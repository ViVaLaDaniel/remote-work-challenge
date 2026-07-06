import Link from "next/link";

export default function Home() {
	return (
		<main className="home-shell">
			<section className="home-card">
				<p className="eyebrow">Remote work challenge</p>
				<h1>48-Hour Remote Work Challenge</h1>
				<p>
					Public challenge page with countdown, live workroom, Stripe and PayPal
					task packages, and anonymous progress updates.
				</p>
				<Link href="/challenge">Open challenge page</Link>
				<Link href="/login">Login</Link>
			</section>
		</main>
	);
}
