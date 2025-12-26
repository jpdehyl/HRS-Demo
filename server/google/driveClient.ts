import { google } from "googleapis";
import { GOOGLE_CONFIG } from "./config";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

function getAuth() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Google OAuth credentials. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

export async function listFilesInFolder(folderId: string): Promise<DriveFile[]> {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType)",
    orderBy: "createdTime",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });

  return (response.data.files || []).map(file => ({
    id: file.id!,
    name: file.name!,
    mimeType: file.mimeType!
  }));
}

export async function listFilesInInbox(): Promise<DriveFile[]> {
  console.log(`[Drive] Listing files in INBOX folder`);
  return listFilesInFolder(GOOGLE_CONFIG.INBOX_FOLDER_ID);
}

export async function downloadFile(fileId: string): Promise<Buffer> {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  const response = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" }
  );

  return Buffer.from(response.data as ArrayBuffer);
}

export async function moveFileToProcessed(fileId: string): Promise<void> {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  await drive.files.update({
    fileId,
    addParents: GOOGLE_CONFIG.PROCESSED_FOLDER_ID,
    removeParents: GOOGLE_CONFIG.INBOX_FOLDER_ID,
    fields: "id, parents",
    supportsAllDrives: true
  });
}

export async function getDocumentContent(docId: string): Promise<string> {
  const auth = getAuth();
  const docs = google.docs({ version: "v1", auth });

  const response = await docs.documents.get({
    documentId: docId
  });

  const content = response.data.body?.content || [];
  let text = "";

  for (const element of content) {
    if (element.paragraph?.elements) {
      for (const textElement of element.paragraph.elements) {
        if (textElement.textRun?.content) {
          text += textElement.textRun.content;
        }
      }
    }
  }

  return text.trim();
}

let cachedKnowledgeBase: { content: string; fetchedAt: number } | null = null;
let cachedPersona: { content: string; fetchedAt: number } | null = null;
let cachedDailySummaryCriteria: { content: string; fetchedAt: number } | null = null;
let cachedScoringParams: { content: string; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function getKnowledgebaseContent(): Promise<string> {
  if (cachedKnowledgeBase && (Date.now() - cachedKnowledgeBase.fetchedAt) < CACHE_TTL) {
    console.log("[Drive] Using cached knowledge base");
    return cachedKnowledgeBase.content;
  }

  console.log("[Drive] Fetching knowledge base from Google Doc");
  const content = await getDocumentContent(GOOGLE_CONFIG.KNOWLEDGE_BASE_DOC_ID);
  
  cachedKnowledgeBase = { content, fetchedAt: Date.now() };
  return content;
}

export async function getPersonaContent(): Promise<string> {
  if (cachedPersona && (Date.now() - cachedPersona.fetchedAt) < CACHE_TTL) {
    console.log("[Drive] Using cached SDR persona");
    return cachedPersona.content;
  }

  console.log("[Drive] Fetching SDR persona from Google Doc");
  const content = await getDocumentContent(GOOGLE_CONFIG.SDR_PERSONA_DOC_ID);
  
  cachedPersona = { content, fetchedAt: Date.now() };
  return content;
}

export async function getDailySummaryCriteria(): Promise<string> {
  if (cachedDailySummaryCriteria && (Date.now() - cachedDailySummaryCriteria.fetchedAt) < CACHE_TTL) {
    console.log("[Drive] Using cached daily summary criteria");
    return cachedDailySummaryCriteria.content;
  }

  console.log("[Drive] Fetching daily summary criteria from Google Doc");
  const content = await getDocumentContent(GOOGLE_CONFIG.DAILY_SUMMARY_CRITERIA_DOC_ID);
  
  cachedDailySummaryCriteria = { content, fetchedAt: Date.now() };
  return content;
}

export async function getLeadScoringParameters(): Promise<string> {
  if (cachedScoringParams && (Date.now() - cachedScoringParams.fetchedAt) < CACHE_TTL) {
    console.log("[Drive] Using cached lead scoring parameters");
    return cachedScoringParams.content;
  }

  console.log("[Drive] Fetching lead scoring parameters from Google Doc");
  const content = await getDocumentContent(GOOGLE_CONFIG.LEAD_SCORING_PARAMS_DOC_ID);
  
  cachedScoringParams = { content, fetchedAt: Date.now() };
  return content;
}

export async function getCoachingExamples(): Promise<{ filename: string; content: string }[]> {
  const files = await listFilesInFolder(GOOGLE_CONFIG.COACHING_EXAMPLES_FOLDER_ID);
  const examples: { filename: string; content: string }[] = [];

  for (const file of files) {
    try {
      if (file.mimeType === "application/vnd.google-apps.document") {
        const content = await getDocumentContent(file.id);
        examples.push({ filename: file.name, content });
      }
    } catch (error) {
      console.error(`Failed to read coaching example ${file.name}:`, error);
    }
  }

  return examples;
}

export async function uploadFileToDrive(
  filename: string,
  content: Buffer,
  mimeType: string,
  folderId: string = GOOGLE_CONFIG.INBOX_FOLDER_ID
): Promise<DriveFile> {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  const { Readable } = await import("stream");
  const stream = Readable.from(content);

  const response = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: "id, name, mimeType",
    supportsAllDrives: true,
  });

  console.log(`[Drive] Uploaded file: ${filename} to folder ${folderId}`);

  return {
    id: response.data.id!,
    name: response.data.name!,
    mimeType: response.data.mimeType!,
  };
}

export function checkDriveConfig(): { configured: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!process.env.GOOGLE_CLIENT_ID) missing.push("GOOGLE_CLIENT_ID");
  if (!process.env.GOOGLE_CLIENT_SECRET) missing.push("GOOGLE_CLIENT_SECRET");
  if (!process.env.GOOGLE_REFRESH_TOKEN) missing.push("GOOGLE_REFRESH_TOKEN");
  
  return {
    configured: missing.length === 0,
    missing
  };
}
