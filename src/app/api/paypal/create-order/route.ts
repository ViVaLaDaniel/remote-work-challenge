import { NextResponse } from "next/server";
import { createPaypalOrder } from "@/lib/paypal";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { createPendingPaymentWithTask } from "@/lib/supabaseAdmin";

type PaypalCreateBody = {
	package?: unknown;
	taskDescription?: unknown;
	contactEmail?: unknown;
	contactTelegram?: unknown;
};

function getText(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
	const rateLimit = checkRateLimit(`paypal:${getClientIp(request)}`, {
		limit: 8,
		windowMs: 60_000,
	});
	if (!rateLimit.allowed) {
		return NextResponse.json(
			{ error: "Too many PayPal order attempts. Try again shortly." },
			{
				status: 429,
				headers: {
					"Retry-After": String(rateLimit.retryAfterSeconds ?? 60),
				},
			},
		);
	}

	const body = (await request
		.json()
		.catch(() => null)) as PaypalCreateBody | null;
	const taskDescription = getText(body?.taskDescription);
	const contactEmail = getText(body?.contactEmail);
	const contactTelegram = getText(body?.contactTelegram);

	if (taskDescription.length < 10) {
		return NextResponse.json(
			{ error: "Describe the task in at least 10 characters." },
			{ status: 400 },
		);
	}
	if (!contactEmail && !contactTelegram) {
		return NextResponse.json(
			{ error: "Add an email or Telegram handle." },
			{ status: 400 },
		);
	}

	try {
		const { orderId, taskPackage } = await createPaypalOrder(body?.package);
		await createPendingPaymentWithTask({
			provider: "paypal",
			providerRef: orderId,
			amountCents: taskPackage.amountCents,
			packageKey: taskPackage.key,
			taskDescription,
			contactEmail,
			contactTelegram,
			displayLabel: `Anonymous - ${taskPackage.label}`,
		});

		return NextResponse.json({ orderId });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "PayPal error." },
			{ status: 400 },
		);
	}
}
