import { parseAction } from "@/lib/actions";
import { jsonError } from "@/lib/errors";
import { updateLead } from "@/lib/leads";
import { requireSession } from "@/lib/require-session";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await context.params;
    const action = parseAction(await request.json());
    const payload = await updateLead(id, action);
    return Response.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}
