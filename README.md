# RIDEINSIGHT AI 2.0
### AI-Powered Ride-Hailing Performance Optimization and Decision Intelligence Platform

![RideInsight AI 2.0 Banner](https://img.shields.io/badge/Platform-RideInsight%20AI%202.0-06B6D4?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11%2F3.13-3B82F6?style=for-the-badge)
![React](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite%20%7C%20TypeScript-10B981?style=for-the-badge)
![ML](https://img.shields.io/badge/Machine%20Learning-Scikit--Learn%20%7C%20SHAP-8B5CF6?style=for-the-badge)
![Tests](https://img.shields.io/badge/Tests-17%2F17%20Passing-emerald?style=for-the-badge)
![Deployment](https://img.shields.io/badge/Deployment-Render%20%2B%20Vercel%20Ready-success?style=for-the-badge)

---

## 1. Executive Summary

**RideInsight AI 2.0** is an enterprise-grade mobility analytics, machine learning, and decision-support platform designed to diagnose, predict, and reduce booking failure friction in ride-hailing networks.

The application answers critical operational questions:
1. **How many bookings succeed versus fail?** (63,967 Successful [62.09%], 18,434 Canceled by Driver, 10,499 Canceled by Customer, 10,124 Driver Not Found in default dataset).
2. **What operational patterns characterize cancellations?** (Fleet tiers, pickup hotspots, rush-hour windows, and fare sensitivities).
3. **Can users upload custom datasets?** Yes, via an interactive CSV drag-and-drop system with dynamic column mapping, transparent quality scoring, and dataset switching.
4. **Can machine learning anticipate cancellation risk before dispatch?** Yes, evaluated across 4 algorithms (Logistic Regression, Decision Tree, Random Forest, Gradient Boosting) on strictly pre-booking parameters.
5. **Why did the model assign a specific cancellation risk?** Game-theoretic feature attributions via **SHAP** (SHapley Additive exPlanations).
6. **How many completed rides will occur in future periods?** Chronologically validated Holt Exponential Smoothing daily projections.
7. **What is the revenue gain if cancellation rates drop?** Interactive What-If simulation with custom fleet rebalancing scenarios.
8. **What actions should operations take?** Automated evidence-based recommendations grounded in empirical data.

---

## 2. Technology Stack & Architecture

```
RideInsight/
├── app/                          # Root proxy package for seamless root & Render execution
│   ├── __init__.py
│   └── main.py                   # Re-exports backend.app.main:app
│
├── frontend/                     # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/           # Header (with real-time API health & active dataset), Sidebar, StatCard
│   │   ├── pages/                # 11 Dedicated Operational Modules
│   │   ├── services/             # Typed API client with VITE_API_URL & timeout guards
│   │   ├── types/                # Strict TypeScript interfaces
│   │   ├── App.tsx               # Client-side router & global state
│   │   └── main.tsx              # Application entrypoint
│   ├── .env.example              # VITE_API_URL configuration guide
│   ├── vercel.json               # SPA route rewrite configuration
│   ├── package.json
│   └── vite.config.ts            # Local development proxy to http://127.0.0.1:8000
│
├── backend/                      # FastAPI + Scikit-Learn + SHAP + SQLAlchemy
│   ├── app/
│   │   ├── api/                  # RESTful Routers (/data, /analysis, /models, /explain, etc.)
│   │   ├── core/                 # App configuration (HOST, PORT, CORS)
│   │   ├── data/                 # Dynamic DataProcessor, Dataset Registry, FingerprintAnalyzer
│   │   ├── database/             # SQLite session & SQLAlchemy ORM models
│   │   ├── explainability/       # Tree & Linear SHAP explainer with domain mapping
│   │   ├── forecasting/          # Holt ES time-series & What-If simulator
│   │   ├── insights/             # Evidence-based recommendation engine
│   │   ├── ml/                   # ModelTrainer (4 algorithms, Scikit-learn pipelines)
│   │   ├── schemas/              # Pydantic validation schemas
│   │   └── main.py               # FastAPI application with lifespan management
│   ├── models/                   # Serialized joblib pipelines & comparison metadata
│   ├── requirements.txt          # Python dependencies
│   └── rideinsight.db            # SQLite persistent database
│
├── data/                         # Bookings.csv (103,024 benchmark records)
│   └── uploads/                  # User-uploaded custom datasets
├── exports/                      # Generated CSV exports
├── tests/                        # Pytest suite (17 automated tests)
├── render.yaml                   # Infrastructure-as-Code Render Web Service blueprint
├── run_backend.py                # Cross-platform Python launcher
├── start_all.ps1                 # One-click Windows PowerShell dual launcher
└── README.md
```

---

## 3. Dynamic Dataset Upload & Management System

Users can analyze their own ride-hailing datasets without being restricted to default data:

### Upload Features:
- **Drag-and-Drop Dropzone**: Select or drag `.csv` files up to 100MB directly on the Executive Overview.
- **Upload Progress & Validation**: Real-time progress bar, extension checking, and path sanitation.
- **Configurable Column Mapping**: If your CSV uses different column names (e.g. `status`, `car_type`, `fare`, `origin`, `dest`), map them in the Column Mapping modal to canonical concepts:
  - Outcome / Cancellation Target (`target_column`)
  - Vehicle Category (`vehicle_type_column`)
  - Pickup Location (`pickup_location_column`)
  - Drop Location (`drop_location_column`)
  - Estimated Fare (`booking_value_column`)
  - Booking Date (`date_column`)
  - Booking Time (`time_column`)
- **Transparent Data Quality Scorecard**:
  Scores dataset from 0 to 100 with clear formula breakdown:
  ```
  Score = 100 - min(30, Missing_Cell_% × 2) - min(25, Duplicate_% × 5) - min(15, Constant_Cols × 5) - Target_Penalty(15) - Temporal_Penalty(10)
  ```
- **Dataset Registry & Switcher**: Easily switch between uploaded datasets and `Bookings.csv` with a single click. Downstream ML models, time-series, and fingerprints refresh dynamically!

---

## 4. Machine Learning & Anti-Leakage Protocol

### Evaluated Algorithms:
1. **Logistic Regression** (L2 Regularized, dual probability calibration)
2. **Decision Tree** (Constrained depth, min split 20 to prevent overfitting)
3. **Random Forest** (Ensemble of 50 trees, max depth 10)
4. **Gradient Boosting** (50 estimators, learning rate 0.1, depth 4)

### Anti-Target Leakage Guarantee:
Features strictly restricted to information available at the exact instant a ride request is initiated:

| Included Feature | Prediction Time Availability |
| :--- | :--- |
| `Vehicle_Type` | Selected by customer during request |
| `Pickup_Location` | GPS pickup pin at request creation |
| `Drop_Location` | Destination pin entered by customer |
| `Booking_Value` | Quoted base fare displayed before confirmation |
| `Booking_Hour` & `Minute` | System timestamp when request is submitted |
| `Day_Of_Week` & `Is_Weekend` | Calendar features of booking initiation |

**Strictly Excluded Post-Booking Features**: `Ride_Distance` (0 for cancellations, positive only for completed rides; creates artificial 100% leakage), `V_TAT` / `C_TAT` (recorded only post-dispatch), `Driver_Ratings`, `Customer_Rating`, `Payment_Method` (missing for 100% of cancellations), and cancellation reason codes.

---

## 5. Local Setup & Execution Guide

### Prerequisites:
- Python 3.10 to 3.13
- Node.js 18+ and npm
- Windows PowerShell or Bash (Linux / macOS)

### Quick One-Click Launch (Windows):
From the project root:
```powershell
.\start_all.ps1
```
This automatically launches both the FastAPI backend (http://127.0.0.1:8000) and the Vite frontend (http://localhost:5173) in separate windows.

---

### Manual Launch (Step-by-Step):

#### 1. Backend Setup:
```powershell
# Navigate to project root
cd c:\Users\prajw\Downloads\ride

# Activate virtual environment
.\backend\venv\Scripts\Activate.ps1
# (or on Linux/macOS: source backend/venv/bin/activate)

# Install dependencies if needed
pip install -r requirements.txt

# Start backend server
python run_backend.py
# (Alternative: uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload)
```
Verify backend is online at:
- Service Info: http://127.0.0.1:8000/
- Health Check: http://127.0.0.1:8000/api/health
- Swagger Docs: http://127.0.0.1:8000/docs

#### 2. Frontend Setup:
In a separate terminal window:
```powershell
cd c:\Users\prajw\Downloads\ride\frontend

# Install node dependencies
npm install

# Start Vite dev server
npm run dev
```
Open **http://localhost:5173** in your browser.

---

## 6. Running Automated Tests

Run the full backend test suite:
```powershell
.\backend\venv\Scripts\python.exe -m pytest tests/test_backend.py -v
```
All **17 tests** verify:
- Health check & dataset summary
- Data quality & transparent scoring calculation
- Data leakage prevention audit
- Executive overview & daily trajectory
- Cancellation fingerprint analysis across 5 dimensions
- Multi-algorithm training & model comparison
- Single-booking real-time inference
- Global & local SHAP explainability
- Holt exponential smoothing forecasting
- What-If scenario simulations
- AI recommendations engine
- File upload validation & full dataset lifecycle (upload, map columns, switch, delete)

---

## 7. Production Cloud Deployment

### A. Deploy Backend to Render (Web Service)

1. **Push your repository to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare RideInsight AI 2.0 for Render and Vercel deployment"
   git push origin main
   ```
2. **Create Web Service on Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com/) and click **New + > Web Service**.
   - Connect your GitHub repository: `https://github.com/Pranab190906/RideInsight`.
   - **Environment**: `Python 3`
   - **Root Directory**: Leave blank (uses repo root) OR enter `backend`.
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/api/health`
3. **Environment Variables**:
   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `PYTHON_VERSION` | `3.11.10` | Render Python version |
   | `HOST` | `0.0.0.0` | Bind to all external interfaces |
   | `PORT` | `10000` | Render dynamically assigns port |
   | `DEBUG` | `False` | Disable dev reload in production |
   | `CORS_ORIGINS` | `*` or your Vercel URL | Allows frontend requests |
4. Click **Deploy Web Service**.
5. Copy your live Render URL (e.g. `https://rideinsight-api.onrender.com`).

---

### B. Deploy Frontend to Vercel

1. **Import Project on Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new).
   - Select your GitHub repository: `Pranab190906/RideInsight`.
   - Set **Root Directory** to `frontend`.
   - **Framework Preset**: `Vite`.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
2. **Environment Variable**:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://YOUR-RENDER-BACKEND-URL.onrender.com` |
3. Click **Deploy**.
4. Vercel will build and assign your production frontend domain (e.g. `https://rideinsight-ai.vercel.app`).
5. Update `CORS_ORIGINS` on your Render service to include your Vercel domain.

---

## 8. Dashboard Modules Reference

| # | Module | Core Functionality |
| :---: | :--- | :--- |
| **1** | **Executive Overview** | Dataset upload hub, column mapping, quality score, KPIs, and daily volume trends. |
| **2** | **Cancellation Fingerprint** | Multi-dimensional friction analyzer across vehicle, pickup, drop, hour, and day. |
| **3** | **ML Model Lab** | Standardized benchmarking across Logistic Regression, Decision Tree, Random Forest, Gradient Boosting. |
| **4** | **Smart Risk Prediction** | Pre-booking real-time inference with calibrated threshold slider and dynamic city dropdowns. |
| **5** | **Explainable AI (SHAP)** | Tree & Linear SHAP game-theoretic attribution with domain-level impact explanations. |
| **6** | **Ride Forecasting** | Double exponential smoothing time-series with backtested RMSE and 95% confidence intervals. |
| **7** | **What-If Simulator** | Sensitivity analysis simulating the gain in completed rides from operational reductions. |
| **8** | **AI Recommendations** | Automated, evidence-grounded action items with data proofs and confidence ratings. |
| **9** | **Data Leakage Audit** | Detailed audit matrix of included pre-booking features and excluded post-outcome variables. |
| **10** | **Model Monitoring** | Operational inference logs, outcome feedback recording, and empirical drift monitoring. |
| **11** | **Export Center** | One-click audit-ready CSV downloads for all reports, models, forecasts, and recommendations. |

---

## 9. Verification Checklist

- [x] Backend tests: 17/17 passing (`pytest tests/test_backend.py`)
- [x] Frontend build: compiled with 0 errors in 1.32s (`npm run build`)
- [x] Dynamic dataset upload with CSV validation and progress bar
- [x] Configurable column mapping for non-standard CSVs
- [x] Transparent data quality scoring with mathematical deduction breakdown
- [x] Pre-booking inference free from target leakage
- [x] Real-time backend connectivity detection with status indicator
- [x] Dynamic field options loaded from active dataset
- [x] Blob downloads for CSV export center
- [x] Render configuration (`render.yaml`, `$PORT` binding, root proxy `app/`)
- [x] Vercel configuration (`vercel.json`, `VITE_API_URL` environment support)

---

## 10. License

Developed for enterprise ride-hailing performance optimization and decision intelligence. All rights reserved.
