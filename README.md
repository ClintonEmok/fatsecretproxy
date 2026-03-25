# FatSecret Proxy

A Node.js + Express proxy server for the [FatSecret Platform API](https://platform.fatsecret.com/docs/) using OAuth 2.0.

FatSecret requires OAuth 2.0 tokens to be requested through a proxy server to protect client credentials.

## Setup

```bash
cp .env.example .env
# Edit .env with your FatSecret credentials
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `FATSECRET_CLIENT_ID` | Your FatSecret Client ID |
| `FATSECRET_CLIENT_SECRET` | Your FatSecret Client Secret |
| `FATSECRET_SCOPE` | OAuth scope (default: `basic`) |
| `PORT` | Server port (default: `3000`) |

## API Endpoints

```
GET /health
GET /api/foods/search?q=pizza&page_number=0&max_results=20
GET /api/foods/:id
GET /api/recipes/search?q=pasta&page_number=0&max_results=20
GET /api/recipes/:id
```

## Prerequisites

1. Register at [FatSecret Platform API](https://platform.fatsecret.com/api/)
2. Get your Client ID and Client Secret
3. Whitelist your server IP in the FatSecret dashboard (required for OAuth 2.0)
