"""Groq-backed policy compiler.

Calls a Groq-hosted model to read a written payment policy and emit a single
structured, executable claim-edit rule. Every condition must carry the verbatim
policy phrase that justifies it, and the model is asked to score its own confidence
honestly so ambiguous policies surface for review instead of silently mis-adjudicating.

This module only knows how to talk to the model. Whether the product *uses* it (vs.
the deterministic heuristic fallback) is decided one level up, in ``compiler.py``.
"""
from __future__ import annotations

import json
import random

from groq import Groq

from ..config import settings
from ..schemas import Rule

SYSTEM_PROMPT = """You are PolicyForge, a payment-integrity policy compiler used by health plan analysts. Convert the healthcare payment/coding policy below into a single structured, executable claim-edit rule.

Respond with ONLY valid minified JSON, no prose, no markdown fences. Use exactly this schema:
{"rule_id":"PF-####","title":"short title","policy_summary":"1-2 plain-English sentences","logic_type":"frequency_limit|mutually_exclusive|eligibility|modifier_required|add_on_code","target_codes":["CPT codes the rule applies to"],"conditions":[{"field":"units|member_age|cpt_code|modifier|primary_code","operator":"greater_than|greater_than_or_equal|less_than|less_than_or_equal|equals|not_equals|contains_all|requires","value":<number|string|array>,"source_quote":"the exact phrase from the policy that justifies this condition","confidence":0.0-1.0}],"exceptions":[{"type":"diagnosis|modifier","value":"code","note":"why"}],"outcome":"flag|deny|review","overall_confidence":0.0-1.0}

Guidance on logic_type: use add_on_code when a code is only payable alongside a primary procedure (carry the primary on a condition with field "primary_code", operator "requires"); modifier_required when a code must carry a specific modifier (field "modifier", operator "equals"); mutually_exclusive for NCCI component/unbundling pairs (field "cpt_code", operator "contains_all"); frequency_limit for per-date unit caps (field "units"); eligibility for age/coverage criteria (field "member_age").

Rules: every condition MUST include a verbatim source_quote copied from the policy. Set confidence and overall_confidence honestly — lower them when the policy is ambiguous, hedged, or states no firm numeric limit. If the policy cannot be reduced to one of the allowed logic_types, set outcome to "review" and overall_confidence below 0.7."""


class CompilerError(RuntimeError):
    """Raised when the model is unavailable or returns an unparseable rule."""


def llm_available() -> bool:
    return bool(settings.groq_api_key)


def _client() -> Groq:
    if not settings.groq_api_key:
        raise CompilerError("GROQ_API_KEY is not set.")
    return Groq(api_key=settings.groq_api_key)


def _clamp(value, default: float = 0.8) -> float:
    try:
        return max(0.0, min(1.0, float(value)))
    except (TypeError, ValueError):
        return default


def _normalize(data: dict) -> Rule:
    """Coerce raw model JSON into a validated Rule, defaulting anything missing."""
    data = dict(data or {})
    data.setdefault("rule_id", f"PF-{random.randint(1000, 9999)}")
    data["logic_type"] = str(data.get("logic_type", "review")).lower()
    data["outcome"] = str(data.get("outcome", "review")).lower()
    data["overall_confidence"] = _clamp(data.get("overall_confidence", 0.8))
    data["target_codes"] = [str(c) for c in data.get("target_codes", [])]
    for cond in data.get("conditions", []):
        cond["field"] = str(cond.get("field", "")).lower()
        cond["operator"] = str(cond.get("operator", "")).lower()
        cond["confidence"] = _clamp(cond.get("confidence", 0.8))
    return Rule(**data)


def _extract_json(raw: str) -> dict:
    cleaned = raw.replace("```json", "").replace("```", "").strip()
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start == -1 or end == -1:
        raise CompilerError("The model did not return a parseable rule.")
    try:
        return json.loads(cleaned[start:end + 1])
    except json.JSONDecodeError as exc:
        raise CompilerError(f"Could not parse the compiled rule: {exc}")


def llm_compile(policy_text: str) -> Rule:
    completion = _client().chat.completions.create(
        model=settings.groq_model,
        max_tokens=1024,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f'POLICY:\n"""\n{policy_text}\n"""'},
        ],
    )
    raw = completion.choices[0].message.content or ""
    return _normalize(_extract_json(raw))


def llm_change_summary(old_text: str, new_text: str) -> str:
    """One or two plain-English sentences on what changed between two policy versions."""
    prompt = (
        "You are a payment-integrity analyst. In 1-2 plain-English sentences, summarize what "
        "materially changed between these two versions of a payment policy and how it affects the "
        "claim edit. Be specific and concise. Respond with prose only.\n\n"
        f"PREVIOUS:\n\"\"\"\n{old_text}\n\"\"\"\n\nREVISED:\n\"\"\"\n{new_text}\n\"\"\""
    )
    completion = _client().chat.completions.create(
        model=settings.groq_model, max_tokens=300, temperature=0,
        messages=[{"role": "user", "content": prompt}],
    )
    return (completion.choices[0].message.content or "").strip()
