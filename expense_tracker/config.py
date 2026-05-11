"""
Configuration – reads from .env file via pydantic-settings

FIXES APPLIED:
  - BUG 1: MAIL_* field names now match .env keys exactly
  - BUG 2: DATABASE_URL now read directly (was being ignored)
  - BUG 6: SECRET_KEY is now separate from MAIL_PASSWORD (was a security risk)
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────────
    # BUG 2 FIX: DATABASE_URL is now the primary connection string (matches .env)
    DATABASE_URL: str = "postgresql://postgres:root@localhost:5432/smart_expense_tracker"

    # Individual DB fields kept as convenient fallbacks
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "smart_expense_tracker"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "root"

    # ── JWT Auth ──────────────────────────────────────────────────────────
    # BUG 6 FIX: SECRET_KEY must NOT be the Gmail password.
    # Add a proper SECRET_KEY=<random-long-string> line to your .env file.
    SECRET_KEY: str = "change-this-to-a-long-random-secret-in-dot-env"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # ── Email (SMTP via Gmail) ─────────────────────────────────────────────
    # BUG 1 FIX: All field names now match .env keys exactly
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
