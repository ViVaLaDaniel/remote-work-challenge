"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getFirebaseClient } from "@/lib/firebaseClient";

type AdminTask = {
	id: string;
	contact_email: string | null;
	contact_telegram: string | null;
	task_description: string;
	status: "new" | "in_progress" | "done";
	admin_notes: string | null;
	created_at: string;
	payments: {
		amount_cents: number;
		package: "25" | "50" | "100";
		status: string;
		display_label: string | null;
		is_public: boolean;
		provider: string;
	} | null;
};

function formatEur(cents: number) {
	return new Intl.NumberFormat("en-IE", {
		style: "currency",
		currency: "EUR",
		maximumFractionDigits: 0,
	}).format(cents / 100);
}

export function AdminPanel() {
	const firebase = useMemo(() => getFirebaseClient(), []);
	const [user, setUser] = useState<User | null>(null);
	const [tasks, setTasks] = useState<AdminTask[]>([]);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!firebase) {
			return;
		}
		return onAuthStateChanged(firebase.auth, setUser);
	}, [firebase]);

	const loadTasks = useCallback(async () => {
		if (!user) {
			return;
		}

		setLoading(true);
		setError("");
		try {
			const token = await user.getIdToken();
			const response = await fetch("/api/admin/tasks", {
				headers: { Authorization: `Bearer ${token}` },
			});
			const data = (await response.json()) as {
				tasks?: AdminTask[];
				error?: string;
			};
			if (!response.ok) {
				throw new Error(data.error ?? "Admin request failed.");
			}
			setTasks(data.tasks ?? []);
		} catch (adminError) {
			setError(
				adminError instanceof Error ? adminError.message : "Admin unavailable.",
			);
		} finally {
			setLoading(false);
		}
	}, [user]);

	useEffect(() => {
		const timer = window.setTimeout(() => {
			loadTasks();
		}, 0);
		return () => window.clearTimeout(timer);
	}, [loadTasks]);

	const updateTask = async (
		taskId: string,
		patch: {
			status?: string;
			displayLabel?: string;
			isPublic?: boolean;
			adminNotes?: string;
		},
	) => {
		if (!user) {
			return;
		}

		setLoading(true);
		setError("");
		setMessage("");
		try {
			const token = await user.getIdToken();
			const response = await fetch("/api/admin/tasks", {
				method: "PATCH",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ taskId, ...patch }),
			});
			const data = (await response.json()) as { error?: string };
			if (!response.ok) {
				throw new Error(data.error ?? "Update failed.");
			}
			setMessage("Task updated.");
			await loadTasks();
		} catch (adminError) {
			setError(
				adminError instanceof Error ? adminError.message : "Update failed.",
			);
		} finally {
			setLoading(false);
		}
	};

	if (!firebase) {
		return (
			<section className="auth-card">
				<p className="section-kicker">Admin</p>
				<h1>Firebase config required</h1>
				<p>Add Firebase web env variables before using admin.</p>
				<Link className="button primary" href="/login">
					Go to login
				</Link>
			</section>
		);
	}

	if (!user) {
		return (
			<section className="auth-card">
				<p className="section-kicker">Admin</p>
				<h1>Sign in first</h1>
				<p>Admin requires Firebase Auth plus UID allowlist on the server.</p>
				<Link className="button primary" href="/login">
					Go to login
				</Link>
			</section>
		);
	}

	return (
		<section className="admin-shell">
			<div className="admin-header">
				<div>
					<p className="section-kicker">Admin</p>
					<h1>Task requests</h1>
				</div>
				<button
					className="button secondary"
					disabled={loading}
					onClick={loadTasks}
					type="button"
				>
					Refresh
				</button>
			</div>

			{message ? <p className="status-note">{message}</p> : null}
			{error ? <p className="error-note">{error}</p> : null}

			<div className="admin-list">
				{tasks.map((task) => (
					<article className="admin-card" key={task.id}>
						<div className="admin-card-head">
							<div>
								<strong>
									{task.payments
										? `${formatEur(task.payments.amount_cents)} - ${task.payments.package}`
										: "No payment"}
								</strong>
								<span>
									{task.payments?.provider ?? "unknown"} /{" "}
									{task.payments?.status ?? "missing"}
								</span>
							</div>
							<span className="admin-pill">{task.status}</span>
						</div>

						<p>{task.task_description}</p>
						<div className="admin-meta">
							<span>{task.contact_email || "No email"}</span>
							<span>{task.contact_telegram || "No Telegram"}</span>
						</div>

						<label>
							<span>Public label</span>
							<input
								defaultValue={task.payments?.display_label ?? ""}
								id={`label-${task.id}`}
							/>
						</label>
						<label>
							<span>Admin notes</span>
							<textarea
								defaultValue={task.admin_notes ?? ""}
								id={`notes-${task.id}`}
							/>
						</label>

						<div className="admin-actions">
							<button
								className="button secondary"
								disabled={loading}
								onClick={() => updateTask(task.id, { status: "in_progress" })}
								type="button"
							>
								In progress
							</button>
							<button
								className="button secondary"
								disabled={loading}
								onClick={() => updateTask(task.id, { status: "done" })}
								type="button"
							>
								Done
							</button>
							<button
								className="button primary"
								disabled={loading}
								onClick={() => {
									const label = (
										document.getElementById(
											`label-${task.id}`,
										) as HTMLInputElement | null
									)?.value;
									const notes = (
										document.getElementById(
											`notes-${task.id}`,
										) as HTMLTextAreaElement | null
									)?.value;
									updateTask(task.id, {
										adminNotes: notes,
										displayLabel: label,
										isPublic: true,
									});
								}}
								type="button"
							>
								Show public
							</button>
							<button
								className="button muted"
								disabled={loading}
								onClick={() => updateTask(task.id, { isPublic: false })}
								type="button"
							>
								Hide public
							</button>
						</div>
					</article>
				))}
			</div>
		</section>
	);
}
