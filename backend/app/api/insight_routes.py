from fastapi import APIRouter
from app.insights.recommendation_engine import recommendation_engine
from app.schemas.all_schemas import RecommendationsResponse

router = APIRouter(prefix="/insights", tags=["Evidence-Based Recommendations"])

@router.get("/recommendations", response_model=RecommendationsResponse)
def get_recommendations():
    return recommendation_engine.generate_recommendations()
