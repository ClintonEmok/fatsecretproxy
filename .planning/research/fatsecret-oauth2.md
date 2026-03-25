# FatSecret Platform API - OAuth 2.0 Research

## Key Findings

### Authentication
- **Grant Type**: Client Credentials (server-to-server)
- **Token URL**: `https://oauth.fatsecret.com/connect/token`
- **Auth Method**: Basic Auth header (Base64 encoded `client_id:client_secret`)
- **Token Lifetime**: 86400 seconds (24 hours)
- **Token Type**: Bearer JWT

### Available Scopes
- `basic` - Standard food/nutrition data
- `premier` - Premium data (paid)
- `barcode` - Barcode scanning
- `localization` - Multi-language support
- `nlp` - Natural Language Processing (add-on, 14-day trial available)

### API Endpoint
- **Base URL**: `https://platform.fatsecret.com/rest/server.api`
- **Method**: POST with `Content-Type: application/x-www-form-urlencoded`
- **Auth Header**: `Authorization: Bearer <access_token>`
- **Response Format**: JSON (set `format=json` in body)

### Critical Requirements
1. **Proxy Required**: FatSecret explicitly requires OAuth 2.0 tokens to be requested through a proxy server
2. **IP Whitelisting**: Up to 15 IP addresses must be whitelisted in the FatSecret dashboard for OAuth 2.0
3. **Basic Auth**: Credentials must be in the Authorization header, NOT the request body

### Common Pitfalls
- Sending `client_id`/`client_secret` in POST body instead of Basic Auth header → 400 invalid_client
- Missing IP whitelist → blocked requests
- Requesting scopes not activated on account → scope errors

### Reference
- Official docs: https://platform.fatsecret.com/docs/guides/authentication/oauth2
- Postman collection: https://github.com/fatsecret-group/postman-fatsecret-apis
