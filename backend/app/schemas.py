"""Domain models for PolicyForge.

A compiled Rule is the single source of truth that both the LLM compiler and the
deterministic adjudication engine speak. Keeping it strongly typed here means an
ambiguous policy can never silently produce an un-runnable rule.
"""
from __future__ import annotations

from typing import List, Optional, Union
from pydantic import BaseModel, Field

Outcome = str  # "pay" | "flag" | "deny" | "review"


class Condition(BaseModel):
    field: str
    operator: str
    value: Union[float, int, str, List[str]]
    source_quote: str = ""
    confidence: float = 0.8


class RuleException(BaseModel):
    type: str            # "diagnosis" | "modifier"
    value: str
    note: str = ""


class Rule(BaseModel):
    rule_id: str
    title: str
    policy_summary: str = ""
    logic_type: str       # frequency_limit | mutually_exclusive | eligibility | modifier_required | review
    target_codes: List[str] = Field(default_factory=list)
    conditions: List[Condition] = Field(default_factory=list)
    exceptions: List[RuleException] = Field(default_factory=list)
    outcome: Outcome = "review"
    overall_confidence: float = 0.8
    source_policy: Optional[str] = None


class Policy(BaseModel):
    id: str
    code: str
    title: str
    category: str
    updated: str
    status: str = "compiled"
    text: str


class Claim(BaseModel):
    id: str
    member: str
    age: int
    sex: str
    codes: List[str]
    units: int = 1
    mods: List[str] = Field(default_factory=list)
    dx: List[str] = Field(default_factory=list)
    pos: str = "11"
    dos: str
    billed: float


class RuleEval(BaseModel):
    rule_id: str
    title: str
    outcome: Outcome


class Determination(BaseModel):
    claim_id: str
    final: Outcome
    reason: str
    citation: Optional[str] = None
    primary_rule_id: Optional[str] = None
    evals: List[RuleEval] = Field(default_factory=list)


class Resolution(BaseModel):
    claim_id: str
    outcome: Outcome
    by: str = "analyst"
    at: str = "just now"


# Request and response models for the API payloads

class CompileRequest(BaseModel):
    policy_text: str
    policy_id: Optional[str] = None


class ResolveRequest(BaseModel):
    claim_id: str
    outcome: Outcome
    by: str = "analyst"


class DiffRequest(BaseModel):
    old_text: str
    new_text: str
    policy_id: Optional[str] = None
    apply: bool = False          # persist the recompiled rule against policy_id


class RuleChange(BaseModel):
    kind: str                    # "added" | "removed" | "changed"
    label: str
    before: Optional[str] = None
    after: Optional[str] = None


class PolicyDiffResult(BaseModel):
    summary: str
    mode: str                    # "live" | "heuristic"
    affected_rule_id: Optional[str] = None
    old_rule: Optional[Rule] = None
    new_rule: Rule
    changes: List[RuleChange] = Field(default_factory=list)
    added_lines: List[str] = Field(default_factory=list)
    removed_lines: List[str] = Field(default_factory=list)


class Bootstrap(BaseModel):
    policies: List[Policy]
    claims: List[Claim]
    rules: dict[str, Rule]
    determinations: dict[str, Determination]
    resolutions: dict[str, Resolution]
