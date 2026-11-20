export type Attachment = {
  id: string;
  url: string;
  filename: string;
  type: string;
  size: number | null;
};

export type Assignee = {
  id: string;
  name: string;
  email: string;
};

export type Lead = {
  id: string;
  createdTime: string | null;
  name: string;
  source: string;
  phone: string;
  email: string;
  leadStatus: string;
  statusLegacy: string;
  readAt: string | null;
  calledAt: string | null;
  messagedAt: string | null;
  emailedAt: string | null;
  estimateSentAt: string | null;
  followUpDate: string | null;
  plaudTranscript: Attachment[];
  notes: string;
  activityLog: string;
  leadCreatedTime: string;
  metaRecordId: string;
  metaLeadId: string;
  postalCode: string;
  clientComments: string;
  adName: string;
  campaignName: string;
  adSetName: string;
  formName: string;
  platform: string;
  metaInboxUrl: string;
  metaCreatedAt: string | null;
  assignedTo: Assignee | null;
  lastAction: string;
  lastActionAt: string | null;
  callOutcome: string;
  nonQualifiedReason: string;
  closeOutcome: string;
  estimateAmount: number | null;
  callLink: string;
  replyOnFacebook: string;
  emailLink: string;
  openMetaRecord: string;
  platformName: string;
  daysSinceLead: number | null;
  followUpDue: string | null;
};

export type FieldMeta = {
  name: string;
  type: string;
  choices: string[];
};

export type LeadSchema = {
  loaded: boolean;
  fields: Map<string, FieldMeta>;
};

export type FieldOptions = {
  leadStatus: string[];
  callOutcome: string[];
  nonQualifiedReason: string[];
  closeOutcome: string[];
  lastAction: string[];
  source: string[];
  assignees: Assignee[];
  fields: string[];
};

export type LeadAction =
  | { type: "call" }
  | { type: "message" }
  | { type: "email" }
  | { type: "called" }
  | { type: "callOutcome"; outcome: string }
  | { type: "qualified" }
  | { type: "nonQualified"; reason: string }
  | { type: "closed"; closeOutcome: string }
  | { type: "estimate"; amount: number | null }
  | { type: "followUp"; date: string | null }
  | { type: "assign"; assigneeId: string | null }
  | { type: "note"; text: string };

export type LeadPatch = {
  leadStatus?: string;
  readAt?: string;
  calledAt?: string;
  messagedAt?: string;
  emailedAt?: string;
  estimateSentAt?: string;
  followUpDate?: string | null;
  notes?: string;
  activityLog?: string;
  assignedTo?: Assignee | null;
  lastAction?: string;
  lastActionAt?: string;
  callOutcome?: string;
  nonQualifiedReason?: string;
  closeOutcome?: string;
  estimateAmount?: number | null;
};

export type LeadListResponse = {
  demo: boolean;
  generatedAt: string;
  leads: Lead[];
  options: FieldOptions;
};

export type LeadResponse = {
  demo: boolean;
  generatedAt: string;
  lead: Lead;
  options: FieldOptions;
  notices: string[];
};
