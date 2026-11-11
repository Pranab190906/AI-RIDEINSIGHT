import os
import time
from pathlib import Path
from typing import Dict, Any, Tuple, Optional, List
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report
)

from app.core.config import settings
from app.data.processor import processor

NUMERIC_FEATURES = ["Booking_Hour", "Booking_Minute", "Booking_Value", "Is_Weekend"]
CATEGORICAL_FEATURES = ["Vehicle_Type", "Pickup_Location", "Drop_Location", "Day_Of_Week"]

class ModelTrainer:
    def __init__(self, models_dir: Optional[Path] = None):
        self.models_dir = Path(models_dir) if models_dir else settings.MODELS_DIR
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.active_model_name: str = "Gradient Boosting"
        self._trained_models: Dict[str, Any] = {}
        self._comparison_results: Dict[str, Any] = {}

    def get_preprocessor(self) -> ColumnTransformer:
        return ColumnTransformer(
            transformers=[
                ("num", StandardScaler(), NUMERIC_FEATURES),
                ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES)
            ]
        )

    def train_and_evaluate_all(
        self,
        split_type: str = "random",
        test_size: float = 0.20,
        tune_hyperparameters: bool = False,
        selected_algorithms: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Trains and compares 4 machine learning algorithms on the exact same test dataset.
        Prevents data leakage by fitting transformers strictly on training data.
        """
        X, y, eligible_df = processor.prepare_ml_dataset()
        
        # Chronological vs Random Stratified Split
        if split_type == "chronological":
            # Sort chronologically by parsed datetime
            sort_indices = eligible_df.sort_values(by="_parsed_datetime").index
            X_sorted = X.loc[sort_indices]
            y_sorted = y.loc[sort_indices]
            
            split_idx = int(len(X_sorted) * (1 - test_size))
            X_train, X_test = X_sorted.iloc[:split_idx], X_sorted.iloc[split_idx:]
            y_train, y_test = y_sorted.iloc[:split_idx], y_sorted.iloc[split_idx:]
        else:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y,
                test_size=test_size,
                random_state=settings.RANDOM_STATE,
                stratify=y
            )

        algorithms = {
            "Logistic Regression": LogisticRegression(
                max_iter=500,
                random_state=settings.RANDOM_STATE
            ),
            "Decision Tree": DecisionTreeClassifier(
                max_depth=6,
                min_samples_split=20,
                random_state=settings.RANDOM_STATE
            ),
            "Random Forest": RandomForestClassifier(
                n_estimators=50,
                max_depth=10,
                min_samples_split=20,
                random_state=settings.RANDOM_STATE,
                n_jobs=-1
            ),
            "Gradient Boosting": GradientBoostingClassifier(
                n_estimators=50,
                learning_rate=0.1,
                max_depth=4,
                random_state=settings.RANDOM_STATE
            )
        }

        if selected_algorithms:
            algorithms = {k: v for k, v in algorithms.items() if k in selected_algorithms}

        results = {}
        best_f1 = -1.0
        best_model_name = "Gradient Boosting"

        for name, clf in algorithms.items():
            start_time = time.time()
            preprocessor = self.get_preprocessor()
            
            pipeline = Pipeline([
                ("preprocessor", preprocessor),
                ("classifier", clf)
            ])
            
            best_params = {}
            if tune_hyperparameters and name == "Gradient Boosting":
                param_grid = {
                    "classifier__n_estimators": [80, 120],
                    "classifier__max_depth": [4, 6]
                }
                grid = GridSearchCV(pipeline, param_grid, cv=3, scoring="f1", n_jobs=-1)
                grid.fit(X_train, y_train)
                pipeline = grid.best_estimator_
                best_params = grid.best_params_
            elif tune_hyperparameters and name == "Random Forest":
                param_grid = {
                    "classifier__n_estimators": [80, 120],
                    "classifier__max_depth": [10, 14]
                }
                grid = GridSearchCV(pipeline, param_grid, cv=3, scoring="f1", n_jobs=-1)
                grid.fit(X_train, y_train)
                pipeline = grid.best_estimator_
                best_params = grid.best_params_
            else:
                pipeline.fit(X_train, y_train)
                
            duration = round(time.time() - start_time, 2)
            
            # Predict on test set
            y_pred_proba = pipeline.predict_proba(X_test)[:, 1]
            y_pred = (y_pred_proba >= 0.50).astype(int)
            
            # Metrics
            acc = round(float(accuracy_score(y_test, y_pred)), 4)
            prec = round(float(precision_score(y_test, y_pred, zero_division=0)), 4)
            rec = round(float(recall_score(y_test, y_pred, zero_division=0)), 4)
            f1 = round(float(f1_score(y_test, y_pred, zero_division=0)), 4)
            try:
                auc = round(float(roc_auc_score(y_test, y_pred_proba)), 4)
            except:
                auc = 0.5000
                
            cm = confusion_matrix(y_test, y_pred).tolist()
            report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
            
            metric_data = {
                "algorithm": name,
                "accuracy": acc,
                "precision": prec,
                "recall": rec,
                "f1": f1,
                "roc_auc": auc,
                "confusion_matrix": cm,
                "classification_report": report,
                "duration_seconds": duration,
                "best_params": best_params,
                "threshold": 0.50
            }
            results[name] = metric_data
            
            # Save pipeline to disk
            model_slug = name.lower().replace(" ", "_")
            model_file = self.models_dir / f"{model_slug}.joblib"
            joblib.dump(pipeline, model_file)
            self._trained_models[name] = pipeline
            
            # Pick best model prioritizing F1-score & ROC-AUC for cancellation risk
            composite_score = f1 * 0.6 + auc * 0.4
            if composite_score > best_f1:
                best_f1 = composite_score
                best_model_name = name

        # Save active best model
        self.active_model_name = best_model_name
        active_pipeline = self._trained_models[best_model_name]
        joblib.dump(active_pipeline, self.models_dir / "active_model.joblib")
        
        # Save comparison metadata
        comparison = {
            "split_type": split_type,
            "test_records_count": len(y_test),
            "models": results,
            "recommended_model": best_model_name,
            "recommendation_reason": (
                f"{best_model_name} demonstrated the superior balance between precision and recall "
                f"with an F1 score of {results[best_model_name]['f1']} and ROC-AUC of {results[best_model_name]['roc_auc']}. "
                "In ride-hailing operational intervention, optimizing F1 mitigates costly false-alarm driver reallocations "
                "while capturing the maximum proportion of actual cancellation risks."
            ),
            "active_model": best_model_name
        }
        self._comparison_results = comparison
        joblib.dump(comparison, self.models_dir / "latest_comparison.joblib")
        
        return comparison

    def load_active_model(self) -> Pipeline:
        active_file = self.models_dir / "active_model.joblib"
        if active_file.exists():
            return joblib.load(active_file)
        # If not trained yet, train default models
        self.train_and_evaluate_all(split_type="random", test_size=0.20)
        return joblib.load(active_file)

    def load_model_by_name(self, name: str) -> Pipeline:
        model_slug = name.lower().replace(" ", "_")
        model_file = self.models_dir / f"{model_slug}.joblib"
        if model_file.exists():
            return joblib.load(model_file)
        raise FileNotFoundError(f"Model {name} has not been trained yet.")

    def set_active_model(self, name: str) -> str:
        pipeline = self.load_model_by_name(name)
        joblib.dump(pipeline, self.models_dir / "active_model.joblib")
        self.active_model_name = name
        if self._comparison_results:
            self._comparison_results["active_model"] = name
            joblib.dump(self._comparison_results, self.models_dir / "latest_comparison.joblib")
        return name

    def get_comparison(self) -> Dict[str, Any]:
        if self._comparison_results:
            return self._comparison_results
        comp_file = self.models_dir / "latest_comparison.joblib"
        if comp_file.exists():
            self._comparison_results = joblib.load(comp_file)
            return self._comparison_results
        # Train if not exists
        return self.train_and_evaluate_all()

    def predict_single(
        self,
        booking_time: str,
        day_of_week: str,
        vehicle_type: str,
        pickup_location: str,
        drop_location: str,
        booking_value: float,
        threshold: float = 0.50,
        model_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes real-time inference using the trained pipeline.
        Only uses pre-booking fields.
        """
        pipeline = self.load_model_by_name(model_name) if model_name else self.load_active_model()
        active_name = model_name if model_name else self.active_model_name
        
        # Parse hour and minute
        try:
            parts = booking_time.split(":")
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0
        except:
            hour, minute = 12, 0
            
        is_weekend = 1 if day_of_week.strip().lower() in ["saturday", "sunday"] else 0
        
        input_df = pd.DataFrame([{
            "Booking_Hour": hour,
            "Booking_Minute": minute,
            "Day_Of_Week": day_of_week.strip(),
            "Is_Weekend": is_weekend,
            "Vehicle_Type": vehicle_type.strip(),
            "Pickup_Location": pickup_location.strip(),
            "Drop_Location": drop_location.strip(),
            "Booking_Value": float(booking_value)
        }])
        
        # Predict probability
        prob_cancel = float(pipeline.predict_proba(input_df)[0, 1])
        prob_success = round(1.0 - prob_cancel, 4)
        prob_cancel = round(prob_cancel, 4)
        
        # Classification using decision threshold
        pred_class = 1 if prob_cancel >= threshold else 0
        pred_label = "Cancelled" if pred_class == 1 else "Success"
        
        # Risk categorization based on configurable boundaries
        if prob_cancel < settings.RISK_THRESHOLD_LOW:
            risk_category = "Low Risk"
        elif prob_cancel < settings.RISK_THRESHOLD_HIGH:
            risk_category = "Medium Risk"
        else:
            risk_category = "High Risk"
            
        return {
            "predicted_class": pred_class,
            "predicted_label": pred_label,
            "cancellation_probability": prob_cancel,
            "success_probability": prob_success,
            "risk_category": risk_category,
            "decision_threshold": threshold,
            "prediction_timestamp": pd.Timestamp.now().isoformat(),
            "model_used": active_name,
            "input_features": input_df.to_dict(orient="records")[0]
        }

# Global singleton
trainer = ModelTrainer()
