# SuperStories Distribution Framework

**Version:** 2.0
**Date:** 18 March 2026
**Author:** SuperStories BV
**Applies to:** All SuperStories commercial products

---

## What This Is

This document defines how SuperStories products reach paying customers — the commercial model, the hosting model, the licence key system, and the operational patterns for running client instances.

It is a reusable framework. Every product follows the same distribution model. Product-specific details (pricing tiers, feature flags, product ID) live in the product's PRD. Everything in this document is already decided.

Read alongside `SUPERSTORIES-PLATFORM.md` (the technical stack) and the product PRD.

---

## 1. Core Principles

**Clients want the tool to work.** The default experience for any client — individual, coaching company, or organisation — requires zero technical involvement on their side. They receive a URL and login credentials. That is all.

**Source code never ships.** Clients receive a running application, not a codebase. The Docker image is a compiled binary. They never see the source.

**One codebase, all tiers.** There are no separate builds for different tiers. Feature access is controlled by the licence key payload. One image runs everywhere.

**LLM-agnostic by default.** All products are built on the provider abstraction layer defined in `SUPERSTORIES-PLATFORM.md`. Clients with data sovereignty requirements can run open source models locally. No AI vendor lock-in for SuperStories or for clients.

**Docker is invisible to clients.** SuperStories uses Docker internally for consistent, reproducible deployments. Coolify makes this invisible — clients interact with a browser interface or simply with the product URL. They never touch Docker, never SSH into a server, never run a command.

---

## 2. Hosting Model

### The Three Tiers

#### Tier 1: Shared Hosted (default, 95% of clients)

SuperStories hosts and operates a dedicated product instance per paying organisation on SuperStories-managed server infrastructure. Each instance has its own database, its own URL, its own environment. Instances share physical infrastructure but are fully isolated at the application and data layer.

**Client receives:** A URL (`acme.voicereflect.com`) and login credentials.
**Client does:** Nothing technical. Ever.
**SuperStories does:** Hosts, deploys, updates, monitors, backs up.
**Data:** On SuperStories infrastructure. Separated per instance. Not shared between clients.
**Right for:** The overwhelming majority of coaches, trainers, and organisations.

Operationally, a new client instance is a 15-minute Coolify deployment. The client is not involved.

#### Tier 2: Private VPS (upgrade for data sovereignty)

For clients who require their data to reside on infrastructure they own and control. SuperStories (or a remote dev) installs Coolify on the client's VPS and deploys their instance. After setup, the client manages nothing — Coolify handles everything through a browser interface.

Any VPS provider works: Hetzner (recommended — European, excellent value), DigitalOcean, Vultr, Linode, or any Linux VPS. The client orders the server; SuperStories handles everything else.

With a local Ollama instance and Whisper for transcription, the product can run completely air-gapped — no data ever leaves the client's infrastructure.

**Client receives:** VoiceReflect (or any product) running on their own server.
**Client does:** Orders a VPS (~5-20 EUR/month). One setup call.
**SuperStories does:** Installs Coolify, deploys the instance, handles ongoing updates.
**Data:** On the client's own server, under their full control.
**Right for:** Healthcare, HR, legal, government, or any organisation with strict data sovereignty requirements.

#### Tier 3: Multi-tenant SaaS (future)

A shared-infrastructure SaaS model for individual users and smaller subscribers who have no data sovereignty requirements and want the simplicity of a subscription with no setup. This will be built when validated product-market fit and revenue justify the engineering investment.

**Client receives:** Account on shared SaaS platform.
**Client does:** Signs up, pays, uses.
**Data:** Shared infrastructure, tenant-isolated at the application layer.
**Right for:** Individual journalers, solo coaches, small teams.

### Summary

| Tier | Who | Client effort | Data location | When |
|------|-----|--------------|---------------|------|
| **Shared hosted** | Coaching companies, training orgs, teams | None | SuperStories VPS, per-instance isolation | Now |
| **Private VPS** | Privacy-sensitive orgs, healthcare, HR | Order VPS + one setup call | Client's own server | Now |
| **Multi-tenant SaaS** | Individuals, solo coaches | None — subscribe | Shared SuperStories infrastructure | Future |

