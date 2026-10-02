const mongoose = require("mongoose");

const inventoryHistorySchema = new mongoose.Schema(
    {
        Date: Date,
        Laptop_Model: String,
        Location: String,
        Current_Inventory: Number,
        Demand: Number,
        Supply: Number,
        Incoming_Supply: Number,
        Supplier_Lead_Time: Number,
        Supplier_Delay: Number,
        Safety_Stock: Number,
        Reorder_Level: Number,
        Stockout_History: Number,
        Orders: Number,
        Late_Orders: Number,
        Average_Order_Delay: Number,
        Customer_Satisfaction: Number,
        Future_Requirement: Number,
        Required_Replenishment: Number,
        Surplus_Inventory: Number,
        Inventory_Status: String,
        Late_Order_Risk: String
    },
    {
        collection: "inventory_history_v2"
    }
);

module.exports = mongoose.model(
    "InventoryHistory",
    inventoryHistorySchema
);