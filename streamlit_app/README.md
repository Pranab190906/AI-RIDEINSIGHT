# RideInsight AI — Streamlit Edition (Light UI)

The dashboard uses a bright, clean light theme with high-contrast text, readable cards, clearer page guidance, and light Plotly charts. Each section includes a short “What this page does” explanation.

A self-contained Streamlit version of **RideInsight AI: Ride-Hailing Performance Decline Analyzer**.

It includes a bundled optimized 32,000-row `Bookings` dataset and supports uploading another CSV. It does not require the previous FastAPI backend, React frontend, Render service, Vercel, Firebase, or API keys.

## Features

- Executive overview: KPI cards, status breakdown, vehicle distribution, daily trajectory and efficiency trends
- Cancellation fingerprint by vehicle, pickup/drop location, booking hour and weekday
- Four-model comparison: Logistic Regression, Decision Tree, Random Forest and Gradient Boosting
- Smart risk prediction with adjustable decision threshold and actual-outcome recording
- Model-agnostic explainability using permutation importance plus a local prediction panel
- Daily completed-ride trend projection with explicit limitations
- What-if scenario portfolio with CSV export
- Evidence-based rule-driven operational recommendations
- Data leakage and quality audit
- SQLite prediction monitoring and export center
- Executive overview: total bookings, completed rides, completion rate and unsuccessful rate
- Booking status distribution and daily booking/completion trends
- Dataset explorer: preview, schema, missing-value profile, duplicate count and CSV download
- Cancellation analysis by vehicle type, pickup location, drop location and available payment method
- Retrospective cancellation-reason analysis
- Leakage-aware classification with Logistic Regression or Random Forest
- Chronological holdout split when a usable date column is available
- Accuracy, precision, recall, F1, ROC-AUC, classification report and confusion matrix
- Daily completed-ride trend and clearly labelled linear-trend projection
- What-if cancellation improvement simulator
- Methodology and limitations documentation

## 1. Run locally (Windows)

1. Extract the ZIP file.
2. Install Python 3.10 or newer.
3. Open PowerShell in the extracted `RideInsight_Streamlit` folder.
4. Create a virtual environment:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

5. Install dependencies:

   ```powershell
   python -m pip install --upgrade pip
   pip install -r requirements.txt
   ```

6. Start the app:

   ```powershell
   streamlit run app.py
   ```

7. Open the local URL shown by Streamlit, normally `http://localhost:8501`.

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
streamlit run app.py
```

## 2. Deploy to Streamlit Community Cloud

1. Extract the ZIP.
2. Create a new public or private GitHub repository.
3. Upload the project contents (the `app.py`, `requirements.txt`, and `data` folder must be at the repository root).
4. Go to https://share.streamlit.io/ and sign in with GitHub.
5. Select **Create app**.
6. Choose your repository, branch, and `app.py` as the main file.
7. Deploy.

No secrets or environment variables are required.

## Dataset

Default bundled file: `data/Bookings_32000_Optimized.csv`

- 32,000 rows
- 19 columns
- Main outcome column: `Booking_Status`
- Status values in this bundled version: `Success`, `Canceled by Driver`, `Canceled by Customer`, `Driver Not Found`

An optional `data/RideInsight_Bengaluru_July_2026_SYNTHETIC.csv` is also included for testing. It is simulated Bengaluru ride-hailing data, not actual Ola/Uber company data. You can switch to **Upload CSV** in the sidebar to use it or another dataset. Uploaded files need a booking outcome/status column for the complete dashboard. A date column is needed for daily trends and chronological model splitting.

## Modeling and leakage safeguards

The baseline classifier predicts whether the booking was completed (`1`) or unsuccessful (`0`).

Included when present:
- `Vehicle_Type`
- `Pickup_Location`
- `Drop_Location`
- `Booking_Value` (assumed available at booking time; remove it from `build_features()` if not)
- Booking hour and day of week derived from `Date`

Excluded from booking-time prediction:
- `Ride_Distance`
- `V_TAT`, `C_TAT`
- Driver/customer ratings
- Cancellation reasons and cancellation counters
- Incomplete-ride reasons

These fields can be unavailable or recorded after the booking outcome and may leak the target. The model is a decision-support prototype, not a real-time dispatch system.

## Important limitations

- The supplied data is historical and covers a limited period; it does not establish annual seasonality.
- Segment patterns are associations, not proven causes.
- The dataset does not include a live driver GPS feed, real-time fleet availability, or traffic conditions.
- The trend projection is a simple linear baseline, not a validated production forecasting model.
- The what-if simulator is hypothetical arithmetic, not a causal estimate.
- Evaluate each trained model on the displayed holdout set. Do not claim results before training and measuring them.

## Project structure

```text
RideInsight_Streamlit/
├── app.py
├── requirements.txt
├── README.md
├── .gitignore
├── packages.txt
├── run_windows.bat
├── run_unix.sh
└── data/
    └── Bookings_32000_Optimized.csv
```

## Troubleshooting

**`streamlit` is not recognized**
```bash
python -m pip install -r requirements.txt
python -m streamlit run app.py
```

**Missing dependency**
```bash
pip install -r requirements.txt
```

**App cannot find the default CSV**
Make sure you extracted the entire ZIP, including the `data` folder. Alternatively, choose **Upload your CSV** in the sidebar.

**Model training is slow**
Try Logistic Regression first. Random Forest uses 250 trees and may take longer on large or high-cardinality datasets.
