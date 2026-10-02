from flask import Flask, request, jsonify
import joblib
import pandas as pd
from forecasting.forecast import forecast

app = Flask(__name__)


# =========================================================
# LOAD MODELS
# =========================================================

inventory_status_model = joblib.load(
    "models/inventory_status_model.pkl"
)

replenishment_model = joblib.load(
    "models/replenishment_model.pkl"
)

surplus_model = joblib.load(
    "models/surplus_model.pkl"
)

late_order_risk_model = joblib.load(
    "models/late_order_risk_model.pkl"
)

customer_satisfaction_model = joblib.load(
    "models/customer_satisfaction_model.pkl"
)


# =========================================================
# HOME
# =========================================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "success": True,
        "service": "Predictive Supply Chain AI ML Service",
        "models_loaded": 5
    })


# =========================================================
# HEALTH
# =========================================================

@app.route("/health", methods=["GET"])
def health():

    return jsonify({
        "status": "healthy",
        "service": "Flask ML Service",
        "models_loaded": 5
    })


# =========================================================
# INVENTORY PREDICTION
# =========================================================

@app.route("/predict", methods=["POST"])
def predict():

    try:

        data = request.get_json()

        # -------------------------------------------------
        # COMMON FEATURES
        # -------------------------------------------------

        common_features = [
            "Laptop_Model",
            "Location",
            "Current_Inventory",
            "Demand",
            "Supply",
            "Incoming_Supply",
            "Supplier_Lead_Time",
            "Supplier_Delay",
            "Safety_Stock",
            "Reorder_Level",
            "Stockout_History"
        ]

        common_data = {
            feature: data[feature]
            for feature in common_features
        }

        common_df = pd.DataFrame(
            [common_data]
        )

        # -------------------------------------------------
        # 1. INVENTORY STATUS MODEL
        # -------------------------------------------------

        model_inventory_status = (
            inventory_status_model.predict(
                common_df
            )[0]
        )

        # -------------------------------------------------
        # 2. REPLENISHMENT MODEL
        # -------------------------------------------------

        replenishment = (
            replenishment_model.predict(
                common_df
            )[0]
        )

        replenishment = max(
            0,
            round(float(replenishment))
        )

        # -------------------------------------------------
        # 3. SURPLUS MODEL
        # -------------------------------------------------

        surplus = (
            surplus_model.predict(
                common_df
            )[0]
        )

        surplus = max(
            0,
            round(float(surplus))
        )

        # -------------------------------------------------
        # 4. BUSINESS-CONSISTENT INVENTORY STATUS
        # -------------------------------------------------

        current_inventory = float(
            data["Current_Inventory"]
        )

        demand = float(
            data["Demand"]
        )

        safety_stock = float(
            data["Safety_Stock"]
        )

        incoming_supply = float(
            data["Incoming_Supply"]
        )

        # Inventory available after expected incoming supply
        available_inventory = (
            current_inventory +
            incoming_supply
        )

        # Inventory required to satisfy demand
        # and maintain safety stock
        required_inventory = (
            demand +
            safety_stock
        )

        if available_inventory > required_inventory:
            inventory_status = "Surplus"
            replenishment = 0
            surplus = round(
                available_inventory - required_inventory
            )
        elif available_inventory < required_inventory:
            inventory_status = "Shortage"
            replenishment = max(
                0,
                round(required_inventory - available_inventory)
            )
            surplus = 0
        else:
            inventory_status = "Healthy"
            replenishment = 0
            surplus = 0

        # -------------------------------------------------
        # 5. LATE ORDER RISK
        # -------------------------------------------------

        late_order_data = {
            **common_data,
            "Orders": data["Orders"]
        }

        late_order_df = pd.DataFrame(
            [late_order_data]
        )

        late_order_risk = (
            late_order_risk_model.predict(
                late_order_df
            )[0]
        )

        # -------------------------------------------------
        # 6. CUSTOMER SATISFACTION
        # -------------------------------------------------

        satisfaction_data = {
            **late_order_data,
            "Late_Orders": data["Late_Orders"],
            "Average_Order_Delay":
                data["Average_Order_Delay"]
        }

        satisfaction_df = pd.DataFrame(
            [satisfaction_data]
        )

        customer_satisfaction = (
            customer_satisfaction_model.predict(
                satisfaction_df
            )[0]
        )

        customer_satisfaction = round(
            max(
                0,
                min(
                    100,
                    float(customer_satisfaction)
                )
            ),
            2
        )

        # -------------------------------------------------
        # FINAL RESPONSE
        # -------------------------------------------------

        return jsonify({

            "success": True,

            "inventory_status":
                str(inventory_status),

            "predicted_replenishment":
                replenishment,

            "predicted_surplus":
                surplus,

            "late_order_risk":
                str(late_order_risk),

            "predicted_customer_satisfaction":
                customer_satisfaction,

        })

    # -----------------------------------------------------
    # MISSING INPUT
    # -----------------------------------------------------

    except KeyError as error:

        return jsonify({

            "success": False,

            "error":
                f"Missing required input: {error.args[0]}"
        }), 400

    # -----------------------------------------------------
    # OTHER ERRORS
    # -----------------------------------------------------

    except Exception as error:

        return jsonify({

            "success": False,

            "error": str(error)
        }), 400


# =========================================================
# FORECAST
# =========================================================

@app.route("/forecast", methods=["POST"])
def forecast_api():

    try:

        data = request.get_json()

        result = forecast(

            laptop_model=
                data["Laptop_Model"],

            location=
                data["Location"],

            year=
                data["Year"],

            month=
                data["Month"],

            quarter=
                data["Quarter"],

            demand_lag_1=
                data["Demand_Lag_1"],

            demand_lag_3=
                data["Demand_Lag_3"],

            demand_rolling_3=
                data["Demand_Rolling_3"],

            supply_lag_1=
                data["Supply_Lag_1"],

            supply_lag_3=
                data["Supply_Lag_3"],

            supply_rolling_3=
                data["Supply_Rolling_3"],

            delay_lag_1=
                data["Delay_Lag_1"],

            delay_lag_3=
                data["Delay_Lag_3"],

            delay_rolling_3=
                data["Delay_Rolling_3"]
        )

        return jsonify({

            "success": True,

            "forecast": result
        })

    except KeyError as error:

        return jsonify({

            "success": False,

            "error":
                f"Missing required input: {error.args[0]}"
        }), 400

    except Exception as error:

        return jsonify({

            "success": False,

            "error": str(error)
        }), 500


# =========================================================
# START FLASK SERVER
# =========================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5001,
        debug=True
    )