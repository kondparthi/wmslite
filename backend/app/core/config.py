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
