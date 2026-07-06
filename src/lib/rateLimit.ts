type RateLimitEntry = {
	count: number;
	resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

export function getClientIp(request: Request) {
	const forwarded = request.headers.get("x-forwarded-for");
	return forwarded?.split(",")[0]?.trim() || "unknown";
}

export function checkRateLimit(
	key: string,
	options: { limit: number; windowMs: number },
) {
	const now = Date.now();
	const current = buckets.get(key);

	if (!current || current.resetAt <= now) {
		buckets.set(key, { count: 1, resetAt: now + options.windowMs });
		return { allowed: true, remaining: options.limit - 1 };
	}

	if (current.count >= options.limit) {
		return {
			allowed: false,
			remaining: 0,
			retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
		};
	}

	current.count += 1;
	return { allowed: true, remaining: options.limit - current.count };
}
