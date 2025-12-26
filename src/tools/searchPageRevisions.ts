import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { callMediaWikiAPI } from "../api/mediawiki.js";
import { PageNotFoundError, type WikiRevision } from "../types.js";
import { cache } from "../utils/cache.js";

interface SearchPageRevisionsArgs {
	title: string;
	versionPattern?: string;
	startDate?: string;
	endDate?: string;
	limit?: number;
}

interface QueryResponse {
	query?: {
		pages?: Record<
			string,
			{
				pageid?: number;
				title: string;
				missing?: boolean;
				revisions?: Array<{
					revid: number;
					parentid?: number;
					user: string;
					timestamp: string;
					comment?: string;
				}>;
			}
		>;
	};
}

interface SearchPageRevisionsOutput {
	title: string;
	revisions: WikiRevision[];
	totalFound: number;
	filtered: boolean;
}

export async function searchPageRevisions(
	args: SearchPageRevisionsArgs,
): Promise<CallToolResult> {
	const { title, versionPattern, startDate, endDate, limit = 20 } = args;

	if (!title) {
		throw new Error("title is required");
	}

	const cacheKey = cache.generateKey("page_revisions", {
		title,
		versionPattern,
		startDate,
		endDate,
		limit,
	});

	const cachedResult = cache.get<CallToolResult>(cacheKey);
	if (cachedResult) {
		return cachedResult;
	}

	const params: Record<string, string | number | boolean | undefined> = {
		action: "query",
		prop: "revisions",
		titles: title,
		rvprop: "ids|timestamp|comment|user",
		rvlimit: Math.min(limit * 5, 500),
	};

	if (startDate) {
		params.rvstart = startDate;
	}
	if (endDate) {
		params.rvend = endDate;
	}

	const data = (await callMediaWikiAPI(params)) as QueryResponse;

	if (!data.query?.pages) {
		throw new PageNotFoundError(title);
	}

	const pages = data.query.pages;
	const pageIds = Object.keys(pages);

	if (pageIds.length === 0) {
		throw new PageNotFoundError(title);
	}

	const page = pages[pageIds[0]];

	if (page.missing) {
		throw new PageNotFoundError(title);
	}

	const rawRevisions = page.revisions ?? [];

	let revisions: WikiRevision[] = rawRevisions.map((rev) => ({
		revisionId: rev.revid,
		timestamp: rev.timestamp,
		comment: rev.comment ?? "",
		user: rev.user,
	}));

	const filtered = !!versionPattern;

	if (versionPattern) {
		const pattern = new RegExp(versionPattern, "i");
		revisions = revisions.filter((rev) => pattern.test(rev.comment));
	}

	revisions = revisions.slice(0, limit);

	const output: SearchPageRevisionsOutput = {
		title: page.title,
		revisions,
		totalFound: revisions.length,
		filtered,
	};

	const result: CallToolResult = {
		content: [
			{
				type: "text",
				text: JSON.stringify(output, null, 2),
			},
		],
	};

	cache.set(cacheKey, result);

	return result;
}
