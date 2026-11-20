import "server-only";

import { applyContactLog, type ContactAction } from "@/lib/contact-log";
import { formatDateTime, shiftTorontoDate, torontoWallTime } from "@/lib/format";
import { presentLead } from "@/lib/lead-view";
import { buildPatch, isEmptyPatch } from "@/lib/patch";
import type { Assignee, FieldMeta, Lead, LeadAction, LeadListResponse, LeadResponse, LeadSchema } from "@/lib/types";
import { LeadError, assertRecordId } from "@/lib/errors";

const AVERY: Assignee = {
  id: "usrDemoAvery00001",
  name: "Avery Lang",
  email: "avery.lang@loyalisthomesinc.com",
};

const MORGAN: Assignee = {
  id: "usrDemoMorgan0001",
  name: "Morgan Ellis",
  email: "morgan.ellis@loyalisthomesinc.com",
};

const ASSIGNEES = [AVERY, MORGAN];

function at(daysAgo: number, hours: number, minutes: number): string {
  return torontoWallTime(shiftTorontoDate(-daysAgo), hours, minutes).toISOString();
}

function blankLead(partial: Partial<Lead> & Pick<Lead, "id" | "name">): Lead {
  const created = partial.metaCreatedAt ?? new Date().toISOString();
  return {
    createdTime: created,
    source: "Meta",
    phone: "",
    email: "",
    leadStatus: "Unread",
    statusLegacy: "NEW",
    readAt: null,
    calledAt: null,
    messagedAt: null,
    emailedAt: null,
    estimateSentAt: null,
    followUpDate: null,
    plaudTranscript: [],
    notes: "",
    activityLog: "",
    leadCreatedTime: formatDateTime(created),
    metaRecordId: "",
    metaLeadId: "",
    postalCode: "",
    clientComments: "",
    adName: "",
    campaignName: "",
    adSetName: "",
    formName: "Custom Home Quote",
    platform: "fb",
    metaInboxUrl: "https://business.facebook.com/latest/inbox/all",
    metaCreatedAt: created,
    assignedTo: null,
    lastAction: "",
    lastActionAt: null,
    callOutcome: "",
    nonQualifiedReason: "",
    closeOutcome: "",
    estimateAmount: null,
    callLink: "",
    replyOnFacebook: "",
    emailLink: "",
    openMetaRecord: "",
    platformName: "",
    daysSinceLead: null,
    followUpDue: null,
    ...partial,
  };
}

