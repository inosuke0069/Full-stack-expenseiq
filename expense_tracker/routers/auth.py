"""
Authentication Router – /api/auth
Handles user registration with OTP verification and login with JWT tokens

Registration Flow:
  1. POST /api/auth/register     → creates inactive user, sends OTP email
  2. POST /api/auth/verify-otp   → verifies OTP, activates account
  3. POST /api/auth/login        → returns JWT token (only for active accounts)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from database import get_db
import models
import schemas
import auth as auth_utils
from utils.otp import generate_otp, verify_otp
from utils.email_service import send_otp_email

router = APIRouter()


# Extra schema for OTP verification
class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

class ResendOTP(BaseModel):
    email: EmailStr


@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Step 1: Creates user with is_active=False, sends 6-digit OTP to email.
    User must verify OTP before they can log in.
    """
    existing = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing:
        if existing.is_active:
            raise HTTPException(status_code=400, detail="Email already registered")
        # Exists but unverified — resend OTP
        otp = generate_otp(user_data.email)
        try:
            send_otp_email(user_data.email, existing.name, otp)
        except Exception:
            pass
        return existing

    new_user = models.User(
        name=user_data.name,
        email=user_data.email,
        hashed_password=auth_utils.hash_password(user_data.password),
        is_active=False
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    otp = generate_otp(user_data.email)
    try:
        send_otp_email(user_data.email, new_user.name, otp)
    except Exception:
        pass

    return new_user


@router.post("/verify-otp")
def verify_otp_endpoint(data: OTPVerify, db: Session = Depends(get_db)):
    """Step 2: Verify OTP and activate the account."""
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_active:
        return {"message": "Account already verified. Please log in."}
    if not verify_otp(data.email, data.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP. Please try again.")

    user.is_active = True
    db.commit()
    return {"message": "Email verified successfully! You can now log in."}


@router.post("/resend-otp")
def resend_otp(data: ResendOTP, db: Session = Depends(get_db)):
    """Resend OTP to the user's email."""
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_active:
        return {"message": "Account already verified."}
    otp = generate_otp(data.email)
    try:
        send_otp_email(data.email, user.name, otp)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to send OTP email")
    return {"message": "OTP resent successfully."}


@router.post("/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """Login — only works for verified accounts."""
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not auth_utils.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account not verified. Please check your email for the OTP.")
    access_token = auth_utils.create_access_token(data={"user_id": user.id})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(auth_utils.get_current_user)):
    """Return the currently authenticated user's profile."""
    return current_user
