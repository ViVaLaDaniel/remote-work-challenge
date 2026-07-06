export const PACKAGES = {
	"25": {
		key: "25",
		amountCents: 2500,
		priceEur: 25,
		title: "Quick Fix / Small Script",
		label: "Quick fix / small script",
		publicNote: "Quick fix completed",
		description:
			"One small paid digital task: website fix, text edit, AI setup, script, or remote IT fix. Scope is confirmed before work starts.",
		stripePriceEnv: "STRIPE_PRICE_QUICK_TASK",
	},
	"50": {
		key: "50",
		amountCents: 5000,
		priceEur: 50,
		title: "Landing Section / Integration",
		label: "Landing section / integration",
		publicNote: "Website task completed",
		description:
			"A focused website or copywriting task: landing page section, content improvement, small frontend update, or business website edit.",
		stripePriceEnv: "STRIPE_PRICE_WEBSITE_TASK",
	},
	"100": {
		key: "100",
		amountCents: 10000,
		priceEur: 100,
		title: "Full Feature / Automation",
		label: "Full feature / automation",
		publicNote: "MVP or automation task completed",
		description:
			"A paid planning session for a startup idea, MVP scope, AI automation workflow, technical review, or implementation roadmap.",
		stripePriceEnv: "STRIPE_PRICE_MVP_CONSULTATION",
	},
} as const;

export const challengePackages = PACKAGES;

export type PackageKey = keyof typeof PACKAGES;

export function isPackageKey(value: unknown): value is PackageKey {
	return typeof value === "string" && value in PACKAGES;
}

export function getPackageOrNull(value: unknown) {
	return isPackageKey(value) ? PACKAGES[value] : null;
}

export function getStripePriceId(taskPackage: { stripePriceEnv: string }) {
	const priceId = process.env[taskPackage.stripePriceEnv];
	return priceId?.startsWith("price_") ? priceId : null;
}

export function getGoalEur() {
	const goal = Number.parseInt(
		process.env.NEXT_PUBLIC_CHALLENGE_GOAL_EUR ?? "",
		10,
	);
	return Number.isFinite(goal) && goal > 0 ? goal : 500;
}
