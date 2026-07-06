import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
	getPackageOrNull,
	getStripePriceId,
	type PackageKey,
} from "@/lib/packages";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { createPendingPaymentWithTask } from "@/lib/supabaseAdmin";

type CheckoutBody = {
	package?: unknown;
	taskDescription?: unknown;
	contactEmail?: unknown;
	contactTelegram?: unknown;
};

function getText(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
	const rateLimit = checkRateLimit(`stripe:${getClientIp(request)}`, {
		limit: 8,
		windowMs: 60_000,
	});
	if (!rateLimit.allowed) {
		return NextResponse.json(
			{ error: "Too many checkout attempts. Try again shortly." },
			{
				status: 429,
				headers: {
					"Retry-After": String(rateLimit.retryAfterSeconds ?? 60),
				},
			},
		);
	}

	const secretKey = process.env.STRIPE_SECRET_KEY;
	const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

	if (!secretKey || !siteUrl) {
		return NextResponse.json(
			{ error: "Stripe is not configured." },
			{ status: 503 },
		);
	}

	const body = (await request.json().catch(() => null)) as CheckoutBody | null;
	const taskPackage = getPackageOrNull(body?.package);
	const taskDescription = getText(body?.taskDescription);
	const contactEmail = getText(body?.contactEmail);
	const contactTelegram = getText(body?.contactTelegram);

	if (!taskPackage) {
		return NextResponse.json({ error: "Invalid package." }, { status: 400 });
	}
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

	const stripe = new Stripe(secretKey);
	const priceId = getStripePriceId(taskPackage);
	const session = await stripe.checkout.sessions.create({
		mode: "payment",
		success_url: `${siteUrl}/challenge?payment=success`,
		cancel_url: `${siteUrl}/challenge?payment=cancelled`,
		line_items: [
			priceId
				? {
						quantity: 1,
						price: priceId,
					}
				: {
						quantity: 1,
						price_data: {
							currency: "eur",
							unit_amount: taskPackage.amountCents,
							product_data: {
								name: taskPackage.title,
								description: taskPackage.description,
							},
						},
					},
		],
		custom_text: {
			submit: {
				message:
					"You are paying for a concrete digital service. This is not a donation.",
			},
		},
		metadata: {
			package: taskPackage.key,
			public_note: taskPackage.publicNote,
		},
		payment_intent_data: {
			description: taskPackage.title,
			statement_descriptor: "REMOTE WORK TASK",
			metadata: {
				package: taskPackage.key,
				public_note: taskPackage.publicNote,
			},
		},
	});

	await createPendingPaymentWithTask({
		provider: "stripe",
		providerRef: session.id,
		amountCents: taskPackage.amountCents,
		packageKey: taskPackage.key as PackageKey,
		taskDescription,
		contactEmail,
		contactTelegram,
		displayLabel: `Anonymous - ${taskPackage.label}`,
	});

	return NextResponse.json({ url: session.url });
}
