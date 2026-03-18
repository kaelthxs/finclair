#!/usr/bin/env bash
set -euo pipefail

BASE_AUTH="${BASE_AUTH:-http://localhost:8081}"
BASE_ANALYSIS="${BASE_ANALYSIS:-http://localhost:8001}"
EXCEL_FILE="${EXCEL_FILE:-$(cd "$(dirname "$0")" && pwd)/test-report.xlsx}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi

if [[ ! -f "$EXCEL_FILE" ]]; then
  echo "Excel file not found: $EXCEL_FILE" >&2
  exit 1
fi

suffix="$(date +%s)"
LEADER_LOGIN="leader_${suffix}"
AUDITOR_LOGIN="auditor_${suffix}"
CLIENT_LOGIN="client_${suffix}"
COMMON_PASSWORD="P@ssword123"

register_user() {
  local login="$1"
  local role="$2"

  curl -sS -X POST "$BASE_AUTH/auth/register" \
    -H 'Content-Type: application/json' \
    -d "{\"login\":\"${login}\",\"email\":\"${login}@example.com\",\"password\":\"${COMMON_PASSWORD}\",\"firstName\":\"${login}\",\"lastName\":\"Test\",\"preferredLanguage\":\"ru\",\"roleName\":\"${role}\"}" \
    >/dev/null
}

login_user() {
  local identifier="$1"

  curl -sS -X POST "$BASE_AUTH/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"identifier\":\"${identifier}\",\"password\":\"${COMMON_PASSWORD}\"}" |
    jq -r '.accessToken'
}

jwt_sub() {
  python3 - "$1" <<'PY'
import base64
import json
import sys

payload = sys.argv[1].split('.')[1]
payload += '=' * (-len(payload) % 4)
print(json.loads(base64.urlsafe_b64decode(payload))['sub'])
PY
}

echo "[1/8] Register users"
register_user "$LEADER_LOGIN" "LEADER"
register_user "$AUDITOR_LOGIN" "AUDITOR"
register_user "$CLIENT_LOGIN" "CLIENT"

echo "[2/8] Login users"
LEADER_TOKEN="$(login_user "$LEADER_LOGIN")"
AUDITOR_TOKEN="$(login_user "$AUDITOR_LOGIN")"
CLIENT_TOKEN="$(login_user "$CLIENT_LOGIN")"

AUDITOR_USER_ID="$(jwt_sub "$AUDITOR_TOKEN")"

echo "[3/8] Create team"
TEAM_JSON="$(curl -sS -X POST "$BASE_ANALYSIS/api/teams" \
  -H "Authorization: Bearer $LEADER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Demo Team ${suffix}\",\"auditorUserIds\":[\"${AUDITOR_USER_ID}\"]}")"
TEAM_ID="$(echo "$TEAM_JSON" | jq -r '.id')"

echo "Team ID: $TEAM_ID"

echo "[4/8] Upload Excel report as client"
REPORT_JSON="$(curl -sS -X POST "$BASE_ANALYSIS/api/teams/$TEAM_ID/reports/upload" \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -F "file=@$EXCEL_FILE")"
REPORT_ID="$(echo "$REPORT_JSON" | jq -r '.id')"

echo "Report ID: $REPORT_ID"

echo "[5/8] Assign report to auditor"
curl -sS -X POST "$BASE_ANALYSIS/api/reports/$REPORT_ID/assign" \
  -H "Authorization: Bearer $LEADER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"auditorUserId\":\"${AUDITOR_USER_ID}\"}" >/dev/null

echo "[6/8] Run algorithm as auditor"
curl -sS -X POST "$BASE_ANALYSIS/api/reports/$REPORT_ID/run-algorithm" \
  -H "Authorization: Bearer $AUDITOR_TOKEN" | jq

echo "[7/8] Submit auditor verdict"
curl -sS -X POST "$BASE_ANALYSIS/api/reports/$REPORT_ID/auditor-verdict" \
  -H "Authorization: Bearer $AUDITOR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"verdict":"Approve","comment":"Algorithm checks passed."}' >/dev/null

echo "[8/8] Final leader approve"
FINAL_JSON="$(curl -sS -X POST "$BASE_ANALYSIS/api/reports/$REPORT_ID/leader-approve" \
  -H "Authorization: Bearer $LEADER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"approve":true,"comment":"Final leader decision."}')"

echo "$FINAL_JSON" | jq

echo "Done"
