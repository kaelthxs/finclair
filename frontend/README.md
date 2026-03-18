# Finclair Frontend (Vite + React + JS)

## Requirements
- Node.js 20+
- npm 10+

## Install
```bash
cd frontend
npm install
```

## Run dev server
```bash
npm run dev
```

Vite runs on `http://localhost:5173` and proxies requests:
- `/auth-api/*` -> `http://localhost:8081/*` (`auth-service`)
- `/analysis-api/*` -> `http://localhost:8001/*` (`analysis-service`)

## Build
```bash
npm run build
npm run preview
```

## Run in Docker (with backend services)
```bash
cd ../docker
docker compose up --build
```

Frontend URL in Docker:
- `http://localhost:5173`

## Implemented screens
- Auth (login/register)
- Leader dashboard
- Add auditor to team
- Assign auditor to report
- Leader final decision
- Auditor dashboard
- Auditor file analysis with red/orange/green hints
- Client upload page
- Role management
- Full workflow map

## Token behavior
- Access token refresh is automatic.
- There is no manual refresh screen.
- Logout button with confirm modal is in the header on all protected screens.
