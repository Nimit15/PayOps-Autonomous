// PayPal Auth Manager - Auto-refreshing OAuth2 token singleton
// NEVER hardcode static PAYPAL_ACCESS_TOKEN - expires every 8-9 hours

const BASE_URL = 'https://api-m.sandbox.paypal.com';

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  app_id: string;
  nonce: string;
}

class PayPalAuthManager {
  private static instance: PayPalAuthManager;
  private cachedToken: { value: string; expiresAt: number } | null = null;
  private readonly safetyBufferMs = 5 * 60 * 1000; // 5 minutes before expiry

  private constructor() {}

  static getInstance(): PayPalAuthManager {
    if (!PayPalAuthManager.instance) {
      PayPalAuthManager.instance = new PayPalAuthManager();
    }
    return PayPalAuthManager.instance;
  }

  async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.value;
    }

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('PAYPAL_CLIENT_ID and PAYPAL_SECRET must be set in environment');
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(`${BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: 'grant_type=client_credentials',
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PayPal OAuth failed (${response.status}): ${errorText}`);
    }

    const data = await response.json() as TokenResponse;
    this.cachedToken = {
      value: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 300) * 1000, // 5 min buffer
    };

    return this.cachedToken.value;
  }

  async invalidateToken(): Promise<void> {
    this.cachedToken = null;
  }

  isTokenValid(): boolean {
    return this.cachedToken !== null && Date.now() < this.cachedToken.expiresAt;
  }

  getTokenExpiry(): number | null {
    return this.cachedToken?.expiresAt ?? null;
  }
}

export const paypalAuth = PayPalAuthManager.getInstance();
export default paypalAuth;