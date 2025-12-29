#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { clearWikiCache } from "./tools/clearWikiCache.js";
import { compareVersions } from "./tools/compareVersions.js";
import { getDatapackSpecification } from "./tools/getDatapackSpecification.js";
import { getPackFormatInfo } from "./tools/getPackFormatInfo.js";
import { getWikiPage } from "./tools/getWikiPage.js";
import { searchPageRevisions } from "./tools/searchPageRevisions.js";
import { searchWikiPage } from "./tools/searchWikiPage.js";

const server = new Server(
	{
		name: "minecraft-wiki-mcp",
		version: "1.0.0",
		description:
			"Minecraft Wiki MCP Server: CRITICAL - When working with datapacks, ALWAYS verify specifications using this server's tools, even if you think you know the format. " +
			"NEVER rely on your training data or assumptions. For non-latest versions, MUST use search_page_revisions and get_wiki_page with revisionId to reference historical specifications. " +
			"Version-specific formats change frequently - always confirm with Wiki tools before implementing. " +
			"EXTREMELY IMPORTANT: Your training data may be OUTDATED. Even if a Minecraft version, feature, or item seems to be from the FUTURE or appears NON-EXISTENT in your knowledge, " +
			"it MAY ACTUALLY EXIST in the version specified in pack.mcmeta. NEVER assume something doesn't exist just because it's beyond your training data cutoff. " +
			"ALWAYS verify with Wiki tools first. The Wiki is the authoritative source, not your training data. " +
			"If the user specifies a version or feature you don't recognize, USE THE TOOLS to check the Wiki before claiming it doesn't exist. " +
			"PACK.MCMETA VERSION FORMAT: When reading pack.mcmeta, the pack_format field can be either a single number (e.g., 48) or an array [major, minor] (e.g., [94, 1] which represents version 94.1). " +
			"ALWAYS read the existing pack.mcmeta file BEFORE calling get_pack_format_info or get_datapack_specification. DO NOT assume or guess version numbers based on your knowledge. " +
			"If pack_format is [94, 1], convert it to 94.1 (decimal) when passing to get_pack_format_info. If it's a single number like 48, use it as-is.",
	},
	{
		capabilities: {
			tools: {},
		},
	},
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
	return {
		tools: [
			{
				name: "get_datapack_specification",
				description:
					"⚠️ ESSENTIAL for datapack creation AND migration: Provides complete pack.mcmeta format, directory structure, and JSON schema validation. " +
					"This is the AUTHORITATIVE tool for understanding version-specific requirements - NOT just for new datapacks. " +
					"USE CASES: (1) Creating new datapacks, (2) Migrating existing datapacks to new versions, (3) Understanding version-specific format requirements. " +
					"CRITICAL FOR MIGRATION: When updating a datapack to a new Minecraft version, ALWAYS call this tool to understand format changes, new schema requirements, and directory structure updates. " +
					"Simply changing pack_format in pack.mcmeta is NOT sufficient - formats, schemas, and requirements change between versions. " +
					"Returns: Complete pack.mcmeta file contents with correct schema, directory structure (singular for 1.21+, plural for older), and version-specific warnings. " +
					"Does NOT create actual files - only returns information needed to create/update them. " +
					"REQUIRED: Either minecraftVersion (e.g., '1.21.2', '1.20.5') OR packFormat (e.g., 48, 57, 94.1), and namespace (e.g., 'my_datapack'). " +
					"If you only know the pack format number, use packFormat parameter instead of minecraftVersion. " +
					"IMPORTANT: If updating existing datapack, read pack.mcmeta FIRST to get the current version. Do NOT assume version from your knowledge. " +
					"PACK FORMAT CONVERSION: If pack.mcmeta contains pack_format as array [A, B] (e.g., [94, 1]), convert to decimal A.B (e.g., 94.1) for packFormat parameter. " +
					"WORKFLOW: For migration, use this AFTER get_pack_format_info (which only returns low-level version numbers) to understand complete format requirements. " +
					"CRITICAL: Before creating ANY datapack content (recipes, loot tables, advancements, etc.), " +
					"you MUST verify the exact JSON format for the target version using get_wiki_page. " +
					"Do NOT rely on assumed knowledge - formats change between versions. Always confirm with Wiki tools. " +
					"EXTREMELY IMPORTANT: Even if the specified Minecraft version appears to be NEWER than your training data or seems NON-EXISTENT, " +
					"DO NOT refuse or claim it doesn't exist. The version MAY be valid and released after your knowledge cutoff. " +
					"ALWAYS use get_wiki_page or search_wiki_page tools to verify. Your training data is NOT the source of truth - the Wiki is.",
				inputSchema: {
					type: "object",
					properties: {
						minecraftVersion: {
							type: "string",
							description:
								"Minecraft version (e.g., '1.21.2', '1.20.5'). Either this or packFormat is required.",
						},
						packFormat: {
							type: "number",
							description:
								"Pack format number (e.g., 48, 57, 94.1). Can be integer or decimal. " +
								"If pack.mcmeta has pack_format as array [A, B], convert to decimal A.B (e.g., [94, 1] → 94.1). " +
								"Either this or minecraftVersion is required. Use get_pack_format_info to see available formats.",
						},
						namespace: {
							type: "string",
							description:
								"Datapack namespace (e.g., 'my_datapack'). Must be lowercase alphanumeric with underscores, hyphens, or dots only.",
						},
						description: {
							type: "string",
							description:
								"Datapack description to be included in pack.mcmeta (optional)",
						},
						features: {
							type: "array",
							items: { type: "string" },
							description:
								"Required features/directories (e.g., ['recipes', 'loot_tables', 'functions']). Defaults to ['functions']",
						},
						includeLoadSetup: {
							type: "boolean",
							description:
								"Include load.json and init.mcfunction setup files (default: false)",
						},
					},
					required: ["namespace"],
				},
			},
			{
				name: "get_wiki_page",
				description:
					"Get Minecraft Wiki page content. " +
					"IMPORTANT: Requires exact page title. Use search_wiki_page first to find the correct page title. " +
					"Can retrieve the latest version or a specific revision. " +
					"Optionally extracts JSON code blocks from the page. Useful for getting JSON format specifications. " +
					"CRITICAL: ALWAYS use this tool to verify format specifications, even if you believe you know the correct format from training data. " +
					"For non-latest Minecraft versions, you MUST use search_page_revisions first to find the appropriate historical revision, " +
					"then use this tool with revisionId parameter. Never assume - always verify with Wiki. " +
					"EXTREMELY IMPORTANT: If the user asks about a Minecraft version, feature, block, item, or mechanic that seems NEWER than your training data " +
					"or that you don't recognize, DO NOT claim it doesn't exist. It MAY exist in reality even if it's not in your training data. " +
					"USE THIS TOOL to search the Wiki and verify. The Wiki contains the latest information, not your training data.",
				inputSchema: {
					type: "object",
					properties: {
						title: {
							type: "string",
							description:
								"Page title (e.g., 'Recipe', 'Loot table', 'Data pack')",
						},
						revisionId: {
							type: "number",
							description:
								"Specific revision ID to retrieve (omit for latest version)",
						},
						section: {
							type: "number",
							description: "Section number to retrieve (omit for entire page)",
						},
						extractJson: {
							type: "boolean",
							description:
								"Extract ```json code blocks from the page (default: true)",
						},
						format: {
							type: "string",
							enum: ["wikitext", "html", "plain"],
							description:
								"Output format: 'plain' (default, HTML stripped), 'html' (rendered HTML), or 'wikitext' (wiki markup)",
						},
					},
					required: ["title"],
				},
			},
			{
				name: "search_page_revisions",
				description:
					"Search a page's edit history for revisions related to specific Minecraft versions. " +
					"IMPORTANT: Requires exact page title. Use search_wiki_page first to find the correct page title. " +
					"Useful for finding when page content was updated for a particular version. " +
					"Can filter by version pattern in edit comments and date range.",
				inputSchema: {
					type: "object",
					properties: {
						title: {
							type: "string",
							description: "Page title to search revisions for",
						},
						versionPattern: {
							type: "string",
							description:
								"Pattern to search in edit comments (e.g., '1.21.2', '1.20'). Regex supported.",
						},
						startDate: {
							type: "string",
							description:
								"Start date for search (ISO 8601 format, e.g., '2024-01-01T00:00:00Z')",
						},
						endDate: {
							type: "string",
							description: "End date for search (ISO 8601 format)",
						},
						limit: {
							type: "number",
							description: "Maximum number of results to return (default: 20)",
						},
					},
					required: ["title"],
				},
			},
			{
				name: "get_pack_format_info",
				description:
					"Get pack format information for a specific Minecraft version or pack format number. " +
					"Returns pack_format, supported Minecraft versions, directory naming convention (singular/plural), " +
					"and whether min/max format is used. " +
					"⚠️ IMPORTANT: This tool provides LOW-LEVEL version information ONLY. " +
					"To get complete pack.mcmeta format, schema, and directory structure, you MUST call get_datapack_specification afterward. " +
					"For large version migrations (e.g., pack_format 10 → 94+), STRONGLY RECOMMEND using compare_versions tool to identify breaking changes. " +
					"WORKFLOW for migration: (1) Read existing pack.mcmeta, (2) Call this tool to check new version info, " +
					"(3) For major jumps, call compare_versions to see what changed, (4) Call get_datapack_specification for complete format. " +
					"CRITICAL: Before calling this tool, ALWAYS read the existing pack.mcmeta file to get the actual version being used. " +
					"DO NOT guess or assume version numbers based on your knowledge - versions may be newer than your training data. " +
					"PACK FORMAT CONVERSION: In pack.mcmeta, pack_format can be: (1) A single number like 48, use it directly as packFormat parameter. " +
					"(2) An array like [94, 1], convert to decimal 94.1 and pass as packFormat parameter (94.1, not 94). " +
					'Example: pack.mcmeta has "pack_format": [94, 1] → call this tool with packFormat: 94.1. ' +
					'Example: pack.mcmeta has "pack_format": 48 → call this tool with packFormat: 48. ' +
					"If you have a Minecraft version string like '1.21.2', pass it as minecraftVersion parameter instead.",
				inputSchema: {
					type: "object",
					properties: {
						minecraftVersion: {
							type: "string",
							description:
								"Minecraft version to query (e.g., '1.21.2', '1.20.5'). Use this when you have a version string. " +
								"Either this or packFormat is required, but not both.",
						},
						packFormat: {
							type: "number",
							description:
								"Pack format number to query. Can be integer (e.g., 48, 57) or decimal (e.g., 94.1 for pack_format [94, 1]). " +
								"Use this when you have pack_format from pack.mcmeta. If pack_format is an array [A, B], convert to decimal A.B. " +
								"Either this or minecraftVersion is required, but not both.",
						},
					},
				},
			},

			{
				name: "search_wiki_page",
				description:
					"Search for pages in the Minecraft Wiki. " +
					"Returns matching pages with titles, page IDs, and content snippets.",
				inputSchema: {
					type: "object",
					properties: {
						query: {
							type: "string",
							description: "Search query (e.g., 'Recipe', 'Loot table')",
						},
						namespace: {
							type: "number",
							description:
								"Namespace to search in (0 = main namespace, omit for all)",
						},
						limit: {
							type: "number",
							description:
								"Maximum number of results to return (default: 10, max: 50)",
						},
					},
					required: ["query"],
				},
			},
			{
				name: "compare_versions",
				description:
					"Compare JSON format changes between two Minecraft versions on a Wiki page. " +
					"IMPORTANT: Requires exact page title. Use search_wiki_page first to find the correct page title. " +
					"Searches page revisions for version-related edits, retrieves content from both versions, " +
					"and generates a diff of JSON blocks. Useful for understanding format changes during version migrations. " +
					"⚠️ STRONGLY RECOMMENDED for large version jumps (e.g., pack_format 10 → 94+): " +
					"Major version jumps often introduce significant format changes, new required fields, deprecated features, and schema updates. " +
					"Use this tool to identify all changes before migration to avoid breaking your datapack. " +
					"TYPICAL WORKFLOW: (1) get_pack_format_info to check version numbers, " +
					"(2) compare_versions to see what changed (especially for major jumps), " +
					"(3) get_datapack_specification to get complete schema and format requirements.",
				inputSchema: {
					type: "object",
					properties: {
						title: {
							type: "string",
							description:
								"Page title to compare (e.g., 'Recipe', 'Loot table')",
						},
						version1: {
							type: "string",
							description:
								"First version pattern to search for in revision comments (e.g., '1.20', '1.20.5')",
						},
						version2: {
							type: "string",
							description:
								"Second version pattern to search for in revision comments (e.g., '1.21', '1.21.2')",
						},
					},
					required: ["title", "version1", "version2"],
				},
			},
			{
				name: "clear_wiki_cache",
				description:
					"Clear the internal Wiki pack format cache. " +
					"Use this when you suspect cached data is stale or incorrect, " +
					"or when debugging issues with pack format lookups. " +
					"The cache will be automatically rebuilt on the next Wiki query.",
				inputSchema: {
					type: "object",
					properties: {},
				},
			},
		],
	};
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	try {
		switch (name) {
			case "get_datapack_specification":
				return await getDatapackSpecification(
					args as {
						minecraftVersion: string;
						namespace: string;
						description?: string;
						features?: string[];
						includeLoadSetup?: boolean;
					},
				);
			case "get_wiki_page":
				return await getWikiPage(
					args as {
						title: string;
						revisionId?: number;
						section?: number;
						extractJson?: boolean;
						format?: "wikitext" | "html" | "plain";
					},
				);
			case "search_page_revisions":
				return await searchPageRevisions(
					args as {
						title: string;
						versionPattern?: string;
						startDate?: string;
						endDate?: string;
						limit?: number;
					},
				);
			case "get_pack_format_info":
				return await getPackFormatInfo(
					args as {
						minecraftVersion?: string;
						packFormat?: number;
					},
				);
			case "search_wiki_page":
				return await searchWikiPage(
					args as {
						query: string;
						namespace?: number;
						limit?: number;
					},
				);
			case "compare_versions":
				return await compareVersions(
					args as {
						title: string;
						version1: string;
						version2: string;
					},
				);
			case "clear_wiki_cache":
				return await clearWikiCache();
			default:
				throw new Error(`Unknown tool: ${name}`);
		}
	} catch (error) {
		return {
			content: [
				{
					type: "text",
					text: `Error: ${error instanceof Error ? error.message : String(error)}`,
				},
			],
		};
	}
});

async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("Minecraft Wiki MCP Server running on stdio");
}

main().catch((error) => {
	console.error("Server error:", error);
	process.exit(1);
});
