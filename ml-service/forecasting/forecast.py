import joblib
import pandas as pd


# Load forecasting models
demand_model = joblib.load(
    "models/demand_forecast_model.pkl"
)

supply_model = joblib.load(
    "models/supply_forecast_model.pkl"
)

delay_model = joblib.load(
    "models/supplier_delay_forecast_model.pkl"
)


def forecast(
    laptop_model,
    location,
    year,
    month,
    quarter,
    demand_lag_1,
    demand_lag_3,
    demand_rolling_3,
    supply_lag_1,
    supply_lag_3,
    supply_rolling_3,
    delay_lag_1,
    delay_lag_3,
    delay_rolling_3
):

    # Demand input
    demand_data = pd.DataFrame([{
        "Laptop_Model": laptop_model,
        "Location": location,
        "Year": year,
        "Month": month,
        "Quarter": quarter,
        "Demand_Lag_1": demand_lag_1,
        "Demand_Lag_3": demand_lag_3,
        "Demand_Rolling_3": demand_rolling_3
    }])

    # Supply input
    supply_data = pd.DataFrame([{
        "Laptop_Model": laptop_model,
        "Location": location,
        "Year": year,
        "Month": month,
        "Quarter": quarter,
        "Supply_Lag_1": supply_lag_1,
        "Supply_Lag_3": supply_lag_3,
        "Supply_Rolling_3": supply_rolling_3
    }])

    # Supplier delay input
    delay_data = pd.DataFrame([{
        "Laptop_Model": laptop_model,
        "Location": location,
        "Year": year,
        "Month": month,
        "Quarter": quarter,
        "Delay_Lag_1": delay_lag_1,
        "Delay_Lag_3": delay_lag_3,
        "Delay_Rolling_3": delay_rolling_3
    }])

    # Predictions
    predicted_demand = demand_model.predict(
        demand_data
    )[0]

    predicted_supply = supply_model.predict(
        supply_data
    )[0]

    predicted_delay = delay_model.predict(
        delay_data
    )[0]

    return {
        "predicted_demand": max(
            0,
            round(float(predicted_demand))
        ),

        "predicted_incoming_supply": max(
            0,
            round(float(predicted_supply))
        ),

        "predicted_supplier_delay": max(
            0,
            round(float(predicted_delay), 1)
        )
    }