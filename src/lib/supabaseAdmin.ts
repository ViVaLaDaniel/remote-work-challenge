import { createClient } from "@supabase/supabase-js";
import type { PackageKey } from "@/lib/packages";

export type PaymentProvider = "stripe" | "paypal";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type TaskStatus = "new" | "in_progress" | "done";

export type PublicPaymentRow = {
	amount_cents: number;
	package: PackageKey;
	display_label: string | null;
	created_at: string;
};

export type AdminTaskRow = {
	id: string;
	payment_id: string;
	contact_email: string | null;
	contact_telegram: string | null;
	task_description: string;
	status: TaskStatus;
	admin_notes: string | null;
	created_at: string;
	payments: {
		id: string;
		provider: PaymentProvider;
		provider_ref: string;
		amount_cents: number;
		currency: string;
		package: PackageKey;
		status: PaymentStatus;
		display_label: string | null;
		is_public: boolean;
		created_at: string;
	} | null;
};

export type PendingTaskInput = {
	provider: PaymentProvider;
	providerRef: string;
	amountCents: number;
	packageKey: PackageKey;
	taskDescription: string;
	contactEmail?: string;
	contactTelegram?: string;
	displayLabel?: string;
};

export function getSupabaseAdmin() {
	const url = process.env.SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url || !key) {
		return null;
	}

	return createClient(url, key, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
		},
	});
}

function requireSupabaseAdmin() {
	const supabase = getSupabaseAdmin();
	if (!supabase) {
		throw new Error("Supabase is not configured.");
	}
	return supabase;
}

export async function getChallengeProgressData() {
	const supabase = getSupabaseAdmin();

	if (!supabase) {
		return {
			completedPayments: [] as Array<{ amount_cents: number }>,
			publicPayments: [] as PublicPaymentRow[],
			configured: false,
		};
	}

	const [completedResult, publicResult] = await Promise.all([
		supabase
			.from("payments")
			.select("amount_cents")
			.eq("status", "completed")
			.eq("currency", "eur")
			.limit(1000),
		supabase
			.from("payments")
			.select("amount_cents, package, display_label, created_at")
			.eq("status", "completed")
			.eq("is_public", true)
			.order("created_at", { ascending: false })
			.limit(20),
	]);

	if (completedResult.error) {
		throw new Error(completedResult.error.message);
	}
	if (publicResult.error) {
		throw new Error(publicResult.error.message);
	}

	return {
		completedPayments: (completedResult.data ?? []) as Array<{
			amount_cents: number;
		}>,
		publicPayments: (publicResult.data ?? []) as PublicPaymentRow[],
		configured: true,
	};
}

export async function createPendingPaymentWithTask(input: PendingTaskInput) {
	const supabase = requireSupabaseAdmin();

	const { data: payment, error: paymentError } = await supabase
		.from("payments")
		.upsert(
			{
				provider: input.provider,
				provider_ref: input.providerRef,
				amount_cents: input.amountCents,
				currency: "eur",
				package: input.packageKey,
				status: "pending",
				display_label:
					input.displayLabel ?? `Anonymous - EUR ${input.packageKey} task`,
				is_public: false,
			},
			{ onConflict: "provider,provider_ref" },
		)
		.select("id")
		.single();

	if (paymentError) {
		throw new Error(paymentError.message);
	}

	const { error: taskError } = await supabase.from("task_requests").insert({
		payment_id: payment.id,
		contact_email: input.contactEmail || null,
		contact_telegram: input.contactTelegram || null,
		task_description: input.taskDescription,
		status: "new",
	});

	if (taskError) {
		throw new Error(taskError.message);
	}

	return payment.id as string;
}

export async function completePayment(input: {
	provider: PaymentProvider;
	providerRef: string;
	amountCents: number;
	packageKey: PackageKey;
	displayLabel: string;
}) {
	const supabase = requireSupabaseAdmin();

	const { error } = await supabase.from("payments").upsert(
		{
			provider: input.provider,
			provider_ref: input.providerRef,
			amount_cents: input.amountCents,
			currency: "eur",
			package: input.packageKey,
			status: "completed",
			display_label: input.displayLabel,
			is_public: false,
		},
		{ onConflict: "provider,provider_ref" },
	);

	if (error) {
		throw new Error(error.message);
	}
}

export async function listAdminTasks() {
	const supabase = requireSupabaseAdmin();
	const { data, error } = await supabase
		.from("task_requests")
		.select(
			"id, payment_id, contact_email, contact_telegram, task_description, status, admin_notes, created_at, payments(id, provider, provider_ref, amount_cents, currency, package, status, display_label, is_public, created_at)",
		)
		.order("created_at", { ascending: false })
		.limit(100);

	if (error) {
		throw new Error(error.message);
	}

	return (data ?? []).map((row) => {
		const payment = Array.isArray(row.payments)
			? (row.payments[0] ?? null)
			: row.payments;
		return { ...row, payments: payment };
	}) as unknown as AdminTaskRow[];
}

export async function updateAdminTask(input: {
	taskId: string;
	status?: TaskStatus;
	adminNotes?: string;
	displayLabel?: string;
	isPublic?: boolean;
}) {
	const supabase = requireSupabaseAdmin();
	const taskPatch: Record<string, string> = {};

	if (input.status) {
		taskPatch.status = input.status;
	}
	if (typeof input.adminNotes === "string") {
		taskPatch.admin_notes = input.adminNotes;
	}

	if (Object.keys(taskPatch).length > 0) {
		const { error } = await supabase
			.from("task_requests")
			.update(taskPatch)
			.eq("id", input.taskId);
		if (error) {
			throw new Error(error.message);
		}
	}

	if (
		typeof input.displayLabel === "string" ||
		typeof input.isPublic === "boolean"
	) {
		const paymentPatch: Record<string, string | boolean> = {};
		if (typeof input.displayLabel === "string") {
			paymentPatch.display_label = input.displayLabel;
		}
		if (typeof input.isPublic === "boolean") {
			paymentPatch.is_public = input.isPublic;
		}

		const { data: task, error: taskError } = await supabase
			.from("task_requests")
			.select("payment_id")
			.eq("id", input.taskId)
			.single();
		if (taskError) {
			throw new Error(taskError.message);
		}

		const { error } = await supabase
			.from("payments")
			.update(paymentPatch)
			.eq("id", task.payment_id);
		if (error) {
			throw new Error(error.message);
		}
	}
}
