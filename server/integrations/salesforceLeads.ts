import { salesforceRequest, updateLastSync } from "./salesforceClient";
import { db } from "../db";
import { leads, salesforceSyncLog } from "@shared/schema";
import { eq, isNull, and, or } from "drizzle-orm";

interface SalesforceLeadRecord {
  Id: string;
  FirstName?: string;
  LastName?: string;
  Name?: string;
  Email?: string;
  Phone?: string;
  Company?: string;
  Title?: string;
  Industry?: string;
  Website?: string;
  NumberOfEmployees?: number;
  Status?: string;
  Description?: string;
  LeadSource?: string;
}

interface SalesforceQueryResponse {
  totalSize: number;
  done: boolean;
  records: SalesforceLeadRecord[];
  nextRecordsUrl?: string;
}

export async function importLeadsFromSalesforce(options: {
  ownerId?: string;
  status?: string;
  limit?: number;
} = {}): Promise<{ imported: number; updated: number; errors: string[] }> {
  const syncLog = await db.insert(salesforceSyncLog).values({
    operation: "import_leads",
    direction: "inbound",
    status: "in_progress",
  }).returning();
  
  const logId = syncLog[0].id;
  const errors: string[] = [];
  let imported = 0;
  let updated = 0;
  
  try {
    let query = `SELECT Id, FirstName, LastName, Name, Email, Phone, Company, Title, Industry, Website, NumberOfEmployees, Status, Description, LeadSource FROM Lead`;
    
    const conditions: string[] = [];
    if (options.ownerId) {
      conditions.push(`OwnerId = '${options.ownerId}'`);
    }
    if (options.status) {
      conditions.push(`Status = '${options.status}'`);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }
    
    query += ` ORDER BY CreatedDate DESC`;
    
    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    
    const response = await salesforceRequest<SalesforceQueryResponse>(
      `/services/data/v59.0/query?q=${encodeURIComponent(query)}`
    );
    
    for (const sfLead of response.records) {
      try {
        const existingLead = await db.select().from(leads)
          .where(eq(leads.salesforceId, sfLead.Id))
          .limit(1);
        
        const leadData = {
          companyName: sfLead.Company || "Unknown Company",
          companyWebsite: sfLead.Website || null,
          companyIndustry: sfLead.Industry || null,
          companySize: sfLead.NumberOfEmployees ? String(sfLead.NumberOfEmployees) : null,
          contactName: sfLead.Name || `${sfLead.FirstName || ""} ${sfLead.LastName || ""}`.trim() || "Unknown",
          contactTitle: sfLead.Title || null,
          contactEmail: sfLead.Email || `no-email-${sfLead.Id}@placeholder.com`,
          contactPhone: sfLead.Phone || null,
          source: sfLead.LeadSource || "salesforce",
          status: mapSalesforceStatus(sfLead.Status),
          salesforceId: sfLead.Id,
          salesforceLastSync: new Date(),
        };
        
        if (existingLead.length > 0) {
          await db.update(leads)
            .set({
              ...leadData,
              salesforceLastSync: new Date(),
            })
            .where(eq(leads.id, existingLead[0].id));
          updated++;
        } else {
          await db.insert(leads).values(leadData);
          imported++;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to import lead ${sfLead.Id}: ${errorMsg}`);
      }
    }
    
    await db.update(salesforceSyncLog).set({
      status: errors.length > 0 ? "completed_with_errors" : "completed",
      recordCount: imported + updated,
      errorMessage: errors.length > 0 ? errors.join("; ") : null,
      completedAt: new Date(),
    }).where(eq(salesforceSyncLog.id, logId));
    
    await updateLastSync();
    
    return { imported, updated, errors };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    await db.update(salesforceSyncLog).set({
      status: "failed",
      errorMessage: errorMsg,
      completedAt: new Date(),
    }).where(eq(salesforceSyncLog.id, logId));
    
    throw error;
  }
}

export async function pushLeadToSalesforce(leadId: string, options: {
  includeResearch?: boolean;
  includeCallNotes?: boolean;
} = {}): Promise<{ success: boolean; salesforceId: string }> {
  const lead = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  
  if (lead.length === 0) {
    throw new Error("Lead not found");
  }
  
  const localLead = lead[0];
  
  const nameParts = localLead.contactName.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || nameParts[0] || "";
  
  const sfLeadData: Record<string, unknown> = {
    FirstName: firstName,
    LastName: lastName,
    Email: localLead.contactEmail,
    Phone: localLead.contactPhone,
    Company: localLead.companyName,
    Title: localLead.contactTitle,
    Industry: localLead.companyIndustry,
    Website: localLead.companyWebsite,
    Status: mapToSalesforceStatus(localLead.status),
  };
  
  if (options.includeResearch || options.includeCallNotes) {
    const descriptionParts: string[] = [];
    
    if (localLead.qualificationNotes) {
      descriptionParts.push(`Qualification Notes:\n${localLead.qualificationNotes}`);
    }
    if (localLead.buySignals) {
      descriptionParts.push(`Buy Signals:\n${localLead.buySignals}`);
    }
    if (localLead.budget) {
      descriptionParts.push(`Budget: ${localLead.budget}`);
    }
    if (localLead.timeline) {
      descriptionParts.push(`Timeline: ${localLead.timeline}`);
    }
    
    if (descriptionParts.length > 0) {
      sfLeadData.Description = descriptionParts.join("\n\n");
    }
  }
  
  let salesforceId = localLead.salesforceId;
  
  if (salesforceId) {
    await salesforceRequest(`/services/data/v59.0/sobjects/Lead/${salesforceId}`, {
      method: "PATCH",
      body: JSON.stringify(sfLeadData),
    });
  } else {
    const createResponse = await salesforceRequest<{ id: string }>(
      `/services/data/v59.0/sobjects/Lead`,
      {
        method: "POST",
        body: JSON.stringify(sfLeadData),
      }
    );
    salesforceId = createResponse.id;
    
    await db.update(leads).set({
      salesforceId,
      salesforceLastSync: new Date(),
    }).where(eq(leads.id, leadId));
  }
  
  await db.update(leads).set({
    salesforceLastSync: new Date(),
  }).where(eq(leads.id, leadId));
  
  return { success: true, salesforceId };
}

export async function handoverToSalesforce(leadId: string, options: {
  accountExecutiveEmail?: string;
  convertToOpportunity?: boolean;
} = {}): Promise<{ success: boolean; salesforceId: string; opportunityId?: string }> {
  const result = await pushLeadToSalesforce(leadId, {
    includeResearch: true,
    includeCallNotes: true,
  });
  
  if (options.convertToOpportunity && result.salesforceId) {
    try {
      const convertResponse = await salesforceRequest<{
        accountId: string;
        contactId: string;
        opportunityId: string;
      }>(`/services/data/v59.0/sobjects/Lead/${result.salesforceId}/convert`, {
        method: "POST",
        body: JSON.stringify({
          convertedStatus: "Qualified",
          doNotCreateOpportunity: false,
        }),
      });
      
      return {
        success: true,
        salesforceId: result.salesforceId,
        opportunityId: convertResponse.opportunityId,
      };
    } catch (error) {
      console.error("[Salesforce] Lead conversion failed:", error);
    }
  }
  
  return result;
}

export async function getSyncLogs(limit: number = 20): Promise<typeof salesforceSyncLog.$inferSelect[]> {
  return db.select().from(salesforceSyncLog)
    .orderBy(salesforceSyncLog.startedAt)
    .limit(limit);
}

function mapSalesforceStatus(sfStatus?: string): string {
  if (!sfStatus) return "new";
  
  const statusMap: Record<string, string> = {
    "Open - Not Contacted": "new",
    "Working - Contacted": "contacted",
    "Closed - Converted": "converted",
    "Closed - Not Converted": "lost",
    "Qualified": "qualified",
    "Nurturing": "engaged",
  };
  
  return statusMap[sfStatus] || "new";
}

function mapToSalesforceStatus(localStatus: string): string {
  const statusMap: Record<string, string> = {
    "new": "Open - Not Contacted",
    "researching": "Open - Not Contacted",
    "contacted": "Working - Contacted",
    "engaged": "Working - Contacted",
    "qualified": "Qualified",
    "handed_off": "Qualified",
    "converted": "Closed - Converted",
    "lost": "Closed - Not Converted",
  };
  
  return statusMap[localStatus] || "Open - Not Contacted";
}
