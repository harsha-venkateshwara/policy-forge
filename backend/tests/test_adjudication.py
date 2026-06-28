"""The deterministic engine is the auditable core, so it is the most-tested part.

Every assertion below encodes a payment-integrity expectation: the same claim and
rule set must always produce the same determination, the most severe applicable
edit wins, and any finding from a low-confidence rule is elevated to human review
rather than acted on automatically.
"""
from app.data import CLAIMS, SEED_RULES
from app.schemas import Claim, Condition, Rule
from app.services.adjudication import AUTO_ADJUDICATION_THRESHOLD, adjudicate

RULES = list(SEED_RULES.values())


def _claim(cid):
    return next(c for c in CLAIMS if c.id == cid)


def _final(cid):
    return adjudicate(_claim(cid), RULES).final


# The seed batch spans every outcome

def test_frequency_flag():
    assert _final("C-48201") == "flag"          # 36415 x3 over the 1-unit limit


def test_unbundling_flag():
    assert _final("C-48202") == "flag"          # 80053 + 80048 together


def test_eligibility_denial_under_age():
    assert _final("C-48203") == "deny"          # 45378 at age 34, no high-risk dx


def test_eligibility_exception_pays():
    assert _final("C-48207") == "pay"           # age 41 but Z80.0 high-risk dx


def test_age_boundary_routes_to_review():
    assert _final("C-48208") == "review"        # exactly age 45 boundary


def test_modifier_required_flag():
    assert _final("C-48213") == "flag"          # 71046 without modifier 26


def test_modifier_present_pays():
    assert _final("C-48214") == "pay"           # 71046 with modifier 26


def test_addon_without_primary_denies():
    assert _final("C-48215") == "deny"          # 11045 billed without 11042


def test_addon_with_primary_pays():
    assert _final("C-48216") == "pay"           # 11042 + 11045 together


def test_no_applicable_policy_pays():
    assert _final("C-48210") == "pay"           # 99213, no edit applies


# Governance and determinism

def test_low_confidence_rule_routes_to_review():
    """97605 x2 trips the edit, but PF-7745's confidence (0.74) is below the gate."""
    det = adjudicate(_claim("C-48217"), RULES)
    assert det.final == "review"
    assert SEED_RULES["P-1047"].overall_confidence < AUTO_ADJUDICATION_THRESHOLD


def test_most_severe_edit_wins():
    det = adjudicate(_claim("C-48212"), RULES)   # frequency flag + eligibility pay
    assert det.final == "flag"
    assert len(det.evals) >= 2


def test_adjudication_is_reproducible():
    """Same in, same out — the property that makes the output auditable."""
    for claim in CLAIMS:
        first = adjudicate(claim, RULES)
        second = adjudicate(claim, RULES)
        assert first.model_dump() == second.model_dump()


def test_determination_carries_a_citation_when_an_edit_fires():
    det = adjudicate(_claim("C-48201"), RULES)
    assert det.citation                          # must trace back to policy language
    assert det.primary_rule_id == "PF-7741"


def test_rule_order_does_not_change_outcome():
    claim = _claim("C-48212")
    assert adjudicate(claim, RULES).final == adjudicate(claim, list(reversed(RULES))).final


def test_high_confidence_deny_is_not_downgraded():
    """A confident rule auto-adjudicates; it must not be sent to review."""
    rule = Rule(
        rule_id="PF-TEST", title="t", logic_type="frequency_limit", target_codes=["36415"],
        conditions=[Condition(field="units", operator="greater_than", value=1, confidence=0.99)],
        outcome="deny", overall_confidence=0.99,
    )
    claim = Claim(id="X", member="M", age=40, sex="F", codes=["36415"], units=5, dos="2026-06-14", billed=20)
    assert adjudicate(claim, [rule]).final == "deny"
