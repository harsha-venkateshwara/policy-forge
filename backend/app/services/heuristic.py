"""Deterministic, dependency-free heuristic compiler.

This is the fallback the product uses when no Groq API key is configured (and
the safety net when a live model call fails). It is *not* an LLM — it is a small,
transparent rules-based extractor that reads payment-policy prose and pulls out the
same structured `Rule` the model emits: a logic type, target CPT codes, typed
conditions with the verbatim sentence that justifies each one, exceptions, an
outcome, and an honestly-scored confidence.

Two reasons it earns its place in the codebase:

1. **Clone-and-run.** A reviewer can start the app with zero secrets and still
   drive the full compile → adjudicate → govern loop. The demo never dead-ends on
   a missing key.
2. **First principles.** Spelling out the extraction by hand — regex for codes,
   ages, unit limits and modifiers; keyword scoring for the logic type; hedge-word
   detection that *lowers* confidence so vague policies route to review — shows the
   mechanics the LLM otherwise hides. The model is the better extractor; this proves
   the task is well-posed.
"""
from __future__ import annotations

import re
from typing import List, Optional

from ..schemas import Condition, Rule, RuleException

# Words written as words in policy text, so "forty-five (45)" and "one (1)" parse.
CPT_RE = re.compile(r"\b(\d{5})\b")
PARENS_NUM_RE = re.compile(r"\((\d{1,4})\)")
MODIFIER_RE = re.compile(r"modifier\s+(\d{1,2})", re.IGNORECASE)
ICD_RE = re.compile(r"\b([A-TV-Z]\d{2}(?:\.\d{1,4})?)\b")
# An age threshold: the first number that follows the *word* "age"/"aged" — the
# \b keeps it from firing on "aver(age) risk", and it yields 45 from "aged
# forty-five (45) years", not the "(10) years" that precedes it.
AGE_RE = re.compile(r"\bage(?:d)?\b\D*?(\d{1,3})", re.IGNORECASE)

# Hedge language that should *reduce* confidence and push toward human review.
HEDGES = ("generally", "may be", "depending", "judgment", "examined", "consider",
          "typically", "where appropriate", "at the discretion", "not state",
          "no firm", "should be examined")


def _sentences(text: str) -> List[str]:
    """Split policy text into trimmed sentence-ish spans, verbatim from the source."""
    parts = re.split(r"(?<=[.\n])\s+", text)
    return [p.strip() for p in parts if p.strip()]


def _sentence_with(text: str, *needles: str) -> str:
    """Return the verbatim sentence that contains any of the needles (or '')."""
    for sent in _sentences(text):
        low = sent.lower()
        if any(n.lower() in low for n in needles):
            return sent.rstrip()
    return ""


def _has(text: str, *needles: str) -> bool:
    low = text.lower()
    return any(n.lower() in low for n in needles)


def _cpt_codes(text: str) -> List[str]:
    seen: List[str] = []
    for m in CPT_RE.finditer(text):
        if m.group(1) not in seen:
            seen.append(m.group(1))
    return seen


def _hedge_penalty(text: str) -> float:
    hits = sum(1 for h in HEDGES if h in text.lower())
    return min(0.3, hits * 0.12)


def _clamp(v: float) -> float:
    return max(0.0, min(1.0, round(v, 2)))


def _outcome_from_text(text: str, default: str = "flag") -> str:
    """A policy that says to *flag* is a flag even if it also mentions denying the
    excess; only a pure deny/non-payable instruction (no flag language) is a deny."""
    low = text.lower()
    if _has(low, "flag", "flagged"):
        return "flag"
    if _has(low, "denied", "deny", "not payable", "not eligible",
            "not separately reimbursable", "disallow"):
        return "deny"
    return default


