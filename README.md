# WMS Lite — Delaplex

15-module warehouse management system. FastAPI + SQLAlchemy backend, React/TypeScript/Vite frontend, MySQL in production. **Native deployment — no Docker.**

## Repository layout

```
backend/    FastAPI app (runs via a Python venv + systemd service)
frontend/   React/Vite app (built with npm, served as static files by nginx)
deploy/
  nginx-wmslite.conf     nginx site config (serves frontend, proxies /api/ to the backend)
  wms-backend.service    systemd unit that runs the FastAPI backend
scripts/
  setup-server.sh        one-time VPS setup (installs everything, first build)
  redeploy.sh            re-run on every update (git pull, rebuild, restart) — also used by CI
.github/workflows/deploy.yml   auto-deploys on every push to main via SSH
```

## One-time VPS setup

1. **Clone the repo onto the server:**
   ```bash
   mkdir -p /opt/wmslite
   cd /opt/wmslite
   git clone https://github.com/kondparthi/wmslite.git .
   ```

2. **Run the setup script** (installs Python, Node, nginx, MySQL; creates the DB; builds the venv; builds the frontend; wires up nginx + systemd):
   ```bash
   chmod +x scripts/setup-server.sh scripts/redeploy.sh
   ./scripts/setup-server.sh
   ```
   It will prompt for a MySQL database name/user/password, then pause so you can edit `backend/.env` with real values (JWT secret, admin password, etc.) before continuing. Follow the on-screen prompts.

3. Visit `http://201.18.214.64` — you should see the WMS Lite login page.

## Setting up auto-deploy (GitHub Actions)

In the GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**, add:

| Secret name | Value |
|---|---|
| `VPS_HOST` | `201.18.214.64` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | The **private** SSH key that can log into the VPS (paste the full contents, including `-----BEGIN ... PRIVATE KEY-----` lines) |
| `VPS_PORT` | `22` (optional — defaults to 22 if omitted) |

Once these are set, every push to `main` runs `scripts/redeploy.sh` on the server over SSH from GitHub's own servers: `git pull`, reinstall any new backend deps, rebuild the frontend, restart the `wms-backend` systemd service, reload nginx.

The server's `backend/.env` file is never touched by this process — it's git-ignored and stays put.

### Generating a dedicated SSH key for this (recommended over reusing your personal root key)

On your own machine or on the VPS:
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ./wmslite_deploy_key -N ""
```
Then:
- Append `wmslite_deploy_key.pub` to `/root/.ssh/authorized_keys` **on the VPS**
- Paste the contents of `wmslite_deploy_key` (the private key) into the `VPS_SSH_KEY` GitHub secret
- Delete the local copies of both files once they're in place

## Manual redeploy (without GitHub Actions)

SSH in and run:
```bash
cd /opt/wmslite && ./scripts/redeploy.sh
```

## Domain & HTTPS

To point `wms.delaplex.digital` at this VPS:
1. Add an **A record** for `wms.delaplex.digital` → `201.18.214.64` in your DNS provider.
2. Once DNS resolves, install Certbot and issue a certificate for the nginx site:
   ```bash
   apt-get install -y certbot python3-certbot-nginx
   certbot --nginx -d wms.delaplex.digital
   ```
   Certbot edits the nginx config in place and sets up auto-renewal.

(Ask me to help once DNS is confirmed pointed — not wired in yet.)

## Local development (unchanged)

- Backend: `cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload`
- Frontend: `cd frontend && npm install && npm run dev`
