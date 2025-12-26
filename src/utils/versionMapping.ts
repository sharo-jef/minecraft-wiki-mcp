import * as cheerio from "cheerio";
import { callMediaWikiAPI } from "../api/mediawiki.js";
import type { PackFormatMapping } from "../types.js";

// In-memory cache for Wiki pack format table
// Cache expires after 1 hour to avoid stale data while minimizing Wiki requests
let wikiPackFormatCache: Map<string, PackFormatMapping> | null = null;
let wikiCacheTimestamp = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

/**
 * Clear the Wiki pack format cache (used for testing)
 * @internal
 */
export function clearWikiCache(): void {
	wikiPackFormatCache = null;
	wikiCacheTimestamp = 0;
}

export const KNOWN_PACK_FORMATS: PackFormatMapping[] = [
	{
		packFormat: [94, 1],
		minecraftVersions: ["1.21.11"],
		directoryNaming: "singular",
		usesMinMaxFormat: true, // 1.21.9+ uses min/max format
	},
	{
		packFormat: [88, 0],
		minecraftVersions: ["1.21.9", "1.21.10"],
		directoryNaming: "singular",
		usesMinMaxFormat: true,
	},
	{
		packFormat: 81,
		minecraftVersions: ["1.21.7", "1.21.8"],
		directoryNaming: "singular",
		usesMinMaxFormat: false,
	},
	{
		packFormat: 80,
		minecraftVersions: ["1.21.6"],
		directoryNaming: "singular",
		usesMinMaxFormat: false,
	},
	{
		packFormat: 71,
		minecraftVersions: ["1.21.5"],
		directoryNaming: "singular",
		usesMinMaxFormat: false,
	},
	{
		packFormat: 61,
		minecraftVersions: ["1.21.4"],
		directoryNaming: "singular",
		usesMinMaxFormat: false,
	},
	{
		packFormat: 57,
		minecraftVersions: ["1.21.2", "1.21.3"],
		directoryNaming: "singular",
		usesMinMaxFormat: false,
	},
	{
		packFormat: 48,
		minecraftVersions: ["1.21", "1.21.1"],
		directoryNaming: "singular",
		usesMinMaxFormat: false,
	},
	{
		packFormat: 41,
		minecraftVersions: ["1.20.5", "1.20.6"],
		directoryNaming: "plural",
		usesMinMaxFormat: false,
	},
	{
		packFormat: 26,
		minecraftVersions: ["1.20.3", "1.20.4"],
		directoryNaming: "plural",
		usesMinMaxFormat: false,
	},
	{
		packFormat: 18,
		minecraftVersions: ["1.20.2"],
		directoryNaming: "plural",
		usesMinMaxFormat: false,
	},
	{
		packFormat: 15,
		minecraftVersions: ["1.20", "1.20.1"],
		directoryNaming: "plural",
		usesMinMaxFormat: false,
	},
	{
		packFormat: 12,
		minecraftVersions: ["1.19.4"],
		directoryNaming: "plural",
		usesMinMaxFormat: false,
	},
	{
		packFormat: 10,
		minecraftVersions: ["1.19", "1.19.1", "1.19.2", "1.19.3"],
		directoryNaming: "plural",
		usesMinMaxFormat: false,
	},
	{
		packFormat: 9,
		minecraftVersions: ["1.18", "1.18.1", "1.18.2"],
		directoryNaming: "plural",
		usesMinMaxFormat: false,
	},
	{
		packFormat: 7,
		minecraftVersions: ["1.17", "1.17.1"],
		directoryNaming: "plural",
		usesMinMaxFormat: false,
	},
	{
		packFormat: 6,
		minecraftVersions: ["1.16.2", "1.16.3", "1.16.4", "1.16.5"],
		directoryNaming: "plural",
		usesMinMaxFormat: false,
	},
	{
		packFormat: 5,
		minecraftVersions: ["1.15", "1.15.1", "1.15.2", "1.16", "1.16.1"],
		directoryNaming: "plural",
		usesMinMaxFormat: false,
	},
	{
		packFormat: 4,
		minecraftVersions: [
			"1.13",
			"1.13.1",
			"1.13.2",
			"1.14",
			"1.14.1",
			"1.14.2",
			"1.14.3",
			"1.14.4",
		],
		directoryNaming: "plural",
		usesMinMaxFormat: false,
	},
];

