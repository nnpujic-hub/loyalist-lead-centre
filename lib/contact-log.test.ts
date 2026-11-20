import assert from "node:assert/strict";
import test from "node:test";

import { applyContactLog, activityLine, parseContactAction, prependActivity } from "@/lib/contact-log";
import { formatActivityStamp } from "@/lib/format";
import type { Lead } from "@/lib/types";

const when = new Date("2026-11-20T01:55:00.000Z");

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
    activityLog: "2026-11-18 9:00 AM ET · Email",
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

test("activity stamp uses Toronto wall time", () => {
  assert.equal(formatActivityStamp(when), "2026-11-19 8:55 PM ET");
});

test("activity lines prepend newest first and skip the shared team subject", () => {
  assert.equal(activityLine("call", when, null), "2026-11-19 8:55 PM ET · Call");
  assert.equal(activityLine("call", when, "Avery Lang"), "2026-11-19 8:55 PM ET · Call · Avery Lang");
  assert.equal(prependActivity("", "2026-11-19 8:55 PM ET · Call"), "2026-11-19 8:55 PM ET · Call");
  assert.equal(
    prependActivity("older line", "2026-11-19 8:55 PM ET · Call"),
    "2026-11-19 8:55 PM ET · Call\nolder line",
  );
});

test("call records Called status, timestamp, last action, and the log", () => {
  const patch = applyContactLog(lead(), "call", when, null);
  assert.equal(patch.leadStatus, "Called");
  assert.equal(patch.lastAction, "Called");
  assert.equal(patch.calledAt, when.toISOString());
  assert.equal(patch.lastActionAt, when.toISOString());
  assert.equal(patch.activityLog, "2026-11-19 8:55 PM ET · Call\n2026-11-18 9:00 AM ET · Email");
  assert.equal(patch.messagedAt, undefined);
  assert.equal(patch.emailedAt, undefined);
});

test("facebook does not change status; email sets Emailed", () => {
  const facebook = applyContactLog(lead({ activityLog: "" }), "facebook", when, null);
  assert.equal(facebook.lastAction, "Messaged on Facebook");
  assert.equal(facebook.messagedAt, when.toISOString());
  assert.equal(facebook.leadStatus, undefined);
  assert.equal(facebook.activityLog, "2026-11-19 8:55 PM ET · Facebook");

  const email = applyContactLog(lead({ activityLog: "" }), "email", when, "morgan@loyalisthomesinc.com");
  assert.equal(email.lastAction, "Emailed");
  assert.equal(email.leadStatus, "Emailed");
  assert.equal(email.emailedAt, when.toISOString());
  assert.equal(email.activityLog, "2026-11-19 8:55 PM ET · Email · morgan@loyalisthomesinc.com");
});

test("parseContactAction accepts only the three contact actions", () => {
  assert.equal(parseContactAction({ action: "call" }), "call");
  assert.equal(parseContactAction({ action: "facebook" }), "facebook");
  assert.equal(parseContactAction({ action: "email" }), "email");
  assert.throws(() => parseContactAction({ action: "qualified" }));
  assert.throws(() => parseContactAction(null));
});
