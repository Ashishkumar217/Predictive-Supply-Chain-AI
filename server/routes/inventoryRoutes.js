const express = require("express");
const axios = require("axios");

const CurrentInventory = require("../models/CurrentInventory");
const InventoryHistory = require("../models/InventoryHistory");

const router = express.Router();


// ======================================================
// GET ALL CURRENT INVENTORY
// ======================================================

router.get("/", async (req, res) => {
    try {

        const inventory = await CurrentInventory.find()
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: inventory
        });

    } catch (error) {

        console.error(
            "Get current inventory error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch current inventory",
            error: error.message
        });
    }
});


// ======================================================
// ADD CURRENT INVENTORY
// ======================================================

router.post("/", async (req, res) => {
    try {

        const {
            Laptop_Model,
            Location,
            Current_Inventory
        } = req.body;

        if (
            !Laptop_Model ||
            !Location ||
            Current_Inventory === undefined
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Laptop_Model, Location and Current_Inventory are required"
            });
        }

        const inventory = await CurrentInventory.create({
            Laptop_Model,
            Location,
            Current_Inventory: Number(Current_Inventory)
        });

        res.status(201).json({
            success: true,
            message: "Current inventory saved successfully",
            data: inventory
        });

    } catch (error) {

        console.error(
            "Add current inventory error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to save current inventory",
            error: error.message
        });
    }
});


// ======================================================
// COMPLETE AI INVENTORY ANALYSIS
// ======================================================

