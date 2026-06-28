"""Review queue endpoints — the governance gate.

Claims whose determination is `review` never auto-adjudicate; an analyst resolves
them here, and the resolution is recorded with attribution.
"""
from typing import Dict, List

from fastapi import APIRouter

from ..schemas import Claim, Resolution, ResolveRequest
from ..store import store

router = APIRouter(prefix="/api", tags=["review"])


@router.get("/review", response_model=List[Claim])
def review_queue() -> List[Claim]:
    determinations = store.determinations()
    return [c for c in store.claims() if determinations[c.id].final == "review"]


@router.get("/resolutions", response_model=Dict[str, Resolution])
def resolutions() -> Dict[str, Resolution]:
    return store.resolutions()


@router.post("/review/resolve", response_model=Resolution)
def resolve(req: ResolveRequest) -> Resolution:
    resolution = Resolution(claim_id=req.claim_id, outcome=req.outcome, by=req.by, at="just now")
    store.resolve(resolution)
    return resolution
