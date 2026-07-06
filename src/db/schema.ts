import { relations, sql } from "drizzle-orm";
import {
  sqliteTable,
  integer,
  text,
  real,
  index,
  uniqueIndex,
  check,
  primaryKey,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

// ISO 8601 timestamp "2026-06-09T14:30:00.000Z"
const now = () => new Date().toISOString();

const timestamps = () => ({
  createdAt: text("created_at").notNull().$defaultFn(now),
  updatedAt: text("updated_at").notNull().$defaultFn(now).$onUpdate(now),
});
const softDelete = () => ({
  deletedAt: text("deleted_at"),
});

// ============================================================ PATIENTS
export const patients = sqliteTable(
  "patients",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    dateOfBirth: text("date_of_birth"),
    gender: text("gender", {
      enum: ["male", "female", "other", "not_specified"],
    }),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    insuranceInfo: text("insurance_info"),
    notes: text("notes"),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => [index("idx_patients_name").on(t.lastName, t.firstName)],
);

// ============================================================ SESSIONS
export const sessions = sqliteTable(
  "sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id),
    sessionDate: text("session_date").notNull(),
    reason: text("reason"),
    sessionType: text("session_type", {
      enum: ["praxis", "praxis_2", "telephone", "emergency", "home_visit"],
    })
      .notNull()
      .default("praxis"),
    status: text("status", {
      enum: ["open", "completed", "cancelled"],
    })
      .notNull()
      .default("open"),
    durationMinutes: integer("duration_minutes"),
    summary: text("summary"),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => [
    index("idx_sessions_patient_id").on(t.patientId),
    index("idx_sessions_session_date").on(t.sessionDate),
    index("idx_sessions_status").on(t.status),
  ],
);

// ============================================================ SESSION ENTRIES
export const sessionEntries = sqliteTable(
  "session_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: integer("session_id")
      .notNull()
      .references(() => sessions.id),
    fieldKey: text("field_key").notNull(),
    fieldLabel: text("field_label"),
    value: text("value"),
    valueType: text("value_type", {
      enum: ["text", "number", "boolean", "date", "json"],
    })
      .notNull()
      .default("text"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("idx_session_entries_lookup").on(t.sessionId, t.fieldKey),
  ],
);

// ============================================================ MEDICAL REPORTS
export const medicalReports = sqliteTable(
  "medical_reports",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id),
    title: text("title").notNull(),
    body: text("body").notNull(),
    status: text("status", {
      enum: ["draft", "final", "archived"],
    })
      .notNull()
      .default("draft"),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => [
    index("idx_medical_reports_patient_id").on(t.patientId),
    index("idx_medical_reports_status").on(t.status),
  ],
);

// ============================================ MEDICAL REPORT REFERENCES
export const medicalReportReferences = sqliteTable(
  "medical_report_references",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reportId: integer("report_id")
      .notNull()
      .references(() => medicalReports.id),
    sessionId: integer("session_id").references(() => sessions.id),
    sessionEntryId: integer("session_entry_id").references(
      () => sessionEntries.id,
    ),
    anchor: text("anchor"),
    snapshot: text("snapshot"),
    createdAt: text("created_at").notNull().$defaultFn(now),
  },
  (t) => [
    check(
      "report_ref_target_check",
      sql`${t.sessionId} IS NOT NULL OR ${t.sessionEntryId} IS NOT NULL`,
    ),
  ],
);

// ============================================================ INVOICES
export const invoices = sqliteTable(
  "invoices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id),
    invoiceNumber: text("invoice_number").unique(),
    status: text("status", {
      enum: ["draft", "sent", "paid", "overdue", "cancelled"],
    })
      .notNull()
      .default("draft"),
    currency: text("currency").notNull().default("CHF"),
    issuedAt: text("issued_at"),
    dueAt: text("due_at"),
    paidAt: text("paid_at"),
    notes: text("notes"),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => [
    index("idx_invoices_patient_id").on(t.patientId),
    index("idx_invoices_status").on(t.status),
  ],
);

// ============================================================ INVOICE SESSIONS
export const invoiceSessions = sqliteTable(
  "invoice_sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    invoiceId: integer("invoice_id")
      .notNull()
      .references(() => invoices.id),
    sessionId: integer("session_id")
      .notNull()
      .references(() => sessions.id),
  },
  (t) => [
    uniqueIndex("idx_invoice_sessions_unique").on(t.invoiceId, t.sessionId),
    index("idx_invoice_sessions_session_id").on(t.sessionId),
  ],
);

