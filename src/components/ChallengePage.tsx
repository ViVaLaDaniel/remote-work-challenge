"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Script from "next/script";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TaskPackage = {
	key: string;
	title: string;
	priceEur: number;
	label: string;
	description: string;
};

type ProgressResponse = {
	goalEur: number;
	totalEur: number;
	totalCents: number;
	percentage: number;
	paymentsCount: number;
	recentPayments: Array<{
		amountEur: number;
		publicNote: string;
		provider: string;
		createdAt: string;
	}>;
	configured?: boolean;
	error?: string;
};

declare global {
	interface Window {
		paypal?: {
			Buttons: (config: {
				createOrder: () => Promise<string>;
				onApprove: (data: { orderID: string }) => Promise<void>;
				onError: () => void;
			}) => {
				render: (selector: string) => Promise<void>;
			};
		};
	}
}

const defaultProgress: ProgressResponse = {
	goalEur: 500,
	totalEur: 0,
	totalCents: 0,
	percentage: 0,
	paymentsCount: 0,
	recentPayments: [],
};

const helpItems = [
	"Landing pages and simple websites",
	"Fixing or improving existing websites",
	"React / TypeScript / Next.js tasks",
	"Website copywriting",
	"Portfolio or business website updates",
	"AI tools and automation",
	"Small remote IT tasks",
	"MVP planning or startup idea validation",
];

function formatMoney(value: number) {
	return new Intl.NumberFormat("en-IE", {
		style: "currency",
		currency: "EUR",
		maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
	}).format(value);
}

function useCountdown(endAt: string) {
	const [remainingMs, setRemainingMs] = useState<number | null>(() => {
		const endTime = Date.parse(endAt);
		return !endAt || Number.isNaN(endTime)
			? null
			: Math.max(0, endTime - Date.now());
	});

	useEffect(() => {
		const endTime = Date.parse(endAt);
		if (!endAt || Number.isNaN(endTime)) {
			return;
		}

		const update = () => setRemainingMs(Math.max(0, endTime - Date.now()));
		update();
		const timer = window.setInterval(update, 1000);
		return () => window.clearInterval(timer);
	}, [endAt]);

	return remainingMs;
}

function Countdown({ endAt }: { endAt: string }) {
	const remainingMs = useCountdown(endAt);

	if (remainingMs === null) {
		const fallbackParts = [
			{ label: "hours", value: "48" },
			{ label: "minutes", value: "00" },
			{ label: "seconds", value: "00" },
			{ label: "ready", value: "00" },
		];

		return (
			<div className="timer-grid">
				{fallbackParts.map((part) => (
					<div className="timer-card" key={part.label}>
						<strong>{part.value}</strong>
						<span>{part.label}</span>
					</div>
				))}
			</div>
		);
	}

	if (remainingMs <= 0) {
		return <div className="finished-state">Challenge finished</div>;
	}

	const totalSeconds = Math.floor(remainingMs / 1000);
	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const parts = [
		{ label: "days", value: days },
		{ label: "hours", value: hours },
		{ label: "minutes", value: minutes },
		{ label: "seconds", value: seconds },
	];

	return (
		<div className="timer-grid" aria-live="polite">
			{parts.map((part) => (
				<div className="timer-card" key={part.label}>
					<strong>{String(part.value).padStart(2, "0")}</strong>
					<span>{part.label}</span>
				</div>
			))}
		</div>
	);
}

