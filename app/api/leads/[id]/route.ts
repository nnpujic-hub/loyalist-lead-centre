import { jsonError } from "@/lib/errors";
import { openLead } from "@/lib/leads";
import { requireSession } from "@/lib/require-session";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await context.params;
    const payload = await openLead(id);
    return Response.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}
