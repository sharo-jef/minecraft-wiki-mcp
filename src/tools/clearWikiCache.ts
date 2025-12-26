import { clearWikiCache as clearCache } from "../utils/versionMapping.js";

/**
 * Clear the Wiki pack format cache
 * Use when cached data might be stale or for debugging
 */
export async function clearWikiCache(): Promise<{
	content: Array<{ type: string; text: string }>;
}> {
	clearCache();

	return {
		content: [
			{
				type: "text",
				text: "Wiki pack format cache has been cleared successfully. The cache will be rebuilt on the next Wiki query.",
			},
		],
	};
}
