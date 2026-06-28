"""Policy and rule endpoints."""
from typing import Dict, List

from fastapi import APIRouter, HTTPException

from ..schemas import Policy, Rule
from ..store import store

router = APIRouter(prefix="/api", tags=["policies"])


@router.get("/policies", response_model=List[Policy])
def list_policies() -> List[Policy]:
    return store.policies()


@router.get("/policies/{policy_id}", response_model=Policy)
def get_policy(policy_id: str) -> Policy:
    policy = store.policy(policy_id)
    if policy is None:
        raise HTTPException(status_code=404, detail=f"Policy {policy_id} not found")
    return policy


@router.get("/rules", response_model=Dict[str, Rule])
def list_rules() -> Dict[str, Rule]:
    return store.rules()