---

## 3. Licence Key System

Every product instance — whether shared hosted, private VPS, or future SaaS — is activated by a licence key. The key is validated locally at application startup using Ed25519 asymmetric cryptography. No internet connection required for validation.

### How It Works

- **SuperStories holds:** the private key (never stored in any repo, never shipped)
- **The Docker image contains:** the public key (embedded at build time)
- **Validation:** the app verifies the JWT signature locally at startup — no external call required

A client who decompiles the Docker image can see the public key but cannot forge licence keys without the private key. The private key never leaves SuperStories' password manager.

### JWT Payload

```json
{
  "sub": "client-acme-001",
  "product": "voicereflect",
  "tier": "professional",
  "features": ["cohorts", "deep_reflection", "white_label"],
  "exp": 9999999999,
  "maxVersion": "1.x",
  "iat": 1710000000,
  "iss": "superstories"
}
```

| Field | Purpose |
|-------|---------|
| `sub` | Unique client ID |
| `product` | Product identifier — must match the running application |
| `tier` | Commercial tier name |
| `features` | Array of enabled feature flags |
| `exp` | Unix timestamp expiry — omit for lifetime licences |
| `maxVersion` | Highest app major version this key unlocks |
| `iss` | Always `superstories` |

### maxVersion: The Upgrade Mechanic

`maxVersion: "1.x"` unlocks all versions from `1.0.0` through `1.9.x`. It does not unlock `2.0.0`. Clients pay for major version upgrades. Minor and patch updates are always free for existing licence holders.

| Version bump | Meaning | Licence impact |
|---|---|---|
| `v1.0.1` → `v1.0.2` | Bug fix | Free for all `1.x` holders |
| `v1.0.0` → `v1.1.0` | New feature, backwards compatible | Free for all `1.x` holders |
| `v1.x` → `v2.0.0` | Major — significant new capability | Paid upgrade, new `2.x` key required |

### Validation Logic (Python / FastAPI)

```python
# app/licence.py — identical across all products

import os
import jwt
from cryptography.hazmat.primitives.serialization import load_pem_public_key
from packaging.version import Version

PUBLIC_KEY_PEM = os.getenv("SUPERSTORIES_PUBLIC_KEY", "").encode()
PRODUCT_ID = os.getenv("PRODUCT_ID")
APP_VERSION = os.getenv("APP_VERSION", "1.0.0")

_licence = None

def validate_licence():
    global _licence
    key_str = os.getenv("LICENCE_KEY")
    if not key_str:
        raise SystemExit("ERROR: LICENCE_KEY is missing. Add it to your .env file.")

    try:
        public_key = load_pem_public_key(PUBLIC_KEY_PEM)
        payload = jwt.decode(key_str, public_key, algorithms=["EdDSA"])

        if payload.get("product") != PRODUCT_ID:
            raise ValueError(f"Licence is for '{payload.get('product')}', not '{PRODUCT_ID}'")

        max_ver = payload.get("maxVersion", "1.x").replace(".x", ".9999")
        if Version(APP_VERSION) > Version(max_ver):
            raise ValueError(
                f"Licence covers up to {payload.get('maxVersion')}. "
                f"Current version: {APP_VERSION}. Please upgrade your licence."
            )

        _licence = payload
        print(f"Licence valid — client: {payload['sub']}, tier: {payload['tier']}")

    except Exception as e:
        raise SystemExit(f"ERROR: Invalid licence key — {e}")

def get_licence() -> dict:
    if not _licence:
        raise RuntimeError("Licence not yet validated")
    return _licence

def has_feature(feature: str) -> bool:
    return feature in (get_licence().get("features") or [])
```

### Feature Flag Usage

