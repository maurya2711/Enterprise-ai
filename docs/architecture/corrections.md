# Architectural & Security Corrections Specification

This document details the refined architectural designs, security constraints, and data consistency models approved for the Enterprise AI Knowledge & Support Copilot.

---

## 1. Qdrant Access-Control Filter Schema & Empty-ACL Semantics

### 1.1 Supported Qdrant Payload Structure
Every knowledge chunk indexed in Qdrant contains the following security and routing fields in its payload:

```json
{
  "chunk_id": "67135...a1",
  "document_id": "67135...00",
  "title": "IT_Security_Standard_2026.pdf",
  "minimum_clearance_level": 1,
  "allowed_roles": ["admin", "support_agent"],
  "allowed_departments": ["Engineering", "IT"],
  "allowed_user_ids": [],
  "is_active": true
}
```

### 1.2 Explicit Empty-ACL Semantics
- **`minimum_clearance_level`**: Numeric integer ($0 = \text{public}$, $1 = \text{internal}$, $2 = \text{confidential}$, $3 = \text{restricted}$). A user with clearance $L_{user}$ can only view chunks where $L_{chunk} \le L_{user}$.
- **`allowed_roles`**: Array of strings. If empty (`[]`), the chunk is accessible to **all authenticated roles** satisfying clearance. If populated, user's role must match at least one element.
- **`allowed_departments`**: Array of strings. If empty (`[]`), the chunk is accessible across **all company departments**. If populated, user's department must match at least one element.
- **`allowed_user_ids`**: Array of user IDs. If empty (`[]`), access is governed solely by role/department/clearance. If populated, only explicitly listed user IDs (or administrators) may retrieve it.
- **`is_active`**: Boolean. Must be `true`. If a document is soft-deleted, quarantined, or undergoing reindexing, `is_active` is toggled to `false`.

### 1.3 Exact Qdrant Filter Query Construction
In Qdrant REST/gRPC API, boolean conditions in `must` are logical AND, and conditions in `should` within a group are logical OR.

When user with claims `{ role: "support_agent", department: "IT", clearanceLevel: 1, userId: "u_123" }` executes a query:

```json
{
  "filter": {
    "must": [
      {
        "key": "is_active",
        "match": { "value": true }
      },
      {
        "key": "minimum_clearance_level",
        "range": { "lte": 1 }
      },
      {
        "should": [
          { "is_empty": { "key": "allowed_roles" } },
          { "key": "allowed_roles", "match": { "value": "support_agent" } }
        ]
      },
      {
        "should": [
          { "is_empty": { "key": "allowed_departments" } },
          { "key": "allowed_departments", "match": { "value": "IT" } }
        ]
      },
      {
        "should": [
          { "is_empty": { "key": "allowed_user_ids" } },
          { "key": "allowed_user_ids", "match": { "value": "u_123" } }
        ]
      }
    ]
  }
}
```
**Guarantee**: Unauthorized vectors are filtered out before distance computation in Qdrant's HNSW index, eliminating context leakage at the storage engine level.

---

## 2. Public Registration Security Boundaries

To prevent privilege escalation attacks:
1. **Payload Whitelist**: The public registration DTO (`IRegisterRequest`) accepts only `{ email, password, name, department }`. Any extra fields (`role`, `securityClearance`, `isAdmin`, etc.) are stripped and rejected via Zod schema validation.
2. **Default Assigned Privileges**:
   - `role` is hardcoded to `Role.USER`.
   - `securityClearance` is hardcoded to `ClearanceLevel.INTERNAL` (or `PUBLIC`).
   - `isActive` is set to `true` (or pending admin approval if invite-only policy is enabled).
3. **Role Elevation**: Privileged roles (`admin`, `super_admin`, `compliance_officer`, `knowledge_manager`) can only be assigned through an authenticated, audited administrative endpoint (`PATCH /api/v1/admin/users/:id/role`) protected by `super_admin` RBAC guards.

