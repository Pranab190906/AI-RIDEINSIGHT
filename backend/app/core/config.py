import os
from pathlib import Path

# Paths
# Path(__file__) is backend/app/core/config.py
CORE_DIR = Path(__file__).resolve().parent
APP_DIR = CORE_DIR.parent
BASE_DIR = APP_DIR.parent # backend
ROOT_DIR = BASE_DIR.parent # project root (ride)

class Settings:
    PROJECT_NAME: str = "RideInsight AI 2.0"
    VERSION: str = "2.0.0"
    API_PREFIX: str = "/api"
    
    # Server Network / Render Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")
    
    # Paths (configurable via env vars, with resilient defaults)
    BASE_DIR: Path = BASE_DIR
    ROOT_DIR: Path = ROOT_DIR
    
    # If DATA_DIR is not set, check ROOT_DIR/data then BASE_DIR/../data
    DATA_DIR: Path = Path(os.getenv("DATA_DIR", ROOT_DIR / "data"))
    DEFAULT_CSV_PATH: Path = DATA_DIR / "Bookings.csv"
    MODELS_DIR: Path = Path(os.getenv("MODELS_DIR", BASE_DIR / "models"))
    EXPORTS_DIR: Path = Path(os.getenv("EXPORTS_DIR", ROOT_DIR / "exports"))
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/rideinsight.db")
    
    # Security / CORS
    CORS_ORIGINS_RAW: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,*"
    )
    
    @property
    def CORS_ORIGINS(self) -> list[str]:
        origins = [o.strip() for o in self.CORS_ORIGINS_RAW.split(",") if o.strip()]
        return origins if origins else ["*"]
    
    # Default Risk Thresholds
    RISK_THRESHOLD_LOW: float = 0.30
    RISK_THRESHOLD_HIGH: float = 0.60
    
    # ML settings
    RANDOM_STATE: int = 42

settings = Settings()

# Ensure directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)
settings.EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
