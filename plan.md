# Plan: Fix Multi-Tenant Invite & Workspace Flow Edge Cases

## Context

The signup/invite/workspace flow works for individuals but breaks down for company/org use. When an admin invites employees, several edge cases cause confusion: employees who sign up before seeing their invite get stuck with orphan workspaces; the `?next=` redirect after login/signup is broken so users never return to the invite page; there's no visibility into pending invites; login always defaults to the personal workspace; and **invite emails are never sent** — the invite token is only returned in the API response with no delivery mechanism. This plan fixes all of these and adds Resend email delivery for invites.

---

## Edge Cases Being Fixed

1. **`?next=` redirect is broken** — Login/signup always redirect to `/dashboard`, ignoring the `?next=/invite/{token}` param.
2. **Signup via invite creates unnecessary friction** — User signs up, lands on dashboard, has to re-click invite link.
3. **No pending invite visibility** — No way to discover pending invites except the original link.
4. **No invite emails sent** — Invite token is only returned in the API response. If the admin doesn't manually share it, the invitee never learns about the invite.
5. **Login always defaults to personal workspace** — Should prefer org workspace, then last-used, then personal.
6. **Role upgrade via invite fails** — Re-inviting a member as admin returns `400 "Already a member"`.
7. **Accept-invite doesn't store tokens** — `apiAcceptInvite` types response as `{ message: string }` but backend returns `TokenResponse`.

---

## Implementation Plan

### Step 1: Add `resend` dependency + config

**File:** `backend/requirements.txt`

- Add `resend==2.5.0`

**File:** `backend/app/config.py`

- Add settings:
  ```python
  resend_api_key: str = ""
  frontend_url: str = "http://localhost:3000"
  ```

**File:** `.env.example`

- Add:
  ```
  RESEND_API_KEY=re_xxxxxxxxxxxx
  FRONTEND_URL=http://localhost:3000
  ```

---

### Step 2: Create email utility — `backend/app/utils/email.py`

**New file:** `backend/app/utils/email.py`

Sends invite emails via Resend SDK. Fire-and-forget pattern (matches existing `notifiers.py` style — log failures, never raise).

```python
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

    # Build HTML email (clean, minimal styling)
    html = f"""..."""  # Invite email template with workspace name, role, CTA button

    try:
        resend.Emails.send({
            "from": "MCPHub <contact@mail.aniruddha.fyi>",
            "to": [to_email],
            "subject": f"You've been invited to join {workspace_name} on MCPHub",
            "html": html,
        })
    except Exception as exc:
        logger.warning("Invite email delivery failed (to=%s): %s", to_email, exc)
```

Key design decisions:

- From address: `MCPHub <contact@mail.aniruddha.fyi>` (domain: `mail.aniruddha.fyi`)
- Graceful degradation: if `RESEND_API_KEY` is empty, skip silently (dev environments)
- The SDK's `Emails.send()` is synchronous — call it directly (it's a simple HTTP POST, fast enough for serverless)

---

### Step 3: Alembic migration — add `last_workspace_id` to User

**File:** `backend/app/models/user.py`

- Add column: `last_workspace_id = Column(UUID, ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True)`

**New file:** `backend/alembic/versions/0003_user_last_workspace.py`

- Add `last_workspace_id` UUID column to `users` table, nullable, FK to `workspaces.id` with SET NULL on delete

---

### Step 4: Backend schemas — `PendingInviteResponse`, update `SignupRequest`, update `MeResponse`

**File:** `backend/app/schemas/auth.py`

- Add `invite_token: str | None = None` to `SignupRequest`
- Add new schema:
  ```python
  class PendingInviteResponse(BaseModel):
      token: str
      workspace_name: str
      workspace_id: uuid.UUID
      role: str
      expires_at: datetime
  ```
- Add `pending_invites: list[PendingInviteResponse] = []` to `MeResponse`

---

### Step 5: Backend auth router — all endpoint changes

**File:** `backend/app/routers/auth.py`

**5a. Signup with `invite_token` auto-accept (fixes edge case 2)**

