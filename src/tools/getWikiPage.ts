import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
	callMediaWikiAPI,
	findNearestRevision,
	searchSimilarPages,
} from "../api/mediawiki.js";
import { PageNotFoundError, WikiAPIError } from "../types.js";
import { cache } from "../utils/cache.js";
import { extractJsonBlocks, stripHtml } from "../utils/jsonExtractor.js";

interface GetWikiPageArgs {
	title: string;
	revisionId?: number;
	section?: number;
	extractJson?: boolean;
	format?: "wikitext" | "html" | "plain";
}

interface ParseResponse {
	parse?: {
		title: string;
		pageid: number;
		revid: number;
		text?: { "*": string };
		wikitext?: { "*": string };
	};
}

interface GetWikiPageOutput {
	title: string;
	pageId: number;
	revisionId: number;
	content: string;
	jsonBlocks?: unknown[];
}

export async function getWikiPage(
	args: GetWikiPageArgs,
): Promise<CallToolResult> {
	const {
		title,
		revisionId,
		section,
		extractJson = true,
		format = "plain",
	} = args;

	if (!title) {
		throw new Error("title is required");
	}

	const cacheKey = cache.generateKey("wiki_page", {
		title,
		revisionId,
		section,
		extractJson,
		format,
	});

	const cachedResult = cache.get<CallToolResult>(cacheKey);
	if (cachedResult) {
		return cachedResult;
	}

	const params: Record<string, string | number | boolean | undefined> = {
		action: "parse",
		disablelimitreport: 1,
	};

	if (revisionId) {
		params.oldid = revisionId;
	} else {
		params.page = title;
	}

	if (section !== undefined) {
		params.section = section;
	}

	if (format === "wikitext") {
		params.prop = "wikitext";
	} else {
		params.prop = "text|wikitext";
	}

	let data: ParseResponse;

	try {
		data = (await callMediaWikiAPI(params)) as ParseResponse;
	} catch (error) {
		if (
			error instanceof WikiAPIError &&
			error.code === "nosuchrevid" &&
			revisionId
		) {
			const pageIdData = (await callMediaWikiAPI({
				action: "query",
				titles: title,
			})) as { query?: { pages?: Record<string, { pageid: number }> } };

			const pages = pageIdData.query?.pages;
			const pageId = pages ? Object.values(pages)[0]?.pageid : undefined;

			if (pageId && pageId > 0) {
				const nearest = await findNearestRevision(pageId, revisionId);
				if (nearest) {
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(
									{
										error: `Revision ${revisionId} not found`,
										suggestion: {
											nearestRevision: nearest.revid,
											timestamp: nearest.timestamp,
											message: `Try using revision ${nearest.revid} instead`,
										},
									},
									null,
									2,
								),
							},
						],
					};
				}
			}
		}
		throw error;
	}

	if (!data.parse) {
		const suggestions = await searchSimilarPages(title);
		if (suggestions.length > 0) {
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(
							{
								error: `Page "${title}" not found`,
								suggestions: suggestions,
								message: "Did you mean one of these pages?",
							},
							null,
							2,
						),
					},
				],
			};
		}
		throw new PageNotFoundError(title);
	}

	const { parse } = data;

	let content: string;
	let wikitextContent = "";

	if (parse.wikitext?.["*"]) {
		wikitextContent = parse.wikitext["*"];
	}

	switch (format) {
		case "wikitext":
			content = wikitextContent;
			break;
		case "html":
			content = parse.text?.["*"] ?? "";
			break;
		default:
			content = parse.text?.["*"] ? stripHtml(parse.text["*"]) : "";
			break;
	}

	const output: GetWikiPageOutput = {
		title: parse.title,
		pageId: parse.pageid,
		revisionId: parse.revid,
		content,
	};

	if (extractJson && wikitextContent) {
		const jsonBlocks = extractJsonBlocks(wikitextContent);
		if (jsonBlocks.length > 0) {
			output.jsonBlocks = jsonBlocks;
		}
	}

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
