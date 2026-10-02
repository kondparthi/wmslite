#!/usr/bin/env bash
# One-time VPS setup for WMS Lite — native install, no Docker.
# Run as root on a fresh Ubuntu 26.04 VPS, from inside the cloned repo (/opt/wmslite).
set -euo pipefail

echo "== Installing system packages =="
apt-get update
apt-get install -y --no-install-recommends \
    python3 python3-venv python3-pip \
    nodejs npm \
    nginx \
    mysql-server \
    git curl

echo "== Securing MySQL root user (interactive) =="
echo "If this is a brand-new MySQL install, you may want to run: mysql_secure_installation"

echo "== Creating MySQL database + user for WMS Lite =="
echo "You'll be prompted for the values to use — these must match what you put in backend/.env"
read -rp "MySQL database name [wms_lite]: " DB_NAME
DB_NAME=${DB_NAME:-wms_lite}
read -rp "MySQL app user [wms_user]: " DB_USER
DB_USER=${DB_USER:-wms_user}
read -rsp "MySQL app user password: " DB_PASS
echo

mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

echo "== Setting up backend venv =="
cd /opt/wmslite/backend
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt

if [ ! -f /opt/wmslite/backend/.env ]; then
    cp /opt/wmslite/backend/.env.example /opt/wmslite/backend/.env
    echo ">>> Created backend/.env from the example — edit it now with real values before continuing:"
    echo ">>>   nano /opt/wmslite/backend/.env"
    echo ">>> Make sure DATABASE_URL uses: mysql+pymysql://${DB_USER}:<password>@localhost:3306/${DB_NAME}"
fi

echo "== Building frontend =="
cd /opt/wmslite/frontend
npm ci
echo "VITE_API_BASE_URL=/api" > .env
npm run build

echo "== Installing nginx site =="
cp /opt/wmslite/deploy/nginx-wmslite.conf /etc/nginx/sites-available/wmslite
ln -sf /etc/nginx/sites-available/wmslite /etc/nginx/sites-enabled/wmslite
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "== Installing systemd service for the backend =="
cp /opt/wmslite/deploy/wms-backend.service /etc/systemd/system/wms-backend.service
systemctl daemon-reload
systemctl enable wms-backend
systemctl restart wms-backend

echo "== Done =="
echo "Check status with: systemctl status wms-backend"
echo "Visit: http://201.18.214.64"
