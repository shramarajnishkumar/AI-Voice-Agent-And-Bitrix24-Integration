#!/bin/sh
set -eu

PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-http://localhost:8000}"
AUTO_PUBLIC_BASE_URL="${AUTO_PUBLIC_BASE_URL:-true}"
CLOUDFLARE_METRICS_URL="${CLOUDFLARE_METRICS_URL:-http://cloudflared:20241/metrics}"

if [ "$AUTO_PUBLIC_BASE_URL" = "true" ]; then
  echo "Waiting for Cloudflare tunnel metrics..."
  for _ in $(seq 1 30); do
    if curl -fsS "$CLOUDFLARE_METRICS_URL" >/tmp/cloudflared-metrics.txt 2>/dev/null; then
      DETECTED_URL=$(python - <<'PY'
import os, re
path = '/tmp/cloudflared-metrics.txt'
try:
    with open(path, 'r', encoding='utf-8') as f:
        txt = f.read()
except FileNotFoundError:
    raise SystemExit(0)
match = re.search(r'userHostname\s*="([^"]+)"', txt)
if match:
    value = match.group(1).strip()
    if value.startswith('http://') or value.startswith('https://'):
        print(value)
        raise SystemExit(0)
    if value:
        print(f'https://{value}')
        raise SystemExit(0)
PY
)
      if [ -n "$DETECTED_URL" ]; then
        PUBLIC_BASE_URL="$DETECTED_URL"
        echo "Detected Cloudflare public URL: $PUBLIC_BASE_URL"
        break
      fi
    fi
    sleep 1
  done
fi

export PUBLIC_BASE_URL
export AUTO_PUBLIC_BASE_URL
export CLOUDFLARE_METRICS_URL

echo "Starting FastAPI server with PUBLIC_BASE_URL=$PUBLIC_BASE_URL"
exec uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