/**
 * Normalize Minecraft version string by removing trailing .0
 * and converting Pre-Release/Snapshot/RC notations to Wiki format
 * Examples:
 *   - "1.21.0" -> "1.21"
 *   - "26.1.0" -> "26.1.0" (not 1.x, keep as-is)
 *   - "1.21.11 Pre-Release 1" -> "1.21.11-pre1"
 *   - "26.1 Snapshot 1" -> "26.1-snap1"
 *   - "1.21 Release Candidate 1" -> "1.21-rc1"
 */
function normalizeVersion(version: string): string {
	let normalized = version;

	// Convert Pre-Release/Snapshot/RC notations to Wiki format
	normalized = normalized.replace(/\s+Pre-Release\s+(\d+)/gi, "-pre$1");
	normalized = normalized.replace(/\s+Pre-release\s+(\d+)/gi, "-pre$1");
	normalized = normalized.replace(/\s+Release\s+Candidate\s+(\d+)/gi, "-rc$1");
	normalized = normalized.replace(/\s+RC\s+(\d+)/gi, "-rc$1");
	normalized = normalized.replace(/\s+Snapshot\s+(\d+)/gi, "-snap$1");

	// Only remove trailing .0 for versions in 1.x format
	// New format (26.1, 27.0, etc.) should not be normalized
	if (/^1\.\d+\.0$/.test(normalized)) {
		return normalized.replace(/\.0$/, "");
	}
	return normalized;
}

export function getPackFormat(
	minecraftVersion: string,
): PackFormatMapping | null {
	const normalized = normalizeVersion(minecraftVersion);
	for (const mapping of KNOWN_PACK_FORMATS) {
		if (mapping.minecraftVersions.includes(normalized)) {
			return mapping;
		}
	}
	return null;
}

/**
 * Get pack format with fallback to latest known version for unknown versions
 * Priority: 1. Hardcoded KNOWN_PACK_FORMATS, 2. Wiki lookup, 3. Latest known version fallback
 * @returns mapping, whether it's a known version, the normalized version, and the latest known version if fallback was used
 */
export async function getPackFormatWithFallback(
	minecraftVersion: string,
): Promise<{
	mapping: PackFormatMapping;
	isKnown: boolean;
	normalizedVersion: string;
	latestKnownVersion?: string;
	source: "hardcoded" | "wiki" | "fallback";
}> {
	const normalized = normalizeVersion(minecraftVersion);

	// Priority 1: Try hardcoded KNOWN_PACK_FORMATS first
	const exactMatch = getPackFormat(normalized);
	if (exactMatch) {
		return {
			mapping: exactMatch,
			isKnown: true,
			normalizedVersion: normalized,
			source: "hardcoded",
		};
	}

	// Priority 2: Try Wiki lookup for development versions
	try {
		const wikiMatch = await getPackFormatFromWiki(normalized);
		if (wikiMatch) {
			return {
				mapping: wikiMatch,
				isKnown: true,
				normalizedVersion: normalized,
				source: "wiki",
			};
		}
	} catch (error) {
		console.error("Wiki lookup failed, using fallback:", error);
	}

	// Priority 3: Fallback to latest known version
	const latestMapping = KNOWN_PACK_FORMATS[0]; // Array is sorted newest first
	const latestVersion = latestMapping.minecraftVersions[0];

	return {
		mapping: latestMapping,
		isKnown: false,
		normalizedVersion: normalized,
		latestKnownVersion: latestVersion,
		source: "fallback",
	};
}

