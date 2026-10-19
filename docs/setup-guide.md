# Local Setup & Manual Environment Configuration Guide

This guide provides step-by-step instructions for preparing your local developer environment, generating cryptographic secrets, and safely creating actual `.env` files without exposing credentials.

---

## 1. Environment File Placement

Actual environment files are **strictly excluded from Git** via `.gitignore`. You will create the actual environment files locally using the template provided in `.env.example`.

### File Locations:
1. **Root / Backend Environment File**:
   - Location: `c:\Users\Programming.com\Desktop\Sharad\enterprise-ai\.env`
   - Purpose: Primary configuration for the Express.js server, Mongoose (MongoDB), BullMQ / Redis, Qdrant vector database, JWT authentication, and AI provider integration.
2. **Frontend Environment File** (Required in Phase 7):
   - Location: `c:\Users\Programming.com\Desktop\Sharad\enterprise-ai\apps\frontend\.env.local`
   - Purpose: Next.js public client variables (e.g. `NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1`).

---

## 2. Generating Local Cryptographic Secrets

The backend requires three distinct, cryptographically strong 256-bit secrets for JWT signing and tamper-evident audit logging. **Do not paste or share these values in chats or commit them to source control.**

Run the following commands in **Windows PowerShell** to generate secure, cryptographically random base64 secrets:

### Generate Access Token Secret (`JWT_ACCESS_SECRET`):
```powershell
$bytes = [byte[]]::new(32); [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes); [Convert]::ToBase64String($bytes)
```

### Generate Refresh Token Secret (`JWT_REFRESH_SECRET`):
```powershell
$bytes = [byte[]]::new(32); [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes); [Convert]::ToBase64String($bytes)
```

### Generate Audit Log HMAC Secret (`AUDIT_LOG_HMAC_SECRET`):
```powershell
$bytes = [byte[]]::new(32); [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes); [Convert]::ToBase64String($bytes)
```

---

## 3. Step-by-Step PowerShell Setup for `.env`

To create and populate `.env` safely on Windows without revealing secrets to any console history:

```powershell
# 1. Navigate to the project root
cd c:\Users\Programming.com\Desktop\Sharad\enterprise-ai

# 2. Copy the template to .env
Copy-Item .env.example .env

# 3. Open .env in your preferred editor (Notepad, VS Code, etc.)
notepad .env
```

In the opened editor, paste the generated secrets and your local settings.

---

## 4. Environment Variables Breakdown

