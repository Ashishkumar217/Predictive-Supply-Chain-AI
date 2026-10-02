const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
    {
        productId: {
            type: String,
            required: true,
            trim: true
        },

        productName: {
            type: String,
            required: true,
            trim: true
        },

        category: {
            type: String,
            required: true,
            trim: true
        },

        location: {
            type: String,
            required: true,
            trim: true
        },

        date: {
            type: Date,
            required: true
        },

        // Current stock available
        currentInventory: {
            type: Number,
            required: true,
            min: 0
        },

        // Quantity leaving inventory during the period
        outgoingQuantity: {
            type: Number,
            required: true,
            min: 0
        },

        // Supply received historically
        historicalSupply: {
            type: Number,
            required: true,
            min: 0
        },

        // Supply already expected to arrive
        incomingSupply: {
            type: Number,
            required: true,
            min: 0
        },

        // Supplier lead time in days
        supplierLeadTime: {
            type: Number,
            required: true,
            min: 0
        },

        // Minimum buffer inventory
        safetyStock: {
            type: Number,
            required: true,
            min: 0
        },

        // Inventory level at which replenishment is considered
        reorderLevel: {
            type: Number,
            required: true,
            min: 0
        },

        // Previous stockout occurrence
        stockoutHistory: {
            type: Number,
            default: 0,
            min: 0
        },

        // Seasonal condition
        season: {
            type: String,
            enum: ["Low", "Normal", "High", "Peak"],
            default: "Normal"
        },

        unitPrice: {
            type: Number,
            default: 0,
            min: 0
        },

        ordersLate: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Inventory", inventorySchema);