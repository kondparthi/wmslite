"""
Minimal SMTP sender for system emails (password-reset codes).

Configure SMTP_* in backend/.env. With no SMTP_HOST set, nothing is sent and
the message is written to the log instead, so the reset flow can still be
exercised on a server that has no mail account yet.
"""
import logging
import smtplib
from email.message import EmailMessage

from app.core import config

log = logging.getLogger("wms.mailer")


def send_email(to_address: str, subject: str, body: str) -> bool:
    """Returns True if handed to an SMTP server, False if logged only / failed."""
    if not config.SMTP_HOST:
        log.warning("SMTP not configured — email NOT sent. To=%s Subject=%s\n%s", to_address, subject, body)
        return False

    msg = EmailMessage()
    msg["From"] = config.SMTP_FROM or config.SMTP_USERNAME
    msg["To"] = to_address
    msg["Subject"] = subject
    msg.set_content(body)
    try:
        if config.SMTP_USE_SSL:
            server = smtplib.SMTP_SSL(config.SMTP_HOST, config.SMTP_PORT, timeout=15)
        else:
            server = smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=15)
            server.starttls()
        with server:
            if config.SMTP_USERNAME:
                server.login(config.SMTP_USERNAME, config.SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception:  # noqa: BLE001 — never let a mail failure break the API
        log.exception("Failed to send email to %s", to_address)
        return False