| Variable | Category | Source | Target Service | When Required | Description & Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | Runtime | System | Express / Node | Phase 1+ | Runtime environment (`development`, `test`, `production`). |
| `PORT` | Runtime | Local Config | Express Server | Phase 1+ | HTTP listener port for Express REST API (Default: `5000`). |
| `FRONTEND_URL` | Security | Local Config | Express CORS | Phase 1+ | Allowed origin for Cross-Origin Resource Sharing (Default: `http://localhost:3000`). |
| `API_BASE_URL` | Network | Local Config | Express Server | Phase 1+ | Base prefix for versioned endpoints (`http://localhost:5000/api/v1`). |
| `MONGODB_URI` | Database | Local Infra | Mongoose ODM | Phase 2+ | Connection URI to MongoDB replica set `rs0` (`mongodb://localhost:27017/enterprise_ai?replicaSet=rs0`). |
| `MONGODB_TEST_URI`| Database | Local Infra | Mongoose (Tests) | Phase 2+ | Isolated database connection string used for automated test suites. |
| `REDIS_HOST` | Cache/Queue | Local Infra | BullMQ / ioredis | Phase 3+ | Host address of Redis instance (Default: `localhost`). |
| `REDIS_PORT` | Cache/Queue | Local Infra | BullMQ / ioredis | Phase 3+ | Port of Redis instance (Default: `6379`). |
| `REDIS_PASSWORD` | Security | Local Infra | Redis Client | Phase 3+ | Optional password for secured Redis instances (leave blank for local dev). |
| `QDRANT_URL` | Vector DB | Local Infra | Vector Search | Phase 3+ | HTTP REST endpoint for Qdrant (Default: `http://localhost:6333`). |
| `QDRANT_API_KEY` | Vector DB | Local Infra | Qdrant Client | Phase 3+ | Optional API key for cloud or secured Qdrant instances (leave blank for local dev). |
| `QDRANT_COLLECTION_NAME` | Vector DB | Local Config | Vector Search | Phase 3+ | Vector collection name (Default: `enterprise_knowledge_chunks`). |
| `JWT_ACCESS_SECRET` | Security | **Locally Generated** | Auth Service | Phase 2+ | 256-bit secret used to sign short-lived Access Tokens (15m). |
| `JWT_REFRESH_SECRET`| Security | **Locally Generated** | Auth Service | Phase 2+ | 256-bit secret used to sign rotating Refresh Tokens (7d). |
| `JWT_ACCESS_EXPIRATION` | Auth | Local Config | Auth Service | Phase 2+ | Access token lifespan (Default: `15m`). |
| `JWT_REFRESH_EXPIRATION`| Auth | Local Config | Auth Service | Phase 2+ | Refresh token lifespan (Default: `7d`). |
| `AUDIT_LOG_HMAC_SECRET` | Security | **Locally Generated** | Audit Service | Phase 6+ | 256-bit secret used for cryptographic HMAC chaining in AuditLogs. |
| `LLM_PROVIDER` | AI Model | Local Config | LLM Factory | Phase 4+ | Active LLM provider: `'gemini'` or `'openai'`. |
| `GEMINI_API_KEY` | External AI | **Google AI Studio** | LangChain / Gemini | Phase 3+ / 4+ | API Key from Google AI Studio. **Never commit or share in chat.** |
| `OPENAI_API_KEY` | External AI | **OpenAI Platform** | LangChain / OpenAI | Phase 3+ / 4+ | API Key from OpenAI Platform. **Never commit or share in chat.** |
| `GEMINI_MODEL` | AI Model | Configuration | LLM Factory | Phase 4+ | Identifier for Gemini model (verified before Phase 4). |
| `GEMINI_EMBEDDING_MODEL`| AI Model | Configuration | Embeddings | Phase 3+ | Identifier for Gemini embeddings (verified before Phase 3). |
| `OPENAI_MODEL` | AI Model | Configuration | LLM Factory | Phase 4+ | Identifier for OpenAI model (e.g. `gpt-4o`). |
| `OPENAI_EMBEDDING_MODEL`| AI Model | Configuration | Embeddings | Phase 3+ | Identifier for OpenAI embeddings (e.g. `text-embedding-3-small`). |
| `CHUNK_SIZE` | Ingestion | Tuning Param | Chunker | Phase 3+ | Ingestion text chunk size in tokens (Default: `500`). |
| `CHUNK_OVERLAP` | Ingestion | Tuning Param | Chunker | Phase 3+ | Ingestion overlap size in tokens (Default: `50`). |
| `RAG_TOP_K` | Retrieval | Tuning Param | RAG Pipeline | Phase 4+ | Number of relevant chunks retrieved per query (Default: `5`). |
| `RAG_SIMILARITY_THRESHOLD`| Retrieval| Tuning Param | RAG Pipeline | Phase 4+ | Minimum cosine similarity score threshold (Default: `0.65`). |
| `MAX_FILE_SIZE_BYTES` | Upload | Tuning Param | Document Upload | Phase 3+ | Maximum allowed file upload size (Default: `52428800` = 50MB). |
| `RATE_LIMIT_WINDOW_MS`| Security | Tuning Param | RateLimiter | Phase 5+ | Rate limiting sliding window in ms (Default: `900000` = 15m). |
| `RATE_LIMIT_MAX_REQUESTS`| Security| Tuning Param | RateLimiter | Phase 5+ | Max requests allowed within sliding window (Default: `100`). |

---

## 5. Starting and Stopping Infrastructure

Local database and cache dependencies are orchestrated via Docker Compose:

```powershell
# Start MongoDB (replica set), Redis, and Qdrant in background:
cmd /c npm run infra:up

# Check container status and health:
cmd /c npm run infra:status

# View infrastructure logs:
cmd /c npm run infra:logs

# Stop infrastructure containers:
cmd /c npm run infra:down
```