// ============================================================ INVOICE ITEMS
export const invoiceItems = sqliteTable(
  "invoice_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    invoiceId: integer("invoice_id")
      .notNull()
      .references(() => invoices.id),
    // Session for bill line --> NULL = released (cancelled/trashed) or manual inovice line.
    sessionId: integer("session_id").references(() => sessions.id),
    description: text("description").notNull(),
    tariffCode: text("tariff_code"),
    quantity: real("quantity").notNull().default(1), // hours (duration / 60)
    unitPrice: integer("unit_price").notNull(), // rate/hour in Rappen (snapshot)
    total: integer("total").notNull(), // Rappen (snapshot)
    durationMinutes: integer("duration_minutes"),
    // Does this line currently hold the session lock? Set false on cancel/trash to free the session WITHOUT dropping the session_id link -(needed to re-validate on reactivation).
    billingActive: integer("billing_active", { mode: "boolean" })
      .notNull()
      .default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    index("idx_invoice_items_invoice_id").on(t.invoiceId),
    uniqueIndex("idx_invoice_items_active_session")
      .on(t.sessionId)
      .where(sql`${t.sessionId} IS NOT NULL AND ${t.billingActive} = 1`),
  ],
);

// Per-session-type hourly rate, in Rappen. Edited later via settings.
export const sessionRates = sqliteTable("session_rates", {
  sessionType: text("session_type").primaryKey(),
  rateRappen: integer("rate_rappen").notNull(),
  updatedAt: text("updated_at").notNull().$defaultFn(now).$onUpdate(now),
});
// ============================================================ TODOS
// ============================================================ TODOS
export const todos = sqliteTable(
  "todos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    status: text("status", {
      enum: ["open", "in_progress", "done", "cancelled"],
    })
      .notNull()
      .default("open"),
    priority: integer("priority").notNull().default(2), // 1 low | 2 med | 3 high
    // Self-reference: a todo nested under another. NULL = top-level.
    // onDelete "set null" so a removed parent orphans children to the root
    // rather than cascade-deleting the subtree (see note below).
    parentId: integer("parent_id").references((): AnySQLiteColumn => todos.id, {
      onDelete: "set null",
    }),
    // Order among siblings (same parentId). Lower = first.
    sortOrder: integer("sort_order").notNull().default(0),
    patientId: integer("patient_id").references(() => patients.id),
    sessionId: integer("session_id").references(() => sessions.id),
    dueAt: text("due_at"),
    completedAt: text("completed_at"),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => [
    index("idx_todos_status").on(t.status),
    index("idx_todos_priority").on(t.priority),
    index("idx_todos_patient_id").on(t.patientId),
    index("idx_todos_due_at").on(t.dueAt),
    index("idx_todos_parent_id").on(t.parentId),
  ],
);

// ============================================================ TODO FIELDS
export const todoFields = sqliteTable(
  "todo_fields",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    todoId: integer("todo_id")
      .notNull()
      .references(() => todos.id),
    fieldKey: text("field_key").notNull(),
    fieldLabel: text("field_label"),
    value: text("value"),
    valueType: text("value_type", {
      enum: ["text", "number", "boolean", "date", "json"],
    })
      .notNull()
      .default("text"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps(),
  },
  (t) => [uniqueIndex("idx_todo_fields_lookup").on(t.todoId, t.fieldKey)],
);

// ==================================================== FINANCES GENERAL
export const fgPersons = sqliteTable(
  "fg_persons",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    notes: text("notes"),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => [index("idx_fg_persons_name").on(t.name)],
);

export const fgTags = sqliteTable(
  "fg_tags",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    color: text("color"), // optional hex for the UI chip
    ...timestamps(),
    ...softDelete(),
  },
  // Unique among live tags only — lets you reuse a name after soft-deleting one.
  (t) => [
    uniqueIndex("idx_fg_tags_name")
      .on(t.name)
      .where(sql`${t.deletedAt} IS NULL`),
  ],
);

export const fgTransactions = sqliteTable(
  "fg_transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    direction: text("direction", { enum: ["income", "expense"] }).notNull(),
    description: text("description").notNull(),
    amountRappen: integer("amount_rappen").notNull(), // Rappen, like invoices
    recurrence: text("recurrence", { enum: ["once", "monthly", "yearly"] })
      .notNull()
      .default("once"),
    startDate: text("start_date").notNull(), // ISO date; the date, or first occurrence
    endDate: text("end_date"), // recurring only; NULL = ongoing
    personId: integer("person_id").references(() => fgPersons.id),
    notes: text("notes"),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => [
    index("idx_fg_transactions_direction").on(t.direction),
    index("idx_fg_transactions_start_date").on(t.startDate),
    index("idx_fg_transactions_person_id").on(t.personId),
  ],
);

