from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.auth.routes import router as auth_router
from app.wallet.routes import router as wallet_router
from app.idm.routes import router as idm_router

app = FastAPI(
    title="Scrybe API",
    description="On-Chain IDM Logger for Ethereum Mainnet Backend API",
    version="1.0.0"
)

# Guardrail: strict CORS configuration loaded directly from config.py
allowed_origins = settings.ALLOWED_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(wallet_router)
app.include_router(idm_router)

@app.get("/")
def root():
    return {
        "app": "Scrybe On-Chain IDM Logger API",
        "version": "1.0.0",
        "status": "operational"
    }

@app.get("/api/health")
def health():
    return {"status": "ok"}
