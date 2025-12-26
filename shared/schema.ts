import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, date, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session table for connect-pg-simple (express-session with PostgreSQL)
export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

// Re-export chat schema for Gemini integration
export * from "./models/chat";

// User Roles for Role-Based Access Control
export const userRoleEnum = ["admin", "manager", "sdr", "account_specialist"] as const;
export type UserRole = typeof userRoleEnum[number];

// Users table with authentication and role-based access
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("sdr"),
  isActive: boolean("is_active").default(true).notNull(),
  sdrId: varchar("sdr_id", { length: 50 }),
  managerId: varchar("manager_id"),
  accountSpecialistId: varchar("account_specialist_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
});

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  lastLoginAt: true,
  isActive: true,
}).extend({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(userRoleEnum).default("sdr"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Manager Directory - Sales Managers
export const managers = pgTable("managers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertManagerSchema = createInsertSchema(managers).omit({ id: true, createdAt: true });
export type InsertManager = z.infer<typeof insertManagerSchema>;
export type Manager = typeof managers.$inferSelect;

// SDR Directory - Sales Development Representatives
export const sdrs = pgTable("sdrs", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  managerEmail: text("manager_email").notNull(),
  managerId: varchar("manager_id").references(() => managers.id),
  gender: text("gender").default("neutral").notNull(),
  timezone: text("timezone"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSdrSchema = createInsertSchema(sdrs).omit({ createdAt: true }).extend({
  timezone: z.string().nullable().optional()
});
export type InsertSdr = z.infer<typeof insertSdrSchema>;
export type Sdr = typeof sdrs.$inferSelect;

// Leads table for sales prospects
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  companyWebsite: text("company_website"),
  companyIndustry: text("company_industry"),
  companySize: text("company_size"),
  contactName: text("contact_name").notNull(),
  contactTitle: text("contact_title"),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  contactLinkedIn: text("contact_linkedin"),
  source: text("source").default("manual").notNull(),
  status: text("status").default("new").notNull(),
  fitScore: integer("fit_score"),
  priority: text("priority"),
  assignedSdrId: varchar("assigned_sdr_id", { length: 50 }).references(() => sdrs.id),
  nextFollowUpAt: timestamp("next_follow_up_at"),
  lastContactedAt: timestamp("last_contacted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

// Live Coaching Sessions - Track calls
export const liveCoachingSessions = pgTable("live_coaching_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callProvider: text("call_provider").default("twilio").notNull(),
  zoomMeetingId: text("zoom_meeting_id").notNull(),
  zoomMeetingUuid: text("zoom_meeting_uuid"),
  sdrId: varchar("sdr_id", { length: 50 }).references(() => sdrs.id),
  leadId: varchar("lead_id").references(() => leads.id),
  hostEmail: text("host_email"),
  topic: text("topic"),
  status: text("status").notNull().default("active"),
  streamId: text("stream_id"),
  leadContext: text("lead_context"),
  joinUrl: text("join_url"),
  phoneNumber: text("phone_number"),
  callDuration: integer("call_duration"),
  callOutcome: text("call_outcome"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

export const insertLiveCoachingSessionSchema = createInsertSchema(liveCoachingSessions).omit({ 
  id: true, 
  startedAt: true,
  endedAt: true
});
export type InsertLiveCoachingSession = z.infer<typeof insertLiveCoachingSessionSchema>;
export type LiveCoachingSession = typeof liveCoachingSessions.$inferSelect;

// Live Coaching Tips - Real-time AI coaching tips during calls
export const liveCoachingTips = pgTable("live_coaching_tips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => liveCoachingSessions.id).notNull(),
  tipType: text("tip_type").notNull(),
  content: text("content").notNull(),
  context: text("context"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLiveCoachingTipSchema = createInsertSchema(liveCoachingTips).omit({ 
  id: true, 
  createdAt: true
});
export type InsertLiveCoachingTip = z.infer<typeof insertLiveCoachingTipSchema>;
export type LiveCoachingTip = typeof liveCoachingTips.$inferSelect;

// Live Transcripts - Store live transcript chunks
export const liveTranscripts = pgTable("live_transcripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => liveCoachingSessions.id).notNull(),
  speaker: text("speaker"),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertLiveTranscriptSchema = createInsertSchema(liveTranscripts).omit({ 
  id: true
});
export type InsertLiveTranscript = z.infer<typeof insertLiveTranscriptSchema>;
export type LiveTranscript = typeof liveTranscripts.$inferSelect;

// Research Packets - AI-generated lead intelligence
export const researchPackets = pgTable("research_packets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id).notNull(),
  companyIntel: text("company_intel"),
  contactIntel: text("contact_intel"),
  painSignals: text("pain_signals"),
  competitorPresence: text("competitor_presence"),
  fitAnalysis: text("fit_analysis"),
  talkTrack: text("talk_track"),
  discoveryQuestions: text("discovery_questions"),
  objectionHandles: text("objection_handles"),
  companyHardIntel: text("company_hard_intel"),
  sources: text("sources"),
  verificationStatus: text("verification_status").default("unverified"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertResearchPacketSchema = createInsertSchema(researchPackets).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
});
export type InsertResearchPacket = z.infer<typeof insertResearchPacketSchema>;
export type ResearchPacket = typeof researchPackets.$inferSelect;

// Sessions table for express-session
export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Twilio Call Sessions - Track browser-based calls
export const callSessions = pgTable("call_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callSid: text("call_sid").unique(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  leadId: varchar("lead_id").references(() => leads.id),
  direction: text("direction").notNull(), // 'inbound' or 'outbound'
  fromNumber: text("from_number").notNull(),
  toNumber: text("to_number").notNull(),
  status: text("status").notNull().default("initiated"), // initiated, ringing, in-progress, completed, failed, busy, no-answer
  duration: integer("duration"),
  recordingUrl: text("recording_url"),
  transcriptText: text("transcript_text"),
  coachingNotes: text("coaching_notes"),
  managerSummary: text("manager_summary"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

export const insertCallSessionSchema = createInsertSchema(callSessions).omit({
  id: true,
  startedAt: true,
  endedAt: true,
});
export type InsertCallSession = z.infer<typeof insertCallSessionSchema>;
export type CallSession = typeof callSessions.$inferSelect;

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  sdr: one(sdrs, {
    fields: [users.sdrId],
    references: [sdrs.id],
  }),
  manager: one(managers, {
    fields: [users.managerId],
    references: [managers.id],
  }),
}));

export const managersRelations = relations(managers, ({ many }) => ({
  sdrs: many(sdrs),
}));

export const sdrsRelations = relations(sdrs, ({ one, many }) => ({
  manager: one(managers, {
    fields: [sdrs.managerId],
    references: [managers.id],
  }),
  leads: many(leads),
  sessions: many(liveCoachingSessions),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  assignedSdr: one(sdrs, {
    fields: [leads.assignedSdrId],
    references: [sdrs.id],
  }),
  researchPackets: many(researchPackets),
  coachingSessions: many(liveCoachingSessions),
}));

export const liveCoachingSessionsRelations = relations(liveCoachingSessions, ({ one, many }) => ({
  sdr: one(sdrs, {
    fields: [liveCoachingSessions.sdrId],
    references: [sdrs.id],
  }),
  lead: one(leads, {
    fields: [liveCoachingSessions.leadId],
    references: [leads.id],
  }),
  tips: many(liveCoachingTips),
  transcripts: many(liveTranscripts),
}));

export const liveCoachingTipsRelations = relations(liveCoachingTips, ({ one }) => ({
  session: one(liveCoachingSessions, {
    fields: [liveCoachingTips.sessionId],
    references: [liveCoachingSessions.id],
  }),
}));

export const liveTranscriptsRelations = relations(liveTranscripts, ({ one }) => ({
  session: one(liveCoachingSessions, {
    fields: [liveTranscripts.sessionId],
    references: [liveCoachingSessions.id],
  }),
}));

export const researchPacketsRelations = relations(researchPackets, ({ one }) => ({
  lead: one(leads, {
    fields: [researchPackets.leadId],
    references: [leads.id],
  }),
}));
