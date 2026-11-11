from typing import Dict, Any, List, Optional
from app.data.processor import processor

class ScenarioSimulator:
    def __init__(self):
        # Default saved scenarios
        self._custom_scenarios: List[Dict[str, Any]] = [
            {
                "id": 1,
                "name": "Fleet Rebalancing Pilot (-2.5%)",
                "total_bookings": 103024,
                "current_cancellation_rate": 31.14,
                "proposed_reduction_percent": 2.5,
                "scenario_cancellation_rate": 28.64,
                "current_completed_rides": 63967,
                "scenario_completed_rides": 66543,
                "additional_completed_rides": 2576,
                "percentage_improvement": 4.03,
                "formula_used": "Additional Rides = Total Bookings (103,024) × Cancellation Rate Reduction (2.5%)",
                "notes": "Driver staging at high-cancellation pickup hubs like Tumkur Road.",
                "disclaimer": "Hypothetical operational calculation assuming unchanged booking volume and demand elasticity. Not a causal guarantee."
            },
            {
                "id": 2,
                "name": "Targeted Retention & ETA Buffer (-5.0%)",
                "total_bookings": 103024,
                "current_cancellation_rate": 31.14,
                "proposed_reduction_percent": 5.0,
                "scenario_cancellation_rate": 26.14,
                "current_completed_rides": 63967,
                "scenario_completed_rides": 69118,
                "additional_completed_rides": 5151,
                "percentage_improvement": 8.05,
                "formula_used": "Additional Rides = Total Bookings (103,024) × Cancellation Rate Reduction (5.0%)",
                "notes": "Combines realistic ETA buffers with priority dispatch for high-risk bookings.",
                "disclaimer": "Hypothetical operational calculation assuming unchanged booking volume and demand elasticity. Not a causal guarantee."
            }
        ]

    def simulate(
        self,
        name: str,
        total_bookings: int,
        current_cancellation_rate: float,
        proposed_reduction_percent: float,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes operational simulation:
        Estimated Additional Completed Rides = Total Bookings * (Reduction in Cancellation Rate / 100)
        """
        summary = processor.get_summary()
        default_completed = summary.get("successful_rides", 63967)
        default_total = summary.get("total_bookings", 103024)
        
        # Scale current completed rides proportionally if total_bookings differs
        ratio = (total_bookings / default_total) if default_total > 0 else 1.0
        current_completed = int(round(default_completed * ratio))
        
        # Calculate reduction
        reduction_fraction = proposed_reduction_percent / 100.0
        additional_completed = int(round(total_bookings * reduction_fraction))
        scenario_completed = current_completed + additional_completed
        
        scenario_canc_rate = max(0.0, round(current_cancellation_rate - proposed_reduction_percent, 2))
        pct_improvement = round((additional_completed / max(1, current_completed)) * 100, 2)
        
        res = {
            "id": len(self._custom_scenarios) + 1,
            "name": name,
            "total_bookings": total_bookings,
            "current_cancellation_rate": round(current_cancellation_rate, 2),
            "proposed_reduction_percent": round(proposed_reduction_percent, 2),
            "scenario_cancellation_rate": scenario_canc_rate,
            "current_completed_rides": current_completed,
            "scenario_completed_rides": scenario_completed,
            "additional_completed_rides": additional_completed,
            "percentage_improvement": pct_improvement,
            "formula_used": f"Additional Rides = Total Bookings ({total_bookings:,}) × Reduction Rate ({proposed_reduction_percent}%)",
            "notes": notes,
            "disclaimer": "Hypothetical operational scenario calculation assuming exogenous demand stability. This is an analytical estimation, not a causal guarantee."
        }
        
        # Keep track in in-memory list
        self._custom_scenarios.append(res)
        return res

    def get_all_scenarios(self) -> List[Dict[str, Any]]:
        return self._custom_scenarios

    def reset_scenarios(self) -> List[Dict[str, Any]]:
        self._custom_scenarios = self._custom_scenarios[:2]
        return self._custom_scenarios

# Global singleton
simulator = ScenarioSimulator()
