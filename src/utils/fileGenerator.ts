import type { PackFormatMapping, PackMcmeta } from "../types.js";

/**
 * Generate datapack files based on configuration
 */
export function generateDatapackFiles(
	namespace: string,
	description: string | undefined,
	features: string[],
	mapping: PackFormatMapping,
	includeLoadSetup: boolean,
): Record<string, unknown> {
	const files: Record<string, unknown> = {};
	const { packFormat, usesMinMaxFormat, directoryNaming } = mapping;

	// Generate pack.mcmeta
	const packMcmeta: PackMcmeta = {
		pack: {},
	};

	if (usesMinMaxFormat) {
		packMcmeta.pack.min_format = packFormat;
		packMcmeta.pack.max_format = packFormat;
	} else {
		packMcmeta.pack.pack_format = packFormat;
	}

	if (description !== undefined && description !== null) {
		packMcmeta.pack.description = description;
	}

	files["pack.mcmeta"] = packMcmeta;

	// Generate load setup if requested
	if (includeLoadSetup && features.includes("functions")) {
		const functionDir =
			directoryNaming === "singular" ? "function" : "functions";
		const tagFunctionDir =
			directoryNaming === "singular" ? "tag/function" : "tags/functions";

		// load.json for initialization
		files[`data/minecraft/${tagFunctionDir}/load.json`] = {
			values: [`${namespace}:init`],
		};

		// init.mcfunction
		const initMessage = description
			? `${description} loaded!`
			: `${namespace} loaded!`;
		files[`data/${namespace}/${functionDir}/init.mcfunction`] =
			`# Datapack initialized\ntellraw @a {"text":"${initMessage}","color":"green"}`;
	}

	return files;
}

/**
 * Get directory paths for requested features
 */
export function getFeatureDirectories(
	namespace: string,
	features: string[],
	directoryNaming: "singular" | "plural",
): string[] {
	const directories: string[] = [];

	const FEATURE_MAP: Record<string, { singular: string; plural: string }> = {
		functions: { singular: "function", plural: "functions" },
		recipes: { singular: "recipe", plural: "recipes" },
		loot_tables: { singular: "loot_table", plural: "loot_tables" },
		advancements: { singular: "advancement", plural: "advancements" },
		predicates: { singular: "predicate", plural: "predicates" },
		tags: { singular: "tag", plural: "tags" },
		dimension: { singular: "dimension", plural: "dimension" },
		dimension_type: { singular: "dimension_type", plural: "dimension_type" },
		worldgen: { singular: "worldgen", plural: "worldgen" },
		structures: { singular: "structure", plural: "structures" },
		enchantments: { singular: "enchantment", plural: "enchantment" },
		painting_variants: {
			singular: "painting_variant",
			plural: "painting_variant",
		},
	};

	for (const feature of features) {
		const featureMap = FEATURE_MAP[feature];
		if (featureMap) {
			const dirName =
				directoryNaming === "singular"
					? featureMap.singular
					: featureMap.plural;
			directories.push(`data/${namespace}/${dirName}`);
		}
	}

	return directories;
}