- After creating user + personal workspace, check if `body.invite_token` is provided
- If provided: validate invite (exists, not expired, not accepted, email matches signup email)
- If valid: create `WorkspaceMember` for the invited workspace, mark invite accepted, issue JWT scoped to the **invited workspace** (not personal), set `user.last_workspace_id`
- If invalid: silently ignore, issue JWT scoped to personal workspace as normal
- Personal workspace is always created (safety net)

**5b. Login with smart workspace selection (fixes edge case 5)**

- Change workspace selection from `prefer owned, else first` to:
  1. Prefer `last_workspace_id` if set and user is still a member
  2. Else prefer an **org workspace** (one where role != "owner", i.e. user was invited) — this covers the common case where an employee belongs to both personal + company workspaces
  3. Else prefer owned workspace
  4. Else first workspace
- After selection, update `user.last_workspace_id` and flush

**5c. Refresh with same workspace selection (fixes edge case 5)**

- Same selection logic as login

**5d. Switch-workspace updates `last_workspace_id`**

- After successful switch, set `user.last_workspace_id = workspace.id` and flush

**5e. Accept-invite handles role upgrade (fixes edge case 6)**

- In the "already a member" check, instead of raising 400:
  - If invite role ranks higher than current role (member→admin), upgrade the role
  - If same or lower rank, raise `400 "Already a member with equal or higher role"`
  - Role hierarchy: `member=0, admin=1` (owner can never be assigned via invite)

**5f. `/auth/me` returns pending invites (fixes edge case 3)**

- Query `workspace_invites` where `email = user.email AND accepted_at IS NULL AND expires_at > now()`
- Join with `workspaces` to get workspace name
- Return as `pending_invites` in `MeResponse`

---

### Step 6: Backend workspaces router — send invite emails + duplicate handling

**File:** `backend/app/routers/workspaces.py`

**6a. Send invite email on invite creation (fixes edge case 4)**

- In `invite_member` endpoint (line 176), after creating the `WorkspaceInvite` row:
  - Look up the workspace name (already resolved via `_resolve_workspace`)
  - Call `send_invite_email(to_email=body.email, workspace_name=ws.name, invite_token=token, role=body.role, invited_by_name=user.display_name)`
  - Import from `app.utils.email`

**6b. Duplicate invite handling**

- Before creating a new invite, check for existing pending (unaccepted, non-expired) invite for the same email + workspace
- If found, delete the old one and create the new one (with fresh token + expiry)
- This prevents token accumulation and allows re-inviting with a different role — the new email will have the correct link

---

### Step 7: Frontend types

**File:** `frontend/src/lib/types.ts`

- Add `PendingInvite` interface: `{ token, workspace_name, workspace_id, role, expires_at }`
- Ensure `MeResponse` includes optional `pending_invites?: PendingInvite[]`
- Ensure `TokenResponse` type exists and is exported (for accept-invite fix)

---

### Step 8: Frontend api.ts — fix `apiAcceptInvite` return type (fixes edge case 7)

**File:** `frontend/src/lib/api.ts` (line 145-146)

- Change `apiFetch<{ message: string }>` to `apiFetch<TokenResponse>`
- Import `TokenResponse` from types

---

### Step 9: Frontend auth.ts — add `inviteToken` to signup, `pendingInvites` to state, `acceptInvite` method

**File:** `frontend/src/lib/auth.ts`

- Add `pendingInvites: PendingInvite[]` to `AuthState` interface
- Add `acceptInvite: (token: string) => Promise<void>` to `AuthState` interface
- Update `signup` signature: add optional `inviteToken?: string` param, include in request body as `invite_token`
- Add `pendingInvites` state, populate from `loadMe` response (`data.pending_invites ?? []`)
- Add `acceptInvite` method: calls `apiAcceptInvite`, stores returned access_token + refresh_token, calls `loadMe`

---

### Step 10: Frontend LoginForm — handle `?next=` redirect (fixes edge case 1)

**File:** `frontend/src/components/auth/LoginForm.tsx`

- Import `useSearchParams` from `next/navigation`
- Read `next` query param
- After login success, redirect to `next || '/dashboard'`
- Validate `next` starts with `/` to prevent open redirect
- Pass `next` through to signup link: `/signup?next=...`

**File:** `frontend/src/app/login/page.tsx`

