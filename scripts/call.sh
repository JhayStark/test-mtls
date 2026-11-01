#!/usr/bin/env bash
# Calls a SEC endpoint the way SEC does, then checks the response signature.
#
#   BASE_URL=https://sec-sandbox.example.com SEC_API_KEY=... \
#   SEC_SIGNING_SECRET=... ./scripts/call.sh /sec/v1/ping
#
# CERT=client  (default) picks certs/<CERT>.pem|key; CERT= sends none.
# SIMULATE_ALB=1 sends the cert as x-amzn-mtls-clientcert-leaf instead of over
# TLS, for running against the app locally without an ALB.
# NONCE / TIMESTAMP / SEC_API_KEY can be overridden (or set empty) to provoke
# the SIG_* and AUTH_* errors.
set -euo pipefail

PATH_ARG="${1:-/sec/v1/ping}"
BASE_URL="${BASE_URL:-http://localhost:3000}"
CERT_DIR="${CERT_DIR:-certs}"
CERT="${CERT-client}"
NONCE="${NONCE-$(openssl rand -hex 16)}"
TIMESTAMP="${TIMESTAMP-$(date +%s)}"

args=(-sS -i)
[ -n "${SEC_API_KEY:-}" ] && args+=(-H "X-SEC-API-Key: $SEC_API_KEY")
[ -n "$TIMESTAMP" ] && args+=(-H "X-VAMSS-Request-Timestamp: $TIMESTAMP")
[ -n "$NONCE" ] && args+=(-H "X-VAMSS-Request-Nonce: $NONCE")
[ -n "${FORWARDED_FOR:-}" ] && args+=(-H "X-Forwarded-For: $FORWARDED_FOR")

if [ -n "$CERT" ]; then
  if [ "${SIMULATE_ALB:-}" = "1" ]; then
    leaf=$(node -e "process.stdout.write(encodeURIComponent(require('fs').readFileSync(process.argv[1],'utf8')))" "$CERT_DIR/$CERT.pem")
    args+=(-H "x-amzn-mtls-clientcert-leaf: $leaf")
  else
    args+=(--cert "$CERT_DIR/$CERT.pem" --key "$CERT_DIR/$CERT.key")
  fi
fi

response=$(curl "${args[@]}" "$BASE_URL$PATH_ARG")
echo "$response"

headers=$(printf '%s' "$response" | sed '/^\r\{0,1\}$/q')
body=$(printf '%s' "$response" | sed '1,/^\r\{0,1\}$/d')
header() { printf '%s' "$headers" | grep -i "^$1:" | head -1 | cut -d' ' -f2- | tr -d '\r'; }

signature=$(header x-vamss-signature)
if [ -z "${SEC_SIGNING_SECRET:-}" ] || [ -z "$signature" ]; then
  echo; echo "signature: not checked"
  exit 0
fi
expected="v1=$(printf '%s.%s.%s' "$(header x-vamss-timestamp)" "$(header x-vamss-nonce)" "$body" \
  | openssl dgst -sha256 -hmac "$SEC_SIGNING_SECRET" -r | cut -d' ' -f1)"
echo
if [ "$signature" = "$expected" ]; then echo "signature: valid"; else echo "signature: INVALID"; exit 1; fi
