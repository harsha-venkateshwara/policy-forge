"""Claims and adjudication endpoints."""
from typing import Dict, List

from fastapi import APIRouter

from ..schemas import Claim, Determination
from ..store import store

router = APIRouter(prefix="/api", tags=["claims"])


@router.get("/claims", response_model=List[Claim])
def list_claims() -> List[Claim]:
    return store.claims()


@router.get("/adjudications", response_model=Dict[str, Determination])
def run_adjudication() -> Dict[str, Determination]:
    """Adjudicate every claim against the current rule set. Deterministic — same in, same out."""
    return store.determinations()