function PaypalButton({
	packageId,
	taskDescription,
	contactEmail,
	contactTelegram,
	enabled,
	onPaid,
	onError,
}: {
	packageId: string;
	taskDescription: string;
	contactEmail: string;
	contactTelegram: string;
	enabled: boolean;
	onPaid: () => void;
	onError: (message: string) => void;
}) {
	const containerId = `paypal-button-${packageId}`;
	const payloadRef = useRef({
		contactEmail,
		contactTelegram,
		taskDescription,
	});

	useEffect(() => {
		payloadRef.current = { contactEmail, contactTelegram, taskDescription };
	}, [contactEmail, contactTelegram, taskDescription]);

	useEffect(() => {
		if (!enabled || !window.paypal) {
			return;
		}

		const container = document.getElementById(containerId);
		if (!container || container.childElementCount > 0) {
			return;
		}

		window.paypal
			.Buttons({
				createOrder: async () => {
					const response = await fetch("/api/paypal/create-order", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							package: packageId,
							taskDescription: payloadRef.current.taskDescription,
							contactEmail: payloadRef.current.contactEmail,
							contactTelegram: payloadRef.current.contactTelegram,
						}),
					});
					const data = (await response.json()) as {
						orderId?: string;
						error?: string;
					};
					if (!response.ok || !data.orderId) {
						throw new Error(data.error ?? "PayPal order failed.");
					}
					return data.orderId;
				},
				onApprove: async (data) => {
					const response = await fetch("/api/paypal/capture-order", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ orderId: data.orderID }),
					});
					if (!response.ok) {
						throw new Error("PayPal capture failed.");
					}
					onPaid();
				},
				onError: () => onError("PayPal payment could not be completed."),
			})
			.render(`#${containerId}`)
			.catch(() => onError("PayPal button could not load."));
	}, [containerId, enabled, onError, onPaid, packageId]);

	if (!enabled) {
		return (
			<button className="button muted" disabled type="button">
				PayPal not configured
			</button>
		);
	}

	return <div className="paypal-slot" id={containerId} />;
}