def heuristic_compile(text: str) -> Rule:
    codes = _cpt_codes(text)
    mods = [m.group(1) for m in MODIFIER_RE.finditer(text)]
    rule_id = f"PF-{(abs(hash(text.strip())) % 9000) + 1000}"

    # Detect the logic type from weighted keyword evidence
    is_unbundle = _has(text, "mutually exclusive", "component of", "unbundl", "ncci", "included in")
    is_addon = _has(text, "add-on", "add on", "in addition to the primary", "each additional")
    # Only an explicit *requirement* counts — a passing mention like "modifier 91
    # does not override this limit" must not be read as a modifier edit.
    is_modifier = _has(text, "must append modifier", "must be billed with modifier",
                       "requires modifier", "append modifier", "must include modifier")
    is_eligibility = _has(text, "aged", "years and older", "years of age", "members under age", "eligible for coverage")
    is_frequency = _has(text, "maximum of", "per date of service", "once per", "no more than", "per member, per")

    summary_sentence = _sentences(text)[0] if _sentences(text) else text[:160]
    exceptions: List[RuleException] = []

    # Add-on code dependency edit
    if is_addon and len(codes) >= 2:
        addon = codes[0]
        primary = next((c for c in codes[1:] if c != addon), codes[1])
        quote = _sentence_with(text, "in addition to", "add-on", "each additional") or summary_sentence
        conf = _clamp(0.9 - _hedge_penalty(text))
        return Rule(
            rule_id=rule_id, title="Add-on code dependency edit", logic_type="add_on_code",
            policy_summary=f"Add-on CPT {addon} is only payable with primary procedure CPT {primary}.",
            target_codes=[addon],
            conditions=[Condition(field="primary_code", operator="requires", value=primary,
                                  source_quote=quote, confidence=conf)],
            exceptions=[], outcome=_outcome_from_text(text, "deny"), overall_confidence=conf,
        )

    # NCCI mutually exclusive edit
    if is_unbundle and len(codes) >= 2:
        pair = codes[:2]
        quote = _sentence_with(text, "mutually exclusive", "component of", "unbundl") or summary_sentence
        conf = _clamp(0.92 - _hedge_penalty(text))
        return Rule(
            rule_id=rule_id, title="Component billing (NCCI) edit", logic_type="mutually_exclusive",
            policy_summary=f"CPT {pair[1]} is a component of {pair[0]}; billed together triggers an unbundling edit.",
            target_codes=pair,
            conditions=[Condition(field="cpt_code", operator="contains_all", value=pair,
                                  source_quote=quote, confidence=conf)],
            exceptions=[], outcome=_outcome_from_text(text, "flag"), overall_confidence=conf,
        )

    # Required modifier edit
    if is_modifier and codes and mods:
        quote = _sentence_with(text, "modifier") or summary_sentence
        conf = _clamp(0.88 - _hedge_penalty(text))
        return Rule(
            rule_id=rule_id, title="Required modifier edit", logic_type="modifier_required",
            policy_summary=f"CPT {codes[0]} must carry modifier {mods[0]}; absence is flagged for correction.",
            target_codes=[codes[0]],
            conditions=[Condition(field="modifier", operator="equals", value=mods[0],
                                  source_quote=quote, confidence=conf)],
            exceptions=[], outcome=_outcome_from_text(text, "flag"), overall_confidence=conf,
        )

    # Member age eligibility edit
    if is_eligibility and codes:
        ages = [int(n) for n in AGE_RE.findall(text) if 1 <= int(n) <= 120]
        threshold = ages[0] if ages else None
        for dx in ICD_RE.findall(text):
            if dx not in [e.value for e in exceptions]:
                exceptions.append(RuleException(type="diagnosis", value=dx,
                                                note="High-risk diagnosis noted as a coverage exception."))
        quote = _sentence_with(text, "aged", "years and older", "eligible") or summary_sentence
        if threshold is not None:
            conf = _clamp(0.85 - _hedge_penalty(text))
            return Rule(
                rule_id=rule_id, title="Member eligibility edit", logic_type="eligibility",
                policy_summary=f"CPT {codes[0]} requires member age >= {threshold}; younger members without a high-risk diagnosis are denied.",
                target_codes=[codes[0]],
                conditions=[Condition(field="member_age", operator="less_than", value=threshold,
                                      source_quote=quote, confidence=conf)],
                exceptions=exceptions, outcome=_outcome_from_text(text, "deny"), overall_confidence=conf,
            )

    # Frequency limit edit
    if is_frequency and codes:
        limit_match = PARENS_NUM_RE.search(text)
        limit = int(limit_match.group(1)) if limit_match else 1
        if limit > 12:  # a parenthetical age/year slipped in; fall back to the policy default
            limit = 1
        quote = _sentence_with(text, "maximum of", "per date of service", "no more than", "once per") or summary_sentence
        conf = _clamp(0.9 - _hedge_penalty(text))
        outcome = "review" if conf < 0.78 else _outcome_from_text(text, "flag")
        title = "Frequency limit edit" + (" (ambiguous)" if conf < 0.78 else "")
        return Rule(
            rule_id=rule_id, title=title, logic_type="frequency_limit",
            policy_summary=f"CPT {codes[0]} is limited to {limit} unit(s) per date of service; excess units are flagged.",
            target_codes=[codes[0]],
            conditions=[Condition(field="units", operator="greater_than", value=limit,
                                  source_quote=quote, confidence=conf)],
            exceptions=[], outcome=outcome, overall_confidence=conf,
        )

    # Nothing matched a supported edit, so route this policy to review
    return Rule(
        rule_id=rule_id, title="Unrecognized policy — manual review",
        logic_type="review",
        policy_summary="The policy could not be reduced to a supported edit type. Routed to an analyst.",
        target_codes=codes[:3],
        conditions=[], exceptions=[], outcome="review", overall_confidence=0.5,
    )
