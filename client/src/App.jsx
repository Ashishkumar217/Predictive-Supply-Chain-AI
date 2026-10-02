import React, { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import "./App.css";

const API_URL = "http://localhost:5000";

const LAPTOP_MODELS = [
  "Dell Inspiron 15",
  "HP Pavilion 15",
  "Lenovo IdeaPad Slim 3",
  "ASUS VivoBook 15",
  "Acer Aspire 5",
];

const LOCATIONS = ["Delhi", "Bangalore", "Mumbai"];

const RISK_PERCENTAGE = {
  Low: 20,
  Medium: 55,
  High: 85,
};

function App() {
  const [activeSection, setActiveSection] = useState("dashboard");

  const [form, setForm] = useState({
    Laptop_Model: "Dell Inspiron 15",
    Location: "Delhi",
    Current_Inventory: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const normalized = result || createEmptyResult();

  const forecastChartData = [
    {
      name: "Inventory",
      demand: normalized.forecastDemand,
      current: normalized.currentInventory,
      incoming: normalized.incomingSupply,
    },
  ];

  const inventoryChartData = [
    {
      name: "Inventory Action",
      replenishment: normalized.replenishment,
      surplus: normalized.surplus,
    },
  ];

  const actionType =
  normalized.inventoryStatus === "Shortage"
    ? "Replenish"
    : normalized.inventoryStatus === "Surplus"
    ? "Distribute"
    : "Maintain";

const actionRiskReduction =
  normalized.inventoryStatus === "Shortage"
    ? Math.min(
        25,
        normalized.replenishment * 0.5
      )
    : normalized.inventoryStatus === "Surplus"
    ? Math.min(
        15,
        normalized.surplus * 0.3
      )
    : 0;

const afterActionRisk = Math.max(
  0,
  normalized.currentRisk - actionRiskReduction
);

const riskBuildUp = Math.max(
  1,
  Math.round(normalized.currentRisk * 0.5)
);

const riskChartData = [
  {
    name: "Start",
    risk: 0,
  },
  {
    name: "Risk Build-up",
    risk: riskBuildUp,
  },
  {
    name: "Current Risk",
    risk: normalized.currentRisk,
  },
  {
    name: actionType,
    risk: Math.round(
      (normalized.currentRisk + afterActionRisk) / 2
    ),
  },
  {
    name: "After Action",
    risk: afterActionRisk,
  },
];

  const satisfactionChartData = [
    {
      name: "Previous",
      score: normalized.previousSatisfaction,
    },
    {
      name: "Current",
      score: normalized.currentSatisfaction,
    },
    {
      name: "After Action",
      score: normalized.afterActionSatisfaction,
    },
  ];

  const inventoryComposition = [
    {
      name: "Current Inventory",
      value: normalized.currentInventory,
    },
    {
      name: "Incoming Supply",
      value: normalized.incomingSupply,
    },
  ].filter((item) => item.value > 0);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);

    document
      .getElementById(sectionId)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  const handlePredict = async () => {
    setError("");

    if (!form.Laptop_Model || !form.Location) {
      setError("Please select a laptop model and location.");
      return;
    }

    const currentInventory = Number(form.Current_Inventory);

    if (
      form.Current_Inventory === "" ||
      !Number.isFinite(currentInventory) ||
      currentInventory < 0
    ) {
      setError("Please enter a valid current inventory.");
      return;
    }

    setLoading(true);

    try {
      // 1. Save the three dashboard inputs.
      const createResponse = await fetch(
        `${API_URL}/api/current-inventory`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Laptop_Model: form.Laptop_Model,
            Location: form.Location,
            Current_Inventory: currentInventory,
          }),
        }
      );

      const createdData = await parseJson(createResponse);

      if (!createResponse.ok || !createdData?.success) {
        throw new Error(
          createdData?.message ||
            "Failed to save current inventory."
        );
      }

      const inventoryId =
        createdData?.data?._id ||
        createdData?.data?.id ||
        createdData?._id ||
        createdData?.id;

      if (!inventoryId) {
        throw new Error(
          "Current inventory was saved, but no inventory ID was returned by the backend."
        );
      }

      // 2. Run the complete forecast + inventory + risk + satisfaction workflow.
      const predictionResponse = await fetch(
        `${API_URL}/api/current-inventory/predict/${inventoryId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const predictionData =
        await parseJson(predictionResponse);

      if (
        !predictionResponse.ok ||
        !predictionData?.success
      ) {
        throw new Error(
          predictionData?.message ||
            predictionData?.error ||
            "AI prediction failed."
        );
      }

      // 3. Normalize different possible backend response shapes.
   setResult(
  normalizePrediction(
    predictionData,
    Number(form.Current_Inventory)
  )
);
    } catch (err) {
      console.error("Prediction error:", err);

      setResult(null);

      setError(
        err?.message ||
          "Unable to connect to the Node.js backend."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">✦</div>

          <div>
            <h1>Predictive</h1>
            <span>Supply Chain AI</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={
              activeSection === "dashboard"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => scrollToSection("dashboard")}
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            className={
              activeSection === "forecasting"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => scrollToSection("forecasting")}
          >
            <span>↗</span>
            Forecasting
          </button>

          <button
            className={
              activeSection === "inventory"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => scrollToSection("inventory")}
          >
            <span>▣</span>
            Inventory Management
          </button>

          <button
            className={
              activeSection === "risk"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => scrollToSection("risk")}
          >
            <span>⚠</span>
            Late Order Risk
          </button>

          <button
            className={
              activeSection === "satisfaction"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => scrollToSection("satisfaction")}
          >
            <span>♡</span>
            Customer Satisfaction
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <span className="status-dot"></span>
            AI Engine Online
          </div>

          <small>Predictive Supply Chain AI</small>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              AI-POWERED INVENTORY INTELLIGENCE
            </p>
            <h2>Supply Chain Command Center</h2>
          </div>

          <div className="topbar-badge">
            <span className="status-dot"></span>
            Live Prediction
          </div>
        </header>

        {/* DASHBOARD */}
        <section
          id="dashboard"
          className="page-section dashboard-section"
        >
          <SectionHeading
            number="01"
            title="Dashboard"
            description="Select the laptop model, location and current inventory. The AI engine retrieves historical operational information and generates the remaining supply-chain predictions automatically."
          />

          <div className="prediction-panel">
            <div className="panel-header">
              <div>
                <span className="panel-label">
                  Prediction Input
                </span>
                <h3>Inventory Situation</h3>
              </div>

              <div className="ai-badge">AI MODEL</div>
            </div>

            <div className="input-grid">
              <InputField
                label="Laptop Model"
                name="Laptop_Model"
                type="select"
                value={form.Laptop_Model}
                options={LAPTOP_MODELS}
                onChange={handleInputChange}
              />

              <InputField
                label="Location"
                name="Location"
                type="select"
                value={form.Location}
                options={LOCATIONS}
                onChange={handleInputChange}
              />

              <InputField
                label="Current Inventory"
                name="Current_Inventory"
                type="number"
                value={form.Current_Inventory}
                placeholder="Enter units"
                onChange={handleInputChange}
              />
            </div>

            <div className="input-note">
              <span>ⓘ</span>
              Demand, incoming supply, supplier delay, orders and
              other operational variables are obtained from
              historical data and AI forecasting.
            </div>

            <div className="predict-row">
              <button
                className="predict-button"
                onClick={handlePredict}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loader"></span>
                    Generating Prediction...
                  </>
                ) : (
                  <>
                    Generate Prediction
                    <span>→</span>
                  </>
                )}
              </button>

              {result && (
                <div className="prediction-generated">
                  <span className="status-dot"></span>
                  Prediction generated successfully
                </div>
              )}
            </div>

            {error && (
              <div className="error-box">
                <strong>Prediction Error</strong>
                <span>{error}</span>
              </div>
            )}
          </div>

          {result && (
            <div className="quick-results">
              <MetricCard
                label="Forecast Demand"
                value={normalized.forecastDemand}
                unit="units"
                icon="↗"
              />

              <MetricCard
                label="Incoming Supply"
                value={normalized.incomingSupply}
                unit="units"
                icon="↓"
              />

              <MetricCard
                label="Inventory Status"
                value={normalized.inventoryStatus}
                icon="▣"
                status={normalized.inventoryStatus}
              />

              <MetricCard
                label="Late Order Risk"
                value={`${normalized.currentRisk}%`}
                icon="⚠"
                status={normalized.lateOrderRisk}
              />
            </div>
          )}
        </section>

        {/* FORECASTING */}
        <section
          id="forecasting"
          className="page-section"
        >
          <SectionHeading
            number="02"
            title="Forecasting"
            description="The forecasting engine estimates future demand and incoming supply using historical monthly patterns, lag features and rolling trends."
          />

          {!result ? (
            <EmptyState
              icon="↗"
              title="Forecasting data will appear here"
              text="Generate a prediction from the Dashboard to view forecasted demand and total inventory."
            />
          ) : (
            <>
              <div className="forecast-kpis">
                <div className="forecast-kpi">
                  <div className="kpi-icon">◈</div>
                  <div>
                    <span>Forecasted Demand</span>
                    <strong>{normalized.forecastDemand}</strong>
                    <small>units expected</small>
                  </div>
                </div>

                <div className="forecast-kpi">
                  <div className="kpi-icon">▣</div>
                  <div>
                    <span>Total Inventory</span>
                    <strong>{normalized.totalInventory}</strong>
                    <small>current + incoming supply</small>
                  </div>
                </div>

                <div className="forecast-kpi">
                  <div className="kpi-icon">◌</div>
                  <div>
                    <span>Supplier Delay</span>
                    <strong>{normalized.supplierDelay}</strong>
                    <small>days forecasted</small>
                  </div>
                </div>
              </div>

              <div className="chart-grid forecast-grid">
                <ChartCard
                  title="Demand vs Total Inventory"
                  description="Forecasted demand compared with current inventory and incoming supply."
                >
                 <ResponsiveContainer width="100%" height={310}>
  <BarChart data={forecastChartData}>
    <CartesianGrid
      strokeDasharray="3 3"
      stroke="#292929"
    />

    <XAxis
      dataKey="name"
      stroke="#858585"
    />

    <YAxis stroke="#858585" />

    <Tooltip
      contentStyle={{
        background: "#171717",
        border: "1px solid #343434",
        borderRadius: "10px",
        color: "#fff",
      }}
    />

    <Legend />

    {/* Forecast Demand */}
    <Bar
      dataKey="demand"
      name="Forecast Demand"
      fill="#c4d42d"
      radius={[8, 8, 0, 0]}
    />

    {/* Total Inventory Pool */}
    <Bar
      dataKey="current"
      name="Current Inventory"
      stackId="inventory"
      fill="#261183"
    />

    <Bar
      dataKey="incoming"
      name="Incoming Supply"
      stackId="inventory"
      fill="#121db1"
      radius={[8, 8, 0, 0]}
    />
  </BarChart>
</ResponsiveContainer>
                </ChartCard>

                <ChartCard
                  title="Total Inventory Composition"
                  description="Current inventory and forecasted incoming supply."
                >
                  {inventoryComposition.length > 0 ? (
                    <div className="pie-wrapper">
                      <ResponsiveContainer
                        width="100%"
                        height={280}
                      >
                        <PieChart>
                          <Pie
                            data={inventoryComposition}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={95}
                            innerRadius={55}
                            paddingAngle={4}
                          >
                            {inventoryComposition.map(
                              (_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    index === 0
                                      ? "#261183"
                                      : "#121db1"
                                  }
                                />
                              )
                            )}
                          </Pie>

                          <Tooltip
                            contentStyle={{
                              background: "#171717",
                              border: "1px solid #343434",
                              borderRadius: "10px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="pie-center">
                        <strong>
                          {normalized.totalInventory}
                        </strong>
                        <span>Total Units</span>
                      </div>

                      <div className="pie-legend">
                        <div>
                          <span className="legend-dot yellow"></span>
                          Current Inventory
                          <strong>
                            {normalized.currentInventory}
                          </strong>
                        </div>

                        <div>
                          <span className="legend-dot grey"></span>
                          Incoming Supply
                          <strong>
                            {normalized.incomingSupply}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <EmptyChart />
                  )}
                </ChartCard>
              </div>

              <div className="info-strip">
                <div className="info-icon">✦</div>
                <div>
                  <strong>AI Forecasting Engine</strong>
                  <p>
                    The system analyzes historical demand, supply
                    and supplier-delay patterns to estimate the
                    next planning period. Total inventory combines
                    your entered current inventory with forecasted
                    incoming supply.
                  </p>
                </div>
              </div>
            </>
          )}
        </section>

        {/* INVENTORY MANAGEMENT */}
        <section
          id="inventory"
          className="page-section"
        >
          <SectionHeading
            number="03"
            title="Inventory Management"
            description="The inventory engine compares forecasted requirements with available inventory and determines whether stock should be replenished, maintained or managed as surplus."
          />

          {!result ? (
            <EmptyState
              icon="▣"
              title="Inventory recommendation will appear here"
              text="Generate a prediction to calculate replenishment and surplus inventory."
            />
          ) : (
            <>
              <div className="inventory-summary">
                <div className="inventory-action-card">
                  <div className="action-top">
                    <span>Recommended Action</span>

                    <span
                      className={`action-status ${getActionClass(
                        normalized.inventoryStatus
                      )}`}
                    >
                      {normalized.inventoryStatus}
                    </span>
                  </div>

                  <h3>{normalized.recommendation}</h3>

                  <p>
                    Based on forecast demand of{" "}
                    <strong>
                      {normalized.forecastDemand} units
                    </strong>{" "}
                    and total available inventory of{" "}
                    <strong>
                      {normalized.totalInventory} units
                    </strong>
                    .
                  </p>
                </div>

                <div className="inventory-number-card">
                  <span>Replenishment</span>
                  <strong>{normalized.replenishment}</strong>
                  <small>units to add</small>
                </div>

                <div className="inventory-number-card">
                  <span>Surplus</span>
                  <strong>{normalized.surplus}</strong>
                  <small>units to manage</small>
                </div>
              </div>

              <div className="chart-grid">
                <ChartCard
  title="Demand vs Inventory Action"
  description={
    normalized.totalInventory < normalized.forecastDemand
      ? "Forecasted demand compared with total inventory and the additional replenishment required."
      : normalized.surplus > 0
      ? "Forecasted demand compared with total inventory and the surplus available to manage."
      : "Forecasted demand compared with available inventory."
  }
>
  <ResponsiveContainer width="100%" height={320}>
    <BarChart
  layout="vertical"
 data={[
  {
    name: "Demand",
    demand: normalized.forecastDemand,
    totalInventory: 0,
    action: 0,
  },
  {
    name:
      normalized.totalInventory < normalized.forecastDemand
        ? "Inventory + Replenishment"
        : "Total Inventory",

    demand: 0,

totalInventory:
  normalized.totalInventory < normalized.forecastDemand
    ? normalized.totalInventory
    : Math.min(
        normalized.totalInventory,
        normalized.forecastDemand
      ),

action:
  normalized.totalInventory < normalized.forecastDemand
    ? Math.max(
        0,
        normalized.forecastDemand -
          normalized.totalInventory
      )
    : Math.max(
        0,
        normalized.totalInventory -
          normalized.forecastDemand
      ),
  },
]}
  margin={{
    top: 15,
    right: 5,
    left: -15,
    bottom: 10,
  }}
  barCategoryGap="25%"
>
      <CartesianGrid
        strokeDasharray="3 3"
        stroke="#292929"
      />

     <XAxis
  type="number"
  stroke="#858585"
  tick={{ fontSize: 11 }}
/>

 <YAxis
  type="category"
  dataKey="name"
  stroke="#858585"
  width={105}
  tick={{
    fontSize: 11,
  }}
/>

      <Tooltip
        contentStyle={{
          background: "#171717",
          border: "1px solid #343434",
          borderRadius: "10px",
          color: "#ffffff",
        }}
     />

<Legend />

{/* Forecast Demand */}
<Bar
  dataKey="demand"
  name="Forecast Demand"
  fill="#f54242"
  barSize={45}
  radius={[0, 8, 8, 0]}
/>

{/* Inventory before action */}
<Bar
  dataKey="totalInventory"
  name={
    normalized.surplus > 0
      ? "Available Inventory"
      : "Total Inventory"
  }
  stackId="inventoryAction"
  fill="#2563EB"
  barSize={45}
/>

{/* Replenishment OR Surplus */}
<Bar
  dataKey="action"
  name={
    normalized.totalInventory < normalized.forecastDemand
      ? "Replenishment"
      : normalized.surplus > 0
      ? "Surplus"
      : "Action"
  }
  stackId="inventoryAction"
  fill={
    normalized.totalInventory < normalized.forecastDemand
      ? "#22C55E"
      : "#A855F7"
  }
  barSize={45}
  radius={[0, 8, 8, 0]}
/>
</BarChart>
</ResponsiveContainer>
</ChartCard>

                <div className="management-card">
                  <div className="management-icon">✦</div>

                  <span className="panel-label">
                    Inventory Intelligence
                  </span>

                  <h3>
                    {getManagementTitle(
                      normalized.inventoryStatus
                    )}
                  </h3>

                  <p>
                    {getManagementDescription(
                      normalized.inventoryStatus,
                      normalized.replenishment,
                      normalized.surplus
                    )}
                  </p>

                  <div className="management-details">
                    <div>
                      <span>Current</span>
                      <strong>
                        {normalized.currentInventory}
                      </strong>
                    </div>

                    <div>
                      <span>Incoming</span>
                      <strong>
                        {normalized.incomingSupply}
                      </strong>
                    </div>

                    <div>
                      <span>Demand</span>
                      <strong>
                        {normalized.forecastDemand}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        {/* LATE ORDER RISK */}
        <section id="risk" className="page-section">
          <SectionHeading
            number="04"
            title="Late Order Risk"
            description="The AI risk model evaluates demand pressure, supplier delay, inventory availability and order conditions to identify the current late-order risk."
          />

          {!result ? (
            <EmptyState
              icon="⚠"
              title="Late order risk will appear here"
              text="Generate a prediction to analyze operational risk."
            />
          ) : (
            <>
              <div className="risk-header-card">
                <div className="risk-score">
                  <span>Current Risk</span>

                  <strong>{normalized.currentRisk}%</strong>

                  <small>
                    {normalized.lateOrderRisk} Risk
                  </small>
                </div>

                <div className="risk-meter">
                  <div className="meter-track">
                    <div
                      className={`meter-fill ${getRiskClass(
                        normalized.lateOrderRisk
                      )}`}
                      style={{
                        width: `${normalized.currentRisk}%`,
                      }}
                    ></div>
                  </div>

                  <div className="meter-labels">
                    <span>Low</span>
                    <span>Medium</span>
                    <span>High</span>
                  </div>
                </div>

                <div className="risk-message">
                  <span className="panel-label">
                    Risk Assessment
                  </span>

                  <h3>
                    {getRiskMessage(
                      normalized.lateOrderRisk
                    )}
                  </h3>

                  <p>
                    The model considers inventory availability,
                    forecast demand and supplier conditions.
                  </p>
                </div>
              </div>

              <div className="chart-grid risk-grid">
                <ChartCard
                 title="Risk Build-up & Action Impact"
description="Late-order risk increases under operational pressure and decreases after the recommended inventory action."
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={riskChartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#292929"
                      />
                      <XAxis
                        dataKey="name"
                        stroke="#858585"
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke="#858585"
                      />
                      <Tooltip
                        formatter={(value) => [
                          `${value}%`,
                          "Risk",
                        ]}
                        contentStyle={{
                          background: "#171717",
                          border: "1px solid #343434",
                          borderRadius: "10px",
                        }}
                      />

                      <Line
                        type="monotone"
                        dataKey="risk"
                        name="Late Order Risk"
                        stroke="#f5c542"
                        strokeWidth={3}
                        dot={{
                          r: 5,
                          fill: "#f5c542",
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                <div className="risk-factors-card">
                  <span className="panel-label">
                    Risk Contributors
                  </span>

                  <h3>What affects the risk?</h3>

                  <RiskFactor
                    title="Supplier Delay"
                    value={`${normalized.supplierDelay} days`}
                    level={getFactorLevel(
                      normalized.supplierDelay,
                      2,
                      4
                    )}
                  />

                  <RiskFactor
                    title="Inventory Shipment Time"
                    value={`${normalized.supplierLeadTime} days`}
                    level={getFactorLevel(
                      normalized.supplierLeadTime,
                      3,
                      6
                    )}
                  />

                  <RiskFactor
                    title="Forecast Demand"
                    value={`${normalized.forecastDemand} units`}
                    level={
                      normalized.forecastDemand >
                      normalized.totalInventory
                        ? "High"
                        : "Low"
                    }
                  />

                  <RiskFactor
                    title="Inventory Coverage"
                    value={`${normalized.totalInventory} units`}
                    level={
                      normalized.totalInventory <
                      normalized.forecastDemand
                        ? "High"
                        : "Low"
                    }
                  />
                </div>
              </div>

              <div className="small-disclaimer">
                <span>ⓘ</span>
                Risk percentage uses the backend probability when
                available. If the backend only returns Low,
                Medium or High, the interface uses a display-band
                fallback.
              </div>
            </>
          )}
        </section>

        {/* CUSTOMER SATISFACTION */}
        <section
          id="satisfaction"
          className="page-section last-section"
        >
          <SectionHeading
            number="05"
            title="Customer Satisfaction"
            description="Customer satisfaction is estimated from inventory availability, order delays, late orders and other operational conditions."
          />

          {!result ? (
            <EmptyState
              icon="♡"
              title="Customer satisfaction will appear here"
              text="Generate a prediction to see the current satisfaction report."
            />
          ) : (
            <>
              <div className="satisfaction-header">
                <div className="satisfaction-score-card">
                  <span>Current Satisfaction</span>

                  <strong>
                    {normalized.currentSatisfaction}
                  </strong>

                  <small>out of 100</small>
                </div>

                <div className="satisfaction-change">
                  <span className="panel-label">
                    Customer Experience
                  </span>

                  <h3>
                    {getSatisfactionMessage(
                      normalized.currentSatisfaction
                    )}
                  </h3>

                  <p>
                    Inventory decisions directly influence product
                    availability and order fulfillment conditions.
                  </p>
                </div>
              </div>

              <div className="chart-grid satisfaction-grid">
                <ChartCard
                  title="Customer Satisfaction Trend"
                  description="Previous, current and estimated after-action satisfaction."
                >
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={satisfactionChartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#292929"
                      />
                      <XAxis
                        dataKey="name"
                        stroke="#858585"
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke="#858585"
                      />
                      <Tooltip
                        formatter={(value) => [
                          `${value}/100`,
                          "Satisfaction",
                        ]}
                        contentStyle={{
                          background: "#171717",
                          border: "1px solid #343434",
                          borderRadius: "10px",
                        }}
                      />
                      <Legend />

                      <Bar
                        dataKey="score"
                        name="Satisfaction Score"
                        fill="#f5c542"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <div className="satisfaction-impact">
                  <span className="panel-label">
                    Inventory Action Impact
                  </span>

                  <h3>Before vs After Management</h3>

                  <div className="impact-row">
                    <div>
                      <span>Previous</span>
                      <strong>
                        {normalized.previousSatisfaction}
                      </strong>
                    </div>

                    <div className="impact-arrow">→</div>

                    <div>
                      <span>Current</span>
                      <strong>
                        {normalized.currentSatisfaction}
                      </strong>
                    </div>

                    <div className="impact-arrow">→</div>

                    <div>
                      <span>After Action</span>
                      <strong>
                        {normalized.afterActionSatisfaction}
                      </strong>
                    </div>
                  </div>

                  <div className="impact-message">
                    <span>✦</span>

                    <p>
                      {getActionImpactMessage(normalized)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="info-strip">
                <div className="info-icon">♡</div>

                <div>
                  <strong>Customer Satisfaction Report</strong>

                  <p>
                    The system uses operational conditions to estimate
                    customer satisfaction. The “After Action” value
                    is shown as a scenario estimate when the backend
                    does not return a separate after-action prediction.
                  </p>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

/* ========================= COMPONENTS ========================= */

function SectionHeading({ number, title, description }) {
  return (
    <div className="section-heading">
      <div className="section-number">{number}</div>

      <div>
        <p className="eyebrow">SUPPLY CHAIN ANALYSIS</p>
        <h2>{title}</h2>
        <p className="section-description">
          {description}
        </p>
      </div>
    </div>
  );
}

function InputField({
  label,
  name,
  type,
  value,
  options,
  placeholder,
  onChange,
}) {
  return (
    <div className="input-group">
      <label htmlFor={name}>{label}</label>

      {type === "select" ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          min="0"
          onChange={onChange}
        />
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  icon,
  status,
}) {
  return (
    <div className="metric-card">
      <div className="metric-icon">{icon}</div>

      <div>
        <span>{label}</span>

        <strong className={statusClass(status)}>
          {value}
          {unit && (
            <small className="metric-unit">
              {" "}
              {unit}
            </small>
          )}
        </strong>
      </div>
    </div>
  );
}

function ChartCard({ title, description, children }) {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      <div className="chart-body">{children}</div>
    </div>
  );
}

function RiskFactor({ title, value, level }) {
  return (
    <div className="risk-factor">
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
      </div>

      <span
        className={`factor-level ${level.toLowerCase()}`}
      >
        {level}
      </span>
    </div>
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="empty-chart">
      No inventory data available
    </div>
  );
}

/* ========================= NORMALIZATION ========================= */

function normalizePrediction(data, inputCurrentInventory) {
  const prediction =
    data?.prediction ||
    data?.ml_prediction ||
    data?.result ||
    data;

  const forecast =
    data?.forecast ||
    prediction?.forecast ||
    data?.forecast_result ||
    {};

const currentInventory = Number(inputCurrentInventory);

const safeCurrentInventory = Number.isFinite(currentInventory)
  ? currentInventory
  : 0;

const forecastDemand = Number(
  data?.forecasted_demand ??
    data?.predicted_demand ??
    forecast?.predicted_demand ??
    prediction?.forecasted_demand ??
    prediction?.predicted_demand ??
    0
);

const incomingSupply = Number(
  data?.forecast?.predicted_incoming_supply ??
    data?.forecast_result?.predicted_incoming_supply ??
    data?.predicted_incoming_supply ??
    prediction?.forecast?.predicted_incoming_supply ??
    prediction?.forecast_result?.predicted_incoming_supply ??
    prediction?.predicted_incoming_supply ??
    0
);

  const supplierDelay = Number(
    data?.predicted_supplier_delay ??
      forecast?.predicted_supplier_delay ??
      prediction?.predicted_supplier_delay ??
      data?.supplier_delay ??
      0
  );

  const supplierLeadTime = Number(
    data?.supplier_lead_time ??
      prediction?.supplier_lead_time ??
      data?.Supplier_Lead_Time ??
      prediction?.Supplier_Lead_Time ??
      4
  );

  const inventoryStatus =
    data?.inventory_status ??
    prediction?.inventory_status ??
    "Healthy";

  const replenishment = Number(
    data?.predicted_replenishment ??
      data?.predicted_replenishment_units ??
      data?.replenishment ??
      prediction?.predicted_replenishment ??
      prediction?.predicted_replenishment_units ??
      prediction?.replenishment ??
      0
  );

  const surplus = Number(
    data?.predicted_surplus ??
      data?.surplus ??
      prediction?.predicted_surplus ??
      prediction?.surplus ??
      0
  );

  const lateOrderRisk =
    data?.late_order_risk ??
    prediction?.late_order_risk ??
    "Low";

  const probability =
    data?.late_order_risk_probability ??
    prediction?.late_order_risk_probability ??
    data?.risk_probability ??
    prediction?.risk_probability;

  const currentRisk =
    probability !== undefined
      ? Number(probability)
      : RISK_PERCENTAGE[lateOrderRisk] || 20;

  const previousRisk = Number(
  data?.previous_risk ??
    data?.previous_late_order_risk_percentage ??
    prediction?.previous_risk ??
    (RISK_PERCENTAGE[lateOrderRisk] || 20)
);

  const currentSatisfaction = Number(
    data?.predicted_customer_satisfaction ??
      data?.customer_satisfaction ??
      prediction?.predicted_customer_satisfaction ??
      prediction?.customer_satisfaction ??
      0
  );

  const previousSatisfaction = Number(
    data?.previous_customer_satisfaction ??
      prediction?.previous_customer_satisfaction ??
      currentSatisfaction
  );

  const afterActionSatisfaction = Number(
    data?.after_action_customer_satisfaction ??
      data?.estimated_after_action_satisfaction ??
      prediction?.after_action_customer_satisfaction ??
      prediction?.estimated_after_action_satisfaction ??
      calculateAfterActionSatisfaction(
        currentSatisfaction,
        inventoryStatus,
        replenishment
      )
  );

  const totalInventory =
  safeCurrentInventory + incomingSupply;

  const recommendation =
    data?.recommendation ??
    prediction?.recommendation ??
    getRecommendation(
      inventoryStatus,
      replenishment,
      surplus
    );

  return {
    currentInventory: safeCurrentInventory,
    forecastDemand,
    incomingSupply,
    totalInventory,
    supplierDelay,
    supplierLeadTime,
    inventoryStatus,
    replenishment,
    surplus,
    lateOrderRisk,
    currentRisk: clamp(currentRisk, 0, 100),
    previousRisk: clamp(previousRisk, 0, 100),
    currentSatisfaction: clamp(
      currentSatisfaction,
      0,
      100
    ),
    previousSatisfaction: clamp(
      previousSatisfaction,
      0,
      100
    ),
    afterActionSatisfaction: clamp(
      afterActionSatisfaction,
      0,
      100
    ),
    recommendation,
  };
}

function createEmptyResult() {
  return {
    currentInventory: 0,
    forecastDemand: 0,
    incomingSupply: 0,
    totalInventory: 0,
    supplierDelay: 0,
    supplierLeadTime: 0,
    inventoryStatus: "Healthy",
    replenishment: 0,
    surplus: 0,
    lateOrderRisk: "Low",
    currentRisk: 0,
    previousRisk: 0,
    currentSatisfaction: 0,
    previousSatisfaction: 0,
    afterActionSatisfaction: 0,
    recommendation: "Maintain current inventory",
  };
}

/* ========================= HELPERS ========================= */

async function parseJson(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Backend returned an invalid response (${response.status}).`
    );
  }
}