```python
# Protect a feature-gated API endpoint
from app.licence import has_feature
from fastapi import HTTPException

@router.post("/api/reflections/{id}/deep")
async def deep_reflection(id: int):
    if not has_feature("deep_reflection"):
        raise HTTPException(
            status_code=403,
            detail={"code": "FEATURE_NOT_LICENSED", "message": "Deep reflection requires a Pro licence."}
        )
    # ... proceed

# Expose licence info to the frontend (no sensitive data)
# GET /api/licence → { tier, features }
@router.get("/api/licence")
async def licence_info():
    lic = get_licence()
    return {"tier": lic["tier"], "features": lic["features"]}
```

```typescript
// React: conditionally render based on features
const { features } = useLicence()
{features.includes("deep_reflection") && <DeepReflectionButton />}
```

---

## 4. Key Generation CLI

A standalone Python script stored in a **private SuperStories repo** (`superstories/internal`). Never committed to any product repo. Used internally to generate keys at purchase or renewal.

### Usage

```bash
python keygen.py \
  --customer "acme-001" \
  --product "voicereflect" \
  --tier "professional" \
  --features "cohorts,deep_reflection,white_label" \
  --max-version "1.x" \
  --lifetime
  # or: --expires 2027-03-18

# Output:
# Customer:  acme-001
# Product:   voicereflect
# Tier:      professional
# Features:  cohorts, deep_reflection, white_label
# Expires:   lifetime
# Key:       eyJhbGciOiJFZERTQSJ9...
```

### keygen.py

```python
import argparse
import time
import jwt
from cryptography.hazmat.primitives.serialization import load_pem_private_key
import os

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--customer", required=True)
    parser.add_argument("--product", required=True)
    parser.add_argument("--tier", default="core")
    parser.add_argument("--features", default="")
    parser.add_argument("--max-version", default="1.x")
    parser.add_argument("--lifetime", action="store_true")
    parser.add_argument("--expires")
    args = parser.parse_args()

    private_key_pem = os.environ.get("SUPERSTORIES_PRIVATE_KEY")
    if not private_key_pem:
        raise SystemExit("SUPERSTORIES_PRIVATE_KEY env var required")

    private_key = load_pem_private_key(private_key_pem.encode(), password=None)
    features = [f.strip() for f in args.features.split(",") if f.strip()]

    payload = {
        "sub": args.customer,
        "product": args.product,
        "tier": args.tier,
        "features": features,
        "maxVersion": args.max_version,
        "iat": int(time.time()),
        "iss": "superstories"
    }

    if not args.lifetime and args.expires:
        from datetime import datetime
        payload["exp"] = int(datetime.fromisoformat(args.expires).timestamp())

    token = jwt.encode(payload, private_key, algorithm="EdDSA")

    print(f"\nCustomer:  {args.customer}")
    print(f"Product:   {args.product}")
    print(f"Tier:      {args.tier}")
    print(f"Features:  {', '.join(features) or 'none'}")
    print(f"Expires:   {'lifetime' if args.lifetime else args.expires}")
    print(f"\nKey: {token}\n")

if __name__ == "__main__":
    main()
```

### First-time Keypair Generation (run once per product, or share across products)

```python
# generate_keypair.py — run once, store output securely
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import (
    Encoding, PrivateFormat, PublicFormat, NoEncryption
)

private_key = Ed25519PrivateKey.generate()
public_key = private_key.public_key()

print("PRIVATE KEY (store in 1Password / Bitwarden — never in git):")
print(private_key.private_bytes(Encoding.PEM, PrivateFormat.PKCS8, NoEncryption()).decode())

print("PUBLIC KEY (embed in Docker image as build arg):")
print(public_key.public_bytes(Encoding.PEM, PublicFormat.SubjectPublicKeyInfo).decode())
```

---

## 5. Deployment Operations

### New Client Onboarding (Shared Hosted)

