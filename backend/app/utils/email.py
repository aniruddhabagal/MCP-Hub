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
    inviter_line = f"<p class='text-secondary' style='color:#475569;font-size:14px;margin:0 0 24px'>Invited by <strong class='text-primary' style='color:#0f172a'>{invited_by_name}</strong></p>" if invited_by_name else ""

    html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root {{
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }}
    @media (prefers-color-scheme: dark) {{
      .bg-body {{ background: #0f1117 !important; }}
      .bg-card {{ background: #161b26 !important; }}
      .border-card {{ border-color: #1e2533 !important; }}
      .border-divider {{ border-color: #1e2533 !important; }}
      .text-primary {{ color: #e2e8f0 !important; }}
      .text-secondary {{ color: #94a3b8 !important; }}
      .text-tertiary {{ color: #475569 !important; }}
      .text-quaternary {{ color: #334155 !important; }}
      .text-link {{ color: #4f5e75 !important; }}
      .text-workspace {{ color: #64748b !important; }}
    }}
  </style>
</head>
<body class="bg-body" style="margin:0;padding:0;background:#f8fafc;font-family:'Courier New',Courier,monospace">
  <table width="100%" cellpadding="0" cellspacing="0" class="bg-body" style="background:#f8fafc;padding:40px 16px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" class="bg-card border-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
        <!-- Header -->
        <tr>
          <td class="border-divider" style="padding:28px 32px;border-bottom:1px solid #e2e8f0">
            <p class="text-primary" style="margin:0;font-size:18px;font-style:italic;color:#0f172a;letter-spacing:-0.02em">MCPHub</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 24px">
            <p class="text-workspace" style="color:#475569;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;margin:0 0 16px">Workspace Invitation</p>
            <h1 class="text-primary" style="color:#0f172a;font-size:22px;font-style:italic;margin:0 0 8px;font-weight:400">You've been invited to join <strong class="text-primary" style="color:#0f172a">{workspace_name}</strong></h1>
            <p class="text-secondary" style="color:#475569;font-size:14px;margin:0 0 24px">You've been invited as a <strong class="text-primary" style="color:#0f172a">{role}</strong>.</p>
            {inviter_line}
            <a href="{invite_url}" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:10px 24px;border-radius:4px;font-size:13px;letter-spacing:0.05em">
              Accept invitation
            </a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td class="border-divider" style="padding:20px 32px;border-top:1px solid #e2e8f0">
            <p class="text-tertiary" style="color:#64748b;font-size:11px;margin:0">If you weren't expecting this invitation, you can safely ignore this email.</p>
            <p class="text-quaternary" style="color:#94a3b8;font-size:10px;margin:8px 0 0">Link expires in 7 days: <a href="{invite_url}" class="text-link" style="color:#64748b">{invite_url}</a></p>
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
