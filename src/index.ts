#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { compareVersions } from "./tools/compareVersions.js";
import { createDatapackStructure } from "./tools/createDatapackStructure.js";
import { getPackFormatInfo } from "./tools/getPackFormatInfo.js";
import { getWikiPage } from "./tools/getWikiPage.js";
import { searchPageRevisions } from "./tools/searchPageRevisions.js";
import { searchWikiPage } from "./tools/searchWikiPage.js";

const server = new Server(
	{
		name: "minecraft-wiki-mcp",
		version: "1.0.0",
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
				name: "create_datapack_structure",
				description:
					"Generate pack.mcmeta and correct directory structure for a specific Minecraft version. " +
					"Uses version-appropriate pack_format and directory naming (singular for 1.21+, plural for older versions). " +
					"Returns file contents, JSON schema for pack.mcmeta, and version-specific warnings. " +
					"REQUIRED: minecraftVersion (e.g., '1.21.2', '1.20.5') and namespace (e.g., 'my_datapack').",
				inputSchema: {
					type: "object",
					properties: {
						minecraftVersion: {
							type: "string",
							description: "Minecraft version (e.g., '1.21.2', '1.20.5')",
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
					required: ["minecraftVersion", "namespace"],
				},
			},
			{
				name: "get_wiki_page",
				description:
					"Get Minecraft Wiki page content. Can retrieve the latest version or a specific revision. " +
					"Optionally extracts JSON code blocks from the page. Useful for getting JSON format specifications.",
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
					"and whether min/max format is used.",
				inputSchema: {
					type: "object",
					properties: {
						minecraftVersion: {
							type: "string",
							description:
								"Minecraft version to query (e.g., '1.21.2', '1.20.5')",
						},
						packFormat: {
							type: "number",
							description: "Pack format number to query (e.g., 57, 48)",
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
					"Searches page revisions for version-related edits, retrieves content from both versions, " +
					"and generates a diff of JSON blocks. Useful for understanding format changes during version migrations.",
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
		],
	};
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	try {
		switch (name) {
			case "create_datapack_structure":
				return await createDatapackStructure(
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
