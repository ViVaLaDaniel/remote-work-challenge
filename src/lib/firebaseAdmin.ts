import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getFirebaseAdminApp() {
	const existing = getApps()[0];
	if (existing) {
		return existing;
	}

	const rawServiceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
	if (!rawServiceAccount) {
		throw new Error("Firebase Admin service account is not configured.");
	}

	const serviceAccount = JSON.parse(rawServiceAccount) as {
		clientEmail?: string;
		client_email?: string;
		privateKey?: string;
		private_key?: string;
		projectId?: string;
		project_id?: string;
	};

	return initializeApp({
		credential: cert({
			clientEmail: serviceAccount.clientEmail ?? serviceAccount.client_email,
			privateKey: (
				serviceAccount.privateKey ?? serviceAccount.private_key
			)?.replace(/\\n/g, "\n"),
			projectId: serviceAccount.projectId ?? serviceAccount.project_id,
		}),
	});
}

export async function verifyAdminRequest(request: Request) {
	const header = request.headers.get("authorization");
	const token = header?.startsWith("Bearer ") ? header.slice(7) : "";

	if (!token) {
		throw new Error("Missing Firebase ID token.");
	}

	const decoded = await getAuth(getFirebaseAdminApp()).verifyIdToken(token);
	const allowedUids = (process.env.ADMIN_ALLOWED_UIDS ?? "")
		.split(",")
		.map((uid) => uid.trim())
		.filter(Boolean);

	if (!allowedUids.includes(decoded.uid)) {
		throw new Error("User is not allowed to access admin.");
	}

	return decoded;
}
