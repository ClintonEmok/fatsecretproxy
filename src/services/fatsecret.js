const axios = require("axios");

const TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const API_BASE = "https://platform.fatsecret.com/rest";

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);

  if (cachedToken && now < tokenExpiry - 60) {
    return cachedToken;
  }

  const clientId = process.env.FATSECRET_CLIENT_ID;
  const clientSecret = process.env.FATSECRET_CLIENT_SECRET;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const response = await axios.post(
    TOKEN_URL,
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  cachedToken = response.data.access_token;
  tokenExpiry = now + response.data.expires_in;

  return cachedToken;
}

async function callFatSecret(method, params = {}) {
  const token = await getAccessToken();

  const response = await axios.post(
    `${API_BASE}/server.api`,
    new URLSearchParams({
      method,
      format: "json",
      ...params,
    }).toString(),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return response.data;
}

async function callFatSecretUrl(path, params = {}) {
  const token = await getAccessToken();

  const query = new URLSearchParams({ format: "json", ...params }).toString();

  const response = await axios.get(`${API_BASE}${path}?${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

module.exports = { getAccessToken, callFatSecret, callFatSecretUrl };
