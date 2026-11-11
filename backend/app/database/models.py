import datetime
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, Text, ForeignKey
from app.database.session import Base, engine

class DatasetMeta(Base):
    __tablename__ = "dataset_meta"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    total_rows = Column(Integer, default=0)
    total_cols = Column(Integer, default=0)
    status_distribution = Column(Text, default="{}")
    missing_summary = Column(Text, default="{}")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ModelRun(Base):
    __tablename__ = "model_runs"
    
    id = Column(Integer, primary_key=True, index=True)
    algorithm = Column(String(100), nullable=False)
    split_type = Column(String(50), default="random")
    hyperparameters = Column(Text, default="{}")
    metrics = Column(Text, default="{}")
    feature_names = Column(Text, default="[]")
    model_filename = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class PredictionRecord(Base):
    __tablename__ = "prediction_records"
    
    id = Column(Integer, primary_key=True, index=True)
    model_run_id = Column(Integer, ForeignKey("model_runs.id"), nullable=True)
    input_features = Column(Text, default="{}")
    cancellation_probability = Column(Float, nullable=False)
    success_probability = Column(Float, nullable=False)
    risk_category = Column(String(50), nullable=False)
    threshold_used = Column(Float, default=0.50)
    actual_outcome = Column(String(50), nullable=True) # e.g. Success, Cancelled
    feedback_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ScenarioRecord(Base):
    __tablename__ = "scenario_records"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    total_bookings = Column(Integer, nullable=False)
    current_cancellation_rate = Column(Float, nullable=False)
    reduction_rate = Column(Float, nullable=False)
    current_completed = Column(Integer, nullable=False)
    scenario_completed = Column(Integer, nullable=False)
    additional_completed = Column(Integer, nullable=False)
    percentage_gain = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

# Ensure tables exist
Base.metadata.create_all(bind=engine)

