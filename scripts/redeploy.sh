#!/usr/bin/env bash
# Re-deploy after a git pull — rebuilds frontend, updates backend deps, restarts service.
# Used by GitHub Actions on every push to main; safe to run manually too.
set -euo pipefail
cd /opt/wmslite

echo "== Pulling latest code =="
git fetch origin main
git reset --hard origin/main

echo "== Updating backend deps =="
cd /opt/wmslite/backend
./venv/bin/pip install -r requirements.txt

echo "== Rebuilding frontend =="
cd /opt/wmslite/frontend
npm ci
npm run build

echo "== Restarting backend service =="
systemctl restart wms-backend

echo "== Reloading nginx (picks up new static build automatically, reload is just a safety net) =="
nginx -t && systemctl reload nginx

echo "== Redeploy complete =="
systemctl status wms-backend --no-pager -l | head -10
