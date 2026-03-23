"""FastAPI application entry point."""

from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import init_db

# ── Routers ──────────────────────────────────────────────
from app.routers import (
    auth,
    complaints,
    verification,
    social,
    communications,
    dashboard,
    public,
    whatsapp,
)


# ── Lifespan (startup / shutdown) ───────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown (nothing to tear down for now)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Governance Intelligence Platform",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global exception handler ────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": str(exc) if settings.DEBUG else "Something went wrong",
        },
    )


# ── Health check ─────────────────────────────────────────
@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Jansewa AI backend is running",
        "docs": "/docs",
        "health": "/api/health",
        "api_base": "/api",
    }


@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "app": settings.APP_NAME,
    }


# ── Register routers ────────────────────────────────────
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(complaints.router, prefix="/api/complaints", tags=["Complaints"])
app.include_router(verification.router, prefix="/api/verification", tags=["Verification"])
app.include_router(social.router, prefix="/api/social", tags=["Social Media"])
app.include_router(communications.router, prefix="/api/communications", tags=["Communications"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(public.router, prefix="/api/public", tags=["Public Portal"])
app.include_router(whatsapp.router, prefix="/api/whatsapp", tags=["WhatsApp Bot"])

uploads_dir = Path(__file__).resolve().parents[1] / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")
