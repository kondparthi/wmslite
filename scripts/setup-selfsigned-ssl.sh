#!/usr/bin/env bash
# One-time: generates a self-signed SSL certificate for the bare IP (201.18.214.64)
# and switches nginx to serve HTTPS on 443, with plain HTTP on 80 redirecting to it.
#
# NOTE: No certificate authority issues trusted certs for bare IP addresses, so
# browsers will show a one-time "not secure / proceed anyway" warning — this is
# expected and not fixable without a real domain name pointed at this server.
set -euo pipefail

CERT_DIR=/etc/ssl/wmslite
IP="201.18.214.64"

mkdir -p "$CERT_DIR"

echo "== Generating a 10-year self-signed certificate for $IP =="
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout "$CERT_DIR/selfsigned.key" \
    -out "$CERT_DIR/selfsigned.crt" \
    -subj "/CN=$IP" \
    -addext "subjectAltName=IP:$IP"

echo "== Installing HTTPS nginx site =="
cp /opt/wmslite/deploy/nginx-wmslite-ssl.conf /etc/nginx/sites-available/wmslite
nginx -t
systemctl reload nginx

echo "== Done =="
echo "Visit: https://$IP  (your browser will warn it's not CA-trusted — click through/accept once)"
