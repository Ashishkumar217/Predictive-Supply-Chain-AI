import pandas as pd
import numpy as np
import joblib

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline


data = pd.read_csv(
    "data/laptop_inventory_forecasting_dataset.csv"
)

data["Date"] = pd.to_datetime(data["Date"])

data = data.sort_values(
    ["Laptop_Model", "Location", "Date"]
).reset_index(drop=True)


group_columns = [
    "Laptop_Model",
    "Location"
]


# Previous supplier delay
data["Delay_Lag_1"] = (
    data.groupby(group_columns)["Supplier_Delay"]
    .shift(1)
)

# Supplier delay from 3 months earlier
data["Delay_Lag_3"] = (
    data.groupby(group_columns)["Supplier_Delay"]
    .shift(3)
)

# Previous 3-month average
data["Delay_Rolling_3"] = (
    data.groupby(group_columns)["Supplier_Delay"]
    .transform(
        lambda x: x.shift(1).rolling(3).mean()
    )
)


# Time features
data["Year"] = data["Date"].dt.year
data["Month"] = data["Date"].dt.month
data["Quarter"] = data["Date"].dt.quarter


data = data.dropna(
    subset=[
        "Delay_Lag_1",
        "Delay_Lag_3",
        "Delay_Rolling_3"
    ]
)


# Time-based split
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
    "Delay_Lag_1",
    "Delay_Lag_3",
    "Delay_Rolling_3"
]

target = "Supplier_Delay"


X_train = train[features]
y_train = train[target]

X_test = test[features]
y_test = test[target]


preprocessor = ColumnTransformer(
    transformers=[
        (
            "categorical",
            OneHotEncoder(
                handle_unknown="ignore"
            ),
            [
                "Laptop_Model",
                "Location"
            ]
        ),
        (
            "numeric",
            "passthrough",
            [
                "Year",
                "Month",
                "Quarter",
                "Delay_Lag_1",
                "Delay_Lag_3",
                "Delay_Rolling_3"
            ]
        )
    ]
)


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


pipeline.fit(
    X_train,
    y_train
)


predictions = pipeline.predict(
    X_test
)


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


print(
    "\n===== SUPPLIER DELAY FORECAST MODEL ====="
)

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


joblib.dump(
    pipeline,
    "models/supplier_delay_forecast_model.pkl"
)


print(
    "\nSupplier delay forecast model saved successfully."
)