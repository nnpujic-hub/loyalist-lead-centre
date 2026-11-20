import assert from "node:assert/strict";
import test from "node:test";

import { activityTimeline, parseStoredActivityLine } from "@/lib/activity-timeline";
import { buildPatch } from "@/lib/patch";
import type { Lead, LeadSchema } from "@/lib/types";

const schema: LeadSchema = { loaded: false, fields: new Map() };
const now = new Date("2026-11-20T12:10:00.000Z");

function lead(partial: Partial<Lead> = {}): Lead {
  return {
    id: "recDemoLead000001",
    createdTime: null,
    name: "Priya",
    source: "",
    phone: "",
    email: "",
    leadStatus: "Read",
    statusLegacy: "",
    readAt: null,
    calledAt: null,
    messagedAt: null,
    emailedAt: null,
    estimateSentAt: null,
    followUpDate: null,
    plaudTranscript: [],
    notes: "",
    activityLog: "",
    leadCreatedTime: "",
    metaRecordId: "",
    metaLeadId: "",
    postalCode: "",
    clientComments: "",
    adName: "",
    campaignName: "",
    adSetName: "",
    formName: "",
    platform: "",
    metaInboxUrl: "",
    metaCreatedAt: null,
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

test("stored activity lines display in Toronto", () => {
  const entry = parseStoredActivityLine("2026-11-20 7:10 AM ET · Status changed: Called -> Qualified");
  assert.ok(entry);
  assert.equal(entry.action, "Status changed: Called -> Qualified");
  assert.match(entry.timeLabel, /^Nov 20, 2026, 7:10 AM E[DS]T$/);
});

test("an empty log falls back to contact timestamps, newest first", () => {
  const items = activityTimeline(
    lead({
      calledAt: "2026-11-18T15:00:00.000Z",
      emailedAt: "2026-11-19T15:00:00.000Z",
    }),
  );
  assert.equal(items.length, 2);
  assert.equal(items[0]?.action, "Email");
  assert.equal(items[1]?.action, "Call");
});

test("no log and no timestamps is an empty timeline", () => {
  assert.deepEqual(activityTimeline(lead()), []);
});

test("opening an unread lead and manual status changes are logged", () => {
  const unread = lead({ leadStatus: "Unread" });
  const opened = buildPatch(unread, { type: "markRead" }, schema, { now, assignee: null });
  assert.equal(opened.patch.leadStatus, "Read");
  assert.equal(opened.patch.lastAction, "Marked Read");
  assert.match(opened.patch.activityLog ?? "", /Status changed: Unread -> Read$/);

  const qualified = buildPatch(lead({ leadStatus: "Called" }), { type: "qualified" }, schema, { now, assignee: null });
  assert.equal(qualified.patch.leadStatus, "Qualified");
  assert.equal(qualified.patch.lastAction, "Status changed");
  assert.match(qualified.patch.activityLog ?? "", /Status changed: Called -> Qualified$/);

  const back = buildPatch(lead({ leadStatus: "Qualified" }), { type: "unread" }, schema, { now, assignee: null });
  assert.equal(back.patch.leadStatus, "Unread");
  assert.equal(back.patch.lastAction, "Marked Unread");
  assert.match(back.patch.activityLog ?? "", /Status changed: Qualified -> Unread$/);
});

test("notes, assignment, and follow-up saves are logged", () => {
  const noted = buildPatch(lead(), { type: "note", text: "Left a message." }, schema, { now, assignee: null });
  assert.match(noted.patch.activityLog ?? "", / · Note added$/);
  assert.equal(noted.patch.lastAction, "Note added");

  const cleared = buildPatch(lead({ followUpDate: "2026-11-22" }), { type: "followUp", date: null }, schema, { now, assignee: null });
  assert.match(cleared.patch.activityLog ?? "", / · Follow-up cleared$/);
  assert.equal(cleared.patch.lastAction, "Follow-up cleared");
});
