import pandas as pd
import numpy as np

np.random.seed(42)

# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

laptop_models = [
    "Dell Inspiron 15",
    "HP Pavilion 15",
    "Lenovo IdeaPad Slim 3",
    "ASUS VivoBook 15",
    "Acer Aspire 5"
]

locations = [
    "Delhi",
    "Mumbai",
    "Bangalore"
]

dates = pd.date_range(
    start="2024-01-01",
    end="2026-12-01",
    freq="MS"
)

base_demand = {
    "Dell Inspiron 15": 180,
    "HP Pavilion 15": 160,
    "Lenovo IdeaPad Slim 3": 210,
    "ASUS VivoBook 15": 150,
    "Acer Aspire 5": 140
}

location_factor = {
    "Delhi": 1.00,
    "Mumbai": 0.90,
    "Bangalore": 1.10
}


# --------------------------------------------------
# SEASON
# --------------------------------------------------

def get_season(month):

    if month in [10, 11, 12]:
        return "Peak"

    elif month in [6, 7, 8]:
        return "High"

    elif month in [1, 2]:
        return "Low"

    else:
        return "Normal"


def get_season_factor(season):

    factors = {
        "Low": 0.90,
        "Normal": 1.00,
        "High": 1.10,
        "Peak": 1.30
    }

    return factors[season]


# --------------------------------------------------
# GENERATE DATA
# --------------------------------------------------

records = []

for model in laptop_models:

    for location in locations:

        # Starting inventory
        current_inventory = np.random.randint(60, 160)

        for date in dates:

            season = get_season(date.month)
            season_factor = get_season_factor(season)

            # --------------------------------------
            # DEMAND
            # --------------------------------------

            expected_demand = (
                base_demand[model]
                * location_factor[location]
                * season_factor
            )

            demand = int(
                max(
                    20,
                    np.random.normal(
                        expected_demand,
                        expected_demand * 0.12
                    )
                )
            )

            # --------------------------------------
            # SUPPLIER INFORMATION
            # --------------------------------------

            supplier_lead_time = np.random.randint(3, 11)

            supplier_delay = np.random.choice(
                [0, 1, 2, 3, 5, 7],
                p=[0.35, 0.20, 0.17, 0.12, 0.10, 0.06]
            )

            # --------------------------------------
            # INVENTORY PARAMETERS
            # --------------------------------------

            safety_stock = int(demand * 0.25)

            reorder_level = int(
                demand * 0.65 + safety_stock
            )

            # --------------------------------------
            # SUPPLY
            # --------------------------------------

            # Slightly below demand on average.
            # This creates realistic shortage/surplus
            # situations instead of almost everything
            # becoming surplus.

            supply = int(
                max(
                    0,
                    np.random.normal(
                        demand * 0.91,
                        demand * 0.12
                    )
                )
            )

            incoming_supply = int(
                max(
                    0,
                    np.random.normal(
                        demand * 0.12,
                        demand * 0.10
                    )
                )
            )

            # --------------------------------------
            # AVAILABLE INVENTORY
            # --------------------------------------

            available_inventory = (
                current_inventory
                + incoming_supply
            )

            # --------------------------------------
            # STOCKOUT
            # --------------------------------------

            stockout_history = int(
                available_inventory < demand
            )

            # --------------------------------------
            # FUTURE REQUIREMENT
            # --------------------------------------

            future_requirement = int(
                demand
                * np.random.uniform(0.95, 1.15)
                + safety_stock
            )

            # --------------------------------------
            # INVENTORY GAP
            # --------------------------------------

            inventory_gap = (
                future_requirement
                - available_inventory
            )

            required_replenishment = max(
                0,
                int(inventory_gap)
            )

            surplus_inventory = max(
                0,
                int(-inventory_gap)
            )

            # --------------------------------------
            # INVENTORY STATUS
            # --------------------------------------

            if required_replenishment > 20:

                inventory_status = "Shortage"

            elif surplus_inventory > 50:

                inventory_status = "Surplus"

            else:

                inventory_status = "Healthy"

            # --------------------------------------
            # ORDERS
            # --------------------------------------

            orders = int(
                max(
                    10,
                    np.random.normal(
                        demand,
                        demand * 0.08
                    )
                )
            )

            # --------------------------------------
            # LATE ORDER RISK
            # --------------------------------------

            shortage_pressure = max(
                0,
                (demand - available_inventory)
                / max(demand, 1)
            )

            delay_pressure = (
                supplier_delay
                + supplier_lead_time * 0.25
                + stockout_history * 3
                + shortage_pressure * 5
            )

            late_order_probability = np.clip(
                0.04 + delay_pressure / 22,
                0.03,
                0.75
            )

            late_orders = np.random.binomial(
                orders,
                late_order_probability
            )

            # --------------------------------------
            # ORDER DELAY
            # --------------------------------------

            average_order_delay = round(
                max(
                    0,
                    np.random.normal(
                        supplier_delay
                        + stockout_history * 2,
                        1.2
                    )
                ),
                2
            )

            # --------------------------------------
            # CUSTOMER SATISFACTION
            # --------------------------------------

            satisfaction = (
                95
                - late_order_probability * 35
                - average_order_delay * 4
                - stockout_history * 12
            )

            satisfaction += np.random.normal(0, 3)

            customer_satisfaction = round(
                np.clip(
                    satisfaction,
                    20,
                    100
                ),
                2
            )

            # --------------------------------------
            # LATE ORDER RISK
            # --------------------------------------

            if late_order_probability >= 0.45:

                late_order_risk = "High"

            elif late_order_probability >= 0.20:

                late_order_risk = "Medium"

            else:

                late_order_risk = "Low"

            # --------------------------------------
            # ENDING INVENTORY
            # --------------------------------------

            ending_inventory = (
                current_inventory
                + supply
                + incoming_supply
                - demand
            )

            ending_inventory = max(
                0,
                int(ending_inventory)
            )

            # --------------------------------------
            # SAVE RECORD
            # --------------------------------------

            records.append({

                "Date": date,

                "Laptop_Model": model,

                "Location": location,

                "Current_Inventory": current_inventory,

                "Demand": demand,

                "Supply": supply,

                "Incoming_Supply": incoming_supply,

                "Supplier_Lead_Time": supplier_lead_time,

                "Supplier_Delay": supplier_delay,

                "Safety_Stock": safety_stock,

                "Reorder_Level": reorder_level,

                "Stockout_History": stockout_history,

                "Orders": orders,

                "Late_Orders": late_orders,

                "Average_Order_Delay": average_order_delay,

                "Customer_Satisfaction": customer_satisfaction,

                "Future_Requirement": future_requirement,

                "Required_Replenishment": required_replenishment,

                "Surplus_Inventory": surplus_inventory,

                "Inventory_Status": inventory_status,

                "Late_Order_Risk": late_order_risk
            })

            # Carry inventory to next month
            current_inventory = ending_inventory


