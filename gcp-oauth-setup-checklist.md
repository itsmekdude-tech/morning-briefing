# GCP + OAuth Setup Checklist — Morning Briefing Agent (Local Dev)

> CLI-first setup. Browser is required only for two steps (OAuth consent screen
> and creating the Web OAuth Client) — Google deliberately does not expose
> those via API. Everything else is `gcloud`.
>
> Estimated time: 10–15 minutes. No billing account or credit card required.

---

## Part 0 — Prerequisites (one-time)

- [ ] Install the gcloud CLI:
  ```bash
  brew install --cask google-cloud-sdk
  ```
- [ ] Verify install:
  ```bash
  gcloud --version
  ```
- [ ] Authenticate with the Google account you'll use as the **test user**:
  ```bash
  gcloud auth login
  ```
  *(Opens a browser once for the gcloud login itself — separate from the app OAuth.)*

---

## Part 1 — Create the GCP Project (CLI)

- [ ] Pick a globally-unique project ID (lowercase, 6–30 chars, hyphens ok):
  ```bash
  export PROJECT_ID="morning-briefing-$(whoami)-$(date +%s | tail -c 5)"
  echo "Project ID: $PROJECT_ID"
  ```
- [ ] Create the project:
  ```bash
  gcloud projects create "$PROJECT_ID" --name="Morning Briefing"
  ```
- [ ] Set it as your active project:
  ```bash
  gcloud config set project "$PROJECT_ID"
  ```
- [ ] Verify:
  ```bash
  gcloud config get-value project
  ```

---

## Part 2 — Enable the APIs (CLI)

- [ ] Enable all three APIs in one call:
  ```bash
  gcloud services enable \
    gmail.googleapis.com \
    calendar-json.googleapis.com \
    people.googleapis.com
  ```
- [ ] Verify:
  ```bash
  gcloud services list --enabled --filter="config.name:(gmail OR calendar OR people)"
  ```
  Should list all three.

---

## Part 3 — OAuth Consent Screen ⚠️ BROWSER REQUIRED

> No `gcloud` command exists for this. The consent screen, scope registration,
> and test-user list can only be configured through the web console.

- [ ] Open the consent screen page directly:
  ```bash
  open "https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID"
  ```
- [ ] User Type: **External** → **Create**.

### App information
- [ ] App name: `Morning Briefing`
- [ ] User support email: your email
- [ ] Developer contact email: your email (at bottom)
- [ ] Leave everything else blank → **Save and Continue**

### Scopes
- [ ] Click **Add or Remove Scopes**, check:
  - [ ] `.../auth/userinfo.email`
  - [ ] `.../auth/userinfo.profile`
  - [ ] `openid`
  - [ ] `https://www.googleapis.com/auth/gmail.readonly`   *(restricted)*
  - [ ] `https://www.googleapis.com/auth/calendar.readonly` *(sensitive)*
- [ ] **Update** → **Save and Continue**

### Test users
- [ ] **Add Users** → your Gmail address → **Add** → **Save and Continue**
- [ ] **Back to Dashboard**

Verify: publishing status reads **Testing**.

---

## Part 4 — OAuth Client ID ⚠️ BROWSER REQUIRED

> Also no `gcloud` for generic Web OAuth clients. (`gcloud iap oauth-clients`
> only works for Identity-Aware Proxy backends, not what we need.)

- [ ] Open the credentials page:
  ```bash
  open "https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
  ```
- [ ] **+ Create Credentials** → **OAuth client ID**
- [ ] Application type: **Web application**
- [ ] Name: `morning-briefing-local`

### Authorized JavaScript origins
- [ ] `http://localhost:5173`   *(Vite dev server)*
- [ ] `http://localhost:8000`   *(FastAPI dev server)*

### Authorized redirect URIs
- [ ] `http://localhost:8000/auth/callback`

- [ ] **Create** → modal shows Client ID + Client Secret
- [ ] Click **Download JSON** → save as `~/Downloads/google-client.json`

---

## Part 5 — Wire Credentials Into Your Project (CLI)

- [ ] Move the JSON into your project:
  ```bash
  mkdir -p secrets
  mv ~/Downloads/client_secret_*.json secrets/google-client.json
  ```
- [ ] Make sure secrets are gitignored:
  ```bash
  grep -qxF 'secrets/' .gitignore 2>/dev/null || echo 'secrets/' >> .gitignore
  grep -qxF '.env' .gitignore 2>/dev/null || echo '.env' >> .gitignore
  ```
- [ ] Generate a `.env` directly from the downloaded JSON:
  ```bash
  CLIENT_ID=$(jq -r '.web.client_id' secrets/google-client.json)
  CLIENT_SECRET=$(jq -r '.web.client_secret' secrets/google-client.json)
  cat > .env <<EOF
  GOOGLE_CLIENT_ID=$CLIENT_ID
  GOOGLE_CLIENT_SECRET=$CLIENT_SECRET
  GOOGLE_REDIRECT_URI=http://localhost:8000/auth/callback
  EOF
  ```
- [ ] Sanity check:
  ```bash
  cat .env
  ```

*(If you don't have `jq`: `brew install jq`.)*

---

## Part 6 — Verify the Flow End-to-End

Prove the auth handshake works before building the real pipeline.

- [ ] Install minimal deps:
  ```bash
  pip install fastapi uvicorn 'authlib>=1.3' httpx python-dotenv itsdangerous
  ```
- [ ] Stand up a minimal `main.py` with `/auth/start` + `/auth/callback`
  *(ask Claude to scaffold this if you want a working starter)*.
- [ ] Run:
  ```bash
  uvicorn main:app --reload --port 8000
  ```
- [ ] Open: `http://localhost:8000/auth/start`
- [ ] Google consent screen appears with the **Morning Briefing** app name.
- [ ] **Unverified app** warning → **Advanced** → **Go to Morning Briefing (unsafe)**.
  *(Normal in Testing mode. Test users only; non-test-users would be blocked.)*
- [ ] Approve scopes → redirected back to `/auth/callback?code=...`
- [ ] Console prints `access_token`, `refresh_token`, `expires_in`, `id_token`. ✅

---

## Useful gcloud Commands for Later

```bash
# List your projects
gcloud projects list

# Switch project
gcloud config set project <PROJECT_ID>

# See what APIs are enabled
gcloud services list --enabled

# Disable an API (e.g. cleanup)
gcloud services disable gmail.googleapis.com

# Delete the project entirely (30-day grace period)
gcloud projects delete "$PROJECT_ID"

# Inspect your auth state
gcloud auth list
```

---

## Gotchas

- **Refresh token only returned on first consent.** If you don't see `refresh_token`, add `access_type=offline` and `prompt=consent` to the auth URL — and revoke previous grants at https://myaccount.google.com/permissions before retrying.
- **`redirect_uri_mismatch`** → the URI in your code must match the Credentials page exactly (trailing slash, http vs https, port).
- **Testing-mode refresh tokens expire after 7 days.** Re-consent, or move to Production (requires verification) for long-lived tokens.
- **100 test user cap** in Testing mode. Fine for solo dev.
- **Scope changes require re-consent.** Adding a scope later forces all test users to re-authorize.

---

## Going to Production (for reference, not v1)

Going from Testing → Production for `gmail.readonly` requires:

1. Publicly hosted privacy policy + ToS.
2. YouTube demo video showing the OAuth flow + how each scope is used.
3. **CASA security assessment** (third-party audit) — required for restricted scopes.
4. Google's app verification (4–8 week review).

For v1 personal use, stay in Testing mode with yourself as the only test user.

---

*Setup checklist · v0.2 · 2026-05-23*
