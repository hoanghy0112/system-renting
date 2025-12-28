# Authentication Guide

DistributedCompute uses different authentication methods for REST API and WebSocket connections.

---

## REST API Authentication (Clerk JWT)

Protected REST endpoints use [Clerk](https://clerk.com) for authentication.

### Flow
1. User authenticates via Clerk (frontend)
2. Frontend obtains JWT token from Clerk session
3. Include token in `Authorization` header for API requests

### Request Format
```bash
curl -X GET \
  -H "Authorization: Bearer <CLERK_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/billing/rentals
```

### Token Validation
The backend validates:
- Token signature using Clerk public keys
- Token expiration (`exp` claim)
- Issuer matches configured Clerk instance

### Protected Endpoints
| Module | Endpoints | Auth Required |
|--------|-----------|---------------|
| **Marketplace** | `GET /nodes`, `GET /nodes/:id`, `GET /stats` | ❌ No |
| **Marketplace** | `POST /nodes`, `PUT /nodes/:id`, `DELETE /nodes/:id`, `GET /my-nodes` | ✅ Yes |
| **Billing** | All endpoints | ✅ Yes |

### Error Responses
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

---

## WebSocket Authentication (API Key)

Host Agents authenticate using a unique API key.

### Flow
1. Host registers node via REST API (authenticated)
2. Backend generates unique `HOST_API_KEY` for the node
3. Agent uses API key in WebSocket handshake

### Connection
```javascript
const socket = io('http://localhost:3000/fleet', {
  extraHeaders: {
    Authorization: `Bearer ${HOST_API_KEY}`
  }
});
```

### Key Validation
On connection, the backend:
1. Extracts API key from `Authorization` header
2. Looks up associated node in database
3. Attaches node info to socket for subsequent messages
4. Rejects connection if key is invalid

### Connection Rejection
Invalid authentication results in immediate socket disconnection with no error event.

---

## Security Best Practices

### Token Storage
- **Frontend**: Store Clerk tokens in memory only (Clerk SDK handles this)
- **Agent**: Store API key in environment variables, never in code

### Environment Variables
```bash
# Backend .env
CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# Agent .env
HOST_API_KEY=hak_xxx
BACKEND_WS_URL=wss://api.yourdomain.com/fleet
```

### Rate Limiting
- REST API: Implement per-user rate limits
- WebSocket: Heartbeat interval enforced at 5 seconds

### Token Refresh
- Clerk tokens typically expire in 1 hour
- Frontend should refresh tokens before expiration
- Agent API keys do not expire but can be revoked