function getRecommendation(
  status,
  replenishment,
  surplus
) {
  if (status === "Shortage") {
    return `Replenish ${replenishment} units`;
  }

  if (status === "Surplus") {
    return `Manage surplus of ${surplus} units`;
  }

  return "Maintain current inventory";
}

function getManagementTitle(status) {
  if (status === "Shortage") {
    return "Inventory replenishment required";
  }

  if (status === "Surplus") {
    return "Surplus inventory detected";
  }

  return "Inventory is currently balanced";
}

function getManagementDescription(
  status,
  replenishment,
  surplus
) {
  if (status === "Shortage") {
    return `The forecast indicates that additional inventory is required. The system recommends adding ${replenishment} units to improve inventory coverage.`;
  }

  if (status === "Surplus") {
    return `Available inventory is higher than the forecast requirement. The system has identified ${surplus} surplus units that can be redistributed or managed.`;
  }

  return "Current inventory is aligned with the forecast requirement. No additional replenishment is recommended.";
}

function getRiskMessage(risk) {
  if (risk === "High") {
    return "Immediate operational attention required";
  }

  if (risk === "Medium") {
    return "Monitor supply and fulfillment conditions";
  }

  return "Current operational risk is relatively low";
}

function getSatisfactionMessage(score) {
  if (score >= 80) {
    return "Customer experience is currently strong";
  }

  if (score >= 60) {
    return "Customer experience has room for improvement";
  }

  return "Customer experience requires attention";
}

