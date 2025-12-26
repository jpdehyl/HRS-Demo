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
import { eq, and, isNull, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: string): Promise<void>;
  
  getManager(id: string): Promise<Manager | undefined>;
  createManager(manager: InsertManager): Promise<Manager>;
  
  getSdr(id: string): Promise<Sdr | undefined>;
  createSdr(sdr: InsertSdr): Promise<Sdr>;
  
  getLead(id: string): Promise<Lead | undefined>;
  getLeadsBySdr(sdrId: string): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  
  getLiveCoachingSession(id: string): Promise<LiveCoachingSession | undefined>;
  getActiveSessionBySdr(sdrId: string): Promise<LiveCoachingSession | undefined>;
  createLiveCoachingSession(session: InsertLiveCoachingSession): Promise<LiveCoachingSession>;
  updateLiveCoachingSession(id: string, session: Partial<InsertLiveCoachingSession>): Promise<LiveCoachingSession | undefined>;
  
  getLiveCoachingTipsBySession(sessionId: string): Promise<LiveCoachingTip[]>;
  createLiveCoachingTip(tip: InsertLiveCoachingTip): Promise<LiveCoachingTip>;
  
  getLiveTranscriptsBySession(sessionId: string): Promise<LiveTranscript[]>;
  createLiveTranscript(transcript: InsertLiveTranscript): Promise<LiveTranscript>;
  
  getResearchPacketByLead(leadId: string): Promise<ResearchPacket | undefined>;
  createResearchPacket(packet: InsertResearchPacket): Promise<ResearchPacket>;
  updateResearchPacket(id: string, packet: Partial<InsertResearchPacket>): Promise<ResearchPacket | undefined>;
  
  getCallSession(id: string): Promise<CallSession | undefined>;
  getCallSessionByCallSid(callSid: string): Promise<CallSession | undefined>;
  getCallSessionsByUser(userId: string): Promise<CallSession[]>;
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

  async getSdr(id: string): Promise<Sdr | undefined> {
    const [sdr] = await db.select().from(sdrs).where(eq(sdrs.id, id));
    return sdr;
  }

  async createSdr(insertSdr: InsertSdr): Promise<Sdr> {
    const [sdr] = await db.insert(sdrs).values(insertSdr).returning();
    return sdr;
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async getLeadsBySdr(sdrId: string): Promise<Lead[]> {
    return db.select().from(leads).where(eq(leads.assignedSdrId, sdrId));
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const [lead] = await db.insert(leads).values(insertLead).returning();
    return lead;
  }

  async updateLead(id: string, updates: Partial<InsertLead>): Promise<Lead | undefined> {
    const [lead] = await db.update(leads).set(updates).where(eq(leads.id, id)).returning();
    return lead;
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

  async getCallSession(id: string): Promise<CallSession | undefined> {
    const [session] = await db.select().from(callSessions).where(eq(callSessions.id, id));
    return session;
  }

  async getCallSessionByCallSid(callSid: string): Promise<CallSession | undefined> {
    const [session] = await db.select().from(callSessions).where(eq(callSessions.callSid, callSid));
    return session;
  }

  async getCallSessionsByUser(userId: string): Promise<CallSession[]> {
    return db.select().from(callSessions).where(eq(callSessions.userId, userId));
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
