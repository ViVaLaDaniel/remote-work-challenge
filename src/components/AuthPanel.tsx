"use client";

import {
	createUserWithEmailAndPassword,
	onAuthStateChanged,
	sendPasswordResetEmail,
	signInWithEmailAndPassword,
	signInWithPopup,
	signOut,
	type User,
} from "firebase/auth";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getFirebaseClient } from "@/lib/firebaseClient";

type AuthMode = "signin" | "signup";

function getAuthErrorMessage(error: unknown) {
	if (!(error instanceof Error)) {
		return "Authentication failed. Try again.";
	}

	if (error.message.includes("auth/popup-closed-by-user")) {
		return "The sign-in popup was closed before finishing.";
	}
	if (error.message.includes("auth/account-exists-with-different-credential")) {
		return "This email already uses another sign-in method.";
	}
	if (error.message.includes("auth/invalid-credential")) {
		return "Email or password is incorrect.";
	}
	if (error.message.includes("auth/email-already-in-use")) {
		return "This email is already registered.";
	}
	if (error.message.includes("auth/weak-password")) {
		return "Use at least 6 characters for the password.";
	}
	if (error.message.includes("auth/configuration-not-found")) {
		return "Firebase Auth providers are not enabled yet.";
	}

	return error.message;
}

export function AuthPanel() {
	const firebase = useMemo(() => getFirebaseClient(), []);
	const [user, setUser] = useState<User | null>(null);
	const [mode, setMode] = useState<AuthMode>("signin");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!firebase) {
			return;
		}

		return onAuthStateChanged(firebase.auth, setUser);
	}, [firebase]);

	if (!firebase) {
		return (
			<section className="auth-card">
				<p className="section-kicker">Firebase Auth</p>
				<h1>Login is ready for Firebase config</h1>
				<p>
					Add Firebase web app environment variables in Vercel, then enable
					Email/Password, Google and Facebook providers in Firebase Console.
				</p>
				<Link className="button primary" href="/challenge">
					Back to challenge
				</Link>
			</section>
		);
	}

	const runAuthAction = async (action: () => Promise<unknown>) => {
		setLoading(true);
		setError("");
		setMessage("");
		try {
			await action();
		} catch (authError) {
			setError(getAuthErrorMessage(authError));
		} finally {
			setLoading(false);
		}
	};

	const handleEmailAuth = () =>
		runAuthAction(async () => {
			if (mode === "signin") {
				await signInWithEmailAndPassword(firebase.auth, email, password);
			} else {
				await createUserWithEmailAndPassword(firebase.auth, email, password);
			}
		});

	const handlePasswordReset = () =>
		runAuthAction(async () => {
			if (!email) {
				throw new Error("Enter your email first.");
			}
			await sendPasswordResetEmail(firebase.auth, email);
			setMessage("Password reset email sent.");
		});

	if (user) {
		return (
			<section className="auth-card">
				<p className="section-kicker">Signed in</p>
				<h1>Welcome back</h1>
				<div className="signed-in-card">
					<strong>{user.displayName || "Firebase user"}</strong>
					<span>{user.email}</span>
				</div>
				<div className="auth-actions">
					<Link className="button primary" href="/challenge">
						Open challenge
					</Link>
					<button
						className="button secondary"
						disabled={loading}
						onClick={() => runAuthAction(() => signOut(firebase.auth))}
						type="button"
					>
						Sign out
					</button>
				</div>
			</section>
		);
	}

	return (
		<section className="auth-card">
			<p className="section-kicker">Firebase Auth</p>
			<h1>{mode === "signin" ? "Sign in" : "Create account"}</h1>
			<p>
				Use Google, Facebook, or normal email and password. The browser talks
				directly to Firebase Auth; no secret keys are exposed.
			</p>

			<div className="social-auth-grid">
				<button
					className="button primary"
					disabled={loading}
					onClick={() =>
						runAuthAction(() =>
							signInWithPopup(firebase.auth, firebase.googleProvider),
						)
					}
					type="button"
				>
					Continue with Google
				</button>
				<button
					className="button secondary"
					disabled={loading}
					onClick={() =>
						runAuthAction(() =>
							signInWithPopup(firebase.auth, firebase.facebookProvider),
						)
					}
					type="button"
				>
					Continue with Facebook
				</button>
			</div>

			<div className="auth-divider">or use email</div>

			<form
				className="auth-form"
				onSubmit={(event) => {
					event.preventDefault();
					handleEmailAuth();
				}}
			>
				<label>
					<span>Email</span>
					<input
						autoComplete="email"
						onChange={(event) => setEmail(event.target.value)}
						placeholder="you@example.com"
						required
						type="email"
						value={email}
					/>
				</label>
				<label>
					<span>Password</span>
					<input
						autoComplete={
							mode === "signin" ? "current-password" : "new-password"
						}
						minLength={6}
						onChange={(event) => setPassword(event.target.value)}
						placeholder="Minimum 6 characters"
						required
						type="password"
						value={password}
					/>
				</label>
				<button className="button primary" disabled={loading} type="submit">
					{loading
						? "Working..."
						: mode === "signin"
							? "Sign in with email"
							: "Create email account"}
				</button>
			</form>

			<div className="auth-footer">
				<button
					className="text-button"
					onClick={() => {
						setError("");
						setMessage("");
						setMode(mode === "signin" ? "signup" : "signin");
					}}
					type="button"
				>
					{mode === "signin" ? "Need an account?" : "Already have an account?"}
				</button>
				<button
					className="text-button"
					disabled={loading || !email}
					onClick={handlePasswordReset}
					type="button"
				>
					Reset password
				</button>
			</div>

			{message ? <p className="status-note">{message}</p> : null}
			{error ? <p className="error-note">{error}</p> : null}
		</section>
	);
}