function getActionImpactMessage(result) {
  if (result.inventoryStatus === "Shortage") {
    return `The recommended replenishment of ${result.replenishment} units is intended to improve inventory availability and reduce conditions that can lead to delayed customer orders.`;
  }

  if (result.inventoryStatus === "Surplus") {
    return `Managing ${result.surplus} surplus units can improve inventory efficiency while maintaining product availability.`;
  }

  return "Maintaining the current inventory position avoids unnecessary inventory changes.";
}

function calculateAfterActionSatisfaction(
  satisfaction,
  status,
  replenishment
) {
  if (!satisfaction) {
    return 0;
  }

  if (status === "Shortage") {
    return Math.min(
      100,
      satisfaction +
        Math.min(10, replenishment / 20)
    );
  }

  if (status === "Surplus") {
    return Math.min(100, satisfaction + 2);
  }

  return satisfaction;
}

function getActionClass(status) {
  if (status === "Shortage") {
    return "shortage";
  }

  if (status === "Surplus") {
    return "surplus";
  }

  return "healthy";
}

function getRiskClass(risk) {
  if (risk === "High") {
    return "high";
  }

  if (risk === "Medium") {
    return "medium";
  }

  return "low";
}

function getFactorLevel(
  value,
  lowThreshold,
  highThreshold
) {
  if (value >= highThreshold) {
    return "High";
  }

  if (value > lowThreshold) {
    return "Medium";
  }

  return "Low";
}

function statusClass(status) {
  if (!status) {
    return "";
  }

  return status.toLowerCase();
}

function clamp(value, min, max) {
  return Math.min(
    Math.max(Number(value) || 0, min),
    max
  );
}

export default App;
