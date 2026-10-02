const express = require("express");
const InventoryHistory = require("../models/InventoryHistory");
const axios = require("axios");
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const history = await InventoryHistory
            .find()
            .sort({ Date: 1 });

        res.json({
            success: true,
            count: history.length,
            data: history
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch historical inventory data",
            error: error.message
        });
    }
});

router.get("/filter", async (req, res) => {
    try {
        const { laptopModel, location } = req.query;

        if (!laptopModel || !location) {
            return res.status(400).json({
                success: false,
                message: "Laptop model and location are required"
            });
        }

        const history = await InventoryHistory
            .find({
                Laptop_Model: laptopModel,
                Location: location
            })
            .sort({ Date: 1 });

        res.json({
            success: true,
            count: history.length,
            data: history
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch filtered historical data",
            error: error.message
        });
    }
});

router.get("/latest", async (req, res) => {
    try {
        const { laptopModel, location } = req.query;

        if (!laptopModel || !location) {
            return res.status(400).json({
                success: false,
                message: "Laptop model and location are required"
            });
        }

        const latestRecord = await InventoryHistory
            .findOne({
                Laptop_Model: laptopModel,
                Location: location
            })
            .sort({ Date: -1 });

        if (!latestRecord) {
            return res.status(404).json({
                success: false,
                message: "No historical data found"
            });
        }

        res.json({
            success: true,
            data: latestRecord
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch latest historical record",
            error: error.message
        });
    }
});

router.get("/predict", async (req, res) => {
    try {
        const { laptopModel, location } = req.query;

        if (!laptopModel || !location) {
            return res.status(400).json({
                success: false,
                message: "Laptop model and location are required"
            });
        }

        // Get latest historical record
        const latestRecord = await InventoryHistory
            .findOne({
                Laptop_Model: laptopModel,
                Location: location
            })
            .sort({ Date: -1 });

        if (!latestRecord) {
            return res.status(404).json({
                success: false,
                message: "No historical data found for this laptop model and location"
            });
        }

        // Prepare ML input
        const mlInput = {
            Laptop_Model: latestRecord.Laptop_Model,
            Location: latestRecord.Location,
            Current_Inventory: latestRecord.Current_Inventory,
            Demand: latestRecord.Demand,
            Supply: latestRecord.Supply,
            Incoming_Supply: latestRecord.Incoming_Supply,
            Supplier_Lead_Time: latestRecord.Supplier_Lead_Time,
            Supplier_Delay: latestRecord.Supplier_Delay,
            Safety_Stock: latestRecord.Safety_Stock,
            Reorder_Level: latestRecord.Reorder_Level,
            Stockout_History: latestRecord.Stockout_History,
            Orders: latestRecord.Orders,
            Late_Orders: latestRecord.Late_Orders,
            Average_Order_Delay: latestRecord.Average_Order_Delay
        };

        // Send data to Flask ML service
        const axios = require("axios");

        const mlResponse = await axios.post(
            `${process.env.ML_SERVICE_URL}/predict`,
            mlInput
        );
        const prediction = mlResponse.data;

let inventoryAction = "";
let riskAction = "";
let overallRecommendation = "";

// Inventory recommendation
if (prediction.inventory_status === "Shortage") {
    inventoryAction = `Replenish ${prediction.predicted_replenishment} units`;
} 
else if (
    prediction.inventory_status === "Healthy" &&
    prediction.predicted_surplus > 0
) {
    inventoryAction = `Manage surplus of ${prediction.predicted_surplus} units`;
} 
else if (prediction.inventory_status === "Surplus") {
    inventoryAction = `Reduce or redistribute ${prediction.predicted_surplus} surplus units`;
} 
else {
    inventoryAction = "Maintain current inventory";
}

// Late-order risk recommendation
if (prediction.late_order_risk === "High") {
    riskAction = "Urgent: review supplier delays and order fulfillment";
} 
else if (prediction.late_order_risk === "Medium") {
    riskAction = "Monitor supplier performance and order delays";
} 
else {
    riskAction = "Order fulfillment risk is currently low";
}

// Overall recommendation
if (prediction.inventory_status === "Shortage") {
    overallRecommendation =
        `Replenish inventory and monitor order fulfillment. ${riskAction}`;
} 
else if (prediction.inventory_status === "Surplus") {
    overallRecommendation =
        `Manage surplus inventory and avoid unnecessary replenishment. ${riskAction}`;
} 
else {
    overallRecommendation =
        `Maintain inventory levels and monitor the ${prediction.predicted_surplus} surplus units. ${riskAction}`;
}
res.json({
    success: true,

    laptop_model: laptopModel,
    location: location,

    historical_date: latestRecord.Date,

    input_data: mlInput,

    prediction: {
        inventory_status: prediction.inventory_status,
        predicted_replenishment: prediction.predicted_replenishment,
        predicted_surplus: prediction.predicted_surplus,
        late_order_risk: prediction.late_order_risk,
        predicted_customer_satisfaction:
            prediction.predicted_customer_satisfaction
    },

    business_recommendation: {
        inventory_action: inventoryAction,
        risk_action: riskAction,
        overall_recommendation: overallRecommendation
    }
});

    } catch (error) {
        console.error("Prediction error:", error.message);

        res.status(500).json({
            success: false,
            message: "Prediction failed",
            error: error.response?.data || error.message
        });
    }
});

