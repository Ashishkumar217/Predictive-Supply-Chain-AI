const mongoose = require("mongoose");

const currentInventorySchema = new mongoose.Schema(
    {
        Laptop_Model: {
            type: String,
            required: true
        },

        Location: {
            type: String,
            required: true
        },

        Current_Inventory: {
            type: Number,
            required: true
        }
    },
    {
        timestamps: true,
        collection: "current_inventory"
    }
);

module.exports = mongoose.model(
    "CurrentInventory",
    currentInventorySchema
);