export function getDirectoryNames(
	directoryNaming: "singular" | "plural",
): Record<string, string> {
	if (directoryNaming === "singular") {
		return {
			loot_table: "loot_table",
			function: "function",
			recipe: "recipe",
			"tag/item": "tag/item",
			"tag/block": "tag/block",
			"tag/entity_type": "tag/entity_type",
			"tag/function": "tag/function",
			advancement: "advancement",
			predicate: "predicate",
			dimension: "dimension",
			dimension_type: "dimension_type",
			worldgen: "worldgen",
			structure: "structure",
			chat_type: "chat_type",
			damage_type: "damage_type",
			trim_material: "trim_material",
			trim_pattern: "trim_pattern",
			banner_pattern: "banner_pattern",
			wolf_variant: "wolf_variant",
			enchantment: "enchantment",
			enchantment_provider: "enchantment_provider",
			jukebox_song: "jukebox_song",
			painting_variant: "painting_variant",
		};
	}
	return {
		loot_tables: "loot_tables",
		functions: "functions",
		recipes: "recipes",
		"tags/items": "tags/items",
		"tags/blocks": "tags/blocks",
		"tags/entity_types": "tags/entity_types",
		"tags/functions": "tags/functions",
		advancements: "advancements",
		predicates: "predicates",
		dimension: "dimension",
		dimension_type: "dimension_type",
		worldgen: "worldgen",
		structures: "structures",
		chat_type: "chat_type",
		damage_type: "damage_type",
		trim_material: "trim_material",
		trim_pattern: "trim_pattern",
		banner_pattern: "banner_pattern",
		wolf_variant: "wolf_variant",
		enchantment: "enchantment",
		enchantment_provider: "enchantment_provider",
		jukebox_song: "jukebox_song",
		painting_variant: "painting_variant",
	};
}

/**
 * Parse Wiki Pack Format table to extract version -> pack format mappings
 * Focuses on the "Full table including development versions" section
 */
