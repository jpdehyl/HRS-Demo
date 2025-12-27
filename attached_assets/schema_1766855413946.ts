import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

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

// Email Schedules - Configure manager email summaries
export const emailSchedules = pgTable("email_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  managerId: varchar("manager_id").references(() => managers.id).notNull(),
  dailyEnabled: boolean("daily_enabled").default(true).notNull(),
  weeklyEnabled: boolean("weekly_enabled").default(true).notNull(),
  monthlyEnabled: boolean("monthly_enabled").default(true).notNull(),
  vacationStart: date("vacation_start"),
  vacationEnd: date("vacation_end"),
  delegateManagerId: varchar("delegate_manager_id").references(() => managers.id),
  pauseUntil: date("pause_until"),
  lastDailySent: timestamp("last_daily_sent"),
  lastWeeklySent: timestamp("last_weekly_sent"),
  lastMonthlySent: timestamp("last_monthly_sent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEmailScheduleSchema = createInsertSchema(emailSchedules).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  lastDailySent: true,
  lastWeeklySent: true,
  lastMonthlySent: true
});
export type InsertEmailSchedule = z.infer<typeof insertEmailScheduleSchema>;
export type EmailSchedule = typeof emailSchedules.$inferSelect;

// SDR Directory - Sales Development Representatives
export const sdrs = pgTable("sdrs", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  managerEmail: text("manager_email").notNull(),
  managerId: varchar("manager_id").references(() => managers.id),
  gender: text("gender").default("neutral").notNull(), // male, female, or neutral
  timezone: text("timezone"), // IANA timezone (e.g., "America/Los_Angeles"), null = use global default
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSdrSchema = createInsertSchema(sdrs).omit({ createdAt: true }).extend({
  timezone: z.string().nullable().optional()
});
export type InsertSdr = z.infer<typeof insertSdrSchema>;
export type Sdr = typeof sdrs.$inferSelect;

// Processed Files - Track all processed audio files
export const processedFiles = pgTable("processed_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driveFileId: text("drive_file_id").notNull().unique(),
  filename: text("filename").notNull(),
  sdrId: varchar("sdr_id", { length: 50 }).references(() => sdrs.id),
  callDate: timestamp("call_date"),
  action: text("action"),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
});

export const insertProcessedFileSchema = createInsertSchema(processedFiles).omit({ 
  id: true, 
  processedAt: true 
});
export type InsertProcessedFile = z.infer<typeof insertProcessedFileSchema>;
export type ProcessedFile = typeof processedFiles.$inferSelect;

// Transcripts - Store audio transcriptions
export const transcripts = pgTable("transcripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  processedFileId: varchar("processed_file_id").references(() => processedFiles.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTranscriptSchema = createInsertSchema(transcripts).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertTranscript = z.infer<typeof insertTranscriptSchema>;
export type Transcript = typeof transcripts.$inferSelect;

// Feedback - AI-generated coaching feedback
export const feedbacks = pgTable("feedbacks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  processedFileId: varchar("processed_file_id").references(() => processedFiles.id).notNull(),
  strength: text("strength").notNull(),
  improvement: text("improvement").notNull(),
  emailSent: boolean("email_sent").default(false).notNull(),
  emailSentAt: timestamp("email_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFeedbackSchema = createInsertSchema(feedbacks).omit({ 
  id: true, 
  createdAt: true,
  emailSentAt: true
});
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedbacks.$inferSelect;

// Processing Logs - Detailed activity logs
export const processingLogs = pgTable("processing_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  level: text("level").notNull().default("info"),
  message: text("message").notNull(),
  details: text("details"),
  processedFileId: varchar("processed_file_id").references(() => processedFiles.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProcessingLogSchema = createInsertSchema(processingLogs).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertProcessingLog = z.infer<typeof insertProcessingLogSchema>;
export type ProcessingLog = typeof processingLogs.$inferSelect;

// Relations
export const managersRelations = relations(managers, ({ many }) => ({
  sdrs: many(sdrs),
  emailSchedules: many(emailSchedules),
}));

export const emailSchedulesRelations = relations(emailSchedules, ({ one }) => ({
  manager: one(managers, {
    fields: [emailSchedules.managerId],
    references: [managers.id],
  }),
  delegateManager: one(managers, {
    fields: [emailSchedules.delegateManagerId],
    references: [managers.id],
  }),
}));

export const sdrsRelations = relations(sdrs, ({ one, many }) => ({
  manager: one(managers, {
    fields: [sdrs.managerId],
    references: [managers.id],
  }),
  processedFiles: many(processedFiles),
}));

export const processedFilesRelations = relations(processedFiles, ({ one, many }) => ({
  sdr: one(sdrs, {
    fields: [processedFiles.sdrId],
    references: [sdrs.id],
  }),
  transcripts: many(transcripts),
  feedbacks: many(feedbacks),
  logs: many(processingLogs),
}));

export const transcriptsRelations = relations(transcripts, ({ one }) => ({
  processedFile: one(processedFiles, {
    fields: [transcripts.processedFileId],
    references: [processedFiles.id],
  }),
}));

export const feedbacksRelations = relations(feedbacks, ({ one }) => ({
  processedFile: one(processedFiles, {
    fields: [feedbacks.processedFileId],
    references: [processedFiles.id],
  }),
}));

export const processingLogsRelations = relations(processingLogs, ({ one }) => ({
  processedFile: one(processedFiles, {
    fields: [processingLogs.processedFileId],
    references: [processedFiles.id],
  }),
}));

// Generated Reports - Store weekly/monthly reports for dashboard viewing
export const generatedReports = pgTable("generated_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // "weekly" or "monthly"
  managerEmail: text("manager_email").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalCalls: integer("total_calls").notNull().default(0),
  successRate: integer("success_rate").notNull().default(0),
  activeSdrs: integer("active_sdrs").notNull().default(0),
  reportData: text("report_data").notNull(), // JSON string of full report data
  emailSent: boolean("email_sent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGeneratedReportSchema = createInsertSchema(generatedReports).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertGeneratedReport = z.infer<typeof insertGeneratedReportSchema>;
export type GeneratedReport = typeof generatedReports.$inferSelect;

// Live Coaching Sessions - Track Zoom RTMS sessions and Twilio calls
export const liveCoachingSessions = pgTable("live_coaching_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callProvider: text("call_provider").default("zoom").notNull(), // "zoom" or "twilio"
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
  phoneNumber: text("phone_number"), // For Twilio calls - the number being called
  callDuration: integer("call_duration"), // Duration in seconds
  callOutcome: text("call_outcome"), // connected, voicemail, no_answer, etc.
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

// Relations for live coaching
export const liveCoachingSessionsRelations = relations(liveCoachingSessions, ({ one, many }) => ({
  sdr: one(sdrs, {
    fields: [liveCoachingSessions.sdrId],
    references: [sdrs.id],
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

// ============================================================================
// AUTHENTICATION & AUTHORIZATION
// ============================================================================

// User roles enum
export const userRoles = ["admin", "manager", "sdr", "account_specialist"] as const;
export type UserRole = typeof userRoles[number];

// Users table with role-based access
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("sdr"), // admin, manager, sdr, account_specialist
  isActive: boolean("is_active").default(true).notNull(),
  // Link to profile tables based on role
  sdrId: varchar("sdr_id", { length: 50 }).references(() => sdrs.id),
  managerId: varchar("manager_id").references(() => managers.id),
  accountSpecialistId: varchar("account_specialist_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Sessions table for authentication
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// Account Specialists table
export const accountSpecialists = pgTable("account_specialists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  managerId: varchar("manager_id").references(() => managers.id),
  specialization: text("specialization"), // e.g., "Enterprise", "Mid-Market", "SMB"
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAccountSpecialistSchema = createInsertSchema(accountSpecialists).omit({
  id: true,
  createdAt: true,
});
export type InsertAccountSpecialist = z.infer<typeof insertAccountSpecialistSchema>;
export type AccountSpecialist = typeof accountSpecialists.$inferSelect;

// User relations
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

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountSpecialistsRelations = relations(accountSpecialists, ({ one }) => ({
  manager: one(managers, {
    fields: [accountSpecialists.managerId],
    references: [managers.id],
  }),
}));

// ============================================================================
// LEAD INTEL SYSTEM
// ============================================================================

// Leads - Core lead database for Lead Intel
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
  linkedInIntel: text("linkedin_intel"), // JSON string with deep LinkedIn research
  linkedInVerified: boolean("linkedin_verified").default(false), // Manual verification flag
  linkedInEditedAt: timestamp("linkedin_edited_at"), // When LinkedIn intel was manually edited
  linkedInEditedBy: text("linkedin_edited_by"), // Who edited the LinkedIn intel
  source: text("source").default("manual").notNull(), // manual, sheets, discovered, competitor
  status: text("status").default("new").notNull(), // new, researching, researched, contacted, follow_up, won, lost, disqualified
  fitScore: integer("fit_score"),
  priority: text("priority"), // hot, warm, cool, cold
  assignedSdrId: varchar("assigned_sdr_id", { length: 50 }).references(() => sdrs.id),
  nextFollowUpAt: timestamp("next_follow_up_at"),
  lastContactedAt: timestamp("last_contacted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
});
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

// Research Packets - AI-generated research for leads
export const researchPackets = pgTable("research_packets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id).notNull(),
  companyIntel: text("company_intel"), // JSON string
  contactIntel: text("contact_intel"), // JSON string
  painSignals: text("pain_signals"), // JSON string
  competitorPresence: text("competitor_presence"), // JSON string
  fitAnalysis: text("fit_analysis"), // JSON string with score breakdown
  talkTrack: text("talk_track"),
  discoveryQuestions: text("discovery_questions"), // JSON array
  objectionHandles: text("objection_handles"), // JSON string
  xIntel: text("x_intel"), // JSON string - X.com/Twitter research from xAI
  companyHardIntel: text("company_hard_intel"), // JSON string - Hard facts: location, stock, contracts, news
  // Confidence and verification metadata
  confidenceScores: text("confidence_scores"), // JSON: per-field confidence 0-100
  sources: text("intel_sources"), // JSON: per-field source URLs for verification
  verificationStatus: text("verification_status").default("unverified"), // unverified, partially_verified, verified
  // Manual override tracking
  manualOverrides: text("manual_overrides"), // JSON: { fieldName: { value, editedBy, editedAt, reason } }
  lastEditedBy: text("last_edited_by"),
  lastEditedAt: timestamp("last_edited_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertResearchPacketSchema = createInsertSchema(researchPackets).omit({ 
  id: true, 
  createdAt: true
});
export type InsertResearchPacket = z.infer<typeof insertResearchPacketSchema>;
export type ResearchPacket = typeof researchPackets.$inferSelect;

// Contact History - Track all touchpoints with leads
export const contactHistory = pgTable("contact_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id).notNull(),
  contactType: text("contact_type").notNull(), // call, email, linkedin, meeting, other
  direction: text("direction").notNull(), // outbound, inbound
  outcome: text("outcome"), // connected, voicemail, no_answer, email_sent, replied, meeting_set
  notes: text("notes"),
  nextAction: text("next_action"),
  followUpDate: date("follow_up_date"),
  createdBy: varchar("created_by", { length: 50 }).references(() => sdrs.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContactHistorySchema = createInsertSchema(contactHistory).omit({ 
  id: true, 
  createdAt: true
});
export type InsertContactHistory = z.infer<typeof insertContactHistorySchema>;
export type ContactHistory = typeof contactHistory.$inferSelect;

// Lead Q&A Threads - AI-powered question answering for leads
export const leadQaThreads = pgTable("lead_qa_threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id).notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sources: text("sources"), // JSON: "cached" | "web_search" | "knowledge_base"
  webSearchUsed: boolean("web_search_used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLeadQaThreadSchema = createInsertSchema(leadQaThreads).omit({ 
  id: true, 
  createdAt: true
});
export type InsertLeadQaThread = z.infer<typeof insertLeadQaThreadSchema>;
export type LeadQaThread = typeof leadQaThreads.$inferSelect;

// Lead Intel Relations
export const leadsRelations = relations(leads, ({ one, many }) => ({
  assignedSdr: one(sdrs, {
    fields: [leads.assignedSdrId],
    references: [sdrs.id],
  }),
  researchPackets: many(researchPackets),
  contactHistory: many(contactHistory),
  qaThreads: many(leadQaThreads),
}));

export const leadQaThreadsRelations = relations(leadQaThreads, ({ one }) => ({
  lead: one(leads, {
    fields: [leadQaThreads.leadId],
    references: [leads.id],
  }),
}));

export const researchPacketsRelations = relations(researchPackets, ({ one }) => ({
  lead: one(leads, {
    fields: [researchPackets.leadId],
    references: [leads.id],
  }),
}));

export const contactHistoryRelations = relations(contactHistory, ({ one }) => ({
  lead: one(leads, {
    fields: [contactHistory.leadId],
    references: [leads.id],
  }),
  createdByUser: one(sdrs, {
    fields: [contactHistory.createdBy],
    references: [sdrs.id],
  }),
}));
