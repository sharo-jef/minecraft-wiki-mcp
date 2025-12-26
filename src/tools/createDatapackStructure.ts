import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { CreateDatapackOutput } from "../types.js";
import {
	generateDatapackFiles,
	getFeatureDirectories,
} from "../utils/fileGenerator.js";
import { generatePackMcmetaSchema } from "../utils/schemaGenerator.js";
import { getPackFormatWithFallback } from "../utils/versionMapping.js";
import { generateWarnings } from "../utils/warningGenerator.js";

interface CreateDatapackStructureArgs {
	minecraftVersion: string;
	namespace: string;
	description?: string;
	features?: string[];
	includeLoadSetup?: boolean;
}

export async function createDatapackStructure(
	args: CreateDatapackStructureArgs,
): Promise<CallToolResult> {
	const {
		minecraftVersion,
		namespace,
		description,
		features = ["functions"],
		includeLoadSetup = false,
	} = args;

	// Validate required arguments
	if (!minecraftVersion) {
		throw new Error("minecraftVersion is required");
	}
	if (!namespace) {
		throw new Error("namespace is required");
	}

	// Validate namespace format (must be lowercase, alphanumeric, underscore, hyphen, dot)
	if (!/^[a-z0-9_.-]+$/.test(namespace)) {
		throw new Error(
			"namespace must contain only lowercase letters, numbers, underscores, hyphens, and dots",
		);
	}

	// Get pack format with fallback for unknown versions
	const { mapping, isKnown, latestKnownVersion, normalizedVersion, source } =
		await getPackFormatWithFallback(minecraftVersion);

	// Generate pack.mcmeta schema
	const packMcmetaSchema = generatePackMcmetaSchema(
		mapping,
		normalizedVersion,
		isKnown,
	);

	// Generate version-specific warnings
	const warnings = generateWarnings(
		normalizedVersion,
		mapping,
		isKnown,
		latestKnownVersion,
		source,
	);

	// Generate datapack files
	const files = generateDatapackFiles(
		namespace,
		description,
		features,
		mapping,
		includeLoadSetup,
	);

	// Get feature directories (for documentation purposes)
	const directories = getFeatureDirectories(
		namespace,
		features,
		mapping.directoryNaming,
	);

	// Prepare output
	const output: CreateDatapackOutput = {
		files,
		packMcmetaSchema,
		warnings,
	};

	// Add metadata comment
	const metadata = {
		...output,
		_metadata: {
			minecraft_version: normalizedVersion,
			pack_format: Array.isArray(mapping.packFormat)
				? mapping.packFormat.join(".")
				: mapping.packFormat,
			namespace,
			features,
			directories,
			is_known_version: isKnown,
			source, // "hardcoded", "wiki", or "fallback"
		},
	};

	return {
		content: [
			{
				type: "text",
				text: JSON.stringify(metadata, null, 2),
			},
		],
	};
}
