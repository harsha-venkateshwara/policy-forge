"""Policy compiler endpoints.

`/compile` turns one written policy into an executable rule; `/diff` recompiles a
revised policy and reports, clause by clause, how its rule changed. Compiling a
known policy persists the resulting rule against that policy id so the next
adjudication run uses the freshly compiled logic.
"""
from fastapi import APIRouter, HTTPException, Response

from ..schemas import CompileRequest, DiffRequest, PolicyDiffResult, Rule
from ..services.compiler import CompilerError, compile_policy, diff_policies
from ..store import store

router = APIRouter(prefix="/api", tags=["compiler"])


@router.post("/compile", response_model=Rule)
def compile_policy_endpoint(req: CompileRequest, response: Response) -> Rule:
    if not req.policy_text.strip():
        raise HTTPException(status_code=422, detail="Policy text is empty.")
    try:
        rule, mode = compile_policy(req.policy_text)
    except CompilerError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    response.headers["X-Compiler-Mode"] = mode
    if req.policy_id:
        store.set_rule(req.policy_id, rule)
    return rule


@router.post("/diff", response_model=PolicyDiffResult)
def diff_policy_endpoint(req: DiffRequest) -> PolicyDiffResult:
    if not req.new_text.strip():
        raise HTTPException(status_code=422, detail="Revised policy text is empty.")

    old_rule = store.rules().get(req.policy_id) if req.policy_id else None
    try:
        result = diff_policies(req.old_text, req.new_text, old_rule)
    except CompilerError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    if req.apply and req.policy_id:
        store.set_rule(req.policy_id, result.new_rule)
    return result
