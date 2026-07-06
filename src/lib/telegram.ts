export function notifyTelegram(message: string) {
	const token = process.env.TELEGRAM_BOT_TOKEN;
	const chatId = process.env.TELEGRAM_CHAT_ID;

	if (!token || !chatId) {
		return;
	}

	fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			chat_id: chatId,
			text: message,
			disable_web_page_preview: true,
		}),
	}).catch(() => {
		// Telegram must never block payment confirmation.
	});
}
