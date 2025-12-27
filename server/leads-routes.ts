import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { insertLeadSchema } from "@shared/schema";
import { z } from "zod";
import { fetchLeadsFromSheet, parseLeadsFromSheet, detectColumnMapping, getSpreadsheetInfo } from "./google/sheetsClient";
import { researchLead } from "./ai/leadResearch";

export function registerLeadsRoutes(app: Express, requireAuth: (req: Request, res: Response, next: () => void) => void) {
  
  app.get("/api/leads", requireAuth, async (req: Request, res: Response) => {
    try {
      const leads = await storage.getAllLeads();
      
      const leadsWithResearch = await Promise.all(
        leads.map(async (lead) => {
          const researchPacket = await storage.getResearchPacketByLead(lead.id);
          return {
            ...lead,
            hasResearch: !!researchPacket,
            researchStatus: researchPacket?.verificationStatus || null,
          };
        })
      );
      
      res.json(leadsWithResearch);
    } catch (error) {
      console.error("Leads fetch error:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      const researchPacket = await storage.getResearchPacketByLead(lead.id);
      
      res.json({ lead, researchPacket });
    } catch (error) {
      console.error("Lead fetch error:", error);
      res.status(500).json({ message: "Failed to fetch lead" });
    }
  });

  app.post("/api/leads", requireAuth, async (req: Request, res: Response) => {
    try {
      const validatedData = insertLeadSchema.parse(req.body);
      
      const existingLead = await storage.getLeadByEmail(validatedData.contactEmail);
      if (existingLead) {
        return res.status(400).json({ message: "Lead with this email already exists" });
      }
      
      const lead = await storage.createLead(validatedData);
      res.status(201).json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid lead data", errors: error.errors });
      }
      console.error("Lead creation error:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  app.patch("/api/leads/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const updates = { ...req.body };
      
      if (updates.handedOffAt && typeof updates.handedOffAt === 'string') {
        updates.handedOffAt = new Date(updates.handedOffAt);
      }
      if (updates.nextFollowUpAt && typeof updates.nextFollowUpAt === 'string') {
        updates.nextFollowUpAt = new Date(updates.nextFollowUpAt);
      }
      if (updates.lastContactedAt && typeof updates.lastContactedAt === 'string') {
        updates.lastContactedAt = new Date(updates.lastContactedAt);
      }
      
      const lead = await storage.updateLead(req.params.id, updates);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Lead update error:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  app.delete("/api/leads/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteLead(req.params.id);
      res.json({ message: "Lead deleted" });
    } catch (error) {
      console.error("Lead delete error:", error);
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  app.get("/api/leads/import/preview", requireAuth, async (req: Request, res: Response) => {
    try {
      let range = req.query.range as string | undefined;
      if (!range) {
        const info = await getSpreadsheetInfo();
        const firstSheet = info.sheets[0]?.title || "Sheet1";
        range = `${firstSheet}!A:Z`;
      }
      
      const { headers, rows, totalRows } = await fetchLeadsFromSheet(undefined, range);
      const columnMapping = detectColumnMapping(headers);
      
      const previewRows = rows.slice(0, 5);
      
      res.json({
        headers,
        previewRows,
        totalRows,
        columnMapping,
      });
    } catch (error) {
      console.error("Sheets preview error:", error);
      res.status(500).json({ message: "Failed to preview spreadsheet. Check Google credentials and LEADS_SPREADSHEET_ID." });
    }
  });

  app.get("/api/leads/import/spreadsheet-info", requireAuth, async (req: Request, res: Response) => {
    try {
      const info = await getSpreadsheetInfo();
      res.json(info);
    } catch (error) {
      console.error("Spreadsheet info error:", error);
      res.status(500).json({ message: "Failed to get spreadsheet info. Check Google credentials." });
    }
  });

  app.post("/api/leads/import", requireAuth, async (req: Request, res: Response) => {
    try {
      const { range, columnMapping } = req.body;
      
      let sheetRange = range;
      if (!sheetRange) {
        const info = await getSpreadsheetInfo();
        const firstSheet = info.sheets[0]?.title || "Sheet1";
        sheetRange = `${firstSheet}!A:Z`;
      }
      
      const { headers, rows } = await fetchLeadsFromSheet(undefined, sheetRange);
      const { leads: parsedLeads, skipped, errors } = parseLeadsFromSheet(headers, rows, columnMapping);
      
      const existingEmails = new Set<string>();
      const duplicates: string[] = [];
      const newLeads = [];
      
      for (const lead of parsedLeads) {
        const existing = await storage.getLeadByEmail(lead.contactEmail);
        if (existing || existingEmails.has(lead.contactEmail)) {
          duplicates.push(lead.contactEmail);
        } else {
          existingEmails.add(lead.contactEmail);
          newLeads.push(lead);
        }
      }
      
      const createdLeads = await storage.createLeads(newLeads);
      
      res.json({
        imported: createdLeads.length,
        skipped,
        duplicates: duplicates.length,
        duplicateEmails: duplicates.slice(0, 10),
        errors: errors.slice(0, 10),
        leads: createdLeads,
      });
    } catch (error) {
      console.error("Leads import error:", error);
      res.status(500).json({ message: "Failed to import leads from spreadsheet" });
    }
  });

  app.post("/api/leads/:id/research", requireAuth, async (req: Request, res: Response) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      const existingPacket = await storage.getResearchPacketByLead(lead.id);
      const isFallbackData = existingPacket?.sources?.includes("Fallback template");
      
      if (existingPacket && req.query.refresh !== "true" && !isFallbackData) {
        return res.json({ 
          message: "Research already exists", 
          researchPacket: existingPacket,
          isExisting: true 
        });
      }
      
      if (isFallbackData) {
        console.log(`[LeadResearch] Existing research has fallback data, regenerating for ${lead.contactName}`);
      }
      
      const researchResult = await researchLead(lead);
      
      let researchPacket;
      if (existingPacket) {
        researchPacket = await storage.updateResearchPacket(existingPacket.id, researchResult.packet);
      } else {
        researchPacket = await storage.createResearchPacket(researchResult.packet);
      }
      
      const { discoveredInfo } = researchResult;
      const updateData: Record<string, string | number | null> = {};
      if (discoveredInfo.linkedInUrl && !lead.contactLinkedIn) {
        updateData.contactLinkedIn = discoveredInfo.linkedInUrl;
      }
      if (discoveredInfo.phoneNumber && !lead.contactPhone) {
        updateData.contactPhone = discoveredInfo.phoneNumber;
      }
      if (discoveredInfo.jobTitle && !lead.contactTitle) {
        updateData.contactTitle = discoveredInfo.jobTitle;
      }
      if (discoveredInfo.companyWebsite && !lead.companyWebsite) {
        updateData.companyWebsite = discoveredInfo.companyWebsite;
      }
      
      // Always update fitScore and priority from research
      if (researchPacket && researchPacket.fitScore !== null && researchPacket.fitScore !== undefined) {
        updateData.fitScore = researchPacket.fitScore;
      }
      if (researchPacket && researchPacket.priority) {
        updateData.priority = researchPacket.priority;
      }
      
      if (Object.keys(updateData).length > 0) {
        await storage.updateLead(lead.id, updateData);
        console.log(`[LeadResearch] Updated lead ${lead.id} with:`, Object.keys(updateData));
      }
      
      res.json({ 
        message: "Research completed", 
        researchPacket,
        isExisting: false 
      });
    } catch (error) {
      console.error("Lead research error:", error);
      res.status(500).json({ message: "Failed to research lead" });
    }
  });

  app.get("/api/leads/:id/research", requireAuth, async (req: Request, res: Response) => {
    try {
      const researchPacket = await storage.getResearchPacketByLead(req.params.id);
      if (!researchPacket) {
        return res.status(404).json({ message: "No research found for this lead" });
      }
      res.json(researchPacket);
    } catch (error) {
      console.error("Research fetch error:", error);
      res.status(500).json({ message: "Failed to fetch research" });
    }
  });

  app.get("/api/leads/:id/calls", requireAuth, async (req: Request, res: Response) => {
    try {
      const callHistory = await storage.getCallSessionsByLead(req.params.id);
      res.json(callHistory);
    } catch (error) {
      console.error("Call history fetch error:", error);
      res.status(500).json({ message: "Failed to fetch call history" });
    }
  });
}
