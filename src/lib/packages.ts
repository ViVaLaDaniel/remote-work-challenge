export const challengePackages = {
	quick_task: {
		id: "quick_task",
		title: "Quick Digital Task",
		priceEur: 25,
		amountCents: 2500,
		publicNote: "Quick digital task",
		description: "Small website, text, AI or IT fix.",
	},
	website_task: {
		id: "website_task",
		title: "Website / Copywriting Task",
		priceEur: 50,
		amountCents: 5000,
		publicNote: "Website task",
		description:
			"Landing page improvement, website update, copywriting or small frontend task.",
	},
	mvp_consultation: {
		id: "mvp_consultation",
		title: "MVP / Automation Consultation",
		priceEur: 100,
		amountCents: 10000,
		publicNote: "MVP consultation",
		description:
			"Startup idea review, MVP planning, AI automation or technical consultation.",
	},
} as const;

export type PackageId = keyof typeof challengePackages;

export function isPackageId(value: unknown): value is PackageId {
	return typeof value === "string" && value in challengePackages;
}

export function getPackageOrNull(value: unknown) {
	return isPackageId(value) ? challengePackages[value] : null;
}

export function getGoalEur() {
	const goal = Number.parseInt(
		process.env.NEXT_PUBLIC_CHALLENGE_GOAL_EUR ?? "",
		10,
	);
	return Number.isFinite(goal) && goal > 0 ? goal : 500;
}
