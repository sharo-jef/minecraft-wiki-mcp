import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { cache } from "../utils/cache.js";
import { getPackFormat, KNOWN_PACK_FORMATS } from "../utils/versionMapping.js";

interface GetPackFormatInfoArgs {
	minecraftVersion?: string;
	packFormat?: number | string; // Allow string for array format like "[88, 0]"
}

/**
 * Compare two pack formats for equality.
 * Handles comparisons between:
 * - number and number
 * - number and [number, number]
 * - decimal number (e.g., 94.1) and [number, number] (e.g., [94, 1])
 * - string representations of any of the above
 */
function comparePackFormats(
	format1: number | [number, number] | string,
	format2: number | [number, number] | string,
): boolean {
	// Normalize both formats
	const normalize = (
		fmt: number | [number, number] | string,
	): [number, number] | number => {
		if (typeof fmt === "string") {
			// Try to parse as array format like "[88, 0]"
			if (fmt.startsWith("[") && fmt.endsWith("]")) {
				try {
					const parsed = JSON.parse(fmt);
					if (Array.isArray(parsed) && parsed.length === 2) {
						return parsed as [number, number];
					}
				} catch {
					// Fall through to decimal parsing
				}
			}
			// Try to parse as decimal number (e.g., "94.1" -> [94, 1])
			const num = Number.parseFloat(fmt);
			if (!Number.isNaN(num)) {
				const intPart = Math.floor(num);
				const decimalPart = Math.round((num - intPart) * 10);
				if (decimalPart > 0) {
					return [intPart, decimalPart];
				}
				return intPart;
			}
		} else if (typeof fmt === "number") {
			// Handle decimal numbers like 94.1 -> [94, 1]
			const intPart = Math.floor(fmt);
			const decimalPart = Math.round((fmt - intPart) * 10);
			if (decimalPart > 0) {
				return [intPart, decimalPart];
			}
			return intPart;
		}
		return fmt as number | [number, number];
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

interface PackFormatInfoOutput {
	packFormat: number | [number, number] | string;
	minecraftVersions: string[];
	directoryNaming: "singular" | "plural";
	usesMinMaxFormat: boolean;
	changes?: string;
}

export async function getPackFormatInfo(
	args: GetPackFormatInfoArgs,
): Promise<CallToolResult> {
	const { minecraftVersion, packFormat } = args;

	const cacheKey = cache.generateKey("pack_format", {
		minecraftVersion,
		packFormat,
	});

	const cachedResult = cache.get<CallToolResult>(cacheKey);
	if (cachedResult) {
		return cachedResult;
	}

	if (!minecraftVersion && packFormat === undefined) {
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(
						{
							error: "Either minecraftVersion or packFormat is required",
							availablePackFormats: KNOWN_PACK_FORMATS.map((pf) => ({
								packFormat: pf.packFormat,
								versions: pf.minecraftVersions,
							})),
						},
						null,
						2,
					),
				},
			],
		};
	}

	let result: PackFormatInfoOutput | null = null;

	if (minecraftVersion) {
		const mapping = getPackFormat(minecraftVersion);
		if (mapping) {
			result = {
				packFormat: mapping.packFormat,
				minecraftVersions: mapping.minecraftVersions,
				directoryNaming: mapping.directoryNaming,
				usesMinMaxFormat: mapping.usesMinMaxFormat,
			};
		}
	} else if (packFormat !== undefined) {
		const mapping = KNOWN_PACK_FORMATS.find((pf) =>
			comparePackFormats(pf.packFormat, packFormat),
		);
		if (mapping) {
			result = {
				packFormat: mapping.packFormat,
				minecraftVersions: mapping.minecraftVersions,
				directoryNaming: mapping.directoryNaming,
				usesMinMaxFormat: mapping.usesMinMaxFormat,
			};
		}
	}

	if (!result) {
		const searchTerm = minecraftVersion
			? `version "${minecraftVersion}"`
			: `pack_format ${packFormat}`;

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(
						{
							error: `Unknown ${searchTerm}. Consider fetching the Pack_format wiki page for the latest information.`,
							suggestion:
								"Use get_wiki_page with title='Pack_format' to get the full pack format table.",
							knownPackFormats: KNOWN_PACK_FORMATS.map((pf) => ({
								packFormat: pf.packFormat,
								versions: pf.minecraftVersions,
							})),
						},
						null,
						2,
					),
				},
			],
		};
	}

	const toolResult: CallToolResult = {
		content: [
			{
				type: "text",
				text: JSON.stringify(result, null, 2),
			},
		],
	};

	cache.set(cacheKey, toolResult);

	return toolResult;
}
