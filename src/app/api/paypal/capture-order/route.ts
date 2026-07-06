import { NextResponse } from "next/server";
import { capturePaypalOrder } from "@/lib/paypal";
import { completePayment } from "@/lib/supabaseAdmin";
import { notifyTelegram } from "@/lib/telegram";

export async function POST(request: Request) {
	const body = (await request.json().catch(() => null)) as {
		orderId?: unknown;
	} | null;

	try {
		const capture = await capturePaypalOrder(body?.orderId);

		await completePayment({
			provider: "paypal",
			providerRef: String(body?.orderId),
			amountCents: capture.amountCents,
			packageKey: capture.packageKey,
			displayLabel: `Anonymous - ${capture.taskPackage.label}`,
		});

		notifyTelegram(
			`Paid task confirmed via PayPal: EUR ${capture.taskPackage.priceEur} - ${capture.taskPackage.label}`,
		);

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
