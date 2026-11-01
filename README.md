# SEC mTLS sandbox

A throwaway NestJS app that serves `GET /sec/v1/ping` and `GET /sec/v1/health` behind the SEC VAMSS auth chain (IP allowlist, API key, mTLS client cert, replay guard, signed responses). Its purpose is to prove the AWS ALB mTLS setup before it goes onto the real API.

The guards, error catalog, signer, interceptor and filter are copied from `apps/api/src/integrations/SecGhana/` in the monorepo. Two pieces differ:

| Production | Sandbox |
| --- | --- |
| API key looked up in the `SecVamssApiKey` table | One key, configured by its SHA-256 (`SEC_VAMSS_API_KEY_HASH`) |
| Nonces stored in Redis (`SET NX EX`) | In-memory map. Replay detection only holds while one task runs |

`GET /healthz` is unguarded and exists only for the ALB target group health check. `GET /open` is unguarded too and has nothing to do with the SEC API.

## Run locally

The ALB is simulated: `SIMULATE_ALB=1` makes `call.sh` send the client cert in `x-amzn-mtls-clientcert-leaf`, which is what the ALB forwards.

```bash
pnpm install
./scripts/make-test-certs.sh        # writes certs/, prints SEC_VAMSS_CA_BUNDLE and the subject
./scripts/gen-api-key.sh            # prints SEC_API_KEY (keep it for call.sh) and the app's key vars
cp .env.example .env                # fill in the printed values and a SEC_VAMSS_SIGNING_SECRET
pnpm dev

SEC_API_KEY=... SEC_SIGNING_SECRET=... SIMULATE_ALB=1 ./scripts/call.sh /sec/v1/ping
```

`call.sh` prints the response and checks `X-VAMSS-Signature`. Override its variables to provoke each error:

| Call | Expected |
| --- | --- |
| defaults | 200, signature valid |
| `/sec/v1/health` with `CERT= SEC_API_KEY= TIMESTAMP= NONCE=` | 200 |
| `SEC_API_KEY=` / `SEC_API_KEY=wrong` | AUTH_001 / AUTH_002 |
| `CERT=` / `CERT=rogue-client` / `CERT=client-other-subject` / `CERT=client-expired` | AUTH_005 / 006 / 007 / 008 |
| `TIMESTAMP=` / `TIMESTAMP=abc` / `TIMESTAMP=1000` | SIG_001 / 002 / 003 |
| `NONCE=` / `NONCE=xyz` / same `NONCE` twice | SIG_005 / 006 / 004 |
| `FORWARDED_FOR=8.8.8.8` with `SEC_VAMSS_ALLOWED_CIDRS` set | RES_002 |
| any unknown `/sec/v1/...` path | RES_001 |

## Deploy behind an ALB with mTLS

1. **Certificates.** Use `certs/ca.pem` as the stand-in for the SEC Ghana CA. Keep `certs/` out of git (it is ignored).
2. **Trust store.** Upload `ca.pem` to an S3 bucket, then create an ELB trust store from it (EC2 console, Load Balancing, Trust stores).
3. **Server certificate.** Request an ACM certificate for a hostname such as `sec-sandbox.<domain>`, and point that name at the new ALB in Route 53.
4. **Image.** Build and push to a new ECR repository: `docker build -t <ecr-uri>:latest . && docker push <ecr-uri>:latest`.
5. **Service.** Run the image as an ECS Fargate service (one task) on port 3000 with these env vars (secrets through Secrets Manager or SSM):
   `NODE_ENV=production`, `LOG_LEVEL=debug`, `SEC_VAMSS_CA_BUNDLE`, `SEC_VAMSS_CLIENT_CERT_SUBJECT`, `SEC_VAMSS_SIGNING_SECRET`, `SEC_VAMSS_ALLOWED_CIDRS` (your public IP, as `x.x.x.x/32`), `SEC_VAMSS_API_KEY_HASH`, `SEC_VAMSS_API_KEY_PREFIX`, `SEC_VAMSS_API_KEY_EXPIRES_AT`.
6. **Target group.** HTTP to port 3000, health check path `/healthz`.
7. **Listener.** HTTPS:443 with the ACM certificate, **Mutual authentication (mTLS)** turned on, trust store from step 2. Start in **Verify** mode.
8. **Security groups.** The task accepts port 3000 only from the ALB's security group. This is what makes the forwarded `x-amzn-mtls-clientcert-leaf` trustworthy: if the task were reachable directly, anyone could forge it.

Then, from your machine:

```bash
BASE_URL=https://sec-sandbox.<domain> SEC_API_KEY=... SEC_SIGNING_SECRET=... ./scripts/call.sh /sec/v1/ping
```

## What to find out

Record the answers here before moving the setup onto the real API.

- **Verify mode.** With `CERT=`, `CERT=rogue-client` or `CERT=client-expired`, the ALB should fail the TLS handshake, so curl errors and the app never sees the request (no AUTH_005/006/008 from the app). Confirm the good cert reaches the app and the debug log line `SEC VAMSS mTLS headers received` lists which `x-amzn-mtls-clientcert-*` headers arrived.
- **Passthrough mode.** Switch the listener to passthrough and repeat. The ALB forwards whatever cert is presented (only `x-amzn-mtls-clientcert`, the whole chain, not `-leaf`), so check whether the app's guard still works and which error codes come back.
- **`/sec/v1/health`.** SEC polls it without credentials. In verify mode the TLS layer still demands a client cert on every path of the listener; confirm whether SEC's poller presents one, or whether health needs a separate listener.
- **`X-Forwarded-For`.** Confirm the last entry is your public IP, so the allowlist matches.
- **Revocation.** Optionally add a CRL to the trust store and check that a revoked cert is refused at the handshake (AUTH_009 in SEC's catalog is handled there, not in the app).
