import { getPackageOrNull } from "@/lib/packages";

type PaypalTokenResponse = {
	access_token?: string;
};

type PaypalOrderResponse = {
	id?: string;
};

type PaypalCaptureResponse = {
	id?: string;
	status?: string;
	purchase_units?: Array<{
		reference_id?: string;
		payments?: {
			captures?: Array<{
				id?: string;
				status?: string;
				amount?: {
					currency_code?: string;
					value?: string;
				};
			}>;
		};
	}>;
};

export function getPaypalBaseUrl() {
	return process.env.PAYPAL_ENV === "live"
		? "https://api-m.paypal.com"
		: "https://api-m.sandbox.paypal.com";
}

async function getPaypalAccessToken() {
	const clientId = process.env.PAYPAL_CLIENT_ID;
	const secret = process.env.PAYPAL_CLIENT_SECRET;

	if (!clientId || !secret) {
		throw new Error("PayPal is not configured.");
	}

	const credentials = Buffer.from(`${clientId}:${secret}`).toString("base64");
	const response = await fetch(`${getPaypalBaseUrl()}/v1/oauth2/token`, {
		method: "POST",
		headers: {
			Authorization: `Basic ${credentials}`,
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: "grant_type=client_credentials",
	});

	if (!response.ok) {
		throw new Error("Failed to authenticate with PayPal.");
	}

	const data = (await response.json()) as PaypalTokenResponse;
	if (!data.access_token) {
		throw new Error("PayPal did not return an access token.");
	}

	return data.access_token;
}

export async function createPaypalOrder(packageId: unknown) {
	const taskPackage = getPackageOrNull(packageId);
	if (!taskPackage) {
		throw new Error("Invalid packageId.");
	}

	const token = await getPaypalAccessToken();
	const response = await fetch(`${getPaypalBaseUrl()}/v2/checkout/orders`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			intent: "CAPTURE",
			purchase_units: [
				{
					reference_id: taskPackage.id,
					custom_id: taskPackage.id,
					description: taskPackage.publicNote,
					amount: {
						currency_code: "EUR",
						value: taskPackage.priceEur.toFixed(2),
					},
				},
			],
		}),
	});

	if (!response.ok) {
		throw new Error("Failed to create PayPal order.");
	}

	const data = (await response.json()) as PaypalOrderResponse;
	if (!data.id) {
		throw new Error("PayPal did not return an order ID.");
	}

	return data.id;
}

export async function capturePaypalOrder(orderId: unknown) {
	if (typeof orderId !== "string" || orderId.length < 8) {
		throw new Error("Invalid PayPal order ID.");
	}

	const token = await getPaypalAccessToken();
	const response = await fetch(
		`${getPaypalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(
			orderId,
		)}/capture`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
		},
	);

	if (!response.ok) {
		throw new Error("Failed to capture PayPal order.");
	}

	const data = (await response.json()) as PaypalCaptureResponse;
	if (data.status !== "COMPLETED") {
		throw new Error("PayPal order was not completed.");
	}

	const unit = data.purchase_units?.[0];
	const capture = unit?.payments?.captures?.find(
		(item) => item.status === "COMPLETED",
	);
	const currency = capture?.amount?.currency_code;
	const value = capture?.amount?.value;

	if (currency !== "EUR" || !value) {
		throw new Error("Only completed EUR PayPal captures can be counted.");
	}

	const amountCents = Math.round(Number.parseFloat(value) * 100);
	if (!Number.isFinite(amountCents) || amountCents <= 0) {
		throw new Error("Invalid PayPal capture amount.");
	}

	const packageId = unit?.reference_id;
	const taskPackage = getPackageOrNull(packageId);

	return {
		captureId: capture?.id ?? data.id ?? orderId,
		amountCents,
		packageId: taskPackage?.id ?? null,
		publicNote: taskPackage?.publicNote ?? "Paid digital task",
		raw: data,
	};
}
