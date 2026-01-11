import fetch from "node-fetch";

interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface ZoomRecording {
  id: string;
  call_id: string;
  caller_number: string;
  callee_number: string;
  date_time: string;
  duration: number;
  recording_type: string;
  download_url?: string;
  transcript_download_url?: string;
}

interface ZoomRecordingsResponse {
  recordings: ZoomRecording[];
  page_size: number;
  next_page_token?: string;
}

interface ZoomRecordingDetails {
  id: string;
  call_id: string;
  caller_number: string;
  callee_number: string;
  date_time: string;
  duration: number;
  download_url?: string;
  transcript_download_url?: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error("Zoom OAuth credentials not configured (ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET)");
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authString}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Zoom OAuth token request failed: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as ZoomTokenResponse;

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  console.log("[ZoomAPI] Obtained new access token");
  return data.access_token;
}

export async function listUserRecordings(userId: string, fromDate?: string, toDate?: string): Promise<ZoomRecording[]> {
  const token = await getAccessToken();

  const params = new URLSearchParams({
    page_size: "30",
  });

  if (fromDate) params.set("from", fromDate);
  if (toDate) params.set("to", toDate);

  const response = await fetch(`https://api.zoom.us/v2/phone/users/${userId}/recordings?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to list recordings: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as ZoomRecordingsResponse;
  return data.recordings || [];
}

export async function getRecordingDetails(recordingId: string): Promise<ZoomRecordingDetails> {
  const token = await getAccessToken();

  const response = await fetch(`https://api.zoom.us/v2/phone/recordings/${recordingId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get recording details: ${response.status} - ${errorText}`);
  }

  return (await response.json()) as ZoomRecordingDetails;
}

export async function downloadRecording(recordingId: string): Promise<Buffer> {
  const token = await getAccessToken();

  const response = await fetch(`https://api.zoom.us/v2/phone/recordings/${recordingId}/download`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to download recording: ${response.status} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function downloadTranscript(recordingId: string): Promise<string | null> {
  const token = await getAccessToken();

  const response = await fetch(`https://api.zoom.us/v2/phone/recordings/${recordingId}/transcript/download`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 404) {
    console.log(`[ZoomAPI] No transcript available for recording ${recordingId}`);
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[ZoomAPI] Failed to download transcript: ${response.status} - ${errorText}`);
    return null;
  }

  return await response.text();
}

export async function findRecordingByCallId(userId: string, callId: string): Promise<ZoomRecording | null> {
  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() - 7);

  const recordings = await listUserRecordings(
    userId,
    fromDate.toISOString().split("T")[0],
    today.toISOString().split("T")[0]
  );

  return recordings.find((r) => r.call_id === callId) || null;
}

export { ZoomRecording, ZoomRecordingDetails };