# --------------------------------------------------
# CREATE DATAFRAME
# --------------------------------------------------

df = pd.DataFrame(records)

df = df.sort_values(
    ["Laptop_Model", "Location", "Date"]
).reset_index(drop=True)


# --------------------------------------------------
# SAVE
# --------------------------------------------------

output_path = "data/laptop_inventory_data.csv"

df.to_csv(
    output_path,
    index=False
)


# --------------------------------------------------
# VALIDATION OUTPUT
# --------------------------------------------------

print("\n========================================")
print("Laptop Dataset Generated Successfully")
print("========================================")

print("\nDataset shape:")
print(df.shape)

print("\nMissing values:")
print(df.isnull().sum().sum())

print("\nInventory Status:")
print(df["Inventory_Status"].value_counts())

print("\nInventory Status (%):")
print(
    (df["Inventory_Status"].value_counts(normalize=True) * 100)
    .round(2)
)

print("\nLate Order Risk:")
print(df["Late_Order_Risk"].value_counts())

print("\nLate Order Risk (%):")
print(
    (df["Late_Order_Risk"].value_counts(normalize=True) * 100)
    .round(2)
)

print("\nCustomer Satisfaction:")
print(
    df["Customer_Satisfaction"].describe().round(2)
)

print("\nLaptop Models:")
print(df["Laptop_Model"].value_counts())

print("\nLocations:")
print(df["Location"].value_counts())

print("\nSample Data:")
print(
    df.head(10).to_string(index=False)
)

print("\nSaved to:")
print(output_path)