import { google } from "googleapis";
import mammoth from "mammoth";

export const DRIVE_CONFIG = {
  INBOX_FOLDER_ID: process.env.DRIVE_INBOX_FOLDER_ID || "1NsEMlqn_TUeVenFSWgLU3jEsUCa6LWus",
  PROCESSED_FOLDER_ID: process.env.DRIVE_PROCESSED_FOLDER_ID || "1AUTWsUq2AS-LC2sgKkSqk1bhEYhI_D-2",
  KNOWLEDGE_DOC_ID: process.env.DRIVE_KNOWLEDGE_DOC_ID || "1NxcQYGHXaVfEGK7Vs5AiOjse8bsRbHBEiwdLsMr0LME",
  PERSONA_DOC_ID: process.env.DRIVE_PERSONA_DOC_ID || "1clt69Puie5CB96ukgjMAVCKDyuSPS5BU-C_JrI-tq3I",
  COACHING_EXAMPLES_FOLDER_ID: "10J6xKMbdDlZrKS6el0qWlnZeurtkLStS",
  DAILY_SUMMARY_EVAL_DOC_ID: process.env.DRIVE_DAILY_SUMMARY_EVAL_DOC_ID || "1fuaUZ6kLtWtdF39meAxfoktSPvRRzVWcGg5oEq8ygL8",
  LEAD_SCORING_PARAMS_DOC_ID: process.env.DRIVE_LEAD_SCORING_PARAMS_DOC_ID || "1xERqop5Y9iBNjghbwPF4jNpPKVMW8SlPkJEUnczXL5E"
};

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

export async function listFilesInInbox(): Promise<DriveFile[]> {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  const response = await drive.files.list({
    q: `'${DRIVE_CONFIG.INBOX_FOLDER_ID}' in parents and trashed = false`,
    fields: "files(id, name, mimeType)",
    orderBy: "createdTime",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });

  console.log(`[Drive] Listed files in folder ${DRIVE_CONFIG.INBOX_FOLDER_ID}: found ${response.data.files?.length || 0} files`);
  
  return (response.data.files || []).map(file => ({
    id: file.id!,
    name: file.name!,
    mimeType: file.mimeType!
  }));
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
    addParents: DRIVE_CONFIG.PROCESSED_FOLDER_ID,
    removeParents: DRIVE_CONFIG.INBOX_FOLDER_ID,
    fields: "id, parents",
    supportsAllDrives: true
  });
}

export async function getKnowledgebaseContent(): Promise<string> {
  const auth = getAuth();
  const docs = google.docs({ version: "v1", auth });

  const response = await docs.documents.get({
    documentId: DRIVE_CONFIG.KNOWLEDGE_DOC_ID
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

export async function getPersonaContent(): Promise<string> {
  const auth = getAuth();
  const docs = google.docs({ version: "v1", auth });

  const response = await docs.documents.get({
    documentId: DRIVE_CONFIG.PERSONA_DOC_ID
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

export async function getCoachingExamples(): Promise<{ filename: string; content: string }[]> {
  const files = await listFilesInFolder(DRIVE_CONFIG.COACHING_EXAMPLES_FOLDER_ID);
  const examples: { filename: string; content: string }[] = [];

  for (const file of files) {
    try {
      if (file.mimeType === "application/vnd.google-apps.document") {
        const content = await getDocumentContent(file.id);
        examples.push({ filename: file.name, content });
      } else if (file.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const buffer = await downloadFile(file.id);
        const result = await mammoth.extractRawText({ buffer });
        examples.push({ filename: file.name, content: result.value });
      }
    } catch (error) {
      console.error(`Failed to read coaching example ${file.name}:`, error);
    }
  }

  return examples;
}

let cachedScoringParams: { content: string; fetchedAt: number } | null = null;
const SCORING_PARAMS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

export async function getLeadScoringParameters(): Promise<string> {
  // Return cached content if still valid
  if (cachedScoringParams && (Date.now() - cachedScoringParams.fetchedAt) < SCORING_PARAMS_CACHE_TTL) {
    console.log("[Drive] Using cached lead scoring parameters");
    return cachedScoringParams.content;
  }
  
  console.log("[Drive] Fetching lead scoring parameters from Google Doc");
  const content = await getDocumentContent(DRIVE_CONFIG.LEAD_SCORING_PARAMS_DOC_ID);
  
  // Cache the result
  cachedScoringParams = {
    content,
    fetchedAt: Date.now()
  };
  
  return content;
}

export async function uploadFileToDrive(
  filename: string,
  content: Buffer,
  mimeType: string,
  folderId: string = DRIVE_CONFIG.INBOX_FOLDER_ID
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
