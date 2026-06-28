"""Deterministic adjudication engine.

The LLM authors rules; this engine *applies* them. It is intentionally plain,
branch-by-branch Python: given the same claim and the same rule it always returns
the same determination, with a human-readable reason and a citation back to the
policy language. That reproducibility is what makes the output auditable — and it
is why adjudication does not run on the model.

Governance gate: any non-trivial outcome produced by a rule whose confidence sits
below the auto-adjudication threshold is elevated to human review rather than acted
on automatically.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from ..schemas import Claim, Rule, Determination, RuleEval

AUTO_ADJUDICATION_THRESHOLD = 0.85

_SEVERITY = {"pay": 0, "review": 1, "flag": 2, "deny": 3}
_OP_TEXT = {
    "greater_than": ">", "greater_than_or_equal": ">=",
    "less_than": "<", "less_than_or_equal": "<=",
    "equals": "=", "not_equals": "!=",
}


def _num(v: Any) -> Optional[float]:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _compare(a: Optional[float], op: str, b: Optional[float]) -> bool:
    if a is None or b is None:
        return False
    return {
        "greater_than": a > b,
        "greater_than_or_equal": a >= b,
        "less_than": a < b,
        "less_than_or_equal": a <= b,
        "equals": a == b,
        "not_equals": a != b,
    }.get(op, False)


def _first_quote(rule: Rule) -> str:
    if rule.conditions and rule.conditions[0].source_quote:
        return rule.conditions[0].source_quote
    return rule.policy_summary or ""


def _eval_rule(claim: Claim, rule: Rule) -> Optional[Dict[str, Any]]:
    """Evaluate one rule against one claim. Returns None when the rule does not apply."""
    codes = [str(c) for c in claim.codes]
    targets = [str(c) for c in rule.target_codes]
    if not targets or not any(c in codes for c in targets):
        return None

    def result(outcome: str, citation: Optional[str], reason: str) -> Dict[str, Any]:
        return {"outcome": outcome, "citation": citation, "reason": reason, "rule": rule}

    try:
        lt = rule.logic_type

        if lt == "mutually_exclusive":
            if all(c in codes for c in targets):
                return result(
                    rule.outcome, _first_quote(rule),
                    f"Codes {' + '.join(targets)} billed on the same date of service. "
                    f"{targets[-1]} is a component of {targets[0]} — unbundling edit.",
                )
            return result("pay", None, "No unbundling conflict on this claim.")

        if lt == "frequency_limit":
            cond = rule.conditions[0] if rule.conditions else None
            units = _num(claim.units)
            if cond and _compare(units, cond.operator, _num(cond.value)):
                return result(
                    rule.outcome, cond.source_quote,
                    f"Billed {int(units)} units of {targets[0]}; policy maximum is "
                    f"{cond.value} unit per date of service.",
                )
            return result("pay", None, "Within the frequency limit.")

        if lt == "eligibility":
            dx_exceptions = [str(e.value) for e in rule.exceptions if e.type == "diagnosis"]
            claim_dx = [str(d) for d in claim.dx]
            if any(d in claim_dx for d in dx_exceptions):
                return result("pay", None, "High-risk diagnosis documented — eligibility exception met.")
            cond = next((c for c in rule.conditions if c.field == "member_age"),
                        rule.conditions[0] if rule.conditions else None)
            if cond and cond.field == "member_age":
                age, threshold = _num(claim.age), _num(cond.value)
                if age == threshold:
                    return result(
                        "review", cond.source_quote,
                        f"Member age {int(age)} sits on the coverage boundary. "
                        "Confirm date of birth before adjudication.",
                    )
                if _compare(age, cond.operator, threshold):
                    op = _OP_TEXT.get(cond.operator, cond.operator)
                    return result(
                        rule.outcome, cond.source_quote,
                        f"Member age {int(age)} does not meet eligibility threshold "
                        f"(age {op} {threshold}) and no high-risk diagnosis is present.",
                    )
            return result("pay", None, "Eligibility criteria met.")

        if lt == "modifier_required":
            cond = rule.conditions[0] if rule.conditions else None
            required = str(cond.value) if cond else ""
            if required and required not in [str(m) for m in claim.mods]:
                return result(rule.outcome, cond.source_quote if cond else None,
                              f"Required modifier {required} is absent on {targets[0]}; "
                              "the procedure cannot be adjudicated as billed.")
            return result("pay", None, f"Required modifier {required} present.")

        if lt == "add_on_code":
            # An add-on code is only payable when its primary procedure is on the
            # same claim / date of service. The primary is carried on the condition.
            cond = next((c for c in rule.conditions if c.field == "primary_code"),
                        rule.conditions[0] if rule.conditions else None)
            primary = str(cond.value) if cond else ""
            addon = targets[0]
            if addon in codes and primary and primary not in codes:
                return result(
                    rule.outcome, cond.source_quote if cond else _first_quote(rule),
                    f"Add-on code {addon} billed without its primary procedure {primary} "
                    "on the same date of service — not separately reimbursable.",
                )
            return result("pay", None, f"Add-on code {addon} billed with its primary procedure.")

        return result("review", _first_quote(rule),
                      "Rule logic could not be fully auto-evaluated — routed to analyst review.")
    except Exception:
        return result("review", None, "Could not auto-evaluate this rule — routed to analyst review.")


def adjudicate(claim: Claim, rules: List[Rule]) -> Determination:
    """Run every applicable rule, take the most severe outcome, and apply the governance gate."""
    evaluations = [e for e in (_eval_rule(claim, r) for r in rules) if e is not None]

    if not evaluations:
        return Determination(
            claim_id=claim.id, final="pay",
            reason="No payment policy applies to the billed codes.",
            citation=None, primary_rule_id=None, evals=[],
        )

    primary = max(evaluations, key=lambda e: _SEVERITY.get(e["outcome"], 1))
    final = primary["outcome"]
    reason = primary["reason"]

    rule_confidence = primary["rule"].overall_confidence or 1.0
    if final not in ("pay", "review") and rule_confidence < AUTO_ADJUDICATION_THRESHOLD:
        final = "review"
        reason = (
            f"{reason} Rule confidence {round(rule_confidence * 100)}% is below the "
            f"{round(AUTO_ADJUDICATION_THRESHOLD * 100)}% auto-adjudication threshold — "
            "routed for review."
        )

    return Determination(
        claim_id=claim.id, final=final, reason=reason, citation=primary["citation"],
        primary_rule_id=primary["rule"].rule_id,
        evals=[RuleEval(rule_id=e["rule"].rule_id, title=e["rule"].title, outcome=e["outcome"])
               for e in evaluations],
    )
