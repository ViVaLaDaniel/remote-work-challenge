import { NextResponse } from "next/server";
import { getGoalEur } from "@/lib/packages";
import { getConfirmedChallengePayments } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
	const goalEur = getGoalEur();

	try {
		const { payments, configured } = await getConfirmedChallengePayments();
		const totalCents = payments.reduce(
			(sum, payment) => sum + payment.amount_eur_cents,
			0,
		);
		const totalEur = totalCents / 100;
		const percentage = Math.min(100, Math.round((totalEur / goalEur) * 100));

		return NextResponse.json({
			goalEur,
			totalEur,
			totalCents,
			percentage,
			paymentsCount: payments.length,
			recentPayments: payments.slice(0, 10).map((payment) => ({
				amountEur: payment.amount_eur_cents / 100,
				publicNote: payment.public_note ?? "Paid digital task",
				provider: payment.provider,
				createdAt: payment.created_at,
			})),
			configured,
		});
	} catch (error) {
		return NextResponse.json(
			{
				goalEur,
				totalEur: 0,
				totalCents: 0,
				percentage: 0,
				paymentsCount: 0,
				recentPayments: [],
				configured: false,
				error: error instanceof Error ? error.message : "Progress unavailable.",
			},
			{ status: 500 },
		);
	}
}
