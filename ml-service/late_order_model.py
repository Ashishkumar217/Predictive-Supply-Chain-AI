import pandas as pd
import joblib

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report


DATA_PATH = "data/laptop_inventory_data.csv"


# ========================================
# Load Dataset
# ========================================

df = pd.read_csv(DATA_PATH)

df["Date"] = pd.to_datetime(df["Date"])

df = df.sort_values("Date").reset_index(drop=True)


print("\n========================================")
print("Late Order Risk ML Model")
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
    "Orders"
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
    "Orders"
]


X = df[features]

y = df["Late_Order_Risk"]


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
# Random Forest Classifier
# ========================================

risk_model = RandomForestClassifier(
    n_estimators=250,
    max_depth=15,
    random_state=42,
    class_weight="balanced",
    n_jobs=-1
)


risk_pipeline = Pipeline(
    steps=[
        (
            "preprocessor",
            preprocessor
        ),
        (
            "model",
            risk_model
        )
    ]
)


# ========================================
# Train Model
# ========================================

print("\nTraining late order risk model...")

risk_pipeline.fit(
    X_train,
    y_train
)


# ========================================
# Predictions
# ========================================

predictions = risk_pipeline.predict(
    X_test
)


# ========================================
# Evaluation
# ========================================

accuracy = accuracy_score(
    y_test,
    predictions
)


print("\n----------------------------------------")
print("Late Order Risk Evaluation")
print("----------------------------------------")

print(
    f"Accuracy: {accuracy:.2f}"
)


print("\nClassification Report:")

print(
    classification_report(
        y_test,
        predictions,
        zero_division=0
    )
)


# ========================================
# Sample Predictions
# ========================================

results = X_test.copy()

results["Actual_Risk"] = y_test.values

results["Predicted_Risk"] = predictions


print("\n========================================")
print("Sample Late Order Risk Predictions")
print("========================================")


print(
    results[
        [
            "Laptop_Model",
            "Location",
            "Current_Inventory",
            "Demand",
            "Supplier_Lead_Time",
            "Supplier_Delay",
            "Stockout_History",
            "Actual_Risk",
            "Predicted_Risk"
        ]
    ].head(15).to_string(index=False)
)


# ========================================
# Save Model
# ========================================

joblib.dump(
    risk_pipeline,
    "models/late_order_risk_model.pkl"
)


print("\n========================================")
print("Model Saved")
print("========================================")

print(
    "models/late_order_risk_model.pkl"
)

print("\nLate Order Risk pipeline completed successfully!")