import joblib
import pandas as pd


# Load trained model
model = joblib.load("models/inventory_model.pkl")


# New inventory situation
new_data = pd.DataFrame([
    {
        "Product": "Laptop",
        "Location": "Delhi",
        "Current_Inventory": 500,
        "Outgoing_Quantity": 220,
        "Historical_Supply": 250,
        "Incoming_Supply": 100,
        "Supplier_Lead_Time": 6,
        "Safety_Stock": 150,
        "Reorder_Level": 350,
        "Stockout_History": 0,
        "Season": "Normal"
    }
])


# Make prediction
prediction = model.predict(new_data)

required_replenishment = max(0, round(prediction[0]))


print("\nInventory Prediction")
print("----------------------------")
print("Product:", new_data["Product"].iloc[0])
print("Location:", new_data["Location"].iloc[0])
print("Current Inventory:", new_data["Current_Inventory"].iloc[0])
print("Incoming Supply:", new_data["Incoming_Supply"].iloc[0])

print("\nPredicted Required Replenishment:",
      required_replenishment, "units")