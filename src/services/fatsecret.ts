import axios from "axios";

const TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const API_BASE = "https://platform.fatsecret.com/rest";

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (cachedToken && now < tokenExpiry - 60) {
    return cachedToken;
  }

  const clientId = process.env.FATSECRET_CLIENT_ID;
  const clientSecret = process.env.FATSECRET_CLIENT_SECRET;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const response = await axios.post<TokenResponse>(
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

async function callFatSecret<T = unknown>(
  method: string,
  params: Record<string, string | number | boolean> = {}
): Promise<T> {
  const token = await getAccessToken();

  const response = await axios.post<T>(
    `${API_BASE}/server.api`,
    new URLSearchParams({
      method,
      format: "json",
      ...Object.fromEntries(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ),
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

async function callFatSecretUrl<T = unknown>(
  path: string,
  params: Record<string, string | number | boolean> = {}
): Promise<T> {
  const token = await getAccessToken();

  const searchParams = new URLSearchParams({ format: "json" });
  for (const [key, value] of Object.entries(params)) {
    searchParams.append(key, String(value));
  }

  const response = await axios.get<T>(`${API_BASE}${path}?${searchParams}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

function resetTokenCache(): void {
  cachedToken = null;
  tokenExpiry = 0;
}

export { getAccessToken, callFatSecret, callFatSecretUrl, resetTokenCache };
