# FatSecret Proxy - Project Roadmap

## Overview
A Node.js + Express proxy server for the FatSecret Platform API using OAuth 2.0 Client Credentials flow. FatSecret **requires** OAuth 2.0 tokens to be requested through a proxy server to protect client credentials.

## Goals
- Secure proxy for FatSecret API calls
- Automatic OAuth 2.0 token management with caching
- Clean REST endpoints for food and recipe searches
- Production-ready with security headers, CORS, logging

## Phases

### Phase 1: Core Proxy (Current)
- [x] Project initialization
- [x] OAuth 2.0 token service with caching
- [x] Food search and get endpoints
- [x] Recipe search and get endpoints
- [x] Error handling middleware
- [x] Health check endpoint

### Phase 2: Extended API Coverage
- [ ] Food categories and brands endpoints
- [ ] Barcode lookup endpoint
- [ ] NLP endpoint (requires premium scope)
- [ ] Rate limiting middleware
- [ ] Request validation with Zod/Joi

### Phase 3: Production Hardening
- [ ] Token refresh on 401 responses
- [ ] Retry logic with exponential backoff
- [ ] Request/response logging
- [ ] API key authentication for proxy clients
- [ ] Docker containerization
- [ ] CI/CD setup

### Phase 4: Advanced Features
- [ ] Response caching (Redis)
- [ ] Webhook support for diary entries
- [ ] Multi-tenant support (multiple FatSecret credentials)
- [ ] API documentation (Swagger/OpenAPI)

## Technical Stack
- **Runtime**: Node.js
- **Framework**: Express 5
- **HTTP Client**: Axios
- **Auth**: FatSecret OAuth 2.0 (Client Credentials)
- **Security**: Helmet, CORS

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /api/foods/search?q= | Search foods |
| GET | /api/foods/:id | Get food by ID |
| GET | /api/recipes/search?q= | Search recipes |
| GET | /api/recipes/:id | Get recipe by ID |

## FatSecret OAuth 2.0 Flow
1. Proxy receives client request
2. Checks cached token validity
3. If expired/missing: POST to `https://oauth.fatsecret.com/connect/token` with Basic Auth (Client ID:Secret)
4. Stores token with expiry (86400s / 24h)
5. Makes API call with Bearer token to `https://platform.fatsecret.com/rest/server.api`
6. Returns response to client

## Environment Variables
- `FATSECRET_CLIENT_ID` - Your FatSecret Client ID
- `FATSECRET_CLIENT_SECRET` - Your FatSecret Client Secret
- `FATSECRET_SCOPE` - OAuth scope (basic, premier, barcode, localization)
- `PORT` - Server port (default: 3000)
