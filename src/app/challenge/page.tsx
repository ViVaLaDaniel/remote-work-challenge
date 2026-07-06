import { Suspense } from "react";
import { ChallengePage } from "@/components/ChallengePage";
import { challengePackages } from "@/lib/packages";

export const dynamic = "force-dynamic";

export default function Page() {
	return (
		<Suspense fallback={<main className="challenge-shell" />}>
			<ChallengePage
				contactEmail={process.env.CONTACT_EMAIL ?? ""}
				endAt={process.env.NEXT_PUBLIC_CHALLENGE_END_AT ?? ""}
				packages={Object.values(challengePackages)}
				paypalClientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? ""}
				stripeConfigured={Boolean(process.env.STRIPE_SECRET_KEY)}
				youtubeLiveId={process.env.NEXT_PUBLIC_YOUTUBE_LIVE_ID ?? ""}
			/>
		</Suspense>
	);
}
