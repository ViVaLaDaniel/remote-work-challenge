import { NextResponse } from "next/server";
import { getGoalEur } from "@/lib/packages";
import { getChallengeProgressData } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
	const goalEur = getGoalEur();

	try {
		const { completedPayments, publicPayments, configured } =
			await getChallengeProgressData();
		const totalCents = completedPayments.reduce(
			(sum, payment) => sum + payment.amount_cents,
			0,
		);
		const totalEur = totalCents / 100;
		const percentage = Math.min(100, Math.round((totalEur / goalEur) * 100));

		return NextResponse.json({
			goalEur,
			totalEur,
			totalCents,
			percentage,
			paymentsCount: completedPayments.length,
			recentPayments: publicPayments.map((payment) => ({
				amountEur: payment.amount_cents / 100,
				publicNote:
					payment.display_label ??
					`Anonymous - EUR ${payment.package} task completed`,
				provider: "paid_task",
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
