from fastapi import APIRouter, HTTPException
from typing import List
from app.forecasting.scenarios import simulator
from app.schemas.all_schemas import ScenarioRequest, ScenarioResult

router = APIRouter(prefix="/scenarios", tags=["What-If Operational Simulator"])

@router.post("/simulate", response_model=ScenarioResult)
def simulate_scenario(req: ScenarioRequest):
    try:
        return simulator.simulate(
            name=req.name,
            total_bookings=req.total_bookings,
            current_cancellation_rate=req.current_cancellation_rate,
            proposed_reduction_percent=req.proposed_reduction_percent,
            notes=req.notes
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")

@router.get("/list", response_model=List[ScenarioResult])
def list_scenarios():
    return simulator.get_all_scenarios()

@router.post("/reset", response_model=List[ScenarioResult])
def reset_scenarios():
    return simulator.reset_scenarios()
