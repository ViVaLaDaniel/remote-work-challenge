import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/firebaseAdmin";
import { listAdminTasks, updateAdminTask } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	try {
		await verifyAdminRequest(request);
		const tasks = await listAdminTasks();
		return NextResponse.json({ tasks });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unauthorized." },
			{ status: 401 },
		);
	}
}

export async function PATCH(request: Request) {
	try {
		await verifyAdminRequest(request);
		const body = (await request.json().catch(() => null)) as {
			taskId?: unknown;
			status?: unknown;
			adminNotes?: unknown;
			displayLabel?: unknown;
			isPublic?: unknown;
		} | null;

		if (typeof body?.taskId !== "string") {
			return NextResponse.json({ error: "Missing taskId." }, { status: 400 });
		}

		await updateAdminTask({
			taskId: body.taskId,
			status:
				body.status === "new" ||
				body.status === "in_progress" ||
				body.status === "done"
					? body.status
					: undefined,
			adminNotes:
				typeof body.adminNotes === "string" ? body.adminNotes : undefined,
			displayLabel:
				typeof body.displayLabel === "string" ? body.displayLabel : undefined,
			isPublic: typeof body.isPublic === "boolean" ? body.isPublic : undefined,
		});

		return NextResponse.json({ ok: true });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unauthorized." },
			{ status: 401 },
		);
	}
}
