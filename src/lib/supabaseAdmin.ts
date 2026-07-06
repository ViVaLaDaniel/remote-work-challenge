import { createClient } from "@supabase/supabase-js";

type ChallengePaymentRow = {
	amount_eur_cents: number;
	provider: "stripe" | "paypal";
	public_note: string | null;
	created_at: string;
};

export type ChallengePaymentInsert = {
	provider: "stripe" | "paypal";
	provider_event_id?: string | null;
	provider_payment_id?: string | null;
	amount_cents: number;
	currency: string;
	amount_eur_cents: number;
	status: "confirmed";
	package_id?: string | null;
	public_note?: string | null;
	raw?: unknown;
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

export async function getConfirmedChallengePayments() {
	const supabase = getSupabaseAdmin();

	if (!supabase) {
		return { payments: [] as ChallengePaymentRow[], configured: false };
	}

	const { data, error } = await supabase
		.from("challenge_payments")
		.select("amount_eur_cents, provider, public_note, created_at")
		.eq("status", "confirmed")
		.eq("currency", "EUR")
		.order("created_at", { ascending: false })
		.limit(500);

	if (error) {
		throw new Error(error.message);
	}

	return { payments: (data ?? []) as ChallengePaymentRow[], configured: true };
}

export async function insertChallengePayment(payment: ChallengePaymentInsert) {
	const supabase = getSupabaseAdmin();

	if (!supabase) {
		throw new Error("Supabase is not configured.");
	}

	const { error } = await supabase.from("challenge_payments").upsert(payment, {
		onConflict: payment.provider_event_id
			? "provider,provider_event_id"
			: "provider,provider_payment_id",
		ignoreDuplicates: true,
	});

	if (error) {
		throw new Error(error.message);
	}
}
