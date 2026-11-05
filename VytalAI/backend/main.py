"""
VytalAI Backend v2.2 — entry point.
"""
import logging
import os
from datetime import datetime

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import (
    FRONTEND_ORIGINS, MONGO_URI, DB_NAME, IS_PRODUCTION, validate_production_settings,
)
from database.connection import lifespan
from routes import auth, patients, webhook, websocket, doctor, admin

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

validate_production_settings()

app = FastAPI(
    title="VytalAI API",
    description="AI-Powered Patient Registration System",
    version="2.2.0",
    lifespan=lifespan,
    # Hide interactive docs in production
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(doctor.router)
app.include_router(admin.router)
app.include_router(webhook.router)
app.include_router(websocket.router)


@app.get("/", tags=["Health"])
async def root():
    return {
        "service":   "VytalAI API",
        "version":   "2.2.0",
        "status":    "running",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/health", tags=["Health"])
async def health():
    """Lightweight liveness probe for hosting platforms."""
    return {"status": "ok"}


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    print(f"\n🚀  VytalAI Backend v2.2  ({'production' if IS_PRODUCTION else 'development'})")
    print(f"📡  Webhook   : http://localhost:{port}/webhook/elevenlabs")
    print(f"🔌  WebSocket : ws://localhost:{port}/ws/updates")
    print(f"📊  Swagger   : http://localhost:{port}/docs")
    print(f"💾  MongoDB   : {DB_NAME}\n")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=not IS_PRODUCTION)
