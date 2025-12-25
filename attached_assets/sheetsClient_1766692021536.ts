import { google } from "googleapis";
import type { InsertLead } from "@shared/schema";

export const SHEETS_CONFIG = {
  LEADS_SPREADSHEET_ID: process.env.LEADS_SPREADSHEET_ID || "1dEbs4B7oucHJmA8U0-VehfzQN3Yt54RRs6VQlWNxX2I",
};

function getAuth() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Google OAuth credentials");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

export interface SpreadsheetInfo {
  title: string;
  sheets: Array<{ sheetId: number; title: string }>;
}

export async function getSpreadsheetInfo(): Promise<SpreadsheetInfo> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.get({
    spreadsheetId: SHEETS_CONFIG.LEADS_SPREADSHEET_ID,
  });

  return {
    title: response.data.properties?.title || "Unknown",
    sheets: (response.data.sheets || []).map(sheet => ({
      sheetId: sheet.properties?.sheetId || 0,
      title: sheet.properties?.title || "Unknown",
    })),
  };
}

export async function fetchLeadsFromSheet(
  range: string = "Sheet1!A:Z"
): Promise<{ headers: string[]; rows: string[][]; totalRows: number }> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEETS_CONFIG.LEADS_SPREADSHEET_ID,
    range,
  });

  const values = response.data.values || [];
  if (values.length === 0) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  const headers = values[0].map(h => String(h).toLowerCase().trim());
  const rows = values.slice(1);

  console.log(`[Sheets] Fetched ${rows.length} rows with headers: ${headers.join(", ")}`);

  return { headers, rows, totalRows: rows.length };
}

function findColumnIndex(headers: string[], ...possibleNames: string[]): number {
  for (const name of possibleNames) {
    const index = headers.findIndex(h => 
      h.includes(name.toLowerCase()) || 
      name.toLowerCase().includes(h)
    );
    if (index !== -1) return index;
  }
  return -1;
}

export function parseLeadsFromSheet(
  headers: string[],
  rows: string[][]
): InsertLead[] {
  const companyNameIdx = findColumnIndex(headers, "company", "company name", "organization", "account");
  const companyWebsiteIdx = findColumnIndex(headers, "website", "company website", "domain", "url");
  const companyIndustryIdx = findColumnIndex(headers, "industry", "sector", "vertical");
  const companySizeIdx = findColumnIndex(headers, "size", "company size", "employees", "headcount");
  const contactNameIdx = findColumnIndex(headers, "contact name", "name", "full name", "contact");
  const contactTitleIdx = findColumnIndex(headers, "title", "job title", "position", "role");
  const contactEmailIdx = findColumnIndex(headers, "email", "contact email", "email address");
  const contactPhoneIdx = findColumnIndex(headers, "phone", "phone number", "mobile", "telephone");
  const contactLinkedInIdx = findColumnIndex(headers, "linkedin", "linkedin url", "profile");

  console.log(`[Sheets] Column mapping - Company: ${companyNameIdx}, Contact: ${contactNameIdx}, Email: ${contactEmailIdx}`);

  const leads: InsertLead[] = [];

  for (const row of rows) {
    const companyName = row[companyNameIdx]?.trim();
    const contactName = row[contactNameIdx]?.trim();
    const contactEmail = row[contactEmailIdx]?.trim();

    if (!companyName || !contactName || !contactEmail) {
      continue;
    }

    if (!contactEmail.includes("@")) {
      continue;
    }

    leads.push({
      companyName,
      companyWebsite: row[companyWebsiteIdx]?.trim() || null,
      companyIndustry: row[companyIndustryIdx]?.trim() || null,
      companySize: row[companySizeIdx]?.trim() || null,
      contactName,
      contactTitle: row[contactTitleIdx]?.trim() || null,
      contactEmail,
      contactPhone: row[contactPhoneIdx]?.trim() || null,
      contactLinkedIn: row[contactLinkedInIdx]?.trim() || null,
      source: "sheets",
      status: "new",
      fitScore: null,
      priority: null,
      assignedSdrId: null,
      nextFollowUpAt: null,
      lastContactedAt: null,
    });
  }

  console.log(`[Sheets] Parsed ${leads.length} valid leads from ${rows.length} rows`);

  return leads;
}

export async function importLeadsFromGoogleSheets(
  range?: string
): Promise<{ imported: number; skipped: number; duplicates: string[] }> {
  const { headers, rows, totalRows } = await fetchLeadsFromSheet(range);
  
  if (totalRows === 0) {
    return { imported: 0, skipped: 0, duplicates: [] };
  }

  const leads = parseLeadsFromSheet(headers, rows);
  const skipped = totalRows - leads.length;

  return {
    imported: leads.length,
    skipped,
    duplicates: [],
  };
}