router.post("/current-predict", async (req, res) => {
    try {
        const {
            Laptop_Model,
            Location,
            Current_Inventory,
            Demand,
            Incoming_Supply,
            Supplier_Delay
        } = req.body;

        // Validate current user inputs
        if (
            !Laptop_Model ||
            !Location ||
            Current_Inventory === undefined ||
            Demand === undefined ||
            Incoming_Supply === undefined ||
            Supplier_Delay === undefined
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Laptop_Model, Location, Current_Inventory, Demand, Incoming_Supply and Supplier_Delay are required"
            });
        }

        // Get latest historical record
        const latestRecord = await InventoryHistory
            .findOne({
                Laptop_Model,
                Location
            })
            .sort({ Date: -1 });

        if (!latestRecord) {
            return res.status(404).json({
                success: false,
                message: "No historical data found for this laptop model and location"
            });
        }

        /*
         * User provides current operational values.
         * MongoDB provides historical operational values.
         */

        const mlInput = {
            Laptop_Model,
            Location,

            // Current user inputs
            Current_Inventory: Number(Current_Inventory),
            Demand: Number(Demand),
            Incoming_Supply: Number(Incoming_Supply),
            Supplier_Delay: Number(Supplier_Delay),

            // Historical values
            Supply: latestRecord.Supply,
            Supplier_Lead_Time: latestRecord.Supplier_Lead_Time,
            Safety_Stock: latestRecord.Safety_Stock,
            Reorder_Level: latestRecord.Reorder_Level,
            Stockout_History: latestRecord.Stockout_History,
            Orders: latestRecord.Orders,
            Late_Orders: latestRecord.Late_Orders,
            Average_Order_Delay: latestRecord.Average_Order_Delay
        };

        // Send current + historical data to Flask
        const axios = require("axios");

        const mlResponse = await axios.post(
            `${process.env.ML_SERVICE_URL}/predict`,
            mlInput
        );

        const prediction = mlResponse.data;

        // Inventory recommendation
        let inventoryAction;

        if (prediction.inventory_status === "Shortage") {
            inventoryAction =
                `Replenish ${prediction.predicted_replenishment} units`;
        } else if (
            prediction.inventory_status === "Surplus" ||
            prediction.predicted_surplus > 0
        ) {
            inventoryAction =
                `Manage surplus of ${prediction.predicted_surplus} units`;
        } else {
            inventoryAction = "Maintain current inventory";
        }

        // Risk recommendation
        let riskAction;

        if (prediction.late_order_risk === "High") {
            riskAction =
                "Urgent: review supplier delays and order fulfillment";
        } else if (prediction.late_order_risk === "Medium") {
            riskAction =
                "Monitor supplier performance and order delays";
        } else {
            riskAction =
                "Order fulfillment risk is currently low";
        }

        // Overall recommendation
        let overallRecommendation;

        if (prediction.inventory_status === "Shortage") {
            overallRecommendation =
                `Replenish inventory. ${riskAction}`;
        } else if (prediction.inventory_status === "Surplus") {
            overallRecommendation =
                `Manage surplus inventory. ${riskAction}`;
        } else {
            overallRecommendation =
                `Maintain inventory levels. ${riskAction}`;
        }

        res.json({
            success: true,

            current_input: {
                Laptop_Model,
                Location,
                Current_Inventory: Number(Current_Inventory),
                Demand: Number(Demand),
                Incoming_Supply: Number(Incoming_Supply),
                Supplier_Delay: Number(Supplier_Delay)
            },

            historical_data_used: {
                Supply: latestRecord.Supply,
                Supplier_Lead_Time: latestRecord.Supplier_Lead_Time,
                Safety_Stock: latestRecord.Safety_Stock,
                Reorder_Level: latestRecord.Reorder_Level,
                Stockout_History: latestRecord.Stockout_History,
                Orders: latestRecord.Orders,
                Late_Orders: latestRecord.Late_Orders,
                Average_Order_Delay:
                    latestRecord.Average_Order_Delay
            },

            prediction: {
                inventory_status:
                    prediction.inventory_status,

                predicted_replenishment:
                    prediction.predicted_replenishment,

                predicted_surplus:
                    prediction.predicted_surplus,

                late_order_risk:
                    prediction.late_order_risk,

                predicted_customer_satisfaction:
                    prediction.predicted_customer_satisfaction
            },

            business_recommendation: {
                inventory_action: inventoryAction,
                risk_action: riskAction,
                overall_recommendation:
                    overallRecommendation
            }
        });

    } catch (error) {
        console.error(
            "Current prediction error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Current inventory prediction failed",
            error: error.response?.data || error.message
        });
    }
});

