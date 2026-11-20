import "server-only";

import {
  assigneeDirectory,
  findAirtableAssignee,
  getAirtableRecord,
  getLeadSchema,
  listAirtableRecords,
  optionsFromSchema,
  patchAirtableRecord,
} from "@/lib/airtable";
import { demoList, demoOpen, demoUpdate } from "@/lib/demo-data";
import { LeadError } from "@/lib/errors";
import { buildPatch, isEmptyPatch, toAirtableFields } from "@/lib/patch";
import type { LeadAction, LeadListResponse, LeadResponse } from "@/lib/types";

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

/**
 * All lead reads and writes go through here.
 * Demo mode never calls Airtable. Live mode only touches the Leads table.
 */
export async function listLeads(): Promise<LeadListResponse> {
  if (isDemoMode()) return demoList();
  const [leads, schema] = await Promise.all([listAirtableRecords(), getLeadSchema()]);
  return {
    demo: false,
    generatedAt: new Date().toISOString(),
    leads,
    options: optionsFromSchema(schema, assigneeDirectory()),
  };
}

export async function openLead(id: string): Promise<LeadResponse> {
  if (isDemoMode()) return demoOpen(id);
  const schema = await getLeadSchema();
  const existing = await getAirtableRecord(id);
  const { patch, notices } = buildPatch(existing, { type: "markRead" }, schema, {
    now: new Date(),
    assignee: null,
  });
  const { fields, notices: skipped } = toAirtableFields(patch, schema);
  const lead = isEmptyPatch(patch) ? existing : await patchAirtableRecord(id, fields);
  return {
    demo: false,
    generatedAt: new Date().toISOString(),
    lead,
    options: optionsFromSchema(schema, assigneeDirectory()),
    notices: [...notices, ...skipped],
  };
}

export async function updateLead(id: string, action: LeadAction): Promise<LeadResponse> {
  if (isDemoMode()) return demoUpdate(id, action);
  const schema = await getLeadSchema();
  const existing = await getAirtableRecord(id);
  const assignee =
    action.type === "assign" && action.assigneeId ? await findAirtableAssignee(action.assigneeId) : null;
  if (action.type === "assign" && action.assigneeId && !assignee) {
    throw new LeadError("That teammate is not available to assign. They need to be on a lead already, because Assigned To is an Airtable collaborator.");
  }
  const { patch, notices } = buildPatch(existing, action, schema, { now: new Date(), assignee });
  const { fields, notices: skipped } = toAirtableFields(patch, schema);
  const lead = isEmptyPatch(patch) ? existing : await patchAirtableRecord(id, fields);
  return {
    demo: false,
    generatedAt: new Date().toISOString(),
    lead,
    options: optionsFromSchema(schema, assigneeDirectory()),
    notices: [...notices, ...skipped],
  };
}
