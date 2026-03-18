# finclair
System for Analysis, Verification, and Forecasting Based on Financial Reporting.

## Services
- `auth-service` (Spring Boot): registration/login/JWT + roles.
- `analysis-service` (ASP.NET Core + PostgreSQL): teams, report upload, auditor workflow.
- `frontend` (Vite + React + JS): role-based UI for all workflows.

## Run all services in Docker
```bash
cd docker
docker compose up --build
```

Ports:
- `frontend`: `http://localhost:5173`
- `auth-service`: `http://localhost:8081`
- `analysis-service`: `http://localhost:8001`

## Run frontend locally (optional dev mode)
```bash
cd frontend
npm install
npm run dev
```

Frontend dev URL:
- `http://localhost:5173`

Vite proxy routes:
- `/auth-api/*` -> `http://localhost:8081/*`
- `/analysis-api/*` -> `http://localhost:8001/*`

## Key analysis workflow
1. Leader creates a team and adds auditors.
2. Client uploads an Excel report to a team.
3. Leader assigns the report to an auditor.
4. Auditor runs algorithm checks (`appropriate` / `not appropriate`).
5. Auditor submits official verdict.
6. Leader publishes final approve/reject decision.
