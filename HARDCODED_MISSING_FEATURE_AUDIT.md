# Hardcoded & Missing Feature Audit

## Executive Summary

This audit identifies hardcoded configuration values, security risks, and feature gaps across the repository. The most critical findings are:

- Multiple environment files and code paths hardcode `localhost` service URLs.
- Sensitive credentials are committed in `Backend/.env`.
- The frontend and backend rely on fallback localhost values instead of enforcing environment configuration.
- Some claimed visualization/chart features are not fully implemented.
- There is limited validation for AI JSON payloads and no end-to-end chart rendering test coverage.

## Hardcoded Configuration Issues

### 1. Localhost URL hardcoding

Files containing hardcoded local URLs:

- `Backend/.env`
  - `CORS_ORIGIN=http://localhost:5173`
  - `PYTHON_SERVICE_URL=http://localhost:5000`
  - `FRONTEND_URL=http://localhost:5173`
  - `GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback`
  - `CLIENT_URL=http://localhost:5173`
- `Frontend/.env`
  - `VITE_API_URL=http://localhost:8000/api/v1`
- `Frontend/src/pages/LoginPage.jsx`
  - fallback Google auth redirect uses `http://localhost:8000/api/v1/auth/google`
- `Frontend/src/pages/ChatPage.jsx`
  - fallback backend origin uses `http://localhost:8000`
- `Frontend/src/utils/api.js`
  - fallback API URL uses `http://localhost:8000/api/v1`
- `Backend/src/app.js`
  - default CORS origin `http://localhost:5173`
- `Backend/src/server.js`
  - default CORS origin `http://localhost:5173`
- `Python-Backend/.env`
  - `NODE_WEBHOOK_URL=http://localhost:8000`
  - `OPENROUTER_SITE_URL=http://localhost:5173`
- `Python-Backend/app/config/settings.py`
  - `OPENROUTER_SITE_URL` defaults to `http://localhost:5173`
  - `NODE_WEBHOOK_URL` defaults to `http://localhost:8000`

### 2. Documentation and README hardcoding

The documentation repeatedly uses `localhost` endpoints for services and examples, including:

- `README.md`
- `README_QUICK_START.md`
- `DEPLOYMENT_GUIDE.md`
- `QUICK_START_DEPLOYMENT.md`
- `OCR_CONFIGURATION_GUIDE.md`
- `FIXES_APPLIED.md`

This increases the risk of misconfiguration in staging or production.

### 3. Insecure committed credentials

`Backend/.env` contains production-like secrets and credentials that should not be committed:

- MongoDB connection string with embedded username/password
- SMTP credentials for `EMAIL_USER` / `EMAIL_PASS`
- JWT secret strings

These should be removed from version control and moved to an example environment file.

## Functional and Feature Gaps

### 4. Visualization feature claims vs implementation

The AI prompt schema claims support for chart types including `composed`.

- `Python-Backend/app/config/prompts.py` includes `composed` in the allowed chart type list.
- `Frontend/src/components/DataVisualization.jsx` does not implement a `composed` chart renderer.

This is a missing feature / inconsistency between prompt contract and UI implementation.

### 5. AI JSON output validation is weak

The Python backend and frontend assume the AI returns a strict JSON object. In practice, model output can be malformed or wrapped in markdown.

- `Python-Backend/app/api/routes.py` and `Python-Backend/app/services/rag_service.py` return raw `visualizations` if available.
- `Frontend/src/components/Message.jsx` and `Frontend/src/components/DataVisualization.jsx` attempt to parse JSON from text, but there is no explicit fallback display or error handling for malformed payloads.

This makes the visualization feature fragile and can lead to raw JSON being displayed instead of charts.

### 6. Chat socket and API origin discovery is brittle

The socket connection flow in `Frontend/src/pages/ChatPage.jsx` relies on parsing `VITE_API_URL` and falling back to `http://localhost:8000`.

- If `VITE_API_URL` is missing or malformed, socket connection may fail silently.
- The app assumes API and socket host are the same origin, which may not hold for some production deployments.

### 7. OAuth redirect and auth URL construction is partial

`Frontend/src/pages/LoginPage.jsx` builds a Google auth redirect URL via string manipulation from `VITE_API_URL`.

- This is fragile and not centralized behind a dedicated config helper.
- If the backend path changes, the auth redirect logic may break.

### 8. Missing chart export or interaction support

The product claims interactive visualizations, but in the chat UI:

- there is no explicit chart export/download functionality,
- no chart type selector for AI-generated charts,
- no user control for toggling between multiple series or chart modes.

These are feature gaps relative to the UI/analytics experience.

### 9. Limited test and validation coverage

There is no evidence of dedicated automated tests for:

- JSON visualization parsing
- chart rendering from AI output
- socket-based document status updates
- environment variable configuration fallbacks

This makes it harder to verify the hardcoded / missing features are fixed.

## Recommended Actions

1. Remove secrets from `Backend/.env` and replace them with a safe `.env.example`.
2. Replace localhost fallbacks with explicit required environment configuration, and/or add a documented `ENVIRONMENT=development|production` guard.
3. Centralize API/sockets/auth URLs behind config utilities instead of inline fallbacks.
4. Implement `composed` chart rendering in `Frontend/src/components/DataVisualization.jsx` if the prompt contract still includes it.
5. Add robust validation and fallback handling for malformed AI JSON in both Python and frontend code.
6. Add a repo-level audit or check to ensure documentation URLs are environment-agnostic where appropriate.
7. Add tests for AI visualization ingestion and rendering logic.

## Files Reviewed

- Backend/.env
- Frontend/.env
- Python-Backend/.env
- Frontend/src/pages/LoginPage.jsx
- Frontend/src/pages/ChatPage.jsx
- Frontend/src/utils/api.js
- Backend/src/app.js
- Backend/src/server.js
- Python-Backend/app/config/settings.py
- Python-Backend/app/config/prompts.py
- Python-Backend/app/api/routes.py
- Frontend/src/components/Message.jsx
- Frontend/src/components/DataVisualization.jsx
- README.md
- README_QUICK_START.md
- DEPLOYMENT_GUIDE.md
- QUICK_START_DEPLOYMENT.md
- OCR_CONFIGURATION_GUIDE.md
- FIXES_APPLIED.md
