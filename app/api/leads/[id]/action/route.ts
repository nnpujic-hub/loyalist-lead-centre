import { contactActor, parseContactAction } from "@/lib/contact-log";
import { jsonError, LeadError } from "@/lib/errors";
import { logContact } from "@/lib/leads";
import { requireSession } from "@/lib/require-session";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new LeadError("Choose call, facebook, or email.");
    }
    const action = parseContactAction(body);
    const payload = await logContact(id, action, contactActor(session.sub));
    return Response.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}
