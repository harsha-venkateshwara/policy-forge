"""The heuristic compiler must read each seed policy into the right structured rule.

These tests double as a spec for the offline extractor: the demo runs with no API
key, so this path has to produce correct, adjudication-ready rules on its own.
"""
import pytest

from app.data import POLICIES
from app.schemas import Claim
from app.services.adjudication import adjudicate
from app.services.heuristic import heuristic_compile

BY_ID = {p.id: p for p in POLICIES}


def _compile(policy_id):
    return heuristic_compile(BY_ID[policy_id].text)


@pytest.mark.parametrize("policy_id,logic_type,outcome", [
    ("P-1042", "frequency_limit", "flag"),
    ("P-1043", "mutually_exclusive", "flag"),
    ("P-1044", "eligibility", "deny"),
    ("P-1045", "modifier_required", "flag"),
    ("P-1046", "add_on_code", "deny"),
])
def test_logic_type_and_outcome(policy_id, logic_type, outcome):
    rule = _compile(policy_id)
    assert rule.logic_type == logic_type
    assert rule.outcome == outcome


def test_frequency_targets_and_limit():
    rule = _compile("P-1042")
    assert rule.target_codes == ["36415"]
    assert rule.conditions[0].field == "units"
    assert rule.conditions[0].value == 1


def test_eligibility_extracts_age_not_year_span():
    """'once every ten (10) years ... aged forty-five (45)' must yield 45, not 10."""
    rule = _compile("P-1044")
    assert rule.conditions[0].field == "member_age"
    assert rule.conditions[0].value == 45
    assert "Z80.0" in [e.value for e in rule.exceptions]


def test_modifier_passing_mention_is_not_a_modifier_rule():
    """P-1042 mentions 'Modifier 91 does not override' — must stay a frequency edit."""
    assert _compile("P-1042").logic_type == "frequency_limit"


def test_addon_links_to_primary():
    rule = _compile("P-1046")
    assert rule.target_codes == ["11045"]
    assert rule.conditions[0].field == "primary_code"
    assert rule.conditions[0].value == "11042"


def test_ambiguous_policy_is_low_confidence_and_reviews():
    rule = _compile("P-1047")
    assert rule.overall_confidence < 0.78
    assert rule.outcome == "review"


def test_every_condition_carries_a_verbatim_source_quote():
    for p in POLICIES:
        rule = heuristic_compile(p.text)
        for cond in rule.conditions:
            assert cond.source_quote
            assert cond.source_quote in p.text     # citation must be verbatim


def test_unrecognized_policy_routes_to_review():
    rule = heuristic_compile("This document describes our office holiday schedule.")
    assert rule.outcome == "review"


def test_heuristic_rules_adjudicate_correctly():
    """End to end: compile P-1042 with the heuristic, then adjudicate a 3-unit claim."""
    rule = _compile("P-1042")
    claim = Claim(id="X", member="M", age=40, sex="F", codes=["36415"], units=3, dos="2026-06-14", billed=42)
    assert adjudicate(claim, [rule]).final == "flag"
