from __future__ import annotations
from io import BytesIO
from pathlib import Path
import sqlite3, json, warnings
from datetime import datetime, date
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import (accuracy_score, precision_score, recall_score, f1_score,
                             roc_auc_score, confusion_matrix, classification_report)
from sklearn.inspection import permutation_importance
from sklearn.utils.validation import check_is_fitted

warnings.filterwarnings("ignore")
ROOT = Path(__file__).parent
DATA_PATH = ROOT / "data" / "Bookings_32000_Optimized.csv"
DB_PATH = ROOT / "rideinsight_monitoring.db"
st.set_page_config(page_title="RideInsight AI 2.0", page_icon="🚕", layout="wide", initial_sidebar_state="expanded")

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Manrope:wght@500;600;700;800&display=swap');
:root { color-scheme: light; }
html, body, [class*="css"] {font-family:'DM Sans',sans-serif;}
.stApp {background:#f4f7fb;color:#17243b;}
[data-testid="stAppViewContainer"] {background:linear-gradient(180deg,#f8fbff 0%,#f1f5fb 100%);}
[data-testid="stHeader"] {background:rgba(248,251,255,.92);}
[data-testid="stSidebar"] {background:#ffffff;border-right:1px solid #e2e8f0;}
[data-testid="stSidebar"] * {color:#26364d;}
[data-testid="stSidebar"] [data-testid="stRadio"] label {font-weight:600;}
[data-testid="stSidebar"] [data-testid="stRadio"] label:hover {color:#087f8c;}
.block-container {padding-top:1.35rem;padding-bottom:2.5rem;max-width:1580px;}
h1,h2,h3,h4 {font-family:'Manrope',sans-serif;color:#14243b!important;letter-spacing:-.02em;}
p,li,label,span,div { }
[data-testid="stMarkdownContainer"] p, [data-testid="stCaptionContainer"] p {color:#52627a;}
[data-testid="stMetric"] {background:#ffffff;border:1px solid #e2eaf3;padding:16px 17px;border-radius:16px;box-shadow:0 3px 12px rgba(28,48,78,.045);}
[data-testid="stMetricLabel"] {color:#64748b!important;font-weight:700;}
[data-testid="stMetricValue"] {font-family:'Manrope';color:#14243b!important;font-weight:800;}
[data-testid="stMetricDelta"] {font-weight:600;}
[data-testid="stDataFrame"], [data-testid="stTable"] {background:#fff;border:1px solid #e2eaf3;border-radius:12px;overflow:hidden;}
[data-testid="stVerticalBlockBorderWrapper"] {background:#fff;border-color:#e1e9f2!important;border-radius:16px;box-shadow:0 3px 12px rgba(28,48,78,.035);}
[data-testid="stExpander"] {background:#fff;border:1px solid #e1e9f2;border-radius:12px;}
[data-testid="stTabs"] button {color:#52627a;font-weight:700;}
[data-testid="stTabs"] button[aria-selected="true"] {color:#087f8c;border-bottom-color:#0e9aa7;}
.stButton>button, .stDownloadButton>button {border-radius:10px;font-weight:700;border:1px solid #d5e1ee;min-height:2.6rem;}
.stButton>button[kind="primary"] {background:linear-gradient(90deg,#0891a2,#2563eb);border:0;color:white;}
.stButton>button:not([kind="primary"]), .stDownloadButton>button {background:#fff;color:#1d3554;}
.stButton>button:hover, .stDownloadButton>button:hover {border-color:#0e9aa7;color:#087f8c;}
[data-baseweb="select"] > div, [data-baseweb="input"] > div, [data-baseweb="textarea"] > div {background:#fff;border-color:#d7e2ee;border-radius:9px;}
[data-testid="stAlert"] {border-radius:12px;}
.ri-hero {background:linear-gradient(110deg,#e8f4ff,#e8fbf7);border:1px solid #cfe4f2;border-radius:18px;padding:21px 24px;margin-bottom:16px;color:#172f4d;box-shadow:0 5px 18px rgba(37,99,145,.055);}
.ri-hero h2 {color:#132d49!important;}
.ri-muted {color:#647b93;font-size:12px;}
.ri-card {background:#fff;border:1px solid #dce7f1;border-radius:14px;padding:16px;color:#1d3554;box-shadow:0 3px 12px rgba(28,48,78,.04);}
.ri-help {background:#edf7fb;border-left:4px solid #0e9aa7;border-radius:9px;padding:11px 14px;color:#31536a;font-size:13px;margin:8px 0 14px 0;}
.ri-chip {display:inline-block;background:#e7f5f5;color:#087f8c;padding:4px 9px;border-radius:999px;font-size:11px;font-weight:800;}
hr {border-color:#e2eaf3;}
</style>
""", unsafe_allow_html=True)

px.defaults.template = "plotly_white"
px.defaults.color_discrete_sequence = ["#0e9aa7", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef6b73", "#10b981"]

SUCCESS = {"success","completed","complete"}
POST_OUTCOME = {"Ride_Distance","V_TAT","C_TAT","Driver_Ratings","Customer_Rating",
                "Canceled_Rides_by_Customer","Canceled_Rides_by_Driver","Incomplete_Rides",
                "Incomplete_Rides_Reason"}
DB_SCHEMA = """CREATE TABLE IF NOT EXISTS predictions (
 id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT, dataset TEXT, model TEXT,
 probability REAL, predicted_label TEXT, actual_label TEXT
)"""
def db():
    con=sqlite3.connect(DB_PATH)
    con.execute(DB_SCHEMA); con.commit()
    return con

@st.cache_data(show_spinner=False)
def read_csv_bytes(raw: bytes) -> pd.DataFrame:
    return pd.read_csv(BytesIO(raw), low_memory=False)
@st.cache_data(show_spinner=False)
def read_default() -> pd.DataFrame:
    return pd.read_csv(DATA_PATH, low_memory=False) if DATA_PATH.exists() else pd.DataFrame()

def target_col(df):
    for c in df.columns:
        if str(c).lower().replace(" ","_") in ("booking_status","status"):
            return c
    return None
def success_mask(s):
    return s.fillna("").astype(str).str.strip().str.lower().isin(SUCCESS)
def prep(df):
    x=df.copy()
    datecol=next((c for c in x.columns if str(c).lower()=="date"),None)
    timecol=next((c for c in x.columns if str(c).lower()=="time"),None)
    if datecol:
        x["_dt"]=pd.to_datetime(x[datecol],errors="coerce")
        if timecol and x["_dt"].notna().any():
            # Date often already contains the timestamp; don't overwrite it.
            pass
    else: x["_dt"]=pd.NaT
    if x["_dt"].notna().any():
        x["_hour"]=x["_dt"].dt.hour
        x["_weekday"]=x["_dt"].dt.dayofweek
        x["_day"]=x["_dt"].dt.date
    elif timecol:
        tm=pd.to_datetime(x[timecol],errors="coerce")
        x["_hour"]=tm.dt.hour; x["_weekday"]=np.nan; x["_day"]=pd.NaT
    else:
        x["_hour"]=np.nan; x["_weekday"]=np.nan; x["_day"]=pd.NaT
    return x
def features(df, target):
    p=prep(df)
    y=success_mask(p[target]).astype(int)
    wanted=["Vehicle_Type","Pickup_Location","Drop_Location","Booking_Value","_hour","_weekday"]
    cols=[c for c in wanted if c in p.columns and p[c].notna().any()]
    X=p[cols].copy()
    # Remove identifiers and all outcome/post-outcome variables by construction.
    cat=X.select_dtypes(include=["object","category"]).columns.tolist()
    num=[c for c in X.columns if c not in cat]
    return X,y,cat,num
def make_pipeline(cat,num,algo):
    transformers=[]
    if cat:
        transformers.append(("cat",Pipeline([("impute",SimpleImputer(strategy="most_frequent")),
            ("onehot",OneHotEncoder(handle_unknown="ignore",min_frequency=2))]),cat))
    if num:
        transformers.append(("num",Pipeline([("impute",SimpleImputer(strategy="median")),
            ("scale",StandardScaler())]),num))
    pre=ColumnTransformer(transformers)
    models={
      "Logistic Regression":LogisticRegression(max_iter=1500,class_weight="balanced"),
      "Decision Tree":DecisionTreeClassifier(max_depth=8,min_samples_leaf=5,class_weight="balanced",random_state=42),
      "Random Forest":RandomForestClassifier(n_estimators=180,max_depth=15,min_samples_leaf=3,class_weight="balanced_subsample",n_jobs=-1,random_state=42),
      "Gradient Boosting":GradientBoostingClassifier(n_estimators=100,max_depth=2,learning_rate=.06,random_state=42)
    }
    return Pipeline([("prep",pre),("model",models[algo])])
def split_data(df,target,test_size,validation_mode='Auto (chronological when dates exist)'):
    X,y,cat,num=features(df,target)
    if len(X)<30 or y.nunique()<2: raise ValueError("Need at least 30 rows and both completed and unsuccessful outcomes.")
    p=prep(df); dt=p["_dt"]
    if validation_mode == "Chronological holdout" or (validation_mode == "Auto (chronological when dates exist)" and dt.notna().sum()>len(df)*.6):
        order=np.argsort(dt.fillna(pd.Timestamp.min).values)
        cut=max(1,min(len(order)-1,int(len(order)*(1-test_size))))
        tr,te=order[:cut],order[cut:]
        return X.iloc[tr],X.iloc[te],y.iloc[tr],y.iloc[te],cat,num,"Chronological holdout"
    xa,xb,ya,yb=train_test_split(X,y,test_size=test_size,random_state=42,stratify=y)
    return xa,xb,ya,yb,cat,num,"Stratified random holdout"
def evaluate(algo,df,target,test_size,validation_mode="Auto (chronological when dates exist)",tune=False):
    xa,xb,ya,yb,cat,num,split=split_data(df,target,test_size,validation_mode)
    model=make_pipeline(cat,num,algo)
    if tune:
        grids={
            "Logistic Regression": {"model__C": [0.1, 1.0, 10.0]},
            "Decision Tree": {"model__max_depth": [4, 8, None], "model__min_samples_leaf": [3, 5, 10]},
            "Random Forest": {"model__n_estimators": [120, 180], "model__max_depth": [10, 15]},
            "Gradient Boosting": {"model__n_estimators": [80, 120], "model__learning_rate": [0.03, 0.06]}
        }
        search=GridSearchCV(model,grids[algo],cv=3,scoring="f1",n_jobs=-1)
        search.fit(xa,ya)
        model=search.best_estimator_
    else:
        model.fit(xa,ya)
    pred=model.predict(xb); proba=model.predict_proba(xb)[:,1]
    met={"Accuracy":accuracy_score(yb,pred),"Precision":precision_score(yb,pred,zero_division=0),
         "Recall":recall_score(yb,pred,zero_division=0),"F1":f1_score(yb,pred,zero_division=0),
         "ROC-AUC":roc_auc_score(yb,proba) if yb.nunique()==2 else np.nan}
    return model,met,pred,proba,yb,xb,split
def save_prediction(dataset,model,prob,pred):
    con=db(); con.execute("INSERT INTO predictions(created_at,dataset,model,probability,predicted_label,actual_label) VALUES(?,?,?,?,?,?)",
      (datetime.now().isoformat(timespec="seconds"),dataset,model,float(prob), "Completed" if pred else "Unsuccessful",None)); con.commit(); con.close()
def metric_row(items):
    cols=st.columns(len(items))
    for c,(label,value,delta) in zip(cols,items):
        c.metric(label,value,delta)
def download_df(df,name,label):
    st.download_button(label,df.to_csv(index=False).encode(),name,"text/csv",use_container_width=True)
PAGE_GUIDES = {
    "Executive Overview": "Start here for a quick health check. KPI cards summarize the active dataset; charts show booking outcomes, vehicle mix and daily trends.",
    "Cancellation Fingerprint": "Choose a dimension, then set Minimum segment volume. A segment is included only when it has at least that many bookings. Higher unsuccessful rates identify areas to investigate, not proven causes.",
    "Machine Learning Model Lab": "Choose a validation strategy and test-set percentage, then train the four algorithms. Compare scores on held-out records and inspect the confusion matrix before selecting an active model.",
    "Smart Cancellation Risk Prediction": "Enter only details available when a booking is requested. Train a model in Model Lab first. The result is a probability estimate, not a guarantee.",
    "Explainable AI (Permutation Importance)": "Global permutation importance measures how much the chosen test score changes when one feature is shuffled. The local panel shows one booking and its prediction; it is not a SHAP decomposition.",
    "Completed-Ride Forecasting": "Choose a forecast horizon to project daily completed rides from historical daily totals. Treat the simple trend projection as exploratory, especially with a short history.",
    "What-If Operational Scenario Simulator": "Change the assumed booking volume, baseline unsuccessful rate and relative reduction. The result is hypothetical arithmetic assuming demand stays constant.",
    "AI Operational Recommendations": "Review each recommendation together with its measured evidence. These are rule-based prompts for investigation, not proof of causation.",
    "Data Leakage Audit & Quality Inspection": "Check missing values, duplicate rows and feature exclusions. Only use fields genuinely available at prediction time when training the booking-time model.",
    "Model Observability & Monitoring": "Run predictions, then record their actual outcomes when known. Accuracy is shown only for records with verified outcomes.",
    "Export Center": "Download CSV summaries, quality checks, model comparisons and scenario results for reporting or further analysis."
}
def section(title,subtitle=None):
    st.subheader(title)
    if subtitle: st.caption(subtitle)
    guide = PAGE_GUIDES.get(title)
    if guide:
        st.markdown(f"<div class='ri-help'><b>What this page does:</b> {guide}</div>", unsafe_allow_html=True)

# Sidebar dataset selector
with st.sidebar:
    st.markdown("## 🚕 RIDEINSIGHT **2.0**")
    st.caption("MOBILITY INTELLIGENCE PLATFORM")
    page=st.radio("NAVIGATION",[
      "Executive Overview","Cancellation Fingerprint","ML Model Lab","Smart Risk Prediction",
      "Explainable AI (Permutation)","Ride Forecasting","What-If Simulator","AI Recommendations",
      "Data Leakage Audit","Model Monitoring","Export Center"
    ],label_visibility="collapsed")
    st.divider()
    st.markdown("**ACTIVE DATASET**")
    source=st.radio("Source",["Bundled Bookings.csv","Upload CSV"],label_visibility="collapsed")
    up=st.file_uploader("Upload booking dataset",type=["csv"]) if source=="Upload CSV" else None
    st.caption("Upload CSV up to the platform's configured limit.")
    st.divider()
    st.caption("API-free Streamlit deployment · Local SQLite monitoring")

if source=="Upload CSV":
    if up is None:
        st.info("Upload a CSV file from the sidebar to load the dashboard.")
        st.stop()
    try: df=read_csv_bytes(up.getvalue()); dataset=up.name
    except Exception as e: st.error(f"CSV could not be read: {e}"); st.stop()
else:
    df=read_default(); dataset="Bookings.csv"
if df.empty: st.error("Bundled dataset missing. Restore data/Bookings_32000_Optimized.csv or upload a CSV."); st.stop()
target=target_col(df)
if target is None:
    st.error("A booking outcome column such as Booking_Status is required."); st.write(list(df.columns)); st.stop()
p=prep(df); y=success_mask(df[target]); total=len(df); completed=int(y.sum()); failed=total-completed
completion=completed/total*100 if total else 0; failrate=100-completion
statuses=df[target].fillna("Unknown").astype(str).value_counts().rename_axis("Status").reset_index(name="Bookings")
status_online = st.session_state.get("trained_model") is not None

# Shared top bar
c1,c2,c3=st.columns([5,1,1])
with c1:
    st.markdown(f"<div class='ri-hero'><h2 style='margin:0'>RideInsight AI</h2><div>Ride-Hailing Performance Decline Analyzer</div><div class='ri-muted'>Dataset: {dataset} · {total:,} records · {len(df.columns)} columns</div></div>",unsafe_allow_html=True)
with c2: st.markdown("<div class='ri-card'>🟢 Dataset<br><b>Loaded</b></div>",unsafe_allow_html=True)
with c3: st.markdown(f"<div class='ri-card'>🧠 ML Model<br><b>{'Trained' if status_online else 'Ready'}</b></div>",unsafe_allow_html=True)

# Overview
if page=="Executive Overview":
    section("Executive Overview","End-to-end performance metrics, cancellation rates and daily demand patterns.")
    metric_row([("TOTAL BOOKINGS",f"{total:,}",None),("COMPLETED RIDES",f"{completed:,}",f"{completion:.2f}%"),("CANCELLATION / UNSUCCESSFUL RATE",f"{failrate:.2f}%",None),("UNSUCCESSFUL BOOKINGS",f"{failed:,}",None)])
    cols=st.columns(3)
    for col,key,title in zip(cols,["Canceled by Driver","Canceled by Customer","Driver Not Found"],["Canceled by driver","Canceled by customer","Driver not found"]):
        match=statuses[statuses.Status.str.lower().str.contains(key.lower(),regex=False)]
        n=int(match.Bookings.sum()) if len(match) else 0
        col.metric(title,f"{n:,}",f"{n/total*100:.1f}% of bookings")
    a,b=st.columns([1,1])
    with a: st.plotly_chart(px.pie(statuses,names="Status",values="Bookings",hole=.58,title="Booking Status Breakdown"),use_container_width=True)
    with b:
        if "Vehicle_Type" in df:
            veh=df["Vehicle_Type"].fillna("Unknown").value_counts().rename_axis("Vehicle").reset_index(name="Bookings")
            st.plotly_chart(px.bar(veh,x="Vehicle",y="Bookings",title="Vehicle Category Distribution"),use_container_width=True)
        else: st.info("Vehicle_Type not present.")
    if p["_dt"].notna().any():
        daily=p.assign(Completed=y.astype(int)).dropna(subset=["_dt"]).groupby(p["_dt"].dt.date).agg(Bookings=(target,"size"),Completed=("Completed","sum")).reset_index(names="Date")
        daily["Unsuccessful"]=daily.Bookings-daily.Completed
        st.plotly_chart(px.area(daily,x="Date",y=["Completed","Unsuccessful"],title="Daily Booking Trajectory"),use_container_width=True)
        daily["Completion Rate (%)"]=daily.Completed/daily.Bookings*100
        st.plotly_chart(px.line(daily,x="Date",y="Completion Rate (%)",title="Daily Efficiency Trend (%)"),use_container_width=True)
    st.dataframe(statuses,use_container_width=True,hide_index=True)

elif page=="Cancellation Fingerprint":
    section("Cancellation Fingerprint","Compare cancellation friction across vehicle fleets, locations and booking time.")
    st.info(f"Overall unsuccessful baseline: **{failrate:.2f}%**. Category rates are calculated from records in the active dataset.")
    dims=[c for c in ["Vehicle_Type","Pickup_Location","Drop_Location"] if c in df.columns]
    if p["_hour"].notna().any(): dims.append("_hour")
    if p["_weekday"].notna().any(): dims.append("_weekday")
    if not dims: st.warning("No suitable segment columns found.")
    else:
        dim=st.selectbox("Fingerprint dimension",dims,format_func=lambda x:{"_hour":"Booking Hour","_weekday":"Day of Week"}.get(x,x))
        temp=df[[dim,target]].copy(); temp["Unsuccessful"]=(~success_mask(temp[target])).astype(int)
        agg=temp.groupby(dim,dropna=False).agg(Bookings=(target,"size"),Unsuccessful=("Unsuccessful","sum")).reset_index()
        agg["Unsuccessful Rate (%)"]=agg.Unsuccessful/agg.Bookings*100
        minvol=st.slider("Minimum segment volume (bookings)",1, max(1,int(agg.Bookings.max())),min(50,max(1,int(agg.Bookings.max()))))
        st.caption(f"Only segments with at least {minvol:,} bookings are shown. Increase this value to hide small samples and reduce unstable rate comparisons.")
        agg=agg[agg.Bookings>=minvol].sort_values("Unsuccessful Rate (%)",ascending=False)
        if not agg.empty:
            worst=agg.iloc[0]; best=agg.iloc[-1]
            l,r=st.columns(2); l.metric("Highest-friction segment",str(worst[dim]),f"{worst['Unsuccessful Rate (%)']:.2f}% · {int(worst.Bookings):,} bookings"); r.metric("Lowest-friction segment",str(best[dim]),f"{best['Unsuccessful Rate (%)']:.2f}% · {int(best.Bookings):,} bookings")
            st.plotly_chart(px.bar(agg,x=dim,y="Unsuccessful Rate (%)",color="Unsuccessful Rate (%)",title="Unsuccessful Rate by Segment"),use_container_width=True)
            st.dataframe(agg,use_container_width=True,hide_index=True)
            download_df(agg,"cancellation_fingerprint.csv","Export fingerprint")
    if "Canceled_Rides_by_Driver" in df:
        st.caption("Reason fields are retrospective and are not used as booking-time prediction inputs.")

elif page=="ML Model Lab":
    section("Machine Learning Model Lab","Benchmark, tune and select four supervised learning algorithms using pre-booking features.")
    st.info("Leakage-aware inputs: vehicle type, pickup/drop location, booking value (only if available at request time), booking hour and weekday. Post-outcome fields are excluded.")
    with st.expander("Understand the evaluation metrics"):
        st.markdown("- **Accuracy:** fraction of all test predictions that are correct.\n- **Precision:** among predictions labelled Completed, the fraction actually Completed.\n- **Recall:** among actual Completed bookings, the fraction correctly identified.\n- **F1-score:** harmonic mean of precision and recall.\n- **ROC-AUC:** how well the model ranks Completed above Unsuccessful across thresholds.\n- **Validation:** the held-out test strategy used to estimate performance on unseen records.")
        st.caption("In this project, Completed = 1 and Unsuccessful = 0. Also inspect unsuccessful-class recall if detecting failed bookings is the main operational objective.")
    with st.container(border=True):
        st.markdown("**Pipeline Training Configuration**")
        cfg1,cfg2,cfg3,cfg4=st.columns([1.2,1,1.25,1.2])
        with cfg1:
            validation=st.selectbox("Validation mode",[
                "Auto (chronological when dates exist)","Stratified random holdout","Chronological holdout"
            ])
        with cfg2:
            test=st.slider("Holdout size",.15,.40,.20,.05)
        with cfg3:
            tune=st.checkbox("Enable grid-search tuning",value=False)
            st.caption("Optional: 3-fold cross-validation · F1 objective · may take longer")
        with cfg4:
            train_clicked=st.button("▶ Train & Evaluate Suite",type="primary",use_container_width=True)
        algos=["Logistic Regression","Decision Tree","Random Forest","Gradient Boosting"]
        if train_clicked:
            rows=[]; models={}; details={}
            bar=st.progress(0,text="Training models...")
            for i,algo in enumerate(algos):
                try:
                    started=__import__("time").perf_counter()
                    model,met,pred,proba,yt,xt,split=evaluate(algo,df,target,test,validation,tune)
                    elapsed=__import__("time").perf_counter()-started
                    cm=confusion_matrix(yt,pred,labels=[0,1])
                    rows.append({"Algorithm":algo,**met,"Training Latency (sec)":elapsed,"Validation":split})
                    models[algo]=model
                    details[algo]={"cm":cm,"y_true":yt,"y_pred":pred,"prob":proba,"metrics":met,"latency":elapsed,"validation":split,"test_rows":len(yt)}
                except Exception as e:
                    rows.append({"Algorithm":algo,"Error":str(e)})
                bar.progress((i+1)/len(algos),text=f"Evaluated {algo}")
            st.session_state["comparison"]=pd.DataFrame(rows)
            st.session_state["models"]=models
            st.session_state["model_details"]=details
            if models:
                best=max(models,key=lambda a:details[a]["metrics"]["F1"])
                st.session_state["trained_model"]=models[best]
                st.session_state["active_algo"]=best
            bar.empty()
    if "comparison" in st.session_state:
        comp=st.session_state["comparison"]
        valid=comp.dropna(subset=["F1"]) if "F1" in comp else pd.DataFrame()
        if not valid.empty:
            bestrow=valid.sort_values(["F1","ROC-AUC"],ascending=False).iloc[0]
            st.markdown(f"""<div class="ri-hero"><b>🏅 Recommended model by F1 objective: {bestrow['Algorithm']}</b><br><span class="ri-muted">F1 {bestrow['F1']:.4f} · ROC-AUC {bestrow['ROC-AUC']:.4f} · evaluated on {int(st.session_state['model_details'][bestrow['Algorithm']]['test_rows']):,} held-out records</span></div>""",unsafe_allow_html=True)
            st.markdown("**Model Comparison Arena**")
            metric_cols=["Accuracy","F1","Precision","ROC-AUC","Recall"]
            chart=valid.melt(id_vars="Algorithm",value_vars=metric_cols,var_name="Metric",value_name="Score")
            st.plotly_chart(px.bar(chart,x="Algorithm",y="Score",color="Metric",barmode="group",range_y=[0,1],title="Side-by-side test-set performance"),use_container_width=True)
            st.dataframe(comp,use_container_width=True,hide_index=True)
            download_df(comp,"model_comparison.csv","Download comparison report")
            selected=st.selectbox("Algorithm inspection",valid.Algorithm.tolist(),index=valid.Algorithm.tolist().index(st.session_state.get("active_algo",bestrow["Algorithm"])))
            detail=st.session_state["model_details"][selected]
            st.markdown("**Algorithm Inspection & Confusion Matrix**")
            cm=detail["cm"]
            tn,fp,fn,tp=cm.ravel()
            a,b,c,d=st.columns(4)
            a.metric("True Negative",f"{tn:,}",help="Unsuccessful booking correctly identified as unsuccessful.")
            b.metric("False Positive",f"{fp:,}",help="Completed booking incorrectly flagged as unsuccessful.")
            c.metric("False Negative",f"{fn:,}",help="Unsuccessful booking missed by the model.")
            d.metric("True Positive",f"{tp:,}",help="Completed booking correctly identified as completed.")
            left,right=st.columns([1,1])
            with left:
                fig=px.imshow(cm,text_auto=True,x=["Predicted Unsuccessful","Predicted Completed"],y=["Actual Unsuccessful","Actual Completed"],color_continuous_scale="Blues",title="Confusion Matrix · held-out test set")
                st.plotly_chart(fig,use_container_width=True)
            with right:
                m=detail["metrics"]
                radar=pd.DataFrame({"Metric":["Accuracy","Precision","Recall","F1","ROC-AUC"],"Score":[m[k] for k in ["Accuracy","Precision","Recall","F1","ROC-AUC"]]})
                fig=go.Figure()
                fig.add_trace(go.Scatterpolar(r=radar.Score,theta=radar.Metric,fill="toself",name=selected))
                fig.update_layout(title="Metric Balance Profile",polar=dict(radialaxis=dict(visible=True,range=[0,1])),showlegend=False)
                st.plotly_chart(fig,use_container_width=True)
            m1,m2,m3,m4=st.columns(4)
            m1.metric("Accuracy",f"{m['Accuracy']*100:.2f}%")
            m2.metric("F1 score",f"{m['F1']*100:.2f}%")
            m3.metric("ROC-AUC",f"{m['ROC-AUC']:.4f}")
            m4.metric("Training latency",f"{detail['latency']:.2f} sec")
            st.caption(f"Validation: {detail['validation']} · Test records: {detail['test_rows']:,} · Threshold: 0.50")
            if st.button("Deploy selected algorithm as active model"):
                st.session_state["trained_model"]=st.session_state["models"][selected]
                st.session_state["active_algo"]=selected
                st.success(f"{selected} is now the active in-session model.")
        else:
            st.dataframe(comp,use_container_width=True,hide_index=True)
    else:
        st.caption("Configure the validation strategy and holdout size, then train the four-model suite.")

elif page=="Smart Risk Prediction":
    section("Smart Cancellation Risk Prediction","Estimate completion probability using fields known when the booking is requested.")
    if "trained_model" not in st.session_state:
        st.warning("Train a model in ML Model Lab first.")
    else:
        model=st.session_state["trained_model"]; algo=st.session_state.get("active_algo","Model")
        X,yy,cat,num=features(df,target)
        c1,c2=st.columns(2); row={}
        with c1:
            row["Vehicle_Type"]=st.selectbox("Vehicle category",sorted(df.Vehicle_Type.dropna().astype(str).unique()) if "Vehicle_Type" in df else ["Unknown"])
            row["Pickup_Location"]=st.selectbox("Pickup location",sorted(df.Pickup_Location.dropna().astype(str).unique()) if "Pickup_Location" in df else ["Unknown"])
            row["Booking_Value"]=st.number_input("Estimated fare / booking value (₹)",min_value=0.0,value=float(pd.to_numeric(df.Booking_Value,errors="coerce").median()) if "Booking_Value" in df and pd.notna(pd.to_numeric(df.Booking_Value,errors="coerce").median()) else 300.0)
        with c2:
            row["Drop_Location"]=st.selectbox("Drop location",sorted(df.Drop_Location.dropna().astype(str).unique()) if "Drop_Location" in df else ["Unknown"])
            hour=st.slider("Booking hour",0,23,14); weekday=st.selectbox("Day of week",list(range(7)),format_func=lambda x:["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"][x])
            row["_hour"]=hour; row["_weekday"]=weekday
        threshold=st.slider("Decision threshold",.1,.9,.5,.05)
        if st.button("Assess booking cancellation risk",type="primary"):
            sample=pd.DataFrame([{c:row.get(c,np.nan) for c in X.columns}])
            prob=float(model.predict_proba(sample)[0,1]); predicted=int(prob>=threshold)
            st.session_state["last_prediction"]={"prob":prob,"pred":predicted,"row":row,"model":algo}
            save_prediction(dataset,algo,prob,predicted)
        if "last_prediction" in st.session_state:
            z=st.session_state["last_prediction"]; risk=1-z["prob"]
            st.metric("Estimated completion probability",f"{z['prob']*100:.1f}%")
            st.metric("Estimated unsuccessful-booking risk",f"{risk*100:.1f}%")
            st.success("Likely completed" if z["pred"]==1 else "Higher unsuccessful risk at selected threshold")
            st.caption(f"Active model: {z['model']} · This is a model estimate, not a guarantee.")
            if st.button("Record actual outcome"):
                st.session_state["show_actual"]=True
            if st.session_state.get("show_actual"):
                actual=st.selectbox("Actual outcome",["Completed","Unsuccessful"])
                if st.button("Save verified outcome"):
                    con=db(); con.execute("UPDATE predictions SET actual_label=? WHERE id=(SELECT MAX(id) FROM predictions)",(actual,)); con.commit(); con.close()
                    st.success("Outcome recorded for monitoring.")

elif page=="Explainable AI (Permutation)":
    section("Explainable AI (Permutation Importance)","Understand global feature importance and inspect one booking prediction. This version uses permutation importance, not SHAP.")
    if "trained_model" not in st.session_state: st.warning("Train a model in ML Model Lab first.")
    else:
        model=st.session_state["trained_model"]
        X,yy,cat,num=features(df,target)
        st.caption("Permutation importance is model-agnostic: it measures how much held-out F1 changes when a feature is shuffled. This is not SHAP and does not decompose an individual prediction.")
        xa,xb,ya,yb,cat,num,split=split_data(df,target,.2)
        with st.spinner("Calculating permutation importance..."):
            imp=permutation_importance(model,xb, yb, n_repeats=4,random_state=42,scoring="f1",n_jobs=-1)
            names=xb.columns
            impdf=pd.DataFrame({"Feature":names,"Importance":imp.importances_mean,"Std":imp.importances_std}).sort_values("Importance",ascending=False)
        st.plotly_chart(px.bar(impdf.sort_values("Importance"),x="Importance",y="Feature",orientation="h",error_x="Std",title="Global feature importance (permutation)"),use_container_width=True)
        st.dataframe(impdf,use_container_width=True,hide_index=True)
        st.markdown("**Local instance explanation**")
        idx=st.number_input("Select row index",0,len(df)-1,0)
        sample=X.iloc[[int(idx)]]
        prob=float(model.predict_proba(sample)[0,1])
        st.metric("Predicted completion probability",f"{prob*100:.2f}%")
        st.dataframe(sample,use_container_width=True,hide_index=True)
        st.caption("The local panel shows the selected input and model output; global permutation importance is not a per-row SHAP decomposition.")

elif page=="Ride Forecasting":
    section("Completed-Ride Forecasting","Chronological daily completed-ride projection with a simple baseline.")
    d=prep(df).dropna(subset=["_dt"]).copy()
    if d.empty: st.warning("A valid Date column is required for forecasting.")
    else:
        d["_day"]=d["_dt"].dt.date; d["_completed"]=success_mask(d[target]).astype(int)
        daily=d.groupby("_day")._completed.sum().reset_index(name="Completed Rides").sort_values("_day")
        horizon=st.radio("Projection horizon",[7,14,30],horizontal=True)
        st.metric("Historical window",f"{len(daily)} days"); st.metric("Daily mean volume",f"{daily['Completed Rides'].mean():,.0f} rides")
        st.plotly_chart(px.line(daily,x="_day",y="Completed Rides",markers=True,title="Historical completed rides"),use_container_width=True)
        if len(daily)>=3:
            from sklearn.linear_model import LinearRegression
            xx=np.arange(len(daily)).reshape(-1,1); yy=daily["Completed Rides"].values
            reg=LinearRegression().fit(xx,yy); fut=np.arange(len(daily),len(daily)+horizon).reshape(-1,1)
            vals=np.maximum(0,reg.predict(fut)); dates=pd.date_range(pd.to_datetime(daily._day.max())+pd.Timedelta(days=1),periods=horizon)
            fdf=pd.DataFrame({"Date":dates,"Projected Completed Rides":np.round(vals).astype(int)})
            hist=pd.DataFrame({"Date":pd.to_datetime(daily._day),"Projected Completed Rides":daily["Completed Rides"]})
            st.plotly_chart(px.line(pd.concat([hist,fdf]),x="Date",y="Projected Completed Rides",color=pd.concat([pd.Series(["Historical"]*len(hist)),pd.Series(["Projection"]*len(fdf))]).values,title="Completed rides projection"),use_container_width=True)
            download_df(fdf,"ride_forecast.csv","Download forecast")
            st.warning("Exploratory linear trend only. A single month of history is not enough to establish seasonality or reliable long-range forecasts.")
        else: st.warning("At least three daily observations are required.")

elif page=="What-If Simulator":
    section("What-If Operational Scenario Simulator","Estimate possible completed-ride changes under explicit hypothetical assumptions.")
    with st.form("scenario_form"):
        name=st.text_input("Scenario title","Driver staging near high-demand pickup zones")
        bookings=st.number_input("Total booking volume",min_value=1,value=int(total),step=100)
        baseline=st.slider("Current unsuccessful baseline (%)",0.0,100.0,float(round(failrate,2)),.5)
        reduction=st.slider("Relative unsuccessful-rate reduction (%)",0.0,50.0,5.0,.5)
        notes=st.text_area("Operational notes","Hypothetical operational change; validate with field data.")
        submitted=st.form_submit_button("Simulate and save scenario",type="primary")
    if submitted:
        newrate=baseline*(1-reduction/100); olddone=bookings*(1-baseline/100); newdone=bookings*(1-newrate/100)
        record={"Scenario":name,"Bookings":bookings,"Current Unsuccessful Rate (%)":baseline,"Reduction Target (%)":reduction,"Scenario Unsuccessful Rate (%)":newrate,"Additional Completed Rides":newdone-olddone,"Notes":notes,"Created":datetime.now().isoformat(timespec="seconds")}
        saved=st.session_state.get("scenarios",[]); saved.append(record); st.session_state["scenarios"]=saved
        st.success(f"Scenario calculated: approximately {newdone-olddone:,.0f} additional completed rides under these assumptions.")
    olddone=bookings*(1-baseline/100); newdone=bookings*(1-(baseline*(1-reduction/100))/100)
    metric_row([("BASELINE COMPLETED",f"{olddone:,.0f}",None),("SCENARIO COMPLETED",f"{newdone:,.0f}",None),("ADDITIONAL COMPLETED",f"{newdone-olddone:,.0f}",None)])
    scenarios=pd.DataFrame(st.session_state.get("scenarios",[]))
    if not scenarios.empty:
        st.dataframe(scenarios,use_container_width=True,hide_index=True); download_df(scenarios,"scenario_portfolio.csv","Export scenario portfolio")
        if st.button("Clear saved scenarios"): st.session_state["scenarios"]=[]; st.rerun()
    st.info("Hypothetical arithmetic assumes fixed booking demand. It is not a causal estimate or a guarantee.")

elif page=="AI Recommendations":
    section("AI Operational Recommendations","Rule-based recommendations grounded in measured booking patterns.")
    recommendations=[]
    if failrate>30: recommendations.append(("High unsuccessful booking share",f"{failrate:.1f}% of bookings are unsuccessful. Prioritize a root-cause review of cancellation and driver-not-found categories.","Operations"))
    if "Vehicle_Type" in df:
        q=df.assign(_bad=(~y).astype(int)).groupby("Vehicle_Type").agg(bookings=(target,"size"),bad=("_bad","sum"))
        q=q[q.bookings>=30]; q["rate"]=q.bad/q.bookings*100
        if len(q):
            w=q.rate.idxmax(); recommendations.append((f"Review {w} vehicle segment",f"{w} has the highest observed unsuccessful rate ({q.loc[w,'rate']:.1f}%) among segments with at least 30 bookings. Validate sample size and operational context.","Fleet"))
    if "Pickup_Location" in df:
        q=df.assign(_bad=(~y).astype(int)).groupby("Pickup_Location").agg(bookings=(target,"size"),bad=("_bad","sum"))
        q=q[q.bookings>=50]; q["rate"]=q.bad/q.bookings*100
        if len(q):
            w=q.rate.idxmax(); recommendations.append((f"Investigate pickup area: {w}",f"This pickup area has the highest observed unsuccessful rate ({q.loc[w,'rate']:.1f}%) among areas with at least 50 bookings. This is an association, not proof of a cause.","Location"))
    if not recommendations: recommendations.append(("Improve data coverage","Review booking status completeness and collect reliable timestamps and operational context before making interventions.","Data"))
    for title,desc,cat in recommendations:
        with st.container(border=True):
            st.markdown(f"**{title}** · `{cat}`"); st.write(desc)
    recdf=pd.DataFrame(recommendations,columns=["Recommendation","Evidence","Category"]); download_df(recdf,"ai_recommendations.csv","Export recommendations")

elif page=="Data Leakage Audit":
    section("Data Leakage Audit & Quality Inspection","Check data quality and document pre-booking feature safeguards.")
    missing=df.isna().sum(); quality=pd.DataFrame({"Column":df.columns,"Missing":missing.values,"Missing %":(missing/len(df)*100).round(2).values,"Data Type":[str(t) for t in df.dtypes]})
    metric_row([("ROWS",f"{len(df):,}",None),("COLUMNS",f"{len(df.columns)}",None),("DUPLICATE ROWS",f"{df.duplicated().sum():,}",None),("MISSING CELLS",f"{int(missing.sum()):,}",None)])
    st.markdown("**Included booking-time features**")
    included=[c for c in ["Vehicle_Type","Pickup_Location","Drop_Location","Booking_Value","Date","Time"] if c in df.columns]
    st.write(included or "No common booking-time features found.")
    st.markdown("**Excluded or restricted post-outcome fields**")
    excluded=[c for c in df.columns if c in POST_OUTCOME]
    st.dataframe(pd.DataFrame({"Feature":excluded,"Reason":["May be measured after the outcome or reveal trip completion"]*len(excluded)}),use_container_width=True,hide_index=True)
    st.markdown("**Data quality profile**"); st.dataframe(quality.sort_values("Missing %",ascending=False),use_container_width=True,hide_index=True)
    st.caption("Booking_Value is included in the baseline only under the assumption it is available when the booking is requested. Verify this in the source system.")
    download_df(quality,"data_quality_audit.csv","Download quality audit")

elif page=="Model Monitoring":
    section("Model Observability & Monitoring","Track prediction volume and verified outcomes in a local SQLite audit store.")
    con=db(); logs=pd.read_sql_query("SELECT * FROM predictions ORDER BY id DESC",con); con.close()
    n=len(logs); verified=logs[logs.actual_label.notna()] if n else logs
    metric_row([("TOTAL PREDICTIONS",f"{n:,}",None),("EVALUATED OUTCOMES",f"{len(verified):,}",None),("LIVE ACCURACY",f"{(np.mean((verified.predicted_label==verified.actual_label)) * 100):.1f}%" if len(verified) else "Pending",None),("ACTIVE DATASET",dataset,None)])
    if n:
        st.dataframe(logs,use_container_width=True,hide_index=True)
        if len(verified):
            st.metric("Verified outcome accuracy",f"{np.mean(verified.predicted_label==verified.actual_label)*100:.2f}%")
        download_df(logs,"prediction_audit_trail.csv","Download audit trail")
    else: st.info("No predictions logged yet. Run a prediction in Smart Risk Prediction.")
    st.caption("SQLite data is stored on the running instance. Ephemeral hosting may reset local files after restarts or redeployments; use a persistent database for durable production monitoring.")

elif page=="Export Center":
    section("Export Center","Download audit-ready CSV reports and operational datasets.")
    exports=[
      ("Dataset Executive Summary","Core booking KPIs and status distribution",pd.DataFrame([{"Metric":"Total bookings","Value":total},{"Metric":"Completed rides","Value":completed},{"Metric":"Unsuccessful bookings","Value":failed},{"Metric":"Completion rate (%)","Value":completion},{"Metric":"Unsuccessful rate (%)","Value":failrate}])),
      ("Booking Status Breakdown","Counts and share by booking status",statuses.assign(Share_Percent=statuses.Bookings/total*100)),
      ("Data Quality Audit","Missingness and column types",pd.DataFrame({"Column":df.columns,"Missing":df.isna().sum().values,"Missing %":(df.isna().mean()*100).round(2).values,"Type":[str(t) for t in df.dtypes]})),
      ("Active Dataset","Current selected dataset",df)
    ]
    for i in range(0,len(exports),2):
        cols=st.columns(2)
        for col,(title,desc,data) in zip(cols,exports[i:i+2]):
            with col.container(border=True):
                st.markdown(f"### {title}"); st.caption(desc)
                col.download_button("⬇ Download CSV",data.to_csv(index=False).encode(),title.lower().replace(" ","_")+".csv","text/csv",use_container_width=True)
    if "comparison" in st.session_state:
        download_df(st.session_state["comparison"],"model_comparison.csv","Download ML model comparison")
    if "scenarios" in st.session_state and st.session_state["scenarios"]:
        download_df(pd.DataFrame(st.session_state["scenarios"]),"scenario_portfolio.csv","Download saved scenarios")

st.divider()
st.caption("RideInsight AI 2.0 · Evidence-led decision support · Verify model metrics and operational assumptions before acting.")
