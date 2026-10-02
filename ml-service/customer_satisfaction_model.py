import pandas as pd
import numpy as np
import joblib

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)


DATA_PATH = "data/laptop_inventory_data.csv"


# ========================================
# Load Dataset
# ========================================

df = pd.read_csv(DATA_PATH)

df["Date"] = pd.to_datetime(df["Date"])

df = df.sort_values("Date").reset_index(drop=True)


print("\n========================================")
print("Customer Satisfaction ML Model")
print("========================================")

print("\nDataset shape:", df.shape)


# ========================================
# Features
# ========================================

features = [
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
    "Stockout_History",
    "Orders",
    "Late_Orders",
    "Average_Order_Delay"
]


categorical_features = [
    "Laptop_Model",
    "Location"
]


numerical_features = [
    "Current_Inventory",
    "Demand",
    "Supply",
    "Incoming_Supply",
    "Supplier_Lead_Time",
    "Supplier_Delay",
    "Safety_Stock",
    "Reorder_Level",
    "Stockout_History",
    "Orders",
    "Late_Orders",
    "Average_Order_Delay"
]


X = df[features]

y = df["Customer_Satisfaction"]


# ========================================
# Train/Test Split
# ========================================

split_index = int(len(df) * 0.80)

X_train = X.iloc[:split_index]
X_test = X.iloc[split_index:]

y_train = y.iloc[:split_index]
y_test = y.iloc[split_index:]


print("\nTraining records:", len(X_train))
print("Testing records:", len(X_test))


# ========================================
# Preprocessing
# ========================================

preprocessor = ColumnTransformer(
    transformers=[
        (
            "categorical",
            OneHotEncoder(handle_unknown="ignore"),
            categorical_features
        ),
        (
            "numerical",
            "passthrough",
            numerical_features
        )
    ]
)


# ========================================
# Random Forest Regressor
# ========================================

satisfaction_model = RandomForestRegressor(
    n_estimators=250,
    max_depth=15,
    random_state=42,
    n_jobs=-1
)


satisfaction_pipeline = Pipeline(
    steps=[
        (
            "preprocessor",
            preprocessor
        ),
        (
            "model",
            satisfaction_model
        )
    ]
)


# ========================================
# Train Model
# ========================================

print("\nTraining customer satisfaction model...")


satisfaction_pipeline.fit(
    X_train,
    y_train
)


# ========================================
# Predictions
# ========================================

predictions = satisfaction_pipeline.predict(
    X_test
)


# Keep predictions between 0 and 100

predictions = np.clip(
    predictions,
    0,
    100
)


# ========================================
# Evaluation
# ========================================

mae = mean_absolute_error(
    y_test,
    predictions
)


rmse = np.sqrt(
    mean_squared_error(
        y_test,
        predictions
    )
)


r2 = r2_score(
    y_test,
    predictions
)


print("\n----------------------------------------")
print("Customer Satisfaction Evaluation")
print("----------------------------------------")


print(
    f"MAE  : {mae:.2f}"
)


print(
    f"RMSE : {rmse:.2f}"
)


print(
    f"R²   : {r2:.2f}"
)


# ========================================
# Sample Predictions
# ========================================

results = X_test.copy()

results["Actual_Satisfaction"] = (
    y_test.values
)

results["Predicted_Satisfaction"] = (
    np.round(
        predictions,
        2
    )
)


print("\n========================================")
print("Sample Satisfaction Predictions")
print("========================================")


print(
    results[
        [
            "Laptop_Model",
            "Location",
            "Current_Inventory",
            "Demand",
            "Supplier_Delay",
            "Stockout_History",
            "Late_Orders",
            "Average_Order_Delay",
            "Actual_Satisfaction",
            "Predicted_Satisfaction"
        ]
    ].head(15).to_string(index=False)
)


# ========================================
# Save Model
# ========================================

joblib.dump(
    satisfaction_pipeline,
    "models/customer_satisfaction_model.pkl"
)


print("\n========================================")
print("Model Saved")
print("========================================")


print(
    "models/customer_satisfaction_model.pkl"
)


print(
    "\nCustomer Satisfaction pipeline completed successfully!"
)