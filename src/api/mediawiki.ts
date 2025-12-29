import { WikiAPIError } from "../types.js";

const WIKI_API_BASE = "https://minecraft.wiki/api.php";
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;

export interface MediaWikiParams {
	[key: string]: string | number | boolean | undefined;
}

export interface RetryOptions {
	maxRetries?: number;
	retryDelayMs?: number;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(status: number, errorCode?: string): boolean {
	return status === 429 || errorCode === "ratelimited";
}

export async function callMediaWikiAPI(
	params: MediaWikiParams,
	options: RetryOptions = {},
): Promise<unknown> {
	const {
		maxRetries = DEFAULT_MAX_RETRIES,
		retryDelayMs = DEFAULT_RETRY_DELAY_MS,
	} = options;

	const defaultParams = {
		format: "json",
		origin: "*",
	};

	const allParams = { ...defaultParams, ...params };

	const cleanParams: Record<string, string> = {};
	for (const [key, value] of Object.entries(allParams)) {
		if (value !== undefined) {
			cleanParams[key] = String(value);
		}
	}

	const queryString = new URLSearchParams(cleanParams).toString();
	const url = `${WIKI_API_BASE}?${queryString}`;

	let _lastError: Error | null = null;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			const response = await fetch(url);

			if (!response.ok) {
				if (isRateLimitError(response.status)) {
					if (attempt < maxRetries) {
						const delay = retryDelayMs * (attempt + 1);
						await sleep(delay);
						continue;
					}
				}
				throw new WikiAPIError(
					`MediaWiki API error: ${response.status} ${response.statusText}`,
					String(response.status),
				);
			}

			const data = (await response.json()) as {
				error?: { code: string; info: string };
			};

			if (data.error) {
				if (isRateLimitError(0, data.error.code)) {
					if (attempt < maxRetries) {
						const delay = retryDelayMs * (attempt + 1);
						await sleep(delay);
						continue;
					}
				}
				throw new WikiAPIError(
					`MediaWiki API error: ${data.error.code} - ${data.error.info}`,
					data.error.code,
					data.error,
				);
			}

			return data;
		} catch (error) {
			// Convert non-Error exceptions to Error for consistent error handling
			_lastError = error instanceof Error ? error : new Error(String(error));

			// Rethrow all errors immediately
			// Note: Rate limit errors are already handled in the try block above.
			// Any WikiAPIError caught here means we've already exhausted retries.
			throw error;
		}
	}
}

export async function searchSimilarPages(
	title: string,
	limit = 5,
): Promise<string[]> {
	const data = (await callMediaWikiAPI({
		action: "query",
		list: "search",
		srsearch: title,
		srlimit: limit,
		srprop: "snippet",
	})) as {
		query?: {
			search?: Array<{ title: string }>;
		};
	};

	return data.query?.search?.map((s) => s.title) ?? [];
}

export async function findNearestRevision(
	pageId: number,
	targetRevisionId: number,
): Promise<{ revid: number; timestamp: string } | null> {
	const data = (await callMediaWikiAPI({
		action: "query",
		prop: "revisions",
		pageids: pageId,
		rvprop: "ids|timestamp",
		rvlimit: 50,
	})) as {
		query?: {
			pages?: Record<
				string,
				{
					revisions?: Array<{ revid: number; timestamp: string }>;
				}
			>;
		};
	};

	const pages = data.query?.pages;
	if (!pages) return null;

	const page = Object.values(pages)[0];
	const revisions = page?.revisions;
	if (!revisions || revisions.length === 0) return null;

	let nearest = revisions[0];
	let minDiff = Math.abs(revisions[0].revid - targetRevisionId);

	for (const rev of revisions) {
		const diff = Math.abs(rev.revid - targetRevisionId);
		if (diff < minDiff) {
			minDiff = diff;
			nearest = rev;
		}
	}

	return nearest;
}