// Junction: multiple tags per transaction.
export const fgTransactionTags = sqliteTable(
  "fg_transaction_tags",
  {
    transactionId: integer("transaction_id")
      .notNull()
      .references(() => fgTransactions.id),
    tagId: integer("tag_id")
      .notNull()
      .references(() => fgTags.id),
  },
  (t) => [
    primaryKey({ columns: [t.transactionId, t.tagId] }),
    index("idx_fg_transaction_tags_tag_id").on(t.tagId),
  ],
);

// ============================================================ RELATIONS
// Enable db.query.* relational lookups (e.g. patient with all sessions).
export const patientsRelations = relations(patients, ({ many }) => ({
  sessions: many(sessions),
  medicalReports: many(medicalReports),
  invoices: many(invoices),
  todos: many(todos),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  patient: one(patients, {
    fields: [sessions.patientId],
    references: [patients.id],
  }),
  entries: many(sessionEntries),
  invoiceSessions: many(invoiceSessions),
  todos: many(todos),
  reportReferences: many(medicalReportReferences),
}));

export const sessionEntriesRelations = relations(
  sessionEntries,
  ({ one, many }) => ({
    session: one(sessions, {
      fields: [sessionEntries.sessionId],
      references: [sessions.id],
    }),
    reportReferences: many(medicalReportReferences),
  }),
);

export const medicalReportsRelations = relations(
  medicalReports,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [medicalReports.patientId],
      references: [patients.id],
    }),
    references: many(medicalReportReferences),
  }),
);

export const medicalReportReferencesRelations = relations(
  medicalReportReferences,
  ({ one }) => ({
    report: one(medicalReports, {
      fields: [medicalReportReferences.reportId],
      references: [medicalReports.id],
    }),
    session: one(sessions, {
      fields: [medicalReportReferences.sessionId],
      references: [sessions.id],
    }),
    sessionEntry: one(sessionEntries, {
      fields: [medicalReportReferences.sessionEntryId],
      references: [sessionEntries.id],
    }),
  }),
);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  patient: one(patients, {
    fields: [invoices.patientId],
    references: [patients.id],
  }),
  items: many(invoiceItems),
  invoiceSessions: many(invoiceSessions),
}));

export const invoiceSessionsRelations = relations(
  invoiceSessions,
  ({ one }) => ({
    invoice: one(invoices, {
      fields: [invoiceSessions.invoiceId],
      references: [invoices.id],
    }),
    session: one(sessions, {
      fields: [invoiceSessions.sessionId],
      references: [sessions.id],
    }),
  }),
);

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  session: one(sessions, {
    fields: [invoiceItems.sessionId],
    references: [sessions.id],
  }),
}));

export const todosRelations = relations(todos, ({ one, many }) => ({
  patient: one(patients, {
    fields: [todos.patientId],
    references: [patients.id],
  }),
  session: one(sessions, {
    fields: [todos.sessionId],
    references: [sessions.id],
  }),
  parent: one(todos, {
    fields: [todos.parentId],
    references: [todos.id],
    relationName: "todo_subtasks",
  }),
  subtasks: many(todos, { relationName: "todo_subtasks" }),
  fields: many(todoFields),
}));

export const todoFieldsRelations = relations(todoFields, ({ one }) => ({
  todo: one(todos, { fields: [todoFields.todoId], references: [todos.id] }),
}));

export const fgPersonsRelations = relations(fgPersons, ({ many }) => ({
  transactions: many(fgTransactions),
}));

export const fgTagsRelations = relations(fgTags, ({ many }) => ({
  transactionTags: many(fgTransactionTags),
}));

export const fgTransactionsRelations = relations(
  fgTransactions,
  ({ one, many }) => ({
    person: one(fgPersons, {
      fields: [fgTransactions.personId],
      references: [fgPersons.id],
    }),
    transactionTags: many(fgTransactionTags),
  }),
);

export const fgTransactionTagsRelations = relations(
  fgTransactionTags,
  ({ one }) => ({
    transaction: one(fgTransactions, {
      fields: [fgTransactionTags.transactionId],
      references: [fgTransactions.id],
    }),
    tag: one(fgTags, {
      fields: [fgTransactionTags.tagId],
      references: [fgTags.id],
    }),
  }),
);
