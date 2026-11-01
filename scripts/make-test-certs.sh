#!/usr/bin/env bash
# Generates a throwaway CA standing in for SEC Ghana's, plus client certs for
# each mTLS outcome. Needs OpenSSL 3.4+ (for -not_before/-not_after).
set -euo pipefail

OUT="${1:-certs}"
SUBJECT="${CLIENT_SUBJECT:-/C=GH/O=SEC Ghana Sandbox/CN=sec-vamss-client}"
mkdir -p "$OUT"
cd "$OUT"

cat > client.ext <<'EXT'
basicConstraints = critical, CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth
authorityKeyIdentifier = keyid, issuer
EXT

make_ca() {
  local name=$1 cn=$2
  openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 825 \
    -keyout "$name.key" -out "$name.pem" \
    -subj "/C=GH/O=$cn/CN=$cn Root CA" -addext "basicConstraints=critical,CA:TRUE" \
    -addext "keyUsage=critical,keyCertSign,cRLSign" 2>/dev/null
}

make_client() {
  local name=$1 ca=$2 subject=$3; shift 3
  openssl req -newkey rsa:2048 -nodes -sha256 \
    -keyout "$name.key" -out "$name.csr" -subj "$subject" 2>/dev/null
  openssl x509 -req -in "$name.csr" -CA "$ca.pem" -CAkey "$ca.key" \
    -CAcreateserial -sha256 -extfile client.ext -out "$name.pem" "$@" 2>/dev/null
  rm "$name.csr"
}

make_ca ca "SEC Ghana Sandbox"
make_ca rogue-ca "Rogue Sandbox"

make_client client ca "$SUBJECT" -days 365
make_client client-other-subject ca "/C=GH/O=Other Exchange/CN=other-client" -days 365
make_client client-expired ca "$SUBJECT" -not_before 20240101000000Z -not_after 20250101000000Z
make_client rogue-client rogue-ca "$SUBJECT" -days 365

rm -f client.ext *.srl
chmod 600 *.key

echo "Wrote $(pwd):"
ls -1
echo
echo "SEC_VAMSS_CA_BUNDLE=$(base64 < ca.pem | tr -d '\n')"
node -e "const {X509Certificate}=require('crypto');const fs=require('fs');console.log('SEC_VAMSS_CLIENT_CERT_SUBJECT='+new X509Certificate(fs.readFileSync('client.pem')).subject.replace(/\n/g,'\\\\n'))"
