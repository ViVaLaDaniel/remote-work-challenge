import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getPackageOrNull } from "@/lib/packages";

export async function POST(request: Request) {
	const secretKey = process.env.STRIPE_SECRET_KEY;
	const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

	if (!secretKey || !siteUrl) {
		return NextResponse.json(
			{ error: "Stripe is not configured." },
			{ status: 503 },
		);
	}

	const body = (await request.json().catch(() => null)) as {
		packageId?: unknown;
	} | null;
	const taskPackage = getPackageOrNull(body?.packageId);

	if (!taskPackage) {
		return NextResponse.json({ error: "Invalid packageId." }, { status: 400 });
	}

	const stripe = new Stripe(secretKey);
	const session = await stripe.checkout.sessions.create({
		mode: "payment",
		success_url: `${siteUrl}/challenge?payment=success`,
		cancel_url: `${siteUrl}/challenge?payment=cancelled`,
		line_items: [
			{
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
		metadata: {
			package_id: taskPackage.id,
			public_note: taskPackage.publicNote,
		},
		payment_intent_data: {
			metadata: {
				package_id: taskPackage.id,
				public_note: taskPackage.publicNote,
			},
		},
	});

	return NextResponse.json({ url: session.url });
}
