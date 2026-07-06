import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { insertChallengePayment } from "@/lib/supabaseAdmin";

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
	const amountTotal = session.amount_total;
	const currency = session.currency?.toUpperCase();

	if (currency !== "EUR" || !amountTotal) {
		return NextResponse.json({ received: true, counted: false });
	}

	const paymentIntent =
		typeof session.payment_intent === "string"
			? session.payment_intent
			: session.id;

	await insertChallengePayment({
		provider: "stripe",
		provider_event_id: event.id,
		provider_payment_id: paymentIntent,
		amount_cents: amountTotal,
		currency,
		amount_eur_cents: amountTotal,
		status: "confirmed",
		package_id: session.metadata?.package_id ?? null,
		public_note: session.metadata?.public_note ?? "Paid digital task",
		raw: event,
	});

	return NextResponse.json({ received: true, counted: true });
}
