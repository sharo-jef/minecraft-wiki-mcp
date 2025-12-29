#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { clearWikiCache } from "./tools/clearWikiCache.js";
import { compareVersions } from "./tools/compareVersions.js";
import { getDatapackSpecification } from "./tools/getDatapackSpecification.js";
import { getPackFormatInfo } from "./tools/getPackFormatInfo.js";
import { getWikiPage } from "./tools/getWikiPage.js";
import { searchPageRevisions } from "./tools/searchPageRevisions.js";
import { searchWikiPage } from "./tools/searchWikiPage.js";

const server = new McpServer(
	{
		name: "minecraft-wiki-mcp",
		version: "1.0.0",
	},
	{
		capabilities: {
			tools: {},
		},
		instructions:
			"Minecraft Wiki MCP Server: REQUIRED WORKFLOW - (1) Read pack.mcmeta FIRST, (2) Call get_pack_format_info to check version, (3) Use other tools as needed. " +
			"NEVER rely on training data - always verify with Wiki tools. Your knowledge may be outdated; versions/features you don't recognize may exist. " +
			"PACK FORMAT CONVERSION: pack_format can be a number (48) or array ([94, 1]). Convert arrays to decimal: [94, 1] → 94.1.",
	},
);

server.registerTool(
	"get_datapack_specification",
	{
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
			minecraftVersion: z.string().optional(),
			packFormat: z.number().optional(),
			namespace: z.string(),
			description: z.string().optional(),
			features: z.array(z.string()).optional(),
			includeLoadSetup: z.boolean().optional(),
		},
	},
	async (args) => {
		return await getDatapackSpecification(args);
	},
);

server.registerTool(
	"get_wiki_page",
	{
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
			title: z.string(),
			revisionId: z.number().optional(),
			section: z.number().optional(),
			extractJson: z.boolean().optional(),
			format: z.enum(["wikitext", "html", "plain"]).optional(),
		},
	},
	async (args) => {
		return await getWikiPage(args);
	},
);

server.registerTool(
	"search_page_revisions",
	{
		description:
			"Search a page's edit history for revisions related to specific Minecraft versions. " +
			"IMPORTANT: Requires exact page title. Use search_wiki_page first to find the correct page title. " +
			"Useful for finding when page content was updated for a particular version. " +
			"Can filter by version pattern in edit comments and date range.",
		inputSchema: {
			title: z.string(),
			versionPattern: z.string().optional(),
			startDate: z.string().optional(),
			endDate: z.string().optional(),
			limit: z.number().optional(),
		},
	},
	async (args) => {
		return await searchPageRevisions(args);
	},
);

server.registerTool(
	"get_pack_format_info",
	{
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
			minecraftVersion: z.string().optional(),
			packFormat: z.number().optional(),
		},
	},
	async (args) => {
		return await getPackFormatInfo(args);
	},
);

server.registerTool(
	"search_wiki_page",
	{
		description:
			"Search for pages in the Minecraft Wiki. " +
			"Returns matching pages with titles, page IDs, and content snippets.",
		inputSchema: {
			query: z.string(),
			namespace: z.number().optional(),
			limit: z.number().optional(),
		},
	},
	async (args) => {
		return await searchWikiPage(args);
	},
);

server.registerTool(
	"compare_versions",
	{
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
			title: z.string(),
			version1: z.string(),
			version2: z.string(),
		},
	},
	async (args) => {
		return await compareVersions(args);
	},
);

server.registerTool(
	"clear_wiki_cache",
	{
		description:
			"Clear the internal Wiki pack format cache. " +
			"Use this when you suspect cached data is stale or incorrect, " +
			"or when debugging issues with pack format lookups. " +
			"The cache will be automatically rebuilt on the next Wiki query.",
		inputSchema: {},
	},
	async () => {
		return await clearWikiCache();
	},
);

async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("Minecraft Wiki MCP Server running on stdio");
}

main().catch((error) => {
	console.error("Server error:", error);
	process.exit(1);
});
