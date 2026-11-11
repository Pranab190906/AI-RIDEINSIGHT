# RIDEINSIGHT AI 2.0
### AI-Powered Ride-Hailing Performance Optimization and Decision Intelligence Platform

![RideInsight AI 2.0 Banner](https://img.shields.io/badge/Platform-RideInsight%20AI%202.0-06B6D4?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.13-3B82F6?style=for-the-badge)
![React](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite%20%7C%20TypeScript-10B981?style=for-the-badge)
![ML](https://img.shields.io/badge/Machine%20Learning-Scikit--Learn%20%7C%20SHAP-8B5CF6?style=for-the-badge)
![Tests](https://img.shields.io/badge/Tests-14%2F14%20Passing-emerald?style=for-the-badge)

---

## 1. Executive Summary

**RideInsight AI 2.0** is an enterprise-grade mobility analytics and decision-support platform designed to diagnose, predict, and reduce booking failure friction in ride-hailing networks. By analyzing 103,024 real-world Bengaluru ride requests from July 2024, the platform answers critical operational questions:

1. **How many bookings succeed versus fail?** (63,967 Successful [62.09%], 18,434 Canceled by Driver, 10,499 Canceled by Customer, 10,124 Driver Not Found).
2. **What operational patterns characterize cancellations?** (Fleet tiers, pickup hotspots, rush-hour windows, and fare sensitivities).
3. **Can machine learning anticipate cancellation risk before dispatch?** Yes, evaluated across 4 algorithms on strictly pre-booking parameters.
4. **Why did the model assign a specific cancellation risk?** Game-theoretic feature attributions via **SHAP** (SHapley Additive exPlanations).
5. **How many completed rides will occur in future periods?** Chronologically validated Holt Exponential Smoothing daily projections.
6. **What is the revenue gain if cancellation rates drop?** Interactive What-If simulation with custom fleet rebalancing scenarios.
7. **What actions should operations take?** Automated evidence-based recommendations grounded in empirical data.

---

## 2. Technology Stack & Architecture

```
rideinsight-ai/
│
├── frontend/                     # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/           # Sidebar, Header, StatCard
│   │   ├── pages/                # 11 Dedicated Pages
│   │   ├── services/             # Typed API client
│   │   ├── types/                # Strict TypeScript interfaces
│   │   ├── App.tsx               # Client-side router
│   │   └── main.tsx              # Application entrypoint
│   ├── package.json
│   └── vite.config.ts            # Proxy to http://127.0.0.1:8000
│
├── backend/                      # FastAPI + Scikit-Learn + SHAP + SQLAlchemy
│   ├── app/
│   │   ├── api/                  # RESTful Routers (/data, /analysis, /models, etc.)
│   │   ├── core/                 # App configuration & settings
│   │   ├── data/                 # Ingestion, DataProcessor, FingerprintAnalyzer
│   │   ├── database/             # SQLite session & SQLAlchemy ORM models
│   │   ├── explainability/       # Tree & Linear SHAP explainer
│   │   ├── forecasting/          # Holt ES time-series & What-If simulator
│   │   ├── insights/             # Evidence-based recommendation engine
│   │   ├── ml/                   # ModelTrainer, 4 algorithms, Scikit-learn pipelines
│   │   ├── schemas/              # Pydantic validation schemas
│   │   └── main.py               # FastAPI application with lifespan management
│   ├── models/                   # Serialized joblib pipelines & comparison metadata
│   ├── requirements.txt          # Python dependencies
│   └── .env.example
│
├── data/                         # Bookings.csv (103,024 records)
├── exports/                      # Generated CSV exports
├── tests/                        # Pytest suite (14 automated tests)
└── README.md
```

### Stack Highlights:
- **Frontend**: React 19, Vite 8, TypeScript 7, Tailwind CSS v4, Recharts, Lucide React, React Router 7.
- **Backend**: Python 3.13, FastAPI, Pandas, NumPy, Scikit-learn, SHAP, Joblib, SQLAlchemy ORM.
- **Storage**: SQLite persistent store for inference logging, model metadata, and what-if scenarios.

---

## 3. Dataset Characteristics (Bookings.csv)

The system is tested against the primary dataset `Bookings.csv`:
- **Total Records**: 103,024 rows
- **Columns**: 21 original columns
- **Date Range**: July 1 to July 31, 2024 (Bengaluru, India)
- **Status Distribution**:
  - `Success`: 63,967 (62.09%)
  - `Canceled by Driver`: 18,434 (17.89%)
  - `Canceled by Customer`: 10,499 (10.19%)
  - `Driver Not Found`: 10,124 (9.83%)
- **Vehicle Types**: Prime Sedan, eBike, Auto, Prime Plus, Bike, Prime SUV, Mini
- **Mean Booking Value**: ₹439.50

---

## 4. Anti-Target Leakage & Preprocessing Protocol

### Excluded Leaked Features:
To ensure the machine learning pipeline is strictly deployable at the moment of ride request, the following attributes are **strictly excluded**:

| Feature | Category | Rationale |
| :--- | :--- | :--- |
| `Ride_Distance` | Target Leakage | Strictly 0 for cancelled trips; >0 only for completed trips. |
| `Booking_Status` | Target Variable | Ground truth outcome. |
| `Booking_ID`, `Customer_ID` | Identifiers | Non-generalizable unique IDs; prevents overfitting. |
| `Canceled_Rides_by_Driver` | Post-Outcome | Contains driver cancellation reason logged post-cancellation. |
| `Canceled_Rides_by_Customer` | Post-Outcome | Contains customer cancellation reason logged post-cancellation. |
| `Incomplete_Rides` / Reason | Post-Dispatch | Only recorded if a trip is aborted mid-journey. |
| `Payment_Method` | Post-Trip | Recorded only upon settlement; missing for 100% of cancellations. |
| `Driver_Ratings` / `Customer_Rating` | Post-Trip | Reviews submitted after trip completion. |
| `V_TAT` / `C_TAT` | Post-Dispatch | Vehicle and customer turnaround time only exist after assignment. |
| `Vehicle Images`, `Unnamed: 20` | Artifacts | Malformed formulas and trailing commas. |

### Included Pre-Booking Features (8):
- `Vehicle_Type`: Category requested.
- `Pickup_Location`: Origin zone.
- `Drop_Location`: Destination zone.
- `Booking_Value`: Estimated upfront fare (₹).
- `Booking_Hour`: Hour of request (0–23).
- `Booking_Minute`: Minute of request (0–59).
- `Day_Of_Week`: Day name (Monday–Sunday).
- `Is_Weekend`: Binary flag (0 or 1).

### Binary Classification Formulation:
- **Class 0 (Success)**: 63,967 completed rides.
- **Class 1 (Cancelled)**: 28,933 cancellations (Driver + Customer).
- **Driver Not Found (10,124)**: Kept separate as a pre-assignment supply exhaustion event rather than an assigned dispatch cancellation.
- **Baseline Cancellation Rate**: `28,933 / (63,967 + 28,933) = 31.14%`.

---

## 5. Machine Learning Suite

The Model Lab benchmarks four distinct algorithms on identical test sets:
1. **Logistic Regression** (Linear baseline with StandardScaler)
2. **Decision Tree** (Non-linear rule partitioner)
3. **Random Forest** (Ensemble bagging classifier, `n_estimators=50`)
4. **Gradient Boosting** (Sequential gradient boosting, `n_estimators=50`, learning rate 0.1)

### Evaluation Features:
- **Random Stratified Split** vs. **Chronological Time-Ordered Split**.
- **Metrics Tracked**: Accuracy, Precision, Recall, F1-Score, ROC-AUC, Training Latency.
- **Confusion Matrix**: Full breakdown of TN, FP, FN, TP.
- **Model Selection Justification**: Recommends the model maximizing the harmonic balance (F1-score & ROC-AUC) to minimize false-positive driver reallocations.

---

## 6. Installation & Execution Guide (Windows 11)

### Quick Start (One-Click Launcher)
In PowerShell from the project root:
```powershell
cd c:\Users\prajw\Downloads\ride
.\start_all.ps1
```
This automatically launches both the **FastAPI Backend** (`http://127.0.0.1:8000`) and the **React Frontend** (`http://localhost:5173`) in their own dedicated windows.

---

### Manual Launch (Two Terminals)

### Terminal 1: Backend Setup & Execution
Open PowerShell in the project directory:
```powershell
# Navigate to workspace
cd c:\Users\prajw\Downloads\ride

# Activate Python virtual environment
.\backend\venv\Scripts\Activate.ps1

# Install dependencies (if not already installed)
pip install -r .\backend\requirements.txt

# Run backend API server (Option 1 - Easiest):
python run_backend.py

# OR (Option 2 - Directly with uvicorn):
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# OR (Option 3 - From backend directory):
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The FastAPI backend will start at: `http://127.0.0.1:8000`  
Swagger API Docs available at: `http://127.0.0.1:8000/docs`


### Terminal 2: Frontend Setup & Execution
Open a second PowerShell window:
```powershell
# Navigate to frontend directory
cd c:\Users\prajw\Downloads\ride\frontend

# Install dependencies (if not already installed)
npm install

# Start Vite development server
npm run dev
```
Open your browser at: `http://localhost:5173`

---

## 7. Running Automated Test Suite

To verify all 14 end-to-end integration tests:
```powershell
cd c:\Users\prajw\Downloads\ride
.\backend\venv\Scripts\pytest.exe -v tests/test_backend.py
```
**Test Coverage**:
- Dataset ingestion & UTF-8-BOM handling
- Data quality & missing value calculations
- Target leakage audit exclusions
- Cancellation fingerprint math & analytical score
- Machine learning pipeline training & inference
- SHAP global feature importances & local attributions
- Holt exponential smoothing daily forecasting
- What-If scenario simulations
- SQLite monitoring & ground-truth outcome logging

---

## 8. REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health status and dataset state |
| `POST` | `/api/data/upload` | Upload and validate new CSV |
| `GET` | `/api/data/summary` | Overall dataset metrics |
| `GET` | `/api/data/quality` | Missing values and duplicate inspection |
| `GET` | `/api/data/leakage-audit` | Pre-booking feature inclusion/exclusion audit |
| `GET` | `/api/data/export` | Download dataset summary CSV |
| `GET` | `/api/analysis/overview` | Executive daily trends and status breakdowns |
| `GET` | `/api/analysis/fingerprint` | Segment cancellation rates and friction scores |
| `POST` | `/api/models/train` | Train and evaluate the 4 ML models |
| `GET` | `/api/models/compare` | Fetch side-by-side benchmark comparison |
| `POST` | `/api/models/predict` | Real-time cancellation risk inference |
| `POST` | `/api/models/select-active` | Switch active deployed model |
| `GET` | `/api/explain/shap-global` | Global SHAP feature importance rankings |
| `POST` | `/api/explain/shap-local` | Individual booking SHAP contribution breakdown |
| `GET` | `/api/forecast/daily` | Daily demand forecast with horizon selector |
| `POST` | `/api/scenarios/simulate` | What-If operational reduction simulation |
| `GET` | `/api/scenarios/list` | List saved scenarios |
| `GET` | `/api/insights/recommendations` | Evidence-based actionable recommendations |
| `GET` | `/api/monitoring/summary` | Real-time prediction logs & accuracy |
| `POST` | `/api/monitoring/record-outcome` | Submit ground-truth ride outcome |

---

## 9. Academic & Technical Disclosures

1. **Correlation vs. Causation**: High cancellation rates observed in particular pickup hubs (e.g. Tumkur Road) reflect operational correlation with traffic bottlenecks, accessibility, or driver supply deficits, not direct vehicle/passenger causality.
2. **Time-Series Horizon Limitation**: With 31 days of historical data (July 2024), long-range annual seasonal decomposition cannot be mathematically confirmed. The Holt Exponential Smoothing model is intended as a validated short-horizon pacing tool (7–30 days).
3. **What-If Simulations**: Scenario projections operate under the analytical assumption of demand volume stability. Operational interventions should be validated via randomized A/B pilot tests.

---
**RideInsight AI 2.0** • Mobility Intelligence & Performance Optimization
