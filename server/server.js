const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const connectDB = require("./config/db");
const inventoryRoutes = require("./routes/inventoryRoutes");
const historyRoutes = require("./routes/historyRoutes");

const currentInventoryRoutes =
    require("./routes/currentInventoryRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/inventory", inventoryRoutes);
app.use("/api/history", historyRoutes);
app.use(
    "/api/current-inventory",
    currentInventoryRoutes
);

const PORT = process.env.PORT || 5000;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL;

// Connect MongoDB
connectDB();

// Home route
app.get("/", (req, res) => {
    res.json({
        success: true,
        service: "Predictive Supply Chain Node.js API",
        message: "Node.js backend is running!"
    });
});

// Health route
app.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        service: "Node.js Backend"
    });
});

app.post("/api/ml/predict", async (req, res) => {
    try {
        const response = await axios.post(
            `${ML_SERVICE_URL}/predict`,
            req.body
        );

        res.json({
            success: true,
            ml_prediction: response.data
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to connect to ML service",
            error: error.response?.data || error.message
        });
    }
});

// Test Flask connection
app.get("/api/ml-health", async (req, res) => {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/health`);

        res.json({
            success: true,
            message: "Node.js successfully connected to Flask!",
            flask: response.data
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Unable to connect to Flask ML service.",
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Node.js server running on http://localhost:${PORT}`);
});