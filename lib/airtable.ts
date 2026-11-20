import "server-only";

import { LeadError, assertRecordId } from "@/lib/errors";
import { presentLead } from "@/lib/lead-view";
import type { Assignee, Attachment, FieldMeta, Lead, LeadSchema } from "@/lib/types";

/** META Leads is the automation source. Lead Centre never calls it. */
const META_LEADS_TABLE_ID = "tblMGnUG41Di1ptCC";

type AirtableRecord = {
  id: string;
  createdTime?: string;
  fields?: Record<string, unknown>;
};

const knownAssignees = new Map<string, Assignee>();
let schemaCache: { at: number; schema: LeadSchema } | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function baseId(): string {
  const id = process.env.AIRTABLE_BASE_ID;
  if (!id) throw new LeadError("AIRTABLE_BASE_ID is not set on the server.", 500);
  return id;
}

function leadsTableId(): string {
  const id = process.env.LEADS_TABLE_ID;
  if (!id) throw new LeadError("LEADS_TABLE_ID is not set on the server.", 500);
  if (id === META_LEADS_TABLE_ID) {
    throw new LeadError("Lead Centre never reads or writes the META Leads table.", 500);
  }
  return id;
}

function token(): string {
  const value = process.env.AIRTABLE_TOKEN;
  if (!value) {
    throw new LeadError("AIRTABLE_TOKEN is not set on the server. Set DEMO_MODE=true to use sample leads.", 500);
  }
  return value;
}

function leadsCollectionUrl(): string {
  return `https://api.airtable.com/v0/${baseId()}/${leadsTableId()}`;
}

function assertSafeUrl(url: string): void {
  if (url.includes(META_LEADS_TABLE_ID)) {
    throw new LeadError("Blocked a request that targeted the META Leads table.", 500);
  }
  const tableId = leadsTableId();
  const isMetadata = url.includes("/meta/bases/");
  if (!isMetadata && !url.includes(`/v0/${baseId()}/${tableId}`)) {
    throw new LeadError("Lead Centre only reads and writes the Leads table.", 500);
  }
}

function airtableMessage(error: unknown): string {
  if (typeof error === "string") return error.slice(0, 240);
  if (isRecord(error) && typeof error.message === "string") return error.message.slice(0, 240);
  return "";
}

async function airtableFetch<T>(url: string, init?: RequestInit): Promise<T> {
  assertSafeUrl(url);
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  if (!response.ok) {
    const message = isRecord(body) ? airtableMessage(body.error) : "";
    if (response.status === 401 || response.status === 403) {
      throw new LeadError("Airtable refused the token. Check the token scopes and that it can access the Lead Pipeline base.", 502);
    }
    if (response.status === 404) throw new LeadError("That lead is not on the Leads table.", 404);
    if (response.status === 429) {
      throw new LeadError("Airtable is rate limiting requests. Wait a moment and try again.", 429);
    }
    throw new LeadError(message || "Airtable could not complete that request.", 502);
  }
  return body as T;
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (isRecord(value) && typeof value.name === "string") return value.name;
  return "";
}

function asDate(value: unknown): string | null {
  const text = asString(value).trim();
  return text || null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function asAssignee(value: unknown): Assignee | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id : "";
  const email = typeof value.email === "string" ? value.email : "";
  const name = typeof value.name === "string" ? value.name : email;
  if (!id && !name) return null;
  return { id, name: name || "Teammate", email };
}

function asAttachments(value: unknown): Attachment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    return [
      {
        id: typeof item.id === "string" ? item.id : asString(item.filename) || "file",
        url: typeof item.url === "string" ? item.url : "",
        filename: typeof item.filename === "string" ? item.filename : "Attachment",
        type: typeof item.type === "string" ? item.type : "",
        size: typeof item.size === "number" ? item.size : null,
      },
    ];
  });
}

function rememberAssignee(assignee: Assignee | null): void {
  if (!assignee?.id) return;
  knownAssignees.set(assignee.id, assignee);
}

export function mapRecord(record: AirtableRecord): Lead {
  const fields = record.fields ?? {};
  const assignedTo = asAssignee(fields["Assigned To"]);
  rememberAssignee(assignedTo);
  const followUpRaw = fields["Follow-up Due"];
  return {
    id: record.id,
    createdTime: record.createdTime ?? null,
    name: asString(fields.Name),
    source: asString(fields.Source),
    phone: asString(fields.Phone),
    email: asString(fields.Email),
    leadStatus: asString(fields["Lead Status"]),
    statusLegacy: asString(fields["Status (Legacy)"]),
    readAt: asDate(fields["Read At"]),
    calledAt: asDate(fields["Called At"]),
    messagedAt: asDate(fields["Messaged At"]),
    emailedAt: asDate(fields["Emailed At"]),
    estimateSentAt: asDate(fields["Estimate Sent At"]),
    followUpDate: asDate(fields["Follow-up Date"]),
    plaudTranscript: asAttachments(fields["Plaud Transcript"]),
    notes: asString(fields.Notes),
    activityLog: asString(fields["Activity Log"]),
    leadCreatedTime: asString(fields["Lead Created Time"]),
    metaRecordId: asString(fields["META Record ID"]),
    metaLeadId: asString(fields["Meta Lead ID"]),
    postalCode: asString(fields["Postal Code"]),
    clientComments: asString(fields["Client Comments"]),
    adName: asString(fields["Ad Name"]),
    campaignName: asString(fields["Campaign Name"]),
    adSetName: asString(fields["Ad Set Name"]),
    formName: asString(fields["Form Name"]),
    platform: asString(fields.Platform),
    metaInboxUrl: asString(fields["Meta Inbox URL"]),
    metaCreatedAt: asDate(fields["Meta Created At"]),
    assignedTo,
    lastAction: asString(fields["Last Action"]),
    lastActionAt: asDate(fields["Last Action At"]),
    callOutcome: asString(fields["Call Outcome"]),
    nonQualifiedReason: asString(fields["Non-Qualified Reason"]),
    closeOutcome: asString(fields["Close Outcome"]),
    estimateAmount: asNumber(fields["Estimate Amount"]),
    callLink: asString(fields.Call),
    replyOnFacebook: asString(fields["Reply on Facebook"]),
    emailLink: asString(fields["Email Link"]),
    openMetaRecord: asString(fields["Open META Record"]),
    platformName: asString(fields["Platform Name"]),
    daysSinceLead: asNumber(fields["Days Since Lead"]),
    followUpDue: followUpRaw == null ? null : asString(followUpRaw),
  };
}

