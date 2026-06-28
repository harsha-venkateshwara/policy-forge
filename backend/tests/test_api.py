"""API-surface tests via FastAPI's TestClient — the contract the frontend relies on.

These exercise the compiler and diff endpoints through the heuristic path, so they
run in CI with no API key.
"""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

NEW_NPWT = (
    "Negative pressure wound therapy using a durable medical equipment pump (CPT 97605) is "
    "reimbursable at a maximum of one (1) unit per date of service. Claims billed with more than "
    "one unit on the same date of service should be flagged as a frequency edit."
)


def test_health_reports_compiler_mode():
    body = client.get("/api/health").json()
    assert body["status"] == "ok"
    assert body["compiler_mode"] in ("live", "heuristic")


def test_bootstrap_returns_full_workspace():
    body = client.get("/api/bootstrap").json()
    assert len(body["policies"]) == 6
    assert len(body["claims"]) == 20
    assert len(body["rules"]) == 6
    assert set(body["determinations"].keys()) == {c["id"] for c in body["claims"]}


def test_compile_endpoint_returns_a_rule():
    policy = client.get("/api/bootstrap").json()["policies"][0]
    res = client.post("/api/compile", json={"policy_text": policy["text"], "policy_id": policy["id"]})
    assert res.status_code == 200
    assert res.headers.get("X-Compiler-Mode") in ("live", "heuristic")
    assert res.json()["logic_type"] == "frequency_limit"


def test_compile_rejects_empty_policy():
    assert client.post("/api/compile", json={"policy_text": "   "}).status_code == 422


def test_diff_summarizes_and_tightens_the_rule():
    """Revising the vague NPWT policy to a firm '1 unit' cap should raise confidence."""
    old = client.get("/api/bootstrap").json()
    old_policy = next(p for p in old["policies"] if p["id"] == "P-1047")
    res = client.post("/api/diff", json={
        "old_text": old_policy["text"], "new_text": NEW_NPWT, "policy_id": "P-1047",
    })
    assert res.status_code == 200
    body = res.json()
    assert body["summary"]
    assert body["new_rule"]["overall_confidence"] > old["rules"]["P-1047"]["overall_confidence"]
    assert any(ch["label"] == "Confidence" for ch in body["changes"])


def test_diff_apply_persists_new_rule():
    old_policy = next(p for p in client.get("/api/bootstrap").json()["policies"] if p["id"] == "P-1047")
    client.post("/api/diff", json={
        "old_text": old_policy["text"], "new_text": NEW_NPWT, "policy_id": "P-1047", "apply": True,
    })
    rules = client.get("/api/rules").json()
    assert rules["P-1047"]["overall_confidence"] > 0.78
