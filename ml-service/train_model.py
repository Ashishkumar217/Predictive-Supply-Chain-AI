import pandas as pd
import numpy as np

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

import joblib


# ---------------------------------------------------------
# 1. Load dataset
# ---------------------------------------------------------

data_path = "data/inventory_data.csv"

df = pd.read_csv(data_path)

# Convert Date to datetime
df["Date"] = pd.to_datetime(df["Date"])

# Sort by time
df = df.sort_values("Date").reset_index(drop=True)


# ---------------------------------------------------------
# 2. Select features and target
# ---------------------------------------------------------

features = [
    "Product",
    "Location",
    "Current_Inventory",
    "Outgoing_Quantity",
    "Historical_Supply",
    "Incoming_Supply",
    "Supplier_Lead_Time",
    "Safety_Stock",
    "Reorder_Level",
    "Stockout_History",
    "Season"
]

target = "Required_Replenishment"

X = df[features]
y = df[target]


# ---------------------------------------------------------
# 3. Time-based train/test split
# ---------------------------------------------------------
# We use older records for training and newer records
# for testing. This is more realistic for a forecasting
# system than randomly mixing past and future data.
# ---------------------------------------------------------

split_index = int(len(df) * 0.80)

X_train = X.iloc[:split_index]
X_test = X.iloc[split_index:]

y_train = y.iloc[:split_index]
y_test = y.iloc[split_index:]

print("\nTraining records:", len(X_train))
print("Testing records:", len(X_test))


# ---------------------------------------------------------
# 4. Identify categorical and numerical features
# ---------------------------------------------------------

categorical_features = [
    "Product",
    "Location",
    "Season"
]

numerical_features = [
    "Current_Inventory",
    "Outgoing_Quantity",
    "Historical_Supply",
    "Incoming_Supply",
    "Supplier_Lead_Time",
    "Safety_Stock",
    "Reorder_Level",
    "Stockout_History"
]


# ---------------------------------------------------------
# 5. Preprocessing
# ---------------------------------------------------------

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


# ---------------------------------------------------------
# 6. Random Forest Regression model
# ---------------------------------------------------------

model = RandomForestRegressor(
    n_estimators=200,
    max_depth=15,
    random_state=42,
    n_jobs=-1
)


# ---------------------------------------------------------
# 7. Create ML pipeline
# ---------------------------------------------------------

pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("model", model)
    ]
)


# ---------------------------------------------------------
# 8. Train model
# ---------------------------------------------------------

print("\nTraining model...")

pipeline.fit(X_train, y_train)

print("Model training completed!")


# ---------------------------------------------------------
# 9. Make predictions
# ---------------------------------------------------------

y_pred = pipeline.predict(X_test)

# Replenishment cannot be negative
y_pred = np.maximum(y_pred, 0)


# ---------------------------------------------------------
# 10. Evaluate model
# ---------------------------------------------------------

mae = mean_absolute_error(y_test, y_pred)

rmse = np.sqrt(
    mean_squared_error(y_test, y_pred)
)

r2 = r2_score(y_test, y_pred)


print("\nModel Evaluation")
print("-------------------------")
print(f"MAE  : {mae:.2f}")
print(f"RMSE : {rmse:.2f}")
print(f"R²   : {r2:.2f}")


# ---------------------------------------------------------
# 11. Show sample predictions
# ---------------------------------------------------------

results = X_test.copy()

results["Actual_Replenishment"] = y_test.values
results["Predicted_Replenishment"] = np.round(y_pred, 2)

print("\nSample Predictions:")
print(
    results[
        [
            "Product",
            "Location",
            "Current_Inventory",
            "Incoming_Supply",
            "Actual_Replenishment",
            "Predicted_Replenishment"
        ]
    ].head(10)
)


# ---------------------------------------------------------
# 12. Save trained model
# ---------------------------------------------------------

model_path = "models/inventory_model.pkl"

joblib.dump(pipeline, model_path)

print("\nModel saved successfully!")
print("Model path:", model_path)