function seed(): Lead[] {
  const priya = at(0, 8, 40);
  const sam = at(1, 19, 5);
  const nora = at(2, 11, 20);
  const chris = at(3, 15, 45);
  const dana = at(4, 9, 10);
  const helen = at(6, 13, 5);
  const marc = at(12, 16, 30);
  const ruth = at(18, 10, 0);

  return [
    blankLead({
      id: "recDemoLead000001",
      name: "Priya Nandakumar",
      phone: "(613) 555-0148",
      email: "priya.nandakumar@example.com",
      postalCode: "K0H 1G0",
      leadStatus: "Unread",
      statusLegacy: "NEW",
      clientComments: "Looking at a 24x36 garage with a loft, on a lot in Bath. Hoping to price it before spring.",
      adName: "24×36 garage packages",
      campaignName: "Custom homes — Loyalist 2026",
      adSetName: "Kingston & Loyalist",
      platform: "fb",
      metaCreatedAt: priya,
      createdTime: priya,
      leadCreatedTime: formatDateTime(priya),
      metaLeadId: "10018422001",
    }),
    blankLead({
      id: "recDemoLead000002",
      name: "Sam Berger",
      phone: "(613) 555-0172",
      email: "sam.berger@example.com",
      postalCode: "K7M 2R4",
      leadStatus: "Unread",
      statusLegacy: "New",
      clientComments: "Want a bungalow, about 1,800 sq ft, walkout basement if the lot allows.",
      adName: "Bungalow — walkout lots",
      campaignName: "Custom homes — Loyalist 2026",
      adSetName: "Kingston & Loyalist",
      platform: "ig",
      formName: "Custom Home Quote",
      metaCreatedAt: sam,
      createdTime: sam,
      leadCreatedTime: formatDateTime(sam),
      metaLeadId: "10018422018",
    }),
    blankLead({
      id: "recDemoLead000003",
      name: "Nora Pelletier",
      phone: "(613) 555-0194",
      email: "nora.pelletier@example.com",
      postalCode: "K7L 4V1",
      leadStatus: "Called",
      statusLegacy: "Called",
      readAt: at(2, 11, 35),
      calledAt: at(2, 11, 42),
      callOutcome: "No Answer",
      lastAction: "Called - No Answer",
      lastActionAt: at(2, 11, 42),
      activityLog: "2026-11-18 11:42 AM ET · Call",
      assignedTo: AVERY,
      clientComments: "Infill lot in Kingston. Asked what a simple two-storey would run.",
      adName: "City lot custom builds",
      campaignName: "Kingston infill",
      adSetName: "Homeowners 35–55",
      platform: "fb",
      metaCreatedAt: nora,
      createdTime: nora,
      leadCreatedTime: formatDateTime(nora),
      metaLeadId: "10018421880",
      followUpDate: shiftTorontoDate(1),
    }),
    blankLead({
      id: "recDemoLead000004",
      name: "Chris Belanger",
      phone: "(613) 555-0115",
      email: "chris.belanger@example.com",
      postalCode: "K7P 0G2",
      leadStatus: "Emailed",
      statusLegacy: "Read",
      readAt: at(3, 16, 0),
      emailedAt: at(3, 16, 20),
      lastAction: "Emailed",
      lastActionAt: at(3, 16, 20),
      activityLog: "2026-11-17 4:20 PM ET · Email",
      assignedTo: MORGAN,
      clientComments: "Replacing a cottage near Amherstview. Wants an honest range before they talk to the bank.",
      adName: "Cottage replacement",
      campaignName: "Custom homes — Loyalist 2026",
      adSetName: "Waterfront & cottage",
      platform: "fb",
      metaCreatedAt: chris,
      createdTime: chris,
      leadCreatedTime: formatDateTime(chris),
      metaLeadId: "10018421702",
      notes: "[Nov 16, 2026, 4:12 PM ET] Read the form. They asked us not to call after 7.",
    }),
    blankLead({
      id: "recDemoLead000005",
      name: "Dana Cho",
      phone: "(613) 555-0160",
      email: "dana.cho@example.com",
      postalCode: "K7K 3N8",
      leadStatus: "Read",
      statusLegacy: "Follow-up Queued",
      readAt: at(4, 9, 30),
      calledAt: at(4, 10, 5),
      callOutcome: "Answered",
      lastAction: "Follow-up Scheduled",
      lastActionAt: at(4, 10, 20),
      assignedTo: AVERY,
      followUpDate: shiftTorontoDate(-1),
      clientComments: "Spoke briefly. They own the lot already and want a site visit next week.",
      adName: "Book a site conversation",
      campaignName: "Custom homes — Loyalist 2026",
      adSetName: "Kingston & Loyalist",
      platform: "ig",
      metaCreatedAt: dana,
      createdTime: dana,
      leadCreatedTime: formatDateTime(dana),
      metaLeadId: "10018421440",
      notes: "[Nov 15, 2026, 10:20 AM ET] Answered. Lot is surveyed. Send a rough range, then book Thursday.",
      plaudTranscript: [
        {
          id: "attDemoTranscript1",
          url: "/sample-transcript.txt",
          filename: "dana-cho-call.txt",
          type: "text/plain",
          size: 420,
        },
      ],
    }),
    blankLead({
      id: "recDemoLead000006",
      name: "Helen Ward",
      phone: "(613) 555-0133",
      email: "helen.ward@example.com",
      postalCode: "K0H 2T0",
      leadStatus: "Qualified",
      statusLegacy: "Estimate Sent",
      readAt: at(6, 13, 20),
      calledAt: at(6, 14, 0),
      messagedAt: at(5, 9, 15),
      estimateSentAt: at(5, 16, 40),
      estimateAmount: 486500,
      callOutcome: "Answered",
      lastAction: "Estimate Sent",
      lastActionAt: at(5, 16, 40),
      assignedTo: MORGAN,
      followUpDate: shiftTorontoDate(3),
      clientComments: "Three-bedroom bungalow, main-floor laundry, double garage. Budget is flexible if the plan is right.",
      adName: "Bungalow — walkout lots",
      campaignName: "Custom homes — Loyalist 2026",
      adSetName: "Kingston & Loyalist",
      platform: "fb",
      metaCreatedAt: helen,
      createdTime: helen,
      leadCreatedTime: formatDateTime(helen),
      metaLeadId: "10018420911",
      notes:
        "[Nov 14, 2026, 2:05 PM ET] Good conversation. They want the kitchen facing the bush.\n[Nov 15, 2026, 4:40 PM ET] Estimate emailed. Waiting on their lender.",
    }),
    blankLead({
      id: "recDemoLead000007",
      name: "Marc Adelman",
      phone: "(416) 555-0188",
      email: "marc.adelman@example.com",
      postalCode: "M4W 1A8",
      leadStatus: "Non-Qualified",
      statusLegacy: "Closed",
      readAt: at(12, 16, 45),
      calledAt: at(12, 17, 10),
      callOutcome: "Answered",
      nonQualifiedReason: "Outside Service Area",
      lastAction: "Called - Answered",
      lastActionAt: at(12, 17, 10),
      assignedTo: AVERY,
      clientComments: "Asking about a laneway house in Toronto.",
      adName: "City lot custom builds",
      campaignName: "Kingston infill",
      adSetName: "Lookalike — Ontario",
      platform: "fb",
      metaCreatedAt: marc,
      createdTime: marc,
      leadCreatedTime: formatDateTime(marc),
      metaLeadId: "10018419002",
      notes: "[Nov 8, 2026, 5:10 PM ET] Toronto laneway project. Told them we build in the Kingston and Loyalist area.",
    }),
    blankLead({
      id: "recDemoLead000008",
      name: "Ruth Ibarra",
      phone: "(613) 555-0104",
      email: "ruth.ibarra@example.com",
      postalCode: "K7N 1S6",
      leadStatus: "Closed",
      statusLegacy: "Closed",
      readAt: at(18, 10, 20),
      calledAt: at(18, 11, 0),
      estimateSentAt: at(16, 15, 0),
      estimateAmount: 612000,
      callOutcome: "Answered",
      closeOutcome: "Won",
      lastAction: "Estimate Sent",
      lastActionAt: at(14, 9, 30),
      assignedTo: MORGAN,
      followUpDate: shiftTorontoDate(-10),
      clientComments: "Ready to build a two-storey on a cleared lot west of Odessa.",
      adName: "Ready-to-build lots",
      campaignName: "Custom homes — Loyalist 2026",
      adSetName: "Kingston & Loyalist",
      platform: "ig",
      metaCreatedAt: ruth,
      createdTime: ruth,
      leadCreatedTime: formatDateTime(ruth),
      metaLeadId: "10018417044",
      notes: "[Nov 2, 2026, 9:30 AM ET] Agreement signed. Handed to production.",
    }),
  ];
}

