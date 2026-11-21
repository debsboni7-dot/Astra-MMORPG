#!/usr/bin/env bash
set -euo pipefail

out_dir="${RUNNER_TEMP:-/tmp}/astrea-dtls"
mkdir -p "$out_dir"
chmod 700 "$out_dir"

openssl genrsa -out "$out_dir/ca.key" 2048
openssl req -x509 -new -nodes -key "$out_dir/ca.key" -sha256 -days 2 \
  -subj "/CN=ASTREA CI Test CA" \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,keyCertSign,cRLSign" \
  -out "$out_dir/ca.crt"

openssl genrsa -out "$out_dir/server.key" 2048
openssl req -new -key "$out_dir/server.key" \
  -subj "/CN=localhost" -out "$out_dir/server.csr"

cat > "$out_dir/server.ext" <<'EOF'
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=DNS:localhost,IP:127.0.0.1
EOF

openssl x509 -req -in "$out_dir/server.csr" \
  -CA "$out_dir/ca.crt" -CAkey "$out_dir/ca.key" \
  -CAcreateserial -out "$out_dir/server.crt" -days 2 -sha256 \
  -extfile "$out_dir/server.ext"

openssl verify -CAfile "$out_dir/ca.crt" "$out_dir/server.crt"
openssl x509 -in "$out_dir/server.crt" -noout -checkhost localhost
openssl x509 -in "$out_dir/server.crt" -noout -checkip 127.0.0.1

if [[ "${1:-}" != "--verify-only" ]]; then
  if [[ -z "${GITHUB_ENV:-}" ]]; then
    echo "GITHUB_ENV is required unless --verify-only is supplied." >&2
    exit 2
  fi
  {
    echo "ASTREA_DTLS_SERVER_CERT<<ASTREA_CERT_EOF"
    cat "$out_dir/server.crt"
    echo "ASTREA_CERT_EOF"
    echo "ASTREA_DTLS_SERVER_KEY<<ASTREA_KEY_EOF"
    cat "$out_dir/server.key"
    echo "ASTREA_KEY_EOF"
    echo "ASTREA_DTLS_CA_CERT<<ASTREA_CA_EOF"
    cat "$out_dir/ca.crt"
    echo "ASTREA_CA_EOF"
    echo "ASTREA_DTLS_SERVER_NAME=localhost"
  } >> "$GITHUB_ENV"
fi

echo "ASTREA ephemeral DTLS certificate chain and localhost SANs verified."
