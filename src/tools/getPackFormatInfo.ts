import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { cache } from "../utils/cache.js";
import { getPackFormat, KNOWN_PACK_FORMATS } from "../utils/versionMapping.js";

interface GetPackFormatInfoArgs {
	minecraftVersion?: string;
	packFormat?: number | string; // Allow string for array format like "[88, 0]"
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
		const mapping = KNOWN_PACK_FORMATS.find(
			(pf) => pf.packFormat === packFormat,
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
