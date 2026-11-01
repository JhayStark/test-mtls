#!/usr/bin/env bash
# Prints a new sandbox API key and the env values the app needs for it. The
# key itself goes to the caller (call.sh), only its hash goes to the app.
set -euo pipefail

KEY="vamss_$(openssl rand -hex 32)"
echo "SEC_API_KEY=$KEY"
echo "SEC_VAMSS_API_KEY_HASH=$(printf '%s' "$KEY" | openssl dgst -sha256 -r | cut -d' ' -f1)"
echo "SEC_VAMSS_API_KEY_PREFIX=${KEY:0:12}"
echo "SEC_VAMSS_API_KEY_EXPIRES_AT=$(date -u -v+1y +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '+1 year' +%Y-%m-%dT%H:%M:%SZ)"
