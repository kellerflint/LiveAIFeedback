from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import sys

from db.session import init_db_pool, close_db_pool
from api import admin_auth, questions, admin_sessions, student, collections

# Configure Application Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler("ai_service.log"),
        logging.StreamHandler(sys.stdout)
    ]
)

app = FastAPI(title="AI Real-Time Teaching Feedback")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await init_db_pool()

@app.on_event("shutdown")
async def shutdown_event():
    await close_db_pool()

@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Include routers
app.include_router(admin_auth.router, prefix="/api/admin", tags=["Admin Auth"])
app.include_router(questions.router, prefix="/api/admin", tags=["Questions"])
app.include_router(collections.router, prefix="/api/admin", tags=["Collections"])
app.include_router(admin_sessions.router, prefix="/api/admin", tags=["Admin Sessions"])
app.include_router(student.router, prefix="/api/student", tags=["Student"])