export function presentRecord(record: AirtableRecord): Lead {
  return presentLead(mapRecord(record));
}

function parseSchema(table: Record<string, unknown>): LeadSchema {
  const fields = new Map<string, FieldMeta>();
  const rawFields = Array.isArray(table.fields) ? table.fields : [];
  for (const field of rawFields) {
    if (!isRecord(field) || typeof field.name !== "string") continue;
    const options = isRecord(field.options) ? field.options : isRecord(field.config) ? field.config : null;
    const rawChoices = options && Array.isArray(options.choices) ? options.choices : [];
    const choices = rawChoices.flatMap((choice) => {
      if (!isRecord(choice) || typeof choice.name !== "string") return [];
      return [choice.name];
    });
    fields.set(field.name, {
      name: field.name,
      type: typeof field.type === "string" ? field.type : "unknown",
      choices,
    });
  }
  return { loaded: true, fields };
}

export async function getLeadSchema(): Promise<LeadSchema> {
  if (schemaCache && Date.now() - schemaCache.at < 60_000) return schemaCache.schema;
  try {
    const payload = await airtableFetch<{ tables?: unknown[] }>(
      `https://api.airtable.com/v0/meta/bases/${baseId()}/tables`,
    );
    const tables = Array.isArray(payload.tables) ? payload.tables : [];
    const leadsId = leadsTableId();
    const leads = tables.find((table) => isRecord(table) && table.id === leadsId);
    if (!isRecord(leads)) return { loaded: false, fields: new Map() };
    const schema = parseSchema(leads);
    schemaCache = { at: Date.now(), schema };
    return schema;
  } catch (error) {
    console.error("Lead schema lookup failed");
    if (error instanceof LeadError && (error.status === 401 || error.status === 403 || error.status === 500)) {
      throw error;
    }
    return { loaded: false, fields: new Map() };
  }
}

export async function listAirtableRecords(): Promise<Lead[]> {
  const records: AirtableRecord[] = [];
  let offset = "";
  do {
    const url = new URL(leadsCollectionUrl());
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const page = await airtableFetch<{ records?: AirtableRecord[]; offset?: string }>(url.toString());
    records.push(...(page.records ?? []));
    offset = page.offset ?? "";
  } while (offset);

  return records
    .map((record) => presentRecord(record))
    .sort((a, b) => {
      const left = Date.parse(b.metaCreatedAt || b.createdTime || "") || 0;
      const right = Date.parse(a.metaCreatedAt || a.createdTime || "") || 0;
      return left - right;
    });
}

export async function getAirtableRecord(id: string): Promise<Lead> {
  assertRecordId(id);
  const record = await airtableFetch<AirtableRecord>(`${leadsCollectionUrl()}/${id}`);
  return presentRecord(record);
}

export async function patchAirtableRecord(id: string, fields: Record<string, unknown>): Promise<Lead> {
  assertRecordId(id);
  if (Object.keys(fields).length === 0) return getAirtableRecord(id);
  const record = await airtableFetch<AirtableRecord>(`${leadsCollectionUrl()}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ fields, typecast: true }),
  });
  return presentRecord(record);
}

export function assigneeDirectory(): Assignee[] {
  return [...knownAssignees.values()].sort((a, b) => a.name.localeCompare(b.name, "en-CA"));
}

export async function findAirtableAssignee(id: string): Promise<Assignee | null> {
  if (knownAssignees.has(id)) return knownAssignees.get(id) ?? null;
  await listAirtableRecords();
  return knownAssignees.get(id) ?? null;
}

export function optionsFromSchema(schema: LeadSchema, assignees: Assignee[]) {
  const choices = (name: string) => schema.fields.get(name)?.choices ?? [];
  return {
    leadStatus: choices("Lead Status"),
    callOutcome: choices("Call Outcome"),
    nonQualifiedReason: choices("Non-Qualified Reason"),
    closeOutcome: choices("Close Outcome"),
    lastAction: choices("Last Action"),
    source: choices("Source"),
    assignees,
    fields: schema.loaded ? [...schema.fields.keys()] : [],
  };
}
