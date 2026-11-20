import { jsonError } from "@/lib/errors";
import { listLeads } from "@/lib/leads";
import { requireSession } from "@/lib/require-session";

export async function GET() {
  try {
    await requireSession();
    const payload = await listLeads();
    return Response.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}
