import { 
  type User, type InsertUser,
  type Manager, type InsertManager,
  type Sdr, type InsertSdr,
  type Lead, type InsertLead,
  type LiveCoachingSession, type InsertLiveCoachingSession,
  type LiveCoachingTip, type InsertLiveCoachingTip,
  type LiveTranscript, type InsertLiveTranscript,
  type ResearchPacket, type InsertResearchPacket,
  type CallSession, type InsertCallSession,
  users, managers, sdrs, leads, 
  liveCoachingSessions, liveCoachingTips, liveTranscripts, researchPackets,
  callSessions
} from "@shared/schema";
import { db } from "./db";
import { eq, and, isNull, desc, inArray, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: string): Promise<void>;
  
  getManager(id: string): Promise<Manager | undefined>;
  getAllManagers(): Promise<Manager[]>;
  createManager(manager: InsertManager): Promise<Manager>;
  
  getSdr(id: string): Promise<Sdr | undefined>;
  getAllSdrs(): Promise<Sdr[]>;
  getSdrsByManager(managerId: string): Promise<Sdr[]>;
  createSdr(sdr: InsertSdr): Promise<Sdr>;
  updateSdr(id: string, updates: Partial<InsertSdr>): Promise<Sdr | undefined>;
  deleteSdr(id: string): Promise<boolean>;
  getUsersBySdrIds(sdrIds: string[]): Promise<User[]>;
  
  getLead(id: string): Promise<Lead | undefined>;
  getLeadByEmail(email: string): Promise<Lead | undefined>;
  getAllLeads(): Promise<Lead[]>;
  getLeadsBySdr(sdrId: string): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  createLeads(leadsData: InsertLead[]): Promise<Lead[]>;
  updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;
  
  getLiveCoachingSession(id: string): Promise<LiveCoachingSession | undefined>;
  getActiveSessionBySdr(sdrId: string): Promise<LiveCoachingSession | undefined>;
  getLiveCoachingSessionsByLead(leadId: string): Promise<LiveCoachingSession[]>;
  createLiveCoachingSession(session: InsertLiveCoachingSession): Promise<LiveCoachingSession>;
  updateLiveCoachingSession(id: string, session: Partial<InsertLiveCoachingSession>): Promise<LiveCoachingSession | undefined>;
  
  getLiveCoachingTipsBySession(sessionId: string): Promise<LiveCoachingTip[]>;
  createLiveCoachingTip(tip: InsertLiveCoachingTip): Promise<LiveCoachingTip>;
  
  getLiveTranscriptsBySession(sessionId: string): Promise<LiveTranscript[]>;
  createLiveTranscript(transcript: InsertLiveTranscript): Promise<LiveTranscript>;
  
  getResearchPacketByLead(leadId: string): Promise<ResearchPacket | undefined>;
  createResearchPacket(packet: InsertResearchPacket): Promise<ResearchPacket>;
  updateResearchPacket(id: string, packet: Partial<InsertResearchPacket>): Promise<ResearchPacket | undefined>;
  deleteResearchPacket(id: string): Promise<boolean>;
  
  getCallSession(id: string): Promise<CallSession | undefined>;
  getCallSessionByCallSid(callSid: string): Promise<CallSession | undefined>;
  getCallSessionsByUser(userId: string): Promise<CallSession[]>;
  getCallSessionsByLead(leadId: string): Promise<CallSession[]>;
  getAllCallSessions(): Promise<CallSession[]>;
  getCallSessionsByUserIds(userIds: string[]): Promise<CallSession[]>;
  getCoachingTipsCountBySession(sessionIds: string[]): Promise<Map<string, number>>;
  getAllCoachingTips(): Promise<{ tipType: string; count: number }[]>;
  getRecentCoachingTips(limit?: number): Promise<{ sessionId: string; tipType: string; content: string; createdAt: Date }[]>;
  getRecentInitiatedCallSession(toNumber: string): Promise<CallSession | undefined>;
  createCallSession(session: InsertCallSession): Promise<CallSession>;
  updateCallSession(id: string, updates: Partial<InsertCallSession>): Promise<CallSession | undefined>;
  updateCallSessionByCallSid(callSid: string, updates: Partial<InsertCallSession>): Promise<CallSession | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
  }

  async getManager(id: string): Promise<Manager | undefined> {
    const [manager] = await db.select().from(managers).where(eq(managers.id, id));
    return manager;
  }

  async createManager(insertManager: InsertManager): Promise<Manager> {
    const [manager] = await db.insert(managers).values(insertManager).returning();
    return manager;
  }

  async getAllManagers(): Promise<Manager[]> {
    return db.select().from(managers).orderBy(managers.name);
  }

  async getSdr(id: string): Promise<Sdr | undefined> {
    const [sdr] = await db.select().from(sdrs).where(eq(sdrs.id, id));
    return sdr;
  }

  async getAllSdrs(): Promise<Sdr[]> {
    return db.select().from(sdrs).orderBy(sdrs.name);
  }

  async getSdrsByManager(managerId: string): Promise<Sdr[]> {
    return db.select().from(sdrs).where(eq(sdrs.managerId, managerId)).orderBy(sdrs.name);
  }

  async getUsersBySdrIds(sdrIds: string[]): Promise<User[]> {
    if (sdrIds.length === 0) return [];
    return db.select().from(users).where(inArray(users.sdrId, sdrIds));
  }

  async createSdr(insertSdr: InsertSdr): Promise<Sdr> {
    const [sdr] = await db.insert(sdrs).values(insertSdr).returning();
    return sdr;
  }

  async updateSdr(id: string, updates: Partial<InsertSdr>): Promise<Sdr | undefined> {
    const [sdr] = await db.update(sdrs).set(updates).where(eq(sdrs.id, id)).returning();
    return sdr;
  }

  async deleteSdr(id: string): Promise<boolean> {
    await db.delete(sdrs).where(eq(sdrs.id, id));
    return true;
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async getLeadByEmail(email: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.contactEmail, email));
    return lead;
  }

  async getAllLeads(): Promise<Lead[]> {
    return db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLeadsBySdr(sdrId: string): Promise<Lead[]> {
    return db.select().from(leads).where(eq(leads.assignedSdrId, sdrId));
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const [lead] = await db.insert(leads).values(insertLead).returning();
    return lead;
  }

  async createLeads(leadsData: InsertLead[]): Promise<Lead[]> {
    if (leadsData.length === 0) return [];
    return db.insert(leads).values(leadsData).returning();
  }

  async updateLead(id: string, updates: Partial<InsertLead>): Promise<Lead | undefined> {
    const [lead] = await db.update(leads).set(updates).where(eq(leads.id, id)).returning();
    return lead;
  }

  async deleteLead(id: string): Promise<boolean> {
    const result = await db.delete(leads).where(eq(leads.id, id));
    return true;
  }

  async getLiveCoachingSession(id: string): Promise<LiveCoachingSession | undefined> {
    const [session] = await db.select().from(liveCoachingSessions).where(eq(liveCoachingSessions.id, id));
    return session;
  }

  async getActiveSessionBySdr(sdrId: string): Promise<LiveCoachingSession | undefined> {
    const [session] = await db.select()
      .from(liveCoachingSessions)
      .where(eq(liveCoachingSessions.sdrId, sdrId));
    return session;
  }

  async getLiveCoachingSessionsByLead(leadId: string): Promise<LiveCoachingSession[]> {
    return db.select()
      .from(liveCoachingSessions)
      .where(eq(liveCoachingSessions.leadId, leadId))
      .orderBy(desc(liveCoachingSessions.startedAt));
  }

  async createLiveCoachingSession(insertSession: InsertLiveCoachingSession): Promise<LiveCoachingSession> {
    const [session] = await db.insert(liveCoachingSessions).values(insertSession).returning();
    return session;
  }

  async updateLiveCoachingSession(id: string, updates: Partial<InsertLiveCoachingSession>): Promise<LiveCoachingSession | undefined> {
    const [session] = await db.update(liveCoachingSessions).set(updates).where(eq(liveCoachingSessions.id, id)).returning();
    return session;
  }

  async getLiveCoachingTipsBySession(sessionId: string): Promise<LiveCoachingTip[]> {
    return db.select().from(liveCoachingTips).where(eq(liveCoachingTips.sessionId, sessionId));
  }

  async createLiveCoachingTip(insertTip: InsertLiveCoachingTip): Promise<LiveCoachingTip> {
    const [tip] = await db.insert(liveCoachingTips).values(insertTip).returning();
    return tip;
  }

  async getLiveTranscriptsBySession(sessionId: string): Promise<LiveTranscript[]> {
    return db.select().from(liveTranscripts).where(eq(liveTranscripts.sessionId, sessionId));
  }

  async createLiveTranscript(insertTranscript: InsertLiveTranscript): Promise<LiveTranscript> {
    const [transcript] = await db.insert(liveTranscripts).values(insertTranscript).returning();
    return transcript;
  }

  async getResearchPacketByLead(leadId: string): Promise<ResearchPacket | undefined> {
    const [packet] = await db.select().from(researchPackets).where(eq(researchPackets.leadId, leadId));
    return packet;
  }

  async createResearchPacket(insertPacket: InsertResearchPacket): Promise<ResearchPacket> {
    const [packet] = await db.insert(researchPackets).values(insertPacket).returning();
    return packet;
  }

  async updateResearchPacket(id: string, updates: Partial<InsertResearchPacket>): Promise<ResearchPacket | undefined> {
    const [packet] = await db.update(researchPackets).set(updates).where(eq(researchPackets.id, id)).returning();
    return packet;
  }

  async deleteResearchPacket(id: string): Promise<boolean> {
    const result = await db.delete(researchPackets).where(eq(researchPackets.id, id));
    return true;
  }

  async getCallSession(id: string): Promise<CallSession | undefined> {
    const [session] = await db.select().from(callSessions).where(eq(callSessions.id, id));
    return session;
  }

  async getCallSessionByCallSid(callSid: string): Promise<CallSession | undefined> {
    const [session] = await db.select().from(callSessions).where(eq(callSessions.callSid, callSid));
    return session;
  }

  async getCallSessionsByUser(userId: string): Promise<CallSession[]> {
    return db.select().from(callSessions).where(eq(callSessions.userId, userId)).orderBy(desc(callSessions.startedAt));
  }

  async getCallSessionsByLead(leadId: string): Promise<CallSession[]> {
    return db.select().from(callSessions).where(eq(callSessions.leadId, leadId)).orderBy(desc(callSessions.startedAt));
  }

  async getAllCallSessions(): Promise<CallSession[]> {
    return db.select().from(callSessions).orderBy(desc(callSessions.startedAt));
  }

  async getCallSessionsByUserIds(userIds: string[]): Promise<CallSession[]> {
    if (userIds.length === 0) return [];
    return db.select().from(callSessions).where(inArray(callSessions.userId, userIds)).orderBy(desc(callSessions.startedAt));
  }

  async getCoachingTipsCountBySession(sessionIds: string[]): Promise<Map<string, number>> {
    if (sessionIds.length === 0) return new Map();
    const counts = await db
      .select({ 
        sessionId: liveCoachingTips.sessionId, 
        count: sql<number>`count(*)::int` 
      })
      .from(liveCoachingTips)
      .where(inArray(liveCoachingTips.sessionId, sessionIds))
      .groupBy(liveCoachingTips.sessionId);
    return new Map(counts.map(c => [c.sessionId, c.count]));
  }

  async getAllCoachingTips(): Promise<{ tipType: string; count: number }[]> {
    const results = await db
      .select({ 
        tipType: liveCoachingTips.tipType, 
        count: sql<number>`count(*)::int` 
      })
      .from(liveCoachingTips)
      .groupBy(liveCoachingTips.tipType)
      .orderBy(sql`count(*) DESC`);
    return results;
  }

  async getRecentCoachingTips(limit: number = 50): Promise<{ sessionId: string; tipType: string; content: string; createdAt: Date }[]> {
    const results = await db
      .select({
        sessionId: liveCoachingTips.sessionId,
        tipType: liveCoachingTips.tipType,
        content: liveCoachingTips.content,
        createdAt: liveCoachingTips.createdAt,
      })
      .from(liveCoachingTips)
      .orderBy(desc(liveCoachingTips.createdAt))
      .limit(limit);
    return results;
  }

  async getRecentInitiatedCallSession(toNumber: string): Promise<CallSession | undefined> {
    const [session] = await db.select()
      .from(callSessions)
      .where(
        and(
          eq(callSessions.toNumber, toNumber),
          eq(callSessions.status, "initiated"),
          isNull(callSessions.callSid)
        )
      )
      .orderBy(desc(callSessions.startedAt))
      .limit(1);
    return session;
  }

  async createCallSession(insertSession: InsertCallSession): Promise<CallSession> {
    const [session] = await db.insert(callSessions).values(insertSession).returning();
    return session;
  }

  async updateCallSession(id: string, updates: Partial<InsertCallSession>): Promise<CallSession | undefined> {
    const [session] = await db.update(callSessions).set(updates).where(eq(callSessions.id, id)).returning();
    return session;
  }

  async updateCallSessionByCallSid(callSid: string, updates: Partial<InsertCallSession>): Promise<CallSession | undefined> {
    const [session] = await db.update(callSessions).set(updates).where(eq(callSessions.callSid, callSid)).returning();
    return session;
  }
}

export const storage = new DatabaseStorage();
