import type { PackFormatMapping } from "../types.js";

/**
 * Generate version-specific warnings for datapack creation
 */
export function generateWarnings(
	minecraftVersion: string,
	mapping: PackFormatMapping,
	isKnownVersion: boolean,
	latestKnownVersion?: string,
	source?: "hardcoded" | "wiki" | "fallback",
): string[] {
	const warnings: string[] = [];

	// Unknown version warning (highest priority)
	if (!isKnownVersion && latestKnownVersion) {
		const sourceMsg =
			source === "fallback"
				? "Version not found in hardcoded mappings or Wiki data."
				: "Version lookup failed.";
		warnings.push(
			`⚠️ UNKNOWN VERSION: Minecraft ${minecraftVersion} is not in the known versions database.`,
			sourceMsg,
			`Using pack format ${Array.isArray(mapping.packFormat) ? `[${mapping.packFormat.join(", ")}]` : mapping.packFormat} from the latest known version (${latestKnownVersion}) as a fallback.`,
			"",
			"💡 TIP: If you're using pre-release/snapshot versions, use the Wiki notation:",
			'  - Pre-Release: "1.21.11-pre1" instead of "1.21.11 Pre-Release 1"',
			'  - Snapshot: "26.1-snap1" instead of "26.1 Snapshot 1"',
			'  - Release Candidate: "1.21-rc1" instead of "1.21 Release Candidate 1"',
			"",
			"This may be inaccurate. Please verify manually using one of these methods:",
			"  1. Check official Minecraft release notes",
			"  2. Test the datapack in-game with /reload",
			"  3. Use get_wiki_page tool to fetch: https://minecraft.wiki/w/Pack_format",
			"Recommended: Update this MCP server to the latest version for accurate support.",
		);
		return warnings; // Return early for unknown versions
	}

	// Add source information for Wiki-sourced data
	if (source === "wiki" && isKnownVersion) {
		warnings.push(
			"ℹ️ Version info retrieved from Minecraft Wiki (development version).",
			"Verify this is accurate for your specific snapshot/pre-release build.",
		);
	}

	const versionNum = parseVersion(minecraftVersion);

	// Directory naming change (1.21+)
	if (mapping.directoryNaming === "singular") {
		warnings.push(
			"Minecraft 1.21+ uses singular directory names:",
			"  - function/ (NOT functions/)",
			"  - recipe/ (NOT recipes/)",
			"  - loot_table/ (NOT loot_tables/)",
			"  - advancement/ (NOT advancements/)",
			"Note: tags/ directory name remains unchanged (NOT tag/)",
		);
	}

	// pack_format structure change (1.21.9+)
	if (versionNum >= [1, 21, 9] || mapping.usesMinMaxFormat) {
		warnings.push(
			"Minecraft 1.21.9+ uses min_format/max_format instead of pack_format.",
			"Format values can be specified as integers or [major, minor] arrays.",
		);
	}

	// supported_formats deprecation (1.21.9+)
	if (versionNum >= [1, 21, 9]) {
		warnings.push(
			"supported_formats is deprecated in 1.21.9+. Use min_format/max_format range instead.",
		);
	}

	// supported_formats availability (1.20.2 - 1.21.8)
	if (versionNum >= [1, 20, 2] && versionNum < [1, 21, 9]) {
		warnings.push(
			"This version supports 'supported_formats' field for compatibility ranges.",
		);
	}

	return warnings;
}

/**
 * Parse version string to comparable array
 * "1.21.4" -> [1, 21, 4]
 */
function parseVersion(version: string): number[] {
	return version
		.split(".")
		.map((v) => Number.parseInt(v, 10))
		.filter((v) => !Number.isNaN(v));
}
