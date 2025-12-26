export function extractJsonBlocks(wikitext: string): unknown[] {
	const jsonBlocks: unknown[] = [];

	const regex = /```json\s*([\s\S]*?)```/g;

	let match = regex.exec(wikitext);
	while (match !== null) {
		try {
			const jsonText = match[1].trim();
			const parsed: unknown = JSON.parse(jsonText);
			jsonBlocks.push(parsed);
		} catch {
			// Invalid JSON is skipped
		}
		match = regex.exec(wikitext);
	}

	return jsonBlocks;
}

export function stripHtml(html: string): string {
	return html
		.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
		.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, '"')
		.replace(/&#039;/g, "'")
		.trim();
}