router.post("/forecast", async (req, res) => {
    try {
        const {
            Laptop_Model,
            Location
        } = req.body;

        if (!Laptop_Model || !Location) {
            return res.status(400).json({
                success: false,
                message: "Laptop_Model and Location are required"
            });
        }

        const latestRecords = await InventoryHistory
            .find({
                Laptop_Model,
                Location
            })
            .sort({ Date: -1 })
            .limit(3);

        if (latestRecords.length < 3) {
            return res.status(404).json({
                success: false,
                message: "At least 3 historical records are required"
            });
        }

        const latest = latestRecords[0];
        const previous = latestRecords[1];
        const third = latestRecords[2];

        const latestDate = new Date(latest.Date);

        const year = latestDate.getFullYear();
        const month = latestDate.getMonth() + 2;

        const adjustedMonth =
            month > 12 ? month - 12 : month;

        const quarter =
            Math.ceil(adjustedMonth / 3);

        const forecastInput = {
            Laptop_Model,
            Location,

            Year:
                month > 12
                    ? year + 1
                    : year,

            Month: adjustedMonth,

            Quarter: quarter,

            Demand_Lag_1:
                latest.Demand,

            Demand_Lag_3:
                third.Demand,

            Demand_Rolling_3:
                (
                    latest.Demand +
                    previous.Demand +
                    third.Demand
                ) / 3,

            Supply_Lag_1:
                latest.Incoming_Supply,

            Supply_Lag_3:
                third.Incoming_Supply,

            Supply_Rolling_3:
                (
                    latest.Incoming_Supply +
                    previous.Incoming_Supply +
                    third.Incoming_Supply
                ) / 3,

            Delay_Lag_1:
                latest.Supplier_Delay,

            Delay_Lag_3:
                third.Supplier_Delay,

            Delay_Rolling_3:
                (
                    latest.Supplier_Delay +
                    previous.Supplier_Delay +
                    third.Supplier_Delay
                ) / 3
        };

        const mlResponse = await axios.post(
            `${process.env.ML_SERVICE_URL}/forecast`,
            forecastInput
        );

        res.json({
            success: true,

            laptop_model: Laptop_Model,
            location: Location,

            forecast_for: {
                year: forecastInput.Year,
                month: forecastInput.Month,
                quarter: forecastInput.Quarter
            },

            historical_data_used: {
                latest_date: latest.Date,
                demand: latest.Demand,
                incoming_supply: latest.Incoming_Supply,
                supplier_delay: latest.Supplier_Delay
            },

            forecast: mlResponse.data.forecast
        });

    } catch (error) {
        console.error(
            "Forecast error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Forecast failed",
            error:
                error.response?.data ||
                error.message
        });
    }
});

module.exports = router;