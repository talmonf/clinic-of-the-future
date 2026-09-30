import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const documentKind = pgEnum("document_kind", ["master", "derivative"]);
export const documentStatus = pgEnum("document_status", [
  "draft",
  "in_progress",
  "pending_approval",
  "approved",
]);
export const taskStatus = pgEnum("task_status", ["open", "done"]);
export const contactCategory = pgEnum("contact_category", [
  "partner",
  "professional",
  "other",
  "referrer",
  "investor",
  "vendor",
  "stakeholder",
]);
export const contactSource = pgEnum("contact_source", ["manual", "inbound"]);
export const contactStatus = pgEnum("contact_status", [
  "new",
  "in_conversation",
  "active",
  "paused",
]);
export const appointmentKind = pgEnum("appointment_kind", [
  "advisor",
  "site_visit",
  "vendor",
  "other",
]);
export const aiTargetType = pgEnum("ai_target_type", ["document", "meeting"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  kind: documentKind("kind").notNull(),
  number: integer("number"),
  cluster: text("cluster"),
  title: text("title").notNull(),
  purpose: text("purpose").notNull().default(""),
  audience: text("audience").notNull().default(""),
  ownerName: text("owner_name").notNull().default(""),
  keyQuestion: text("key_question").notNull().default(""),
  sources: text("sources").notNull().default(""),
  priorDocuments: text("prior_documents").notNull().default(""),
  status: documentStatus("status").notNull().default("draft"),
  decisionNeeded: text("decision_needed").notNull().default(""),
  nextAction: text("next_action").notNull().default(""),
  body: text("body").notNull().default(""),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    status: documentStatus("status").notNull(),
    purpose: text("purpose").notNull().default(""),
    audience: text("audience").notNull().default(""),
    ownerName: text("owner_name").notNull().default(""),
    keyQuestion: text("key_question").notNull().default(""),
    sources: text("sources").notNull().default(""),
    priorDocuments: text("prior_documents").notNull().default(""),
    decisionNeeded: text("decision_needed").notNull().default(""),
    nextAction: text("next_action").notNull().default(""),
    savedBy: text("saved_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("document_versions_document_version").on(table.documentId, table.version)],
);

export const documentSources = pgTable("document_sources", {
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  sourceDocumentId: uuid("source_document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email"),
  organization: text("organization").notNull().default(""),
  category: contactCategory("category").notNull(),
  source: contactSource("source").notNull().default("manual"),
  contactStatus: contactStatus("contact_status").notNull().default("new"),
  contribution: text("contribution").notNull().default(""),
  mutualValue: text("mutual_value").notNull().default(""),
  nextAction: text("next_action").notNull().default(""),
  message: text("message").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const meetings = pgTable("meetings", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "set null" }),
  agenda: text("agenda").notNull().default(""),
  prepQuestions: text("prep_questions").notNull().default(""),
  discussion: text("discussion").notNull().default(""),
  clarifications: text("clarifications").notNull().default(""),
  gaps: text("gaps").notNull().default(""),
  summary: text("summary").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  kind: appointmentKind("kind").notNull().default("other"),
  withWhom: text("with_whom").notNull().default(""),
  location: text("location").notNull().default(""),
  notes: text("notes").notNull().default(""),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const decisions = pgTable("decisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  decidedOn: date("decided_on"),
  subject: text("subject").notNull(),
  decision: text("decision").notNull(),
  rationale: text("rationale").notNull().default(""),
  implication: text("implication").notNull().default(""),
  ownerName: text("owner_name").notNull().default(""),
  meetingId: uuid("meeting_id").references(() => meetings.id, { onDelete: "set null" }),
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assumptions = pgTable("assumptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  statement: text("statement").notNull(),
  importance: text("importance").notNull().default(""),
  certainty: text("certainty").notNull().default(""),
  howToTest: text("how_to_test").notNull().default(""),
  finding: text("finding").notNull().default(""),
  decisionText: text("decision_text").notNull().default(""),
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const risks = pgTable("risks", {
  id: uuid("id").primaryKey().defaultRandom(),
  risk: text("risk").notNull(),
  probability: text("probability").notNull().default(""),
  impact: text("impact").notNull().default(""),
  prevention: text("prevention").notNull().default(""),
  response: text("response").notNull().default(""),
  ownerName: text("owner_name").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  details: text("details").notNull().default(""),
  status: taskStatus("status").notNull().default("open"),
  ownerName: text("owner_name").notNull().default(""),
  dueOn: date("due_on"),
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "set null" }),
  meetingId: uuid("meeting_id").references(() => meetings.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  body: text("body").notNull(),
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "cascade" }),
  meetingId: uuid("meeting_id").references(() => meetings.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  appointmentId: uuid("appointment_id").references(() => appointments.id, {
    onDelete: "cascade",
  }),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiAgents = pgTable("ai_agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  purpose: text("purpose").notNull().default(""),
  systemPrompt: text("system_prompt").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiRuns = pgTable("ai_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => aiAgents.id, { onDelete: "cascade" }),
  actorEmail: text("actor_email"),
  targetType: aiTargetType("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  promptInput: text("prompt_input").notNull(),
  output: text("output").notNull(),
  model: text("model").notNull(),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorEmail: text("actor_email"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
