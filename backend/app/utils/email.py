import logging

import resend

from app.config import settings

logger = logging.getLogger(__name__)


async def send_invite_email(
    to_email: str,
    workspace_name: str,
    invite_token: str,
    role: str,
    invited_by_name: str | None = None,
) -> None:
    if not settings.resend_api_key:
        logger.info("RESEND_API_KEY not set, skipping invite email to %s", to_email)
        return

    resend.api_key = settings.resend_api_key
    invite_url = f"{settings.frontend_url}/invite/{invite_token}"
    inviter_line = f"<p style='color:#94a3b8;font-size:14px;margin:0 0 24px'>Invited by <strong style='color:#e2e8f0'>{invited_by_name}</strong></p>" if invited_by_name else ""

    html = f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Courier New',Courier,monospace">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 16px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#161b26;border:1px solid #1e2533;border-radius:6px;overflow:hidden">
        <!-- Header -->
        <tr>
          <td style="padding:28px 32px;border-bottom:1px solid #1e2533">
            <p style="margin:0;font-size:18px;font-style:italic;color:#e2e8f0;letter-spacing:-0.02em">MCPHub</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 24px">
            <p style="color:#64748b;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;margin:0 0 16px">Workspace Invitation</p>
            <h1 style="color:#e2e8f0;font-size:22px;font-style:italic;margin:0 0 8px;font-weight:400">You've been invited to join <strong>{workspace_name}</strong></h1>
            <p style="color:#94a3b8;font-size:14px;margin:0 0 24px">You've been invited as a <strong style="color:#e2e8f0">{role}</strong>.</p>
            {inviter_line}
            <a href="{invite_url}" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:10px 24px;border-radius:4px;font-size:13px;letter-spacing:0.05em">
              Accept invitation
            </a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #1e2533">
            <p style="color:#475569;font-size:11px;margin:0">If you weren't expecting this invitation, you can safely ignore this email.</p>
            <p style="color:#334155;font-size:10px;margin:8px 0 0">Link expires in 7 days: <a href="{invite_url}" style="color:#4f5e75">{invite_url}</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""

    try:
        resend.Emails.send({
            "from": "MCPHub <contact@mail.aniruddha.fyi>",
            "to": [to_email],
            "subject": f"You've been invited to join {workspace_name} on MCPHub",
            "html": html,
        })
    except Exception as exc:
        logger.warning("Invite email delivery failed (to=%s): %s", to_email, exc)
