import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Explicitly find and load .env from the project root directory
root_dir = Path(__file__).resolve().parent.parent.parent
env_file = root_dir / ".env"
if env_file.exists():
    load_dotenv(dotenv_path=env_file)
else:
    load_dotenv()

class Settings:
    def __init__(self):
        self.ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
        self.LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info")

        # Auth configuration
        self.APP_PASSWORD_HASH: str = os.getenv("APP_PASSWORD_HASH", "")
        self.JWT_SECRET: str = os.getenv("JWT_SECRET", "")
        self.JWT_ALGORITHM: str = "HS256"
        self.JWT_EXPIRATION_HOURS: int = int(os.getenv("JWT_EXPIRATION_HOURS", "4"))
        self.COOKIE_NAME: str = "scrybe_session"

        # Web3 & Wallet configuration
        raw_key = os.getenv("WALLET_PRIVATE_KEY") or os.getenv("SCRYBE_WALLET_PRIVATE_KEY", "")
        if raw_key and not raw_key.startswith("0x"):
            raw_key = "0x" + raw_key
        self.WALLET_PRIVATE_KEY: str = raw_key

        self.ETH_RPC_URL: str = os.getenv("ETH_RPC_URL", "https://eth.llamarpc.com")
        self.ETH_RPC_URL_WS: str = os.getenv("ETH_RPC_URL_WS", "")
        self.ETHERSCAN_API_KEY: str = os.getenv("ETHERSCAN_API_KEY", "")

        # Guardrails
        self.MAX_IDM_BYTES: int = int(os.getenv("MAX_IDM_BYTES", "100000"))
        self.GAS_PRICE_CEILING_GWEI: float = float(os.getenv("GAS_PRICE_CEILING_GWEI", "100"))

        # CORS
        raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
        self.ALLOWED_ORIGINS: list[str] = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

    def validate_required_settings(self, strict: bool = False):
        """Validates that critical settings are populated."""
        missing = []
        if not self.APP_PASSWORD_HASH and strict:
            missing.append("APP_PASSWORD_HASH")
        if not self.JWT_SECRET and strict:
            missing.append("JWT_SECRET")
        if not self.WALLET_PRIVATE_KEY and strict:
            missing.append("WALLET_PRIVATE_KEY / SCRYBE_WALLET_PRIVATE_KEY")
            
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

settings = Settings()
