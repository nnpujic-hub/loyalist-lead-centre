export class LeadError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "LeadError";
    this.status = status;
  }
}

const RECORD_ID = /^rec[A-Za-z0-9]{14}$/;

export function assertRecordId(id: string): void {
  if (!RECORD_ID.test(id)) {
    throw new LeadError("That lead could not be found.", 404);
  }
}

export function jsonError(error: unknown): Response {
  if (error instanceof LeadError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json(
    { error: "The lead desk could not complete that. Try again in a moment." },
    { status: 500 },
  );
}