export function ChallengePage({
	packages,
	endAt,
	contactEmail,
	paypalClientId,
	stripeConfigured,
}: {
	packages: TaskPackage[];
	endAt: string;
	contactEmail: string;
	paypalClientId: string;
	stripeConfigured: boolean;
}) {
	const searchParams = useSearchParams();
	const [progress, setProgress] = useState(defaultProgress);
	const [progressError, setProgressError] = useState("");
	const [loadingPackage, setLoadingPackage] = useState<string | null>(null);
	const [paymentMessage, setPaymentMessage] = useState("");
	const [taskDescription, setTaskDescription] = useState("");
	const [contactEmailInput, setContactEmailInput] = useState("");
	const [contactTelegram, setContactTelegram] = useState("");
	const paypalEnabled = Boolean(paypalClientId);
	const redirectMessage = useMemo(() => {
		const payment = searchParams.get("payment");
		if (payment === "success") {
			return "Payment received. Progress will update after confirmation.";
		}
		if (payment === "cancelled") {
			return "Payment cancelled. No task was counted.";
		}
		return "";
	}, [searchParams]);
	const visiblePaymentMessage = paymentMessage || redirectMessage;

	const loadProgress = useCallback(async () => {
		const response = await fetch("/api/challenge/progress", {
			cache: "no-store",
		});
		const data = (await response.json()) as ProgressResponse;
		setProgress(data);
		setProgressError(
			response.ok ? "" : (data.error ?? "Progress unavailable."),
		);
	}, []);

	useEffect(() => {
		const initialLoad = window.setTimeout(() => {
			loadProgress().catch(() => setProgressError("Progress unavailable."));
		}, 0);
		const timer = window.setInterval(() => {
			loadProgress().catch(() => setProgressError("Progress unavailable."));
		}, 5000);
		return () => {
			window.clearTimeout(initialLoad);
			window.clearInterval(timer);
		};
	}, [loadProgress]);

	const validateTaskForm = () => {
		if (taskDescription.trim().length < 10) {
			return "Describe the task in at least 10 characters.";
		}
		if (!contactEmailInput.trim() && !contactTelegram.trim()) {
			return "Add an email or Telegram handle.";
		}
		return "";
	};

	const handleStripe = async (packageId: string) => {
		const validationError = validateTaskForm();
		if (validationError) {
			setPaymentMessage(validationError);
			return;
		}

		setLoadingPackage(packageId);
		setPaymentMessage("");
		try {
			const response = await fetch("/api/stripe/create-checkout-session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					package: packageId,
					taskDescription,
					contactEmail: contactEmailInput,
					contactTelegram,
				}),
			});
			const data = (await response.json()) as { url?: string; error?: string };
			if (!response.ok || !data.url) {
				throw new Error(data.error ?? "Stripe checkout failed.");
			}
			window.location.assign(data.url);
		} catch (error) {
			setPaymentMessage(
				error instanceof Error ? error.message : "Stripe checkout failed.",
			);
		} finally {
			setLoadingPackage(null);
		}
	};

	return (
		<main className="challenge-shell">
			{paypalEnabled ? (
				<Script
					src={`https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=EUR&intent=capture`}
					strategy="afterInteractive"
				/>
			) : null}

			<nav className="topbar" aria-label="Challenge navigation">
				<Link href="/" className="brand">
					48H Workroom
				</Link>
				<div>
					<a href="#packages">Tasks</a>
					<a href="#contact">Contact</a>
					<Link href="/login">Login</Link>
				</div>
			</nav>

			<section className="hero">
				<div className="hero-copy">
					<p className="badge">48-Hour Remote Work Challenge</p>
					<h1>Can I earn €500 by doing useful digital work?</h1>
					<p className="subtitle">
						Websites • AI Tools • Automation • Copywriting • MVP Planning
					</p>
					<p className="trust-line">No donations. Only real paid tasks.</p>
					<div className="hero-actions">
						{contactEmail ? (
							<a className="button primary" href={`mailto:${contactEmail}`}>
								Send me a task
							</a>
						) : null}
						<a className="button secondary" href="#packages">
							Choose a package
						</a>
					</div>
					{visiblePaymentMessage ? (
						<p className="status-note">{visiblePaymentMessage}</p>
					) : null}
				</div>

				<aside className="hero-panel" aria-label="Challenge status">
					<div className="panel-header">
						<span>Live goal</span>
						<strong>{formatMoney(progress.totalEur)} raised</strong>
					</div>
					<Countdown endAt={endAt} />
					<div className="progress-block">
						<div className="progress-copy">
							<span>
								{formatMoney(progress.totalEur)} /{" "}
								{formatMoney(progress.goalEur)}
							</span>
							<strong>{progress.percentage}%</strong>
						</div>
						<div className="progress-track">
							<div style={{ width: `${progress.percentage}%` }} />
						</div>
					</div>
				</aside>
			</section>

			<section className="section split">
				<div>
					<p className="section-kicker">How it works</p>
					<h2>Simple paid tasks, clear scope, private delivery.</h2>
					<p>
						Pick a package, send a task brief by email, and I confirm the scope
						before doing the work. Public progress shows only anonymous payment
						updates, never private task details.
					</p>
				</div>
				<div className="process-list">
					<div>
						<strong>1. Choose a package</strong>
						<span>EUR 25, EUR 50, or EUR 100 based on scope.</span>
					</div>
					<div>
						<strong>2. Pay securely</strong>
						<span>
							Stripe or PayPal checkout, no custom card handling here.
						</span>
					</div>
					<div>
						<strong>3. Private delivery</strong>
						<span>Task details, client data, and messages stay private.</span>
					</div>
				</div>
			</section>

			<section className="section progress-section">
				<div className="section-heading">
					<p className="section-kicker">Combined money counter</p>
					<h2>Stripe + PayPal progress</h2>
					<p>
						Only confirmed EUR payments count. Failed, cancelled, pending,
						refunded or duplicate payments are excluded.
					</p>
				</div>
				<div className="metric-grid">
					<div className="metric-card">
						<span>Total</span>
						<strong>{formatMoney(progress.totalEur)}</strong>
					</div>
					<div className="metric-card">
						<span>Goal</span>
						<strong>{formatMoney(progress.goalEur)}</strong>
					</div>
					<div className="metric-card">
						<span>Paid tasks</span>
						<strong>{progress.paymentsCount}</strong>
					</div>
				</div>
				{progressError ? <p className="error-note">{progressError}</p> : null}
			</section>

			<section className="section" id="packages">
				<div className="section-heading">
					<p className="section-kicker">Paid task packages</p>
					<h2>Pick a useful task</h2>
					<p>
						Describe the task before checkout. Package prices are validated
						server-side and never trusted from the browser.
					</p>
				</div>
				<div className="task-intake-card">
					<label>
						<span>Task brief</span>
						<textarea
							onChange={(event) => setTaskDescription(event.target.value)}
							placeholder="Example: fix a landing page section, write homepage copy, review an MVP idea, or automate a small workflow."
							value={taskDescription}
						/>
					</label>
					<div className="task-contact-grid">
						<label>
							<span>Email</span>
							<input
								onChange={(event) => setContactEmailInput(event.target.value)}
								placeholder="you@example.com"
								type="email"
								value={contactEmailInput}
							/>
						</label>
						<label>
							<span>Telegram</span>
							<input
								onChange={(event) => setContactTelegram(event.target.value)}
								placeholder="@username"
								value={contactTelegram}
							/>
						</label>
					</div>
				</div>
				<div className="package-grid">
					{packages.map((taskPackage) => (
						<article className="package-card" key={taskPackage.key}>
							<div>
								<h3>{taskPackage.title}</h3>
								<strong>{formatMoney(taskPackage.priceEur)}</strong>
								<p>{taskPackage.description}</p>
							</div>
							<div className="payment-actions">
								<button
									className="button primary"
									disabled={
										!stripeConfigured || loadingPackage === taskPackage.key
									}
									onClick={() => handleStripe(taskPackage.key)}
									type="button"
								>
									{!stripeConfigured
										? "Stripe not configured"
										: loadingPackage === taskPackage.key
											? "Opening Stripe..."
											: "Pay with Stripe"}
								</button>
								<PaypalButton
									enabled={paypalEnabled}
									contactEmail={contactEmailInput}
									contactTelegram={contactTelegram}
									onError={setPaymentMessage}
									onPaid={() => {
										setPaymentMessage("PayPal payment confirmed.");
										loadProgress().catch(() =>
											setProgressError("Progress unavailable."),
										);
									}}
									packageId={taskPackage.key}
									taskDescription={taskDescription}
								/>
							</div>
						</article>
					))}
				</div>
			</section>

			<section className="section updates-grid">
				<div>
					<p className="section-kicker">Recent public updates</p>
					<h2>Anonymous task/payment feed</h2>
				</div>
				<div className="updates-list">
					{progress.recentPayments.length > 0 ? (
						progress.recentPayments.map((payment) => (
							<article
								className="update-card"
								key={`${payment.createdAt}-${payment.amountEur}`}
							>
								<strong>
									{formatMoney(payment.amountEur)} — {payment.publicNote}
								</strong>
								<span>
									{new Date(payment.createdAt).toLocaleString("en-IE", {
										day: "2-digit",
										hour: "2-digit",
										minute: "2-digit",
										month: "short",
									})}
								</span>
							</article>
						))
					) : (
						<div className="empty-card">
							No confirmed public task updates yet.
						</div>
					)}
				</div>
			</section>

			<section className="section help-section">
				<div className="section-heading">
					<p className="section-kicker">What I can help with</p>
					<h2>Useful digital work, shipped fast</h2>
				</div>
				<div className="help-grid">
					{helpItems.map((item) => (
						<div className="help-item" key={item}>
							{item}
						</div>
					))}
				</div>
			</section>

			<section className="section cta-section" id="contact">
				<div>
					<p className="section-kicker">Contact CTA</p>
					<h2>Have a small task I can solve during the challenge?</h2>
					<p>
						Send a clear task brief, choose a package, and I will confirm scope
						before starting paid work.
					</p>
				</div>
				<div className="cta-actions">
					{contactEmail ? (
						<a className="button primary" href={`mailto:${contactEmail}`}>
							Send me a task
						</a>
					) : null}
					<Link className="button secondary" href="/">
						View portfolio
					</Link>
				</div>
			</section>

			<section className="section trust-section">
				<h2>Transparency & privacy</h2>
				<p>
					This is not a donation campaign. I only accept real paid tasks. Public
					progress shows only safe anonymous payment/task updates. Client names,
					emails, private messages, payment dashboards and secret keys are never
					shown publicly.
				</p>
				<Link className="terms-link" href="/legal">
					Terms & refund policy
				</Link>
			</section>
		</main>
	);
}