async function parseWikiPackFormats(): Promise<Map<string, PackFormatMapping>> {
	const versionMap = new Map<string, PackFormatMapping>();

	try {
		// Fetch the Pack format page from Wiki
		const response = await callMediaWikiAPI({
			action: "parse",
			page: "Pack format",
			prop: "text",
			formatversion: "2",
		});

		if (!response || typeof response !== "object") {
			throw new Error("Invalid API response");
		}

		const parseResult = response as {
			parse?: { text?: string };
		};

		const pageContent = parseResult.parse?.text;
		if (!pageContent || typeof pageContent !== "string") {
			throw new Error("Failed to get page content");
		}

		// Load HTML into cheerio
		const $ = cheerio.load(pageContent);

		// Find the table with pack format data
		// The wiki page has multiple tables, we need the one with "Value" header
		const tables = $("table.wikitable");

		for (let i = 0; i < tables.length; i++) {
			const table = tables.eq(i);

			// Check if this table has the correct headers
			const headers = table.find("tr").first().find("th");
			const headerTexts = headers.map((_, el) => $(el).text().trim()).get();

			// Look for table with "Value" and "Versions" columns
			if (!headerTexts.includes("Value") || !headerTexts.includes("Versions")) {
				continue;
			}

			// Find column indices
			const valueIndex = headerTexts.indexOf("Value");
			const versionsIndex = headerTexts.indexOf("Versions");

			// Parse each row (skip header row)
			table
				.find("tr")
				.slice(1)
				.each((_, row) => {
					const cells = $(row).find("th, td"); // Include both th and td
					if (cells.length <= Math.max(valueIndex, versionsIndex)) {
						return; // Skip incomplete rows
					}

					// Extract pack format value
					const packFormatCell = cells.eq(valueIndex);
					const packFormatStr = packFormatCell.text().trim();

					// Extract versions
					const versionsCell = cells.eq(versionsIndex);
					const versionsText = versionsCell.text().trim();

					// Parse pack format (can be "4", "88.0", etc.)
					let packFormat: number | [number, number];
					if (packFormatStr.includes(".")) {
						// Format like "88.0" -> [88, 0]
						const parts = packFormatStr
							.split(".")
							.map((p) => Number.parseInt(p.trim(), 10));
						if (
							parts.length === 2 &&
							!Number.isNaN(parts[0]) &&
							!Number.isNaN(parts[1])
						) {
							packFormat = [parts[0], parts[1]] as [number, number];
						} else {
							return; // Skip invalid format
						}
					} else {
						const num = Number.parseInt(packFormatStr.trim(), 10);
						if (Number.isNaN(num)) return; // Skip non-numeric
						packFormat = num;
					}

					// Parse versions - extract all version strings
					// Versions can be: "1.13", "17w48a", "1.21.11-pre1", ranges like "17w48a – 19w46b"
					const versions: string[] = [];

					// Split by various delimiters (–, -, comma, and, newline)
					// Note: Don't split on single - as it's used in version notation (1.21-rc1, 26.1-snap1)
					const versionParts = versionsText.split(/[–,\n]|(?:\s+and\s+)/);

					for (const part of versionParts) {
						const trimmed = part.trim();
						if (!trimmed) continue;

						// Match version patterns:
						// - Snapshot: 25w41a, 17w48a
						// - Release: 1.13, 1.21.11
						// - Pre-release/RC/Snapshot: 1.21.11-pre1, 1.21-rc1, 26.1-snap1
						const versionMatch = trimmed.match(
							/\d+w\d+[a-z]|\d+\.\d+(?:\.\d+)?(?:-(?:pre|rc|snap)\d+)?/i,
						);
						if (versionMatch) {
							versions.push(versionMatch[0]);
						}
					}

					if (versions.length === 0) {
						return; // Skip rows without valid versions
					}

					// Determine directory naming based on version range
					// 1.21+ uses singular, earlier versions use plural
					const hasPost121 = versions.some((v) => {
						const match = v.match(/^(\d+)\.(\d+)/);
						if (!match) return false;
						const [, major, minor] = match;
						return (
							Number.parseInt(major, 10) === 1 &&
							Number.parseInt(minor, 10) >= 21
						);
					});
					const directoryNaming: "singular" | "plural" = hasPost121
						? "singular"
						: "plural";

					// Determine if min/max format is used (1.21.9+)
					const usesMinMaxFormat = Array.isArray(packFormat);

					const mapping: PackFormatMapping = {
						packFormat,
						minecraftVersions: versions,
						directoryNaming,
						usesMinMaxFormat,
					};

					// Add each version to the map
					for (const version of versions) {
						versionMap.set(version, mapping);
					}
				});

			// Found the right table, no need to check others
			if (versionMap.size > 0) {
				break;
			}
		}
	} catch (error) {
		console.error("Failed to parse Wiki pack formats:", error);
		// Return empty map on failure - fallback will handle this
	}

	return versionMap;
}

/**
 * Get pack format from Wiki with caching
 * Returns null if version not found or Wiki fetch fails
 */
async function getPackFormatFromWiki(
	minecraftVersion: string,
): Promise<PackFormatMapping | null> {
	const now = Date.now();

	// Check if cache is valid
	if (wikiPackFormatCache && now - wikiCacheTimestamp < CACHE_DURATION_MS) {
		return wikiPackFormatCache.get(minecraftVersion) || null;
	}

	// Cache expired or doesn't exist - fetch from Wiki
	try {
		wikiPackFormatCache = await parseWikiPackFormats();
		wikiCacheTimestamp = now;
		return wikiPackFormatCache.get(minecraftVersion) || null;
	} catch (error) {
		console.error("Failed to get pack format from Wiki:", error);
		return null;
	}
}
