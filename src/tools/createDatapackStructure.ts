import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { CreateDatapackOutput } from "../types.js";
import {
	generateDatapackFiles,
	getFeatureDirectories,
} from "../utils/fileGenerator.js";
import { generatePackMcmetaSchema } from "../utils/schemaGenerator.js";
import {
	getPackFormatWithFallback,
	KNOWN_PACK_FORMATS,
} from "../utils/versionMapping.js";
import { generateWarnings } from "../utils/warningGenerator.js";

/**
 * Compare two pack formats for equality.
 * Handles comparisons between:
 * - number and number
 * - number and [number, number]
 * - decimal number (e.g., 94.1) and [number, number] (e.g., [94, 1])
 */
function comparePackFormats(
	format1: number | [number, number],
	format2: number | [number, number],
): boolean {
	// Normalize both formats - handle decimal representation
	const normalize = (
		fmt: number | [number, number],
	): [number, number] | number => {
		if (typeof fmt === "number") {
			const intPart = Math.floor(fmt);
			const decimalPart = Math.round((fmt - intPart) * 10);
			if (decimalPart > 0) {
				return [intPart, decimalPart];
			}
			return intPart;
		}
		return fmt;
	};

	const norm1 = normalize(format1);
	const norm2 = normalize(format2);

	// Compare
	if (Array.isArray(norm1) && Array.isArray(norm2)) {
		return norm1[0] === norm2[0] && norm1[1] === norm2[1];
	}
	if (!Array.isArray(norm1) && !Array.isArray(norm2)) {
		return norm1 === norm2;
	}
	return false;
}

interface CreateDatapackStructureArgs {
	minecraftVersion?: string;
	packFormat?: number;
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
		packFormat,
		namespace,
		description,
		features = ["functions"],
		includeLoadSetup = false,
	} = args;

	// Validate required arguments
	if (!minecraftVersion && !packFormat) {
		throw new Error("Either minecraftVersion or packFormat is required");
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

	// Determine minecraft version from packFormat if needed
	let resolvedMinecraftVersion = minecraftVersion;
	if (!resolvedMinecraftVersion && packFormat) {
		const packFormatMapping = KNOWN_PACK_FORMATS.find((pf) =>
			comparePackFormats(pf.packFormat, packFormat),
		);
		if (!packFormatMapping) {
			throw new Error(
				`Unknown pack format: ${packFormat}. Use get_pack_format_info to see available formats.`,
			);
		}
		// Use the first (usually latest) version for this pack format
		resolvedMinecraftVersion = packFormatMapping.minecraftVersions[0];
	}

	// This should never happen due to validation above, but TypeScript doesn't know that
	if (!resolvedMinecraftVersion) {
		throw new Error("Either minecraftVersion or packFormat is required");
	}

	// Get pack format with fallback for unknown versions
	const { mapping, isKnown, latestKnownVersion, normalizedVersion, source } =
		await getPackFormatWithFallback(resolvedMinecraftVersion);

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
	const _directories = getFeatureDirectories(
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

	return {
		content: [
			{
				type: "text",
				text: JSON.stringify(output, null, 2),
			},
		],
	};
}
