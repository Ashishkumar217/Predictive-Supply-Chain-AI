import pandas as pd
import numpy as np
import joblib

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline


# Load dataset
data = pd.read_csv("data/laptop_inventory_forecasting_dataset.csv")

data["Date"] = pd.to_datetime(data["Date"])

# Sort chronologically
data = data.sort_values(
    ["Laptop_Model", "Location", "Date"]
).reset_index(drop=True)


# -------------------------------------------------
# Create forecasting features
# -------------------------------------------------

group_columns = ["Laptop_Model", "Location"]

data["Demand_Lag_1"] = (
    data.groupby(group_columns)["Demand"]
    .shift(1)
)

data["Demand_Lag_3"] = (
    data.groupby(group_columns)["Demand"]
    .shift(3)
)

data["Demand_Rolling_3"] = (
    data.groupby(group_columns)["Demand"]
    .transform(
        lambda x: x.shift(1).rolling(3).mean()
    )
)

# Time features
data["Year"] = data["Date"].dt.year
data["Month"] = data["Date"].dt.month
data["Quarter"] = data["Date"].dt.quarter


# Remove rows where lag features are unavailable
data = data.dropna(
    subset=[
        "Demand_Lag_1",
        "Demand_Lag_3",
        "Demand_Rolling_3"
    ]
)


# -------------------------------------------------
# Time-based train/test split
# -------------------------------------------------

train = data[
    data["Date"] < "2026-01-01"
]

test = data[
    data["Date"] >= "2026-01-01"
]


features = [
    "Laptop_Model",
    "Location",
    "Year",
    "Month",
    "Quarter",
    "Demand_Lag_1",
    "Demand_Lag_3",
    "Demand_Rolling_3"
]

target = "Demand"


X_train = train[features]
y_train = train[target]

X_test = test[features]
y_test = test[target]


# -------------------------------------------------
# Preprocessing
# -------------------------------------------------

categorical_features = [
    "Laptop_Model",
    "Location"
]

numeric_features = [
    "Year",
    "Month",
    "Quarter",
    "Demand_Lag_1",
    "Demand_Lag_3",
    "Demand_Rolling_3"
]

preprocessor = ColumnTransformer(
    transformers=[
        (
            "categorical",
            OneHotEncoder(handle_unknown="ignore"),
            categorical_features
        ),
        (
            "numeric",
            "passthrough",
            numeric_features
        )
    ]
)


# -------------------------------------------------
# Model
# -------------------------------------------------

model = RandomForestRegressor(
    n_estimators=200,
    max_depth=12,
    random_state=42,
    n_jobs=-1
)


pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("model", model)
    ]
)


# Train
pipeline.fit(X_train, y_train)


# -------------------------------------------------
# Evaluation
# -------------------------------------------------

predictions = pipeline.predict(X_test)

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


print("\n===== DEMAND FORECAST MODEL =====")

print(
    f"Training records: {len(train)}"
)

print(
    f"Testing records: {len(test)}"
)

print(
    f"MAE: {mae:.2f}"
)

print(
    f"RMSE: {rmse:.2f}"
)

print(
    f"R2 Score: {r2:.2f}"
)


# -------------------------------------------------
# Save model
# -------------------------------------------------

joblib.dump(
    pipeline,
    "models/demand_forecast_model.pkl"
)

print(
    "\nDemand forecast model saved successfully."
)