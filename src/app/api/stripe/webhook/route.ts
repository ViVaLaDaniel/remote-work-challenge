import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getPackageOrNull, type PackageKey } from "@/lib/packages";
import { completePayment } from "@/lib/supabaseAdmin";
import { notifyTelegram } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	const secretKey = process.env.STRIPE_SECRET_KEY;
	const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

	if (!secretKey || !webhookSecret) {
		return NextResponse.json(
			{ error: "Stripe webhook is not configured." },
			{ status: 503 },
		);
	}

	const stripe = new Stripe(secretKey);
	const signature = (await headers()).get("stripe-signature");
	const rawBody = await request.text();

	if (!signature) {
		return NextResponse.json({ error: "Missing signature." }, { status: 400 });
	}

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
	} catch {
		return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
	}

	if (event.type !== "checkout.session.completed") {
		return NextResponse.json({ received: true });
	}

	const session = event.data.object;
	const packageKey = session.metadata?.package;
	const taskPackage = getPackageOrNull(packageKey);
	const amountTotal = session.amount_total;
	const currency = session.currency?.toLowerCase();

	if (
		!taskPackage ||
		currency !== "eur" ||
		amountTotal !== taskPackage.amountCents
	) {
		return NextResponse.json({ received: true, counted: false });
	}

	await completePayment({
		provider: "stripe",
		providerRef: session.id,
		amountCents: taskPackage.amountCents,
		packageKey: taskPackage.key as PackageKey,
		displayLabel: `Anonymous - ${taskPackage.label}`,
	});

	notifyTelegram(
		`Paid task confirmed via Stripe: EUR ${taskPackage.priceEur} - ${taskPackage.label}`,
	);

	return NextResponse.json({ received: true, counted: true });
}
