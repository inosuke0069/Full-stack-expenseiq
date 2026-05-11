"""
Smart AI-Driven Personal Expense Tracker
Author: RH Vighnesh Ramadhas Nadar | Enrollment: SOS23301010037
Guide: Prof. Reshma ManeDeshmukh | BCA - School of Computer Application
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, Base, get_db
from routers import auth, transactions, budgets, analytics, alerts, import_pdf
import models  # ensure tables are created

# ── Create all database tables ─────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── FastAPI App ────────────────────────────────────────────────────────────
app = FastAPI(
    title="Smart Expense Tracker API",
    description="AI-powered personal finance tracker with budget alerts and ML insights",
    version="1.0.0",
    contact={
        "name": "RH Vighnesh Ramadhas Nadar",
        "email": "vighnesh@example.com"
    }
)

# ── CORS Middleware ────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register Routers ───────────────────────────────────────────────────────
app.include_router(auth.router,         prefix="/api/auth",         tags=["Authentication"])
app.include_router(transactions.router, prefix="/api/transactions",  tags=["Transactions"])
app.include_router(budgets.router,      prefix="/api/budgets",       tags=["Budgets"])
app.include_router(analytics.router,    prefix="/api/analytics",     tags=["Analytics"])
app.include_router(alerts.router,       prefix="/api/alerts",        tags=["Alerts"])
app.include_router(import_pdf.router,   prefix="/api/import",        tags=["Import"])


@app.get("/", tags=["Health"])
def root():
    return {
        "message": "Smart Expense Tracker API is running",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}