- Wrap LoginForm usage in `<Suspense>` (required for `useSearchParams` in App Router)

---

### Step 11: Frontend SignupForm — handle `?next=` redirect + pass invite token (fixes edge case 2)

**File:** `frontend/src/components/auth/SignupForm.tsx`

- Import `useSearchParams`
- Read `next` query param
- Extract invite token if `next` matches `/invite/<token>` pattern
- Pass `inviteToken` to `auth.signup(email, displayName, password, inviteToken)`
- After signup, redirect to `/dashboard` (backend already auto-accepted via invite_token, JWT scoped to company workspace)
- If no invite token, redirect to `next || '/dashboard'`

**File:** `frontend/src/app/signup/page.tsx`

- Wrap SignupForm usage in `<Suspense>`

---

### Step 12: Frontend invite page — store tokens properly (fixes edge case 7)

**File:** `frontend/src/app/invite/[token]/page.tsx`

- Use `auth.acceptInvite(token)` instead of raw `apiAcceptInvite(token)`
- This stores the returned JWT tokens and reloads auth state
- After success, redirect to `/dashboard` (now scoped to correct workspace)

---

### Step 13: Frontend PendingInviteBanner + one-time modal (fixes edge case 3)

**New file:** `frontend/src/components/dashboard/PendingInviteBanner.tsx`

- Reads `pendingInvites` from `useAuth()`
- If empty, renders nothing
- If non-empty, renders a banner for each invite: "You've been invited to join **{workspace_name}** as {role}" with Accept / Dismiss buttons
- Accept calls `auth.acceptInvite(token)` then reloads
- Styled consistently with existing dashboard components (use existing card/badge patterns)

**New file:** `frontend/src/components/dashboard/PendingInviteModal.tsx`

- On first login after an invite exists, show a dialog/modal listing pending invites with Accept / Later buttons
- Track "already shown" in `sessionStorage` (key: `mcphub_invite_modal_shown`) so it only appears once per session
- Uses shadcn `Dialog` component for consistency
- After Accept, calls `auth.acceptInvite(token)`, closes modal, refreshes state
- "Later" dismisses the modal; the dashboard banner remains visible as a fallback

**File:** `frontend/src/app/dashboard/page.tsx`

- Mount `<PendingInviteModal />` (one-time modal)
- Mount `<PendingInviteBanner />` at the top, before the header (persistent until acted on)

---

## Execution Order

1. Steps 1-2 (resend dependency, config, email utility)
2. Step 3 (migration + model)
3. Step 4 (schemas)
4. Steps 5 + 6 (backend router changes — auth + workspaces)
5. Steps 7 + 8 (frontend types + api fix)
6. Step 9 (auth.ts)
7. Steps 10 + 11 (login/signup form redirects)
8. Step 12 (invite page token storage)
9. Step 13 (pending invite banner + modal)

---

## Verification

1. **Invite email delivery:** Admin invites user → Resend email arrives with correct workspace name, role, and invite link pointing to `/invite/{token}`
2. **Signup via invite link:** Click invite email → "Create account" → signup → should land on company workspace dashboard directly (no second step)
3. **Login via invite link:** Click invite email → "Sign in" → login → should redirect back to `/invite/{token}` → auto-accept → land on company workspace
4. **Pending invites modal (first login):** Login normally with pending invite → modal appears once → click Accept → switch to company workspace. Refresh page → modal does NOT reappear (sessionStorage flag), but banner still visible
5. **Pending invites banner:** Dismiss modal → dashboard banner still shows pending invites → click Accept → switch to company workspace
6. **Role upgrade:** Invite existing member with higher role → accept → role is upgraded
7. **Workspace default preference:** User in both personal + org workspaces → logout → login → should default to org workspace (not personal)
8. **Last workspace memory:** Switch to a specific workspace → logout → login → should default to that workspace
9. **Accept-invite stores tokens:** Accept invite → verify JWT is updated, workspace switcher shows new workspace
10. **Personal workspace still exists:** After all flows, personal workspace remains accessible in switcher
11. **Graceful degradation:** If `RESEND_API_KEY` is empty (dev), invite creation still succeeds, just no email sent
