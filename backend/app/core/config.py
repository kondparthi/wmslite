"""
App configuration.

Production target: MySQL (set DATABASE_URL, e.g.
  mysql+pymysql://wms_user:PASSWORD@localhost:3306/wms_lite
).

For local development/testing without a MySQL server available, DATABASE_URL
falls back to a local SQLite file (./wms_lite_dev.db). SQLAlchemy is dialect-
agnostic, so every model/router below works unchanged against either — just
point DATABASE_URL at MySQL when you deploy.
"""
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./wms_lite_dev.db")

# Comma-separated list of origins allowed to call this API (the React dev
# server + production frontend domain). Override via .env in each environment.
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5183,http://127.0.0.1:5183",
).split(",")

# --- Auth ---
# IMPORTANT: set a real, random JWT_SECRET_KEY in production (.env). This
# default is only for local dev — anyone who knows it can forge login tokens.
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-only-change-me-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # 8 hours

# Seeded on first run if no users exist yet, so the client can log in
# immediately without touching the database by hand. Change/remove after
# first login in a real deployment.
DEFAULT_TENANT_ID = os.getenv("DEFAULT_TENANT_ID", "DELAPLEX-WH01")
DEFAULT_ADMIN_USERNAME = os.getenv("DEFAULT_ADMIN_USERNAME", "admin")
DEFAULT_ADMIN_EMAIL = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@delaplex.digital")
DEFAULT_ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD", "Admin@123")

# --- Remember Me / password reset ---
REMEMBER_ME_EXPIRE_DAYS = int(os.getenv("REMEMBER_ME_EXPIRE_DAYS", "30"))
RESET_CODE_EXPIRE_MINUTES = int(os.getenv("RESET_CODE_EXPIRE_MINUTES", "10"))
RESET_CODE_MAX_ATTEMPTS = int(os.getenv("RESET_CODE_MAX_ATTEMPTS", "5"))

# --- Outgoing email (used for password-reset codes) ---
# If SMTP_HOST is empty, no email is sent: the code is written to the backend
# log instead (journalctl -u wms-backend) so the flow can still be tested.
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "") or SMTP_USERNAME
SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "false").lower() == "true"  # true = implicit SSL (port 465)
