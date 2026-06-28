"""In-memory application store.

Holds the live rule set (seeded, then overwritten as policies are compiled) and the
analyst resolutions from the review queue. It is deliberately a thin repository so
the seam to a real database (Postgres / SQLite via SQLAlchemy) is a one-class swap —
nothing else in the app talks to storage directly.
"""
from __future__ import annotations

import copy
from typing import Dict, List

from .data import CLAIMS, POLICIES, SEED_RULES
from .schemas import Claim, Determination, Policy, Resolution, Rule
from .services.adjudication import adjudicate


class Store:
    def __init__(self) -> None:
        self._rules: Dict[str, Rule] = copy.deepcopy(SEED_RULES)
        self._resolutions: Dict[str, Resolution] = {}

    # Policies and claims from the static seed
    def policies(self) -> List[Policy]:
        return POLICIES

    def policy(self, policy_id: str) -> Policy | None:
        return next((p for p in POLICIES if p.id == policy_id), None)

    def claims(self) -> List[Claim]:
        return CLAIMS

    # Compiled rules, keyed by policy
    def rules(self) -> Dict[str, Rule]:
        return self._rules

    def rule_list(self) -> List[Rule]:
        return list(self._rules.values())

    def set_rule(self, policy_id: str, rule: Rule) -> None:
        rule.source_policy = policy_id
        self._rules[policy_id] = rule

    # Adjudicate every claim against the current rules
    def determinations(self) -> Dict[str, Determination]:
        rules = self.rule_list()
        return {claim.id: adjudicate(claim, rules) for claim in CLAIMS}

    # Analyst resolutions from the review queue
    def resolutions(self) -> Dict[str, Resolution]:
        return self._resolutions

    def resolve(self, resolution: Resolution) -> None:
        self._resolutions[resolution.claim_id] = resolution

    def reset(self) -> None:
        self.__init__()


store = Store()
