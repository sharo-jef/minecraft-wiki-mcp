import type { JSONSchema, PackFormatMapping } from "../types.js";

/**
 * Generate pack.mcmeta JSON Schema for a specific Minecraft version
 */
export function generatePackMcmetaSchema(
	mapping: PackFormatMapping,
	minecraftVersion: string,
	isKnownVersion: boolean,
): JSONSchema {
	const { packFormat, usesMinMaxFormat } = mapping;
	const formatStr = Array.isArray(packFormat)
		? `[${packFormat.join(", ")}]`
		: packFormat.toString();

	const schema: JSONSchema = {
		$schema: "http://json-schema.org/draft-07/schema#",
		description: isKnownVersion
			? `pack.mcmeta schema for Minecraft ${minecraftVersion} (pack format ${formatStr})`
			: `pack.mcmeta schema for Minecraft ${minecraftVersion} (pack format ${formatStr}) - FALLBACK FROM LATEST KNOWN VERSION`,
		type: "object",
		properties: {
			pack: {
				type: "object",
				properties: {},
				required: [],
			},
		},
		required: ["pack"],
	};

	const packSchema = schema.properties?.pack;
	if (
		!packSchema ||
		typeof packSchema !== "object" ||
		!("properties" in packSchema) ||
		!("required" in packSchema)
	) {
		return schema;
	}

	const packProps = (packSchema as { properties: Record<string, unknown> })
		.properties;
	const packRequired = (packSchema as { required: string[] }).required;

	// description (always available, optional)
	packProps.description = {
		description:
			"Pack description. Supports plain string or JSON Text Component format.",
		oneOf: [{ type: "string" }, { type: "object" }],
	};

	// Determine version-specific features
	const versionNum = parseVersion(minecraftVersion);
	const has_1_19_features = versionNum >= [1, 19, 0];
	const has_1_20_2_features = versionNum >= [1, 20, 2];
	const has_1_21_9_features = versionNum >= [1, 21, 9];

	if (has_1_21_9_features || usesMinMaxFormat) {
		// 1.21.9+: min_format/max_format required
		packProps.min_format = {
			description:
				"Minimum compatible format. Can be integer or [major, minor] array (1.21.9+).",
			oneOf: [
				{ type: "integer" },
				{
					type: "array",
					minItems: 2,
					maxItems: 2,
					items: { type: "integer" },
				},
			],
		};
		packProps.max_format = {
			description:
				"Maximum compatible format. Can be integer or [major, minor] array (1.21.9+).",
			oneOf: [
				{ type: "integer" },
				{
					type: "array",
					minItems: 2,
					maxItems: 2,
					items: { type: "integer" },
				},
			],
		};
		packRequired.push("min_format", "max_format");

		// pack_format is deprecated but allowed for backward compatibility
		packProps.pack_format = {
			type: "integer",
			description:
				"Deprecated in 1.21.9+. Use min_format/max_format instead. Only for backward compatibility.",
			deprecated: true,
		};
	} else {
		// Pre-1.21.9: pack_format required
		packProps.pack_format = {
			type: Array.isArray(packFormat) ? "array" : "integer",
			...(Array.isArray(packFormat)
				? {
						const: packFormat,
						minItems: 2,
						maxItems: 2,
						items: { type: "integer" },
						description: `Pack format for Minecraft ${minecraftVersion}. This field is required for this version.`,
					}
				: {
						const: packFormat,
						description: `Pack format for Minecraft ${minecraftVersion}. This field is required for this version.`,
					}),
		};
		packRequired.push("pack_format");

		// supported_formats (1.20.2 - 1.21.8)
		if (has_1_20_2_features) {
			packProps.supported_formats = {
				description:
					"Compatibility range. Supports integer, array of integers, or object with min_inclusive/max_inclusive (available in 1.20.2-1.21.8).",
				oneOf: [
					{ type: "integer" },
					{ type: "array", items: { type: "integer" } },
					{
						type: "object",
						properties: {
							min_inclusive: { type: "integer" },
							max_inclusive: { type: "integer" },
						},
						required: ["min_inclusive", "max_inclusive"],
					},
				],
			};
		}
	}

	// features (1.19+)
	if (has_1_19_features) {
		packProps.features = {
			description:
				"Experimental features configuration (available since 1.19).",
			type: "object",
			properties: {
				enabled: {
					type: "array",
					items: { type: "string" },
					description: "List of enabled experimental feature flags.",
				},
			},
		};
	}

	// filter (1.19+)
	if (has_1_19_features) {
		packProps.filter = {
			description:
				"File filtering configuration (available since 1.19). Blocks files from lower-priority packs.",
			type: "object",
			properties: {
				block: {
					type: "array",
					items: { type: "object" },
					description:
						"List of file patterns to block. Each pattern can use namespace/path wildcards.",
				},
			},
		};
	}

	// overlays (1.20.2+)
	if (has_1_20_2_features) {
		packProps.overlays = {
			description:
				"Version-specific pack overlays (available since 1.20.2). Allows different content for different supported formats.",
			type: "object",
			properties: {
				entries: {
					type: "array",
					items: { type: "object" },
					description: "List of overlay configurations.",
				},
			},
		};
	}

	return schema;
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
