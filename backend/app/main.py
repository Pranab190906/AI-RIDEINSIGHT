import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.session import engine, Base
from app.data.processor import processor
from app.ml.trainer import trainer

# Import routers
from app.api.data_routes import router as data_router
from app.api.analysis_routes import router as analysis_router
from app.api.model_routes import router as model_router
from app.api.explain_routes import router as explain_router
from app.api.forecast_routes import router as forecast_router
from app.api.scenario_routes import router as scenario_router
from app.api.insight_routes import router as insight_router
from app.api.monitoring_routes import router as monitoring_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rideinsight")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create SQLite tables
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    
    # Verify dataset exists and load
    if settings.DEFAULT_CSV_PATH.exists():
        logger.info(f"Loading initial dataset from {settings.DEFAULT_CSV_PATH}...")
        try:
            processor.load_raw_data()
            logger.info("Dataset successfully loaded into memory.")
        except Exception as e:
            logger.error(f"Failed to load dataset: {e}")
    else:
        logger.warning(f"Default dataset not found at {settings.DEFAULT_CSV_PATH}. Upload required via /api/data/upload.")
            
    # Verify or initialize trained models
    active_model_file = settings.MODELS_DIR / "active_model.joblib"
    if not active_model_file.exists():
        logger.info("No pre-trained model detected. Training baseline models...")
        try:
            trainer.train_and_evaluate_all(split_type="random", test_size=0.20)
            logger.info("Baseline ML models successfully trained and persisted.")
        except Exception as e:
            logger.error(f"Error training initial models: {e}")
            
    yield
    logger.info("Shutting down RideInsight AI...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Mobility Intelligence & Cancellation Risk Optimization Platform",
    lifespan=lifespan
)

# CORS middleware
origins = settings.CORS_ORIGINS
allow_all = "*" in origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else origins,
    allow_credentials=not allow_all,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under /api
app.include_router(data_router, prefix=settings.API_PREFIX)
app.include_router(analysis_router, prefix=settings.API_PREFIX)
app.include_router(model_router, prefix=settings.API_PREFIX)
app.include_router(explain_router, prefix=settings.API_PREFIX)
app.include_router(forecast_router, prefix=settings.API_PREFIX)
app.include_router(scenario_router, prefix=settings.API_PREFIX)
app.include_router(insight_router, prefix=settings.API_PREFIX)
app.include_router(monitoring_router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "documentation": "/docs",
        "health": "/api/health"
    }

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
