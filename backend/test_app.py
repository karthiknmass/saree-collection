try:
    from app.main import app
    print("FastAPI app imported successfully without errors.")
    
    # Check DB connection / tables
    from app.database import engine
    from app import models
    print("Database models and tables initialized successfully.")
    
except Exception as e:
    print(f"Error importing backend modules: {e}")
    exit(1)
