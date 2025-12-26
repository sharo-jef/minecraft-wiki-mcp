import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { callMediaWikiAPI } from "../api/mediawiki.js";

interface SearchWikiPageArgs {
	query: string;
	namespace?: number;
	limit?: number;
}

interface SearchQueryResult {
	query?: {
		search?: Array<{
			title: string;
			pageid: number;
			snippet: string;
		}>;
	};
}

interface SearchResultOutput {
	title: string;
	pageId: number;
	snippet: string;
}

export async function searchWikiPage(
	args: SearchWikiPageArgs,
): Promise<CallToolResult> {
	const { query, namespace, limit = 10 } = args;

	if (!query) {
		throw new Error("query is required");
	}

	const params: Record<string, string | number | boolean | undefined> = {
		action: "query",
		list: "search",
		srsearch: query,
		srlimit: Math.min(limit, 50),
		srprop: "snippet",
	};

	if (namespace !== undefined) {
		params.srnamespace = namespace;
	}

	const data = (await callMediaWikiAPI(params)) as SearchQueryResult;

	const searchResults = data.query?.search ?? [];

	const results: SearchResultOutput[] = searchResults.map((result) => ({
		title: result.title,
		pageId: result.pageid,
		snippet: result.snippet.replace(/<[^>]+>/g, ""),
	}));

	return {
		content: [
			{
				type: "text",
				text: JSON.stringify(
					{
						query,
						resultCount: results.length,
						results,
					},
					null,
					2,
				),
			},
		],
	};
}
