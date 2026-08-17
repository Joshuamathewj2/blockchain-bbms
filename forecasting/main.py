"""
BloodChain AI Demand Forecasting Microservice
FastAPI + Scikit-Learn
"""

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import datetime

app = FastAPI(title="BloodChain AI Forecasting Microservice", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"service": "BloodChain AI Forecasting API", "status": "online"}

@app.get("/forecast")
def forecast_demand(blood_group: str = Query("O+"), days: int = Query(30)):
    today = datetime.date.today()
    forecast_data = []

    # Generate synthetic ML predictive trends based on blood group scarcity weights
    base_demand = 15 if blood_group in ["O+", "A+"] else 8
    base_supply = 18 if blood_group in ["O+", "A+"] else 6

    for i in range(days):
        forecast_date = today + datetime.timedelta(days=i)
        # Seasonal cycle modeling with random variance
        demand_factor = 1.0 + 0.3 * np.sin(i / 3.0) + np.random.uniform(-0.1, 0.1)
        supply_factor = 1.0 + 0.2 * np.cos(i / 4.0) + np.random.uniform(-0.1, 0.1)

        predicted_demand = max(1, int(base_demand * demand_factor))
        predicted_supply = max(0, int(base_supply * supply_factor))

        forecast_data.append({
            "date": forecast_date.strftime("%Y-%m-%d"),
            "day": f"Day {i+1}",
            "predictedDemand": predicted_demand,
            "predictedSupply": predicted_supply,
            "netDeficit": max(0, predicted_demand - predicted_supply),
        })

    total_demand = sum(item["predictedDemand"] for item in forecast_data)
    total_supply = sum(item["predictedSupply"] for item in forecast_data)
    risk_level = "HIGH_SHORTAGE_RISK" if total_demand > total_supply * 1.2 else "MODERATE"

    return {
        "bloodGroup": blood_group,
        "days": days,
        "totalPredictedDemand": total_demand,
        "totalPredictedSupply": total_supply,
        "riskLevel": risk_level,
        "forecast": forecast_data,
    }