router.post("/predict/:id", async (req, res) => {

    try {

        // ------------------------------------------------
        // 1. GET CURRENT INVENTORY
        // ------------------------------------------------

        const currentInventory =
            await CurrentInventory.findById(req.params.id);

        if (!currentInventory) {

            return res.status(404).json({
                success: false,
                message: "Current inventory record not found"
            });
        }


        // ------------------------------------------------
        // 2. GET LATEST 3 HISTORICAL RECORDS
        // ------------------------------------------------

        const latestRecords =
            await InventoryHistory
                .find({
                    Laptop_Model:
                        currentInventory.Laptop_Model,

                    Location:
                        currentInventory.Location
                })
                .sort({ Date: -1 })
                .limit(3);


        if (latestRecords.length < 3) {

            return res.status(404).json({
                success: false,
                message:
                    "At least 3 historical records are required for forecasting"
            });
        }


        const latest = latestRecords[0];
        const previous = latestRecords[1];
        const third = latestRecords[2];


        // ------------------------------------------------
        // 3. CALCULATE NEXT FORECAST PERIOD
        // ------------------------------------------------

        const latestDate =
            new Date(latest.Date);

        let forecastYear =
            latestDate.getFullYear();

        let forecastMonth =
            latestDate.getMonth() + 2;


        if (forecastMonth > 12) {

            forecastMonth = 1;
            forecastYear += 1;
        }


        const forecastQuarter =
            Math.ceil(forecastMonth / 3);


        // ------------------------------------------------
        // 4. PREPARE FORECAST INPUT
        // ------------------------------------------------

        const forecastInput = {

            Laptop_Model:
                currentInventory.Laptop_Model,

            Location:
                currentInventory.Location,

            Year:
                forecastYear,

            Month:
                forecastMonth,

            Quarter:
                forecastQuarter,


            // Demand history

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


            // Incoming supply history

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


            // Supplier delay history

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


        // ------------------------------------------------
        // 5. CALL FORECASTING ML SERVICE
        // ------------------------------------------------

        const forecastResponse =
            await axios.post(
                `${process.env.ML_SERVICE_URL}/forecast`,
                forecastInput
            );


        const forecast =
            forecastResponse.data.forecast;


        // ------------------------------------------------
        // 6. BUILD INPUT FOR EXISTING ML MODELS
        // ------------------------------------------------

        const mlInput = {

            Laptop_Model:
                currentInventory.Laptop_Model,

            Location:
                currentInventory.Location,

            Current_Inventory:
                currentInventory.Current_Inventory,


            // Forecasted values

            Demand:
                forecast.predicted_demand,

            Incoming_Supply:
                forecast.predicted_incoming_supply,

            Supplier_Delay:
                forecast.predicted_supplier_delay,


            // Historical operational values

            Supply:
                latest.Supply,

            Supplier_Lead_Time:
                latest.Supplier_Lead_Time,

            Safety_Stock:
                latest.Safety_Stock,

            Reorder_Level:
                latest.Reorder_Level,

            Stockout_History:
                latest.Stockout_History,

            Orders:
                latest.Orders,

            Late_Orders:
                latest.Late_Orders,

            Average_Order_Delay:
                latest.Average_Order_Delay
        };


        // ------------------------------------------------
        // 7. CALL EXISTING INVENTORY ML SERVICE
        // ------------------------------------------------

        const predictionResponse =
            await axios.post(
                `${process.env.ML_SERVICE_URL}/predict`,
                mlInput
            );


        const prediction =
            predictionResponse.data;


        // ------------------------------------------------
        // 8. BUSINESS RECOMMENDATION
        // ------------------------------------------------

        let inventoryAction;

        if (
            prediction.inventory_status ===
            "Shortage"
        ) {

            inventoryAction =
                `Replenish ${prediction.predicted_replenishment} units`;

        } else if (
            prediction.inventory_status ===
            "Surplus" ||
            prediction.predicted_surplus > 0
        ) {

            inventoryAction =
                `Manage surplus of ${prediction.predicted_surplus} units`;

        } else {

            inventoryAction =
                "Maintain current inventory";
        }


        let riskAction;

        if (
            prediction.late_order_risk ===
            "High"
        ) {

            riskAction =
                "Urgent review of supplier delays and order fulfillment";

        } else if (
            prediction.late_order_risk ===
            "Medium"
        ) {

            riskAction =
                "Monitor supplier performance and order delays";

        } else {

            riskAction =
                "Risk currently low";
        }


        const overallRecommendation =
            `${inventoryAction}; ${riskAction}`;


        // ------------------------------------------------
        // 9. FINAL RESPONSE
        // ------------------------------------------------

        res.json({

            success: true,


            // Current inventory entered by user

            current_inventory: {

                laptop_model:
                    currentInventory.Laptop_Model,

                location:
                    currentInventory.Location,

                current_inventory:
                    currentInventory.Current_Inventory
            },


            // Forecasting results

            forecast: {

                forecast_for: {

                    year:
                        forecastYear,

                    month:
                        forecastMonth,

                    quarter:
                        forecastQuarter
                },

                predicted_demand:
                    forecast.predicted_demand,

                predicted_incoming_supply:
                    forecast.predicted_incoming_supply,

                predicted_supplier_delay:
                    forecast.predicted_supplier_delay
            },


            // Historical data used

            historical_data_used: {

                latest_date:
                    latest.Date,

                demand:
                    latest.Demand,

                incoming_supply:
                    latest.Incoming_Supply,

                supplier_delay:
                    latest.Supplier_Delay,

                supply:
                    latest.Supply,

                supplier_lead_time:
                    latest.Supplier_Lead_Time,

                safety_stock:
                    latest.Safety_Stock,

                reorder_level:
                    latest.Reorder_Level
            },


            // Existing ML predictions

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


            // Business recommendation

            business_recommendation: {

                inventory_action:
                    inventoryAction,

                risk_action:
                    riskAction,

                overall_recommendation:
                    overallRecommendation
            }
        });


    } catch (error) {

        console.error(
            "AI inventory prediction error:",
            error.message
        );


        res.status(500).json({

            success: false,

            message:
                "Inventory prediction failed",

            error:
                error.response?.data ||
                error.message
        });
    }
});


module.exports = router;