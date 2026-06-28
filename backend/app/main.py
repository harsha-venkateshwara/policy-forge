"""PolicyForge API.

Compiles written payment policy into governed, executable claim-edit rules and
adjudicates claims against them. The model authors rules; a deterministic engine
applies them; low-confidence and boundary cases route to human review.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import claims, compiler, policies, review
from .schemas import Bootstrap
from .services.compiler import active_mode
from .store import store

app = FastAPI(
    title="PolicyForge API",
    description="Payment policy intelligence — governed GenAI policy-to-rule compilation.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(policies.router)
app.include_router(compiler.router)
app.include_router(claims.router)
app.include_router(review.router)


@app.get("/api/health", tags=["system"])
def health() -> dict:
    mode = active_mode()
    return {
        "status": "ok",
        "compiler_mode": mode,                       # "live" | "heuristic"
        "compiler_ready": bool(settings.groq_api_key),
        "model": settings.groq_model if mode == "live" else "heuristic-extractor",
    }


@app.get("/api/bootstrap", response_model=Bootstrap, tags=["system"])
def bootstrap() -> Bootstrap:
    """Everything the frontend needs to render in a single round trip."""
    return Bootstrap(
        policies=store.policies(),
        claims=store.claims(),
        rules=store.rules(),
        determinations=store.determinations(),
        resolutions=store.resolutions(),
    )
