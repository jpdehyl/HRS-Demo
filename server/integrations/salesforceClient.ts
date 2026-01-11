import { db } from "../db";
import { integrationSettings } from "@shared/schema";
import { eq } from "drizzle-orm";

const SALESFORCE_AUTH_URL = "https://login.salesforce.com/services/oauth2";

interface SalesforceTokens {
  accessToken: string;
  refreshToken: string;
  instanceUrl: string;
  expiresAt: number;
}

interface SalesforceConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

let cachedTokens: SalesforceTokens | null = null;

function getConfig(): SalesforceConfig {
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error("Salesforce credentials not configured. Set SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET.");
  }
  
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.REPL_SLUG 
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : "http://localhost:5000";
  
  return {
    clientId,
    clientSecret,
    redirectUri: `${baseUrl}/api/salesforce/callback`,
  };
}

export function getAuthorizationUrl(): string {
  const config = getConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: "api refresh_token",
  });
  return `${SALESFORCE_AUTH_URL}/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<SalesforceTokens> {
  const config = getConfig();
  
  const response = await fetch(`${SALESFORCE_AUTH_URL}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Salesforce token exchange failed: ${error}`);
  }
  
  const data = await response.json();
  
  const tokens: SalesforceTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    instanceUrl: data.instance_url,
    expiresAt: Date.now() + 7200000,
  };
  
  await saveTokens(tokens);
  cachedTokens = tokens;
  
  return tokens;
}

async function refreshAccessToken(): Promise<SalesforceTokens> {
  const config = getConfig();
  const stored = await getStoredTokens();
  
  if (!stored?.refreshToken) {
    throw new Error("No refresh token available. Please reconnect Salesforce.");
  }
  
  const response = await fetch(`${SALESFORCE_AUTH_URL}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: stored.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    cachedTokens = null;
    await clearTokens();
    throw new Error(`Salesforce token refresh failed: ${error}`);
  }
  
  const data = await response.json();
  
  const tokens: SalesforceTokens = {
    accessToken: data.access_token,
    refreshToken: stored.refreshToken,
    instanceUrl: data.instance_url,
    expiresAt: Date.now() + 7200000,
  };
  
  await saveTokens(tokens);
  cachedTokens = tokens;
  
  return tokens;
}

async function getStoredTokens(): Promise<SalesforceTokens | null> {
  try {
    const result = await db.select().from(integrationSettings).where(eq(integrationSettings.provider, "salesforce")).limit(1);
    if (result.length === 0) return null;
    
    const settings = result[0];
    if (!settings.accessToken || !settings.instanceUrl) return null;
    
    return {
      accessToken: settings.accessToken,
      refreshToken: settings.refreshToken || "",
      instanceUrl: settings.instanceUrl,
      expiresAt: settings.expiresAt ? new Date(settings.expiresAt).getTime() : 0,
    };
  } catch (error) {
    console.error("[Salesforce] Error getting stored tokens:", error);
    return null;
  }
}

async function saveTokens(tokens: SalesforceTokens): Promise<void> {
  const existing = await db.select().from(integrationSettings).where(eq(integrationSettings.provider, "salesforce")).limit(1);
  
  const data = {
    provider: "salesforce" as const,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    instanceUrl: tokens.instanceUrl,
    expiresAt: new Date(tokens.expiresAt),
    isConnected: true,
    updatedAt: new Date(),
  };
  
  if (existing.length > 0) {
    await db.update(integrationSettings).set(data).where(eq(integrationSettings.provider, "salesforce"));
  } else {
    await db.insert(integrationSettings).values(data);
  }
}

async function clearTokens(): Promise<void> {
  await db.update(integrationSettings).set({
    accessToken: null,
    refreshToken: null,
    instanceUrl: null,
    expiresAt: null,
    isConnected: false,
    updatedAt: new Date(),
  }).where(eq(integrationSettings.provider, "salesforce"));
}

export async function getValidAccessToken(): Promise<{ accessToken: string; instanceUrl: string }> {
  if (cachedTokens && cachedTokens.expiresAt > Date.now() + 60000) {
    return { accessToken: cachedTokens.accessToken, instanceUrl: cachedTokens.instanceUrl };
  }
  
  const stored = await getStoredTokens();
  if (!stored) {
    throw new Error("Salesforce not connected. Please connect your Salesforce account.");
  }
  
  if (stored.expiresAt > Date.now() + 60000) {
    cachedTokens = stored;
    return { accessToken: stored.accessToken, instanceUrl: stored.instanceUrl };
  }
  
  const refreshed = await refreshAccessToken();
  return { accessToken: refreshed.accessToken, instanceUrl: refreshed.instanceUrl };
}

export async function salesforceRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { accessToken, instanceUrl } = await getValidAccessToken();
  
  const url = endpoint.startsWith("http") ? endpoint : `${instanceUrl}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    const retryResponse = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${refreshed.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    
    if (!retryResponse.ok) {
      throw new Error(`Salesforce API error: ${retryResponse.status} ${await retryResponse.text()}`);
    }
    
    return retryResponse.json();
  }
  
  if (!response.ok) {
    throw new Error(`Salesforce API error: ${response.status} ${await response.text()}`);
  }
  
  return response.json();
}

export async function isConnected(): Promise<boolean> {
  try {
    const stored = await getStoredTokens();
    return !!stored?.accessToken;
  } catch {
    return false;
  }
}

export async function disconnect(): Promise<void> {
  cachedTokens = null;
  await clearTokens();
}

export async function getConnectionStatus(): Promise<{
  connected: boolean;
  instanceUrl?: string;
  lastSyncAt?: Date;
}> {
  try {
    const result = await db.select().from(integrationSettings).where(eq(integrationSettings.provider, "salesforce")).limit(1);
    
    if (result.length === 0 || !result[0].isConnected) {
      return { connected: false };
    }
    
    return {
      connected: true,
      instanceUrl: result[0].instanceUrl || undefined,
      lastSyncAt: result[0].lastSyncAt || undefined,
    };
  } catch {
    return { connected: false };
  }
}

export async function updateLastSync(): Promise<void> {
  await db.update(integrationSettings).set({
    lastSyncAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(integrationSettings.provider, "salesforce"));
}
