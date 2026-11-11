
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.session import engine, Base
from app.data.processor import processor
from app.ml.trainer import trainer

# Import API routers
from app.api.data_routes import router as data_router
from app.api.analysis_routes import router as analysis_router
from app.api.model_routes import router as model_router
from app.api.explain_routes import router as explain_router
from app.api.forecast_routes import router as forecast_router
from app.api.scenario_routes import router as scenario_router
from app.api.insight_routes import router as insight_router
from app.api.monitoring_routes import router as monitoring_router


# --------------------------------------------------
# Logging configuration
# --------------------------------------------------

logging.basicConfig(level=logging.INFO)

logger = logging.getLogger("rideinsight")


# --------------------------------------------------
# Application startup and shutdown
# --------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):

    logger.info("Starting RideInsight AI...")

    # Create database tables
    try:
        logger.info("Initializing database schema...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database schema initialized successfully.")

    except Exception as e:
        logger.exception("Database initialization failed: %s", e)

    # Load default dataset
    try:
        if settings.DEFAULT_CSV_PATH.exists():

            logger.info(
                "Loading initial dataset from %s...",
                settings.DEFAULT_CSV_PATH
            )

            processor.load_raw_data()

            logger.info("Dataset successfully loaded into memory.")

        else:
            logger.warning(
                "Default dataset not found at %s. "
                "Upload a dataset using /api/data/upload.",
                settings.DEFAULT_CSV_PATH
            )

    except Exception as e:
        logger.exception("Dataset loading failed: %s", e)

    # Initialize baseline ML models if needed
    try:
        active_model_file = (
            settings.MODELS_DIR / "active_model.joblib"
        )

        if not active_model_file.exists():

            logger.info(
                "No pre-trained model detected. "
                "Training baseline models..."
            )

            trainer.train_and_evaluate_all(
                split_type="random",
                test_size=0.20
            )

            logger.info(
                "Baseline ML models successfully trained and persisted."
            )

        else:
            logger.info("Existing trained model detected.")

    except Exception as e:
        logger.exception("Initial model training failed: %s", e)

    logger.info("RideInsight AI startup completed.")

    yield

    logger.info("Shutting down RideInsight AI...")


# --------------------------------------------------
# FastAPI application
# --------------------------------------------------

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Mobility Intelligence & Cancellation Risk "
        "Optimization Platform"
    ),
    lifespan=lifespan
)


# --------------------------------------------------
# CORS configuration
# --------------------------------------------------

# Start with origins configured in application settings.
origins = list(settings.CORS_ORIGINS)

# Add deployed frontend and local development frontend.
required_origins = [
    "https://ai-rideinsight32.onrender.com",
    "http://localhost:5173",
]

for origin in required_origins:
    if origin not in origins and "*" not in origins:
        origins.append(origin)

allow_all = "*" in origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else origins,
    allow_credentials=False if allow_all else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("CORS allowed origins: %s", origins)


# --------------------------------------------------
# Register API routers
# --------------------------------------------------

app.include_router(
    data_router,
    prefix=settings.API_PREFIX
)

app.include_router(
    analysis_router,
    prefix=settings.API_PREFIX
)

app.include_router(
    model_router,
    prefix=settings.API_PREFIX
)

app.include_router(
    explain_router,
    prefix=settings.API_PREFIX
)

app.include_router(
    forecast_router,
    prefix=settings.API_PREFIX
)

app.include_router(
    scenario_router,
    prefix=settings.API_PREFIX
)

app.include_router(
    insight_router,
    prefix=settings.API_PREFIX
)

app.include_router(
    monitoring_router,
    prefix=settings.API_PREFIX
)


# --------------------------------------------------
# Root endpoint
# --------------------------------------------------

@app.get("/")
def root():

    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "documentation": "/docs",
        "health": "/api/health"
    }


# --------------------------------------------------
# Health check endpoint
# --------------------------------------------------

@app.get("/api/health")
def health_check():

    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "active_dataset_id": processor.active_dataset_id,
        "dataset_name": processor.csv_path.name,
        "dataset_loaded": processor._df is not None,
        "active_model": trainer.active_model_name
    }


# --------------------------------------------------
# Local development server
# --------------------------------------------------

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
