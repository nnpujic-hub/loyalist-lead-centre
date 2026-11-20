import assert from "node:assert/strict";
import test from "node:test";

import { buildReport, firstContactAt, leadCreatedAt } from "@/lib/reports";
import type { Lead } from "@/lib/types";

const now = new Date("2026-11-20T17:00:00.000Z");

function lead(partial: Partial<Lead> & Pick<Lead, "id">): Lead {
  return {
    createdTime: "2026-11-20T16:00:00.000Z",
    name: partial.id,
    source: "Meta",
    phone: "",
    email: "",
    leadStatus: "Unread",
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
    platform: "fb",
    metaInboxUrl: "",
    metaCreatedAt: "2026-11-20T16:00:00.000Z",
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
    platformName: "Facebook",
    daysSinceLead: null,
    followUpDue: null,
    ...partial,
  };
}

test("created time falls back to the Airtable record time", () => {
  const row = lead({ id: "recDemoLead000009", metaCreatedAt: null, leadCreatedTime: "not a date", createdTime: "2026-11-18T15:00:00.000Z" });
  assert.equal(leadCreatedAt(row), Date.parse("2026-11-18T15:00:00.000Z"));
});

test("first contact is the earliest of the three timestamps", () => {
  const row = lead({
    id: "recDemoLead000009",
    calledAt: "2026-11-20T18:00:00.000Z",
    messagedAt: "2026-11-20T17:30:00.000Z",
    emailedAt: "2026-11-20T19:00:00.000Z",
  });
  assert.equal(firstContactAt(row), Date.parse("2026-11-20T17:30:00.000Z"));
});

test("rates are n/a with no leads and speed uses only contacted leads", () => {
  const empty = buildReport([], "30d", now);
  assert.equal(empty.total, 0);
  assert.equal(empty.contactedRate, "n/a");
  assert.equal(empty.medianLabel, "n/a");
  assert.equal(empty.qualificationRate, "n/a");

  const fast = lead({
    id: "recDemoLead000009",
    metaCreatedAt: "2026-11-20T15:00:00.000Z",
    calledAt: "2026-11-20T15:30:00.000Z",
    leadStatus: "Called",
    activityLog: "2026-11-20 10:30 AM ET · Call",
  });
  const slow = lead({
    id: "recDemoLead000010",
    metaCreatedAt: "2026-11-19T15:00:00.000Z",
    emailedAt: "2026-11-20T15:00:00.000Z",
    leadStatus: "Emailed",
    activityLog: "2026-11-20 10:00 AM ET · Email",
  });
  const waiting = lead({
    id: "recDemoLead000011",
    metaCreatedAt: "2026-11-18T15:00:00.000Z",
    leadStatus: "Unread",
  });
  const report = buildReport([fast, slow, waiting], "30d", now);
  assert.equal(report.total, 3);
  assert.equal(report.contacted, 2);
  assert.equal(report.within1h, 1);
  assert.equal(report.within24h, 2);
  assert.equal(report.uncontacted, 1);
  assert.equal(report.overdue, 1);
  assert.equal(report.medianLabel, "12.3 h");
  assert.equal(report.methods.find((item) => item.label === "Calls")?.count, 1);
  assert.equal(report.methods.find((item) => item.label === "Email")?.count, 1);
  assert.equal(report.statuses.find((item) => item.label === "Emailed")?.count, 1);
  assert.equal(report.oldest[0]?.id, "recDemoLead000011");
});