const demoGlobal = globalThis as typeof globalThis & { __loyalistDemoLeads?: Lead[] };
if (!demoGlobal.__loyalistDemoLeads) demoGlobal.__loyalistDemoLeads = seed();
const state = demoGlobal.__loyalistDemoLeads;

function field(name: string, type: string, choices: string[] = []): [string, FieldMeta] {
  return [name, { name, type, choices }];
}

function demoSchema(): LeadSchema {
  return {
    loaded: true,
    fields: new Map([
      field("Name", "singleLineText"),
      field("Source", "singleSelect", ["Meta", "Website", "Referral", "Phone", "Other", "RBS Aug 2026"]),
      field("Phone", "phoneNumber"),
      field("Email", "email"),
      field("Status (Legacy)", "singleSelect", [
        "New",
        "Read",
        "Called",
        "Estimate Sent",
        "Follow-up Queued",
        "Closed",
        "NEW",
      ]),
      field("Read At", "dateTime"),
      field("Called At", "dateTime"),
      field("Estimate Sent At", "dateTime"),
      field("Follow-up Date", "date"),
      field("Plaud Transcript", "multipleAttachments"),
      field("Notes", "multilineText"),
      field("Lead Created Time", "singleLineText"),
      field("Lead Status", "singleSelect", ["Unread", "Read", "Called", "Emailed", "Qualified", "Non-Qualified", "Closed"]),
      field("META Record ID", "singleLineText"),
      field("Meta Lead ID", "singleLineText"),
      field("Postal Code", "singleLineText"),
      field("Client Comments", "multilineText"),
      field("Ad Name", "singleLineText"),
      field("Campaign Name", "singleLineText"),
      field("Ad Set Name", "singleLineText"),
      field("Form Name", "singleLineText"),
      field("Platform", "singleLineText"),
      field("Meta Inbox URL", "url"),
      field("Assigned To", "singleCollaborator"),
      field("Meta Created At", "dateTime"),
      field("Messaged At", "dateTime"),
      field("Emailed At", "dateTime"),
      field("Activity Log", "multilineText"),
      field("Last Action At", "dateTime"),
      field("Last Action", "singleSelect", [
        "Marked Read",
        "Called",
        "Called - Answered",
        "Called - No Answer",
        "Left Voicemail",
        "Messaged on Facebook",
        "Emailed",
        "Estimate Sent",
        "Site Visit Booked",
        "Follow-up Scheduled",
        "Other",
      ]),
      field("Call Outcome", "singleSelect", [
        "Answered",
        "No Answer",
        "Left Voicemail",
        "Call Back Later",
        "Wrong Number",
      ]),
      field("Non-Qualified Reason", "singleSelect", [
        "Outside Service Area",
        "Budget",
        "Project Not a Fit",
        "Not Interested",
        "Unreachable",
        "Duplicate",
        "Spam / Test Lead",
        "Other",
      ]),
      field("Close Outcome", "singleSelect", ["Won", "Lost"]),
      field("Estimate Amount", "currency"),
      field("Call", "formula"),
      field("Reply on Facebook", "formula"),
      field("Email Link", "formula"),
      field("Open META Record", "formula"),
      field("Platform Name", "formula"),
      field("Days Since Lead", "formula"),
      field("Follow-up Due", "formula"),
    ]),
  };
}

