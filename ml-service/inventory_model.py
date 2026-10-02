import pandas as pd
import numpy as np
import joblib

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    mean_absolute_error,
    mean_squared_error,
    r2_score
)


# ==================================================
# 1. LOAD DATA
# ==================================================

DATA_PATH = "data/laptop_inventory_data.csv"

df = pd.read_csv(DATA_PATH)

df["Date"] = pd.to_datetime(df["Date"])

df = df.sort_values("Date").reset_index(drop=True)


print("\n========================================")
print("Inventory ML Model")
print("========================================")

print("\nDataset shape:", df.shape)


# ==================================================
# 2. FEATURES
# ==================================================

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
    "Stockout_History"
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
    "Stockout_History"
]


X = df[features]


# ==================================================
# 3. TIME-BASED TRAIN / TEST SPLIT
# ==================================================

split_index = int(len(df) * 0.80)

X_train = X.iloc[:split_index]
X_test = X.iloc[split_index:]


print("\nTraining records:", len(X_train))
print("Testing records:", len(X_test))


# ==================================================
# 4. PREPROCESSOR
# ==================================================

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


# ==================================================
# 5. INVENTORY STATUS CLASSIFIER
# ==================================================

y_status = df["Inventory_Status"]

y_status_train = y_status.iloc[:split_index]
y_status_test = y_status.iloc[split_index:]


status_model = RandomForestClassifier(
    n_estimators=250,
    max_depth=15,
    random_state=42,
    class_weight="balanced",
    n_jobs=-1
)


status_pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("model", status_model)
    ]
)


print("\nTraining inventory status model...")

status_pipeline.fit(
    X_train,
    y_status_train
)


status_predictions = status_pipeline.predict(
    X_test
)


status_accuracy = accuracy_score(
    y_status_test,
    status_predictions
)


print("\n----------------------------------------")
print("Inventory Status Evaluation")
print("----------------------------------------")

print(
    f"Accuracy: {status_accuracy:.2f}"
)

print("\nClassification Report:")

print(
    classification_report(
        y_status_test,
        status_predictions,
        zero_division=0
    )
)


# ==================================================
# 6. REPLENISHMENT REGRESSION MODEL
# ==================================================

y_replenishment = df[
    "Required_Replenishment"
]

y_replenishment_train = (
    y_replenishment.iloc[:split_index]
)

y_replenishment_test = (
    y_replenishment.iloc[split_index:]
)


replenishment_model = RandomForestRegressor(
    n_estimators=250,
    max_depth=15,
    random_state=42,
    n_jobs=-1
)


replenishment_pipeline = Pipeline(
    steps=[
        (
            "preprocessor",
            preprocessor
        ),
        (
            "model",
            replenishment_model
        )
    ]
)


print("\nTraining replenishment model...")

replenishment_pipeline.fit(
    X_train,
    y_replenishment_train
)


replenishment_predictions = (
    replenishment_pipeline.predict(X_test)
)


replenishment_predictions = np.maximum(
    replenishment_predictions,
    0
)


replenishment_mae = mean_absolute_error(
    y_replenishment_test,
    replenishment_predictions
)


replenishment_rmse = np.sqrt(
    mean_squared_error(
        y_replenishment_test,
        replenishment_predictions
    )
)


replenishment_r2 = r2_score(
    y_replenishment_test,
    replenishment_predictions
)


print("\n----------------------------------------")
print("Replenishment Evaluation")
print("----------------------------------------")

print(
    f"MAE  : {replenishment_mae:.2f}"
)

print(
    f"RMSE : {replenishment_rmse:.2f}"
)

print(
    f"R²   : {replenishment_r2:.2f}"
)


# ==================================================
# 7. SURPLUS REGRESSION MODEL
# ==================================================

y_surplus = df[
    "Surplus_Inventory"
]

y_surplus_train = (
    y_surplus.iloc[:split_index]
)

y_surplus_test = (
    y_surplus.iloc[split_index:]
)


surplus_model = RandomForestRegressor(
    n_estimators=250,
    max_depth=15,
    random_state=42,
    n_jobs=-1
)


surplus_pipeline = Pipeline(
    steps=[
        (
            "preprocessor",
            preprocessor
        ),
        (
            "model",
            surplus_model
        )
    ]
)


print("\nTraining surplus model...")

surplus_pipeline.fit(
    X_train,
    y_surplus_train
)


surplus_predictions = (
    surplus_pipeline.predict(X_test)
)


surplus_predictions = np.maximum(
    surplus_predictions,
    0
)


surplus_mae = mean_absolute_error(
    y_surplus_test,
    surplus_predictions
)


surplus_rmse = np.sqrt(
    mean_squared_error(
        y_surplus_test,
        surplus_predictions
    )
)


surplus_r2 = r2_score(
    y_surplus_test,
    surplus_predictions
)


print("\n----------------------------------------")
print("Surplus Evaluation")
print("----------------------------------------")

print(
    f"MAE  : {surplus_mae:.2f}"
)

print(
    f"RMSE : {surplus_rmse:.2f}"
)

print(
    f"R²   : {surplus_r2:.2f}"
)


# ==================================================
# 8. SAMPLE PREDICTIONS
# ==================================================

results = X_test.copy()

results["Actual_Status"] = (
    y_status_test.values
)

results["Predicted_Status"] = (
    status_predictions
)

results["Actual_Replenishment"] = (
    y_replenishment_test.values
)

results["Predicted_Replenishment"] = (
    np.round(
        replenishment_predictions,
        0
    )
)

results["Actual_Surplus"] = (
    y_surplus_test.values
)

results["Predicted_Surplus"] = (
    np.round(
        surplus_predictions,
        0
    )
)


print("\n========================================")
print("Sample Inventory Predictions")
print("========================================")

print(
    results[
        [
            "Laptop_Model",
            "Location",
            "Current_Inventory",
            "Demand",
            "Actual_Status",
            "Predicted_Status",
            "Actual_Replenishment",
            "Predicted_Replenishment",
            "Actual_Surplus",
            "Predicted_Surplus"
        ]
    ].head(15).to_string(index=False)
)


# ==================================================
# 9. SAVE MODELS
# ==================================================

joblib.dump(
    status_pipeline,
    "models/inventory_status_model.pkl"
)

joblib.dump(
    replenishment_pipeline,
    "models/replenishment_model.pkl"
)

joblib.dump(
    surplus_pipeline,
    "models/surplus_model.pkl"
)


print("\n========================================")
print("Models Saved")
print("========================================")

print(
    "models/inventory_status_model.pkl"
)

print(
    "models/replenishment_model.pkl"
)

print(
    "models/surplus_model.pkl"
)

print("\nInventory ML pipeline completed successfully!")