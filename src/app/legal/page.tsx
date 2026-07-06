import Link from "next/link";

export default function LegalPage() {
	return (
		<main className="legal-shell">
			<section className="legal-card">
				<p className="section-kicker">Terms & refund policy</p>
				<h1>Paid digital services, not donations</h1>
				<p>
					The 48-Hour Remote Work Challenge accepts payments only for concrete
					digital services such as website fixes, copywriting, AI automation,
					small technical tasks, MVP planning, or technical consultation.
				</p>

				<h2>Scope</h2>
				<p>
					Each package covers a bounded task. If the task is larger than the
					selected package, I will confirm a reduced scope or suggest a better
					package before starting.
				</p>

				<h2>Delivery</h2>
				<p>
					Delivery happens privately through the contact details provided by the
					client. Public progress updates are anonymous and never include client
					names, emails, payment IDs, private messages, dashboards, credentials,
					or confidential task details.
				</p>

				<h2>Refunds</h2>
				<p>
					If I cannot reasonably start or complete the agreed task, I will issue
					a refund manually through Stripe or PayPal. Refund requests should be
					sent using the same contact channel used for the task.
				</p>

				<h2>No prohibited work</h2>
				<p>
					I may refuse tasks involving illegal activity, credential abuse, spam,
					deception, unsafe automation, or requests that would expose a
					client&apos;s private data.
				</p>

				<Link className="button primary" href="/challenge">
					Back to challenge
				</Link>
			</section>
		</main>
	);
}