---

## 3. Redis Caching Across Authorization Boundaries

To prevent unauthorized users from receiving cached responses containing confidential context:

### 3.1 Partitioned Cache Key Construction
Cache keys incorporate user authorization boundaries, query content, and document state version:

$$\text{Key} = \text{rag:query:v1}:H(\text{query}):\text{clearance}:L_{user}:\text{dept}:D_{user}:\text{role}:R_{user}:\text{docVersion}$$

- $H(\text{query})$: SHA-256 hash of normalized user query.
- $L_{user}$: Numeric clearance level.
- $D_{user}$: Department identifier.
- $R_{user}$: User role.
- $\text{docVersion}$: Global or department document revision counter stored in Redis (`rag:doc_version:global`), incremented whenever a document is ingested, updated, or deleted.

### 3.2 Invalidation Rules
1. **Document Ingestion/Update/Deletion**: Atomically increments `rag:doc_version:global` in Redis, instantly invalidating all cached RAG responses without expensive key scanning.
2. **TTL Bound**: Even without modifications, cached queries expire automatically after a sliding TTL of 1 hour (3600s).
3. **Personalized Exclusions**: Queries with user-specific ACL overrides (`allowedUserIds`) bypass Redis caching completely to guarantee isolation.

---

## 4. Idempotent Ingestion & MongoDB-Qdrant Consistency

### 4.1 Ingestion Pipeline States
1. **Pending**: Document metadata recorded in MongoDB; SHA-256 checksum computed.
   - If `fileHash` matches an existing active document, the upload is rejected with `409 Conflict`.
2. **Processing**: Document text extracted and chunked. BullMQ job coordinates embedding batches.
3. **Partial-Index Cleanup & Failure Recovery**:
   - Chunks are inserted into Qdrant using deterministic UUIDs generated from `UUIDv5(namespace, documentId + "_" + chunkIndex)`.
   - If embedding fails mid-stream or the worker crashes, BullMQ retries the job with exponential backoff (3 attempts).
   - Before re-indexing, the worker issues a Qdrant deletion filter `{ "key": "document_id", "match": { "value": docId } }` and purges existing `DocumentChunks` in MongoDB, ensuring clean idempotency with zero orphaned vectors.
4. **Consistency Verification**:
   - Chunks in Qdrant are only activated (`is_active: true`) once all batches have successfully written to both MongoDB and Qdrant.
   - If unrecoverable failure occurs, document status is set to `'failed'` with error details, and all associated vectors are purged.

---

## 5. Token Lifecycle, Rotation & Session Security

### 5.1 Token Specifications
- **Access Token**: Short-lived JWT (15 minutes lifespan) containing user ID, role, department, clearance level, and unique session ID (`sessionId`).
- **Refresh Token**: Long-lived token (7 days lifespan) stored in an HTTP-only, Secure, SameSite=Strict cookie or Authorization header.

### 5.2 Refresh Token Rotation & Replay Detection
1. **Database Session Record**: MongoDB stores a hashed representation of the current active refresh token and its incremented `tokenVersion`.
2. **Rotation on Use**: When `/api/v1/auth/refresh` is invoked:
   - The presented refresh token is verified against the hash stored in MongoDB.
   - If the token matches, a new access token and a new refresh token are generated.
   - The old refresh token hash is overwritten in MongoDB.
3. **Replay Attack Detection**:
   - If an already-rotated (invalidated) refresh token is submitted, the server detects token reuse / replay.
   - **Immediate Revocation**: The server immediately terminates all sessions for that user (`failedLoginAttempts++`, clears `refreshTokenHash`), invalidating all active refresh tokens and forcing re-authentication across all devices.
4. **Targeted Multi-Device Sessions**:
   - Each login generates a distinct `sessionId`.
   - Logging out on device A invalidates only that device's session without terminating active sessions on device B.