```
1. Create subdomain:  [client].voicereflect.com  (or product equivalent)
2. In Coolify:        New application → Docker Compose → point to product repo
3. Set env vars:      All variables from .env.example, plus LICENCE_KEY
4. Deploy:            Coolify builds and starts the instance (~3 minutes)
5. Verify:            Open the URL, confirm licence validates, confirm email works
6. Deliver:           Send client their URL and login credentials
Total time: ~15 minutes
```

### New Client Onboarding (Private VPS)

```
1. Client orders VPS  (any provider — Hetzner recommended, Ubuntu 22.04)
2. Remote dev runs:   curl -fsSL https://get.coolify.io | bash  (~5 minutes)
3. Add server to SuperStories Coolify dashboard (or client's own Coolify)
4. Deploy instance:   Same as shared hosted steps 2-6 above
5. SSL:               Coolify handles Let's Encrypt automatically
Total time: ~30 minutes including VPS boot time
```

### Updating a Client Instance

```
# Via Coolify UI:
# Applications → [client instance] → Deploy → (pulls latest image)
# Takes ~2 minutes. Zero downtime with health checks.

# Or trigger via GitHub Actions webhook on tag push — Coolify redeploys automatically
```

### Backup Policy

Per instance, two things to back up:

```
1. PostgreSQL database
   pg_dump -U [product] [product] > backup_$(date +%Y%m%d).sql
   (automate via cron or Coolify scheduled tasks)

2. Cloudflare R2 bucket
   R2 has built-in redundancy — no manual backup needed
   For extra safety: enable R2 bucket replication in Cloudflare dashboard
```

---

## 6. Business Model Options

| Model | Licence `exp` | `maxVersion` | Best for |
|-------|--------------|-------------|----------|
| **Lifetime** | Not set | `1.x` | Simple products, one-time sale, reduces support burden |
| **Annual** | +1 year | `1.x` | Includes updates + support contract |
| **Major version** | Not set | `1.x` | Revenue from significant new versions |
| **Feature tiers** | Either | Either | Core vs Pro distinction within same product |

**Recommended starting point:** Annual licence with `maxVersion: "1.x"`. Predictable recurring revenue, simple to communicate, natural renewal conversation each year.

---

## 7. Applying This Framework to a New Product

Checklist when distributing a new SuperStories product:

```
[ ] Define PRODUCT_ID string (e.g. "voicereflect", "tth", "innerguru")
[ ] Define feature flags for this product (in product PRD)
[ ] Define pricing tiers and which features each includes (in product PRD)
[ ] Generate keypair (or reuse SuperStories shared keypair)
[ ] Store private key in 1Password under "SuperStories Keys"
[ ] Add SUPERSTORIES_PUBLIC_KEY as GitHub Actions secret in product repo
[ ] Add SUPERSTORIES_PUBLIC_KEY as build arg in Dockerfile
[ ] Implement app/licence.py (copy as-is from this framework)
[ ] Add feature flag gates to product-specific API endpoints
[ ] Add GET /api/licence endpoint
[ ] Set up ghcr.io/superstories/[PRODUCT] in GitHub Container Registry (private)
[ ] Add GitHub Actions release workflow (from SUPERSTORIES-PLATFORM.md)
[ ] Create Coolify app on SuperStories shared server for first client
[ ] Test full licence validation on a clean deployment before first sale
[ ] Test feature flag enforcement for each tier
```

---

## 8. Security Notes

- The **private key** must never be stored in any Git repository — including private ones. Store in 1Password under "SuperStories Keys."
- The **public key** embedded in the Docker image is intentionally visible — it can only verify signatures, not create them.
- **GHCR image visibility** should be set to private. Clients do not pull images directly — Coolify does, using SuperStories credentials. Clients never need a GHCR token.
- **Licence keys** are safe to email and store in `.env` files — they are signed JWTs, not secrets. They cannot be used to forge other keys.
- **Client `.env` files** contain real secrets (database passwords, API keys). These are set in Coolify's UI and never committed to git.

---

*SuperStories BV — internal framework document — v2.0 — 2026-03-18*
