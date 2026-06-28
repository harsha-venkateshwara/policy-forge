"""Compiler orchestration — the single entry point the routers call.

Decides *how* a policy gets compiled and degrades gracefully:

    live model present?  ──▶ Groq (services/llm.py)
            │  call fails / no key
            ▼
    heuristic extractor (services/heuristic.py)

Either way the caller gets a validated `Rule`; `active_mode()` reports which path
is in use so the UI can be honest about it. This module also owns the policy-change
diff: recompile the revised policy and compute a structured, rule-level changelog
against the prior rule.
"""
from __future__ import annotations

import difflib
import re
from typing import List, Optional, Tuple

from ..schemas import PolicyDiffResult, Rule, RuleChange
from . import llm
from .heuristic import heuristic_compile

# Re-export so existing imports (`from ..services.compiler import CompilerError`) work.
CompilerError = llm.CompilerError


def active_mode() -> str:
    """'live' when a real model is wired up, else 'heuristic'."""
    return "live" if llm.llm_available() else "heuristic"


def compile_policy(policy_text: str) -> Tuple[Rule, str]:
    """Compile policy text into a Rule. Returns (rule, mode_used)."""
    if not policy_text.strip():
        raise CompilerError("Policy text is empty.")
    if llm.llm_available():
        try:
            return llm.llm_compile(policy_text), "live"
        except Exception:
            # Never dead-end a demo on a transient model error — fall back, but be
            # honest in the reported mode.
            return heuristic_compile(policy_text), "heuristic"
    return heuristic_compile(policy_text), "heuristic"


# Policy change diff


def _conditions_as_text(rule: Rule) -> dict[str, str]:
    """A stable {field: 'field op value'} map so conditions diff by what they test."""
    out: dict[str, str] = {}
    for c in rule.conditions:
        val = ", ".join(map(str, c.value)) if isinstance(c.value, list) else c.value
        out[c.field] = f"{c.field} {c.operator} {val}"
    return out


def _rule_changes(old: Optional[Rule], new: Rule) -> List[RuleChange]:
    """Structured, human-readable changelog between two compiled rules."""
    changes: List[RuleChange] = []
    if old is None:
        changes.append(RuleChange(kind="added", label="New rule compiled",
                                  after=f"{new.logic_type} · {new.outcome}"))
        return changes

    if old.outcome != new.outcome:
        changes.append(RuleChange(kind="changed", label="Outcome", before=old.outcome, after=new.outcome))
    if old.logic_type != new.logic_type:
        changes.append(RuleChange(kind="changed", label="Logic type", before=old.logic_type, after=new.logic_type))
    if set(old.target_codes) != set(new.target_codes):
        changes.append(RuleChange(kind="changed", label="Target codes",
                                  before=", ".join(old.target_codes), after=", ".join(new.target_codes)))
    if round(old.overall_confidence, 2) != round(new.overall_confidence, 2):
        changes.append(RuleChange(kind="changed", label="Confidence",
                                  before=f"{round(old.overall_confidence * 100)}%",
                                  after=f"{round(new.overall_confidence * 100)}%"))

    old_c, new_c = _conditions_as_text(old), _conditions_as_text(new)
    for field, text in new_c.items():
        if field not in old_c:
            changes.append(RuleChange(kind="added", label=f"Condition · {field}", after=text))
        elif old_c[field] != text:
            changes.append(RuleChange(kind="changed", label=f"Condition · {field}",
                                      before=old_c[field], after=text))
    for field, text in old_c.items():
        if field not in new_c:
            changes.append(RuleChange(kind="removed", label=f"Condition · {field}", before=text))

    old_exc = {e.value for e in old.exceptions}
    new_exc = {e.value for e in new.exceptions}
    for v in new_exc - old_exc:
        changes.append(RuleChange(kind="added", label="Exception", after=v))
    for v in old_exc - new_exc:
        changes.append(RuleChange(kind="removed", label="Exception", before=v))

    return changes


def _sentences(text: str) -> List[str]:
    return [s.strip() for s in re.split(r"(?<=[.\n])\s+", text) if s.strip()]


def _text_line_diff(old_text: str, new_text: str) -> Tuple[List[str], List[str]]:
    """Sentence-level added / removed spans between two policy versions."""
    old_s, new_s = _sentences(old_text), _sentences(new_text)
    sm = difflib.SequenceMatcher(a=old_s, b=new_s, autojunk=False)
    added, removed = [], []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag in ("replace", "insert"):
            added.extend(new_s[j1:j2])
        if tag in ("replace", "delete"):
            removed.extend(old_s[i1:i2])
    return added, removed


def _heuristic_summary(added: List[str], removed: List[str]) -> str:
    if added and removed:
        return f"{len(removed)} clause(s) revised. Notably added: “{added[0]}”"
    if added:
        return f"{len(added)} new clause(s) added. Notably: “{added[0]}”"
    if removed:
        return f"{len(removed)} clause(s) removed, including: “{removed[0]}”"
    return "No material textual change detected between the two versions."


def diff_policies(old_text: str, new_text: str, old_rule: Optional[Rule]) -> PolicyDiffResult:
    """Summarize what changed, recompile the revised policy, and diff the two rules."""
    if not new_text.strip():
        raise CompilerError("Revised policy text is empty.")

    added, removed = _text_line_diff(old_text, new_text)
    new_rule, mode = compile_policy(new_text)

    if mode == "live":
        try:
            summary = llm.llm_change_summary(old_text, new_text)
        except Exception:
            summary = _heuristic_summary(added, removed)
    else:
        summary = _heuristic_summary(added, removed)

    return PolicyDiffResult(
        summary=summary, mode=mode,
        affected_rule_id=old_rule.rule_id if old_rule else new_rule.rule_id,
        old_rule=old_rule, new_rule=new_rule,
        changes=_rule_changes(old_rule, new_rule),
        added_lines=added, removed_lines=removed,
    )
