import { NextResponse } from "next/server";
import { createPaypalOrder } from "@/lib/paypal";

export async function POST(request: Request) {
	const body = (await request.json().catch(() => null)) as {
		packageId?: unknown;
	} | null;

	try {
		const orderId = await createPaypalOrder(body?.packageId);
		return NextResponse.json({ orderId });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "PayPal error." },
			{ status: 400 },
		);
	}
}
