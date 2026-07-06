import { NextResponse } from "next/server";
import { capturePaypalOrder } from "@/lib/paypal";
import { insertChallengePayment } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
	const body = (await request.json().catch(() => null)) as {
		orderId?: unknown;
	} | null;

	try {
		const capture = await capturePaypalOrder(body?.orderId);

		await insertChallengePayment({
			provider: "paypal",
			provider_payment_id: capture.captureId,
			amount_cents: capture.amountCents,
			currency: "EUR",
			amount_eur_cents: capture.amountCents,
			status: "confirmed",
			package_id: capture.packageId,
			public_note: capture.publicNote,
			raw: capture.raw,
		});

		return NextResponse.json({ ok: true });
	} catch (error) {
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "PayPal capture error.",
			},
			{ status: 400 },
		);
	}
}