export function demoOptions() {
  const schema = demoSchema();
  const choices = (name: string) => schema.fields.get(name)?.choices ?? [];
  return {
    leadStatus: choices("Lead Status"),
    callOutcome: choices("Call Outcome"),
    nonQualifiedReason: choices("Non-Qualified Reason"),
    closeOutcome: choices("Close Outcome"),
    lastAction: choices("Last Action"),
    source: choices("Source"),
    assignees: ASSIGNEES,
    fields: [...schema.fields.keys()],
  };
}

function sortedPresented(): Lead[] {
  return state
    .map((lead) => presentLead({ ...lead, daysSinceLead: null, followUpDue: null, platformName: "", callLink: "", emailLink: "", replyOnFacebook: "" }))
    .sort((a, b) => {
      const left = Date.parse(b.metaCreatedAt || b.createdTime || "") || 0;
      const right = Date.parse(a.metaCreatedAt || a.createdTime || "") || 0;
      return left - right;
    });
}

function findAssignee(id: string | null): Assignee | null {
  if (!id) return null;
  return ASSIGNEES.find((person) => person.id === id) ?? null;
}

function apply(id: string, action: LeadAction | { type: "markRead" }): { lead: Lead; notices: string[] } {
  const index = state.findIndex((lead) => lead.id === id);
  if (index === -1) throw new LeadError("That lead could not be found.", 404);
  const current = state[index];
  const assignee = action.type === "assign" ? findAssignee(action.assigneeId) : null;
  if (action.type === "assign" && action.assigneeId && !assignee) {
    throw new LeadError("That teammate is not available to assign.");
  }
  const { patch, notices } = buildPatch(current, action, demoSchema(), { now: new Date(), assignee });
  if (!isEmptyPatch(patch)) {
    state[index] = { ...current, ...patch };
  }
  const next = state[index];
  return {
    lead: presentLead({
      ...next,
      daysSinceLead: null,
      followUpDue: null,
      platformName: "",
      callLink: "",
      emailLink: "",
      replyOnFacebook: "",
    }),
    notices,
  };
}

export function demoList(): LeadListResponse {
  return {
    demo: true,
    generatedAt: new Date().toISOString(),
    leads: sortedPresented(),
    options: demoOptions(),
  };
}

export function demoOpen(id: string): LeadResponse {
  assertRecordId(id);
  const { lead, notices } = apply(id, { type: "markRead" });
  return {
    demo: true,
    generatedAt: new Date().toISOString(),
    lead,
    options: demoOptions(),
    notices,
  };
}

export function demoLogContact(id: string, action: ContactAction, actor: string | null): LeadResponse {
  assertRecordId(id);
  const index = state.findIndex((lead) => lead.id === id);
  if (index === -1) throw new LeadError("That lead could not be found.", 404);
  const current = state[index];
  state[index] = { ...current, ...applyContactLog(current, action, new Date(), actor) };
  return {
    demo: true,
    generatedAt: new Date().toISOString(),
    lead: presentLead({
      ...state[index],
      daysSinceLead: null,
      followUpDue: null,
      platformName: "",
      callLink: "",
      emailLink: "",
      replyOnFacebook: "",
    }),
    options: demoOptions(),
    notices: [],
  };
}

export function demoUpdate(id: string, action: LeadAction): LeadResponse {
  assertRecordId(id);
  const { lead, notices } = apply(id, action);
  return {
    demo: true,
    generatedAt: new Date().toISOString(),
    lead,
    options: demoOptions(),
    notices,
  };
}
