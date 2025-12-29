import { describe, expect, it } from "vitest";
import { getTextContent } from "./test-utils.js";

/**
 * Integration tests for MCP tools
 * These tests verify the tools work together correctly
 */
describe("MCP Tools Integration", () => {
	describe("Datapack creation workflow", () => {
		it("should create datapack for known version using minecraftVersion", async () => {
			const { getDatapackSpecification } = await import(
				"./tools/getDatapackSpecification.js"
			);

			const result = await getDatapackSpecification({
				minecraftVersion: "1.21.2",
				namespace: "my_pack",
				description: "Test Pack",
				features: ["functions"],
			});

			expect(result.content).toHaveLength(1);
			const content = JSON.parse(getTextContent(result));

			// Verify pack.mcmeta
			expect(content.files["pack.mcmeta"]).toBeDefined();
			expect(content.files["pack.mcmeta"].pack.pack_format).toBe(57);

			// Verify schema
			expect(content.packMcmetaSchema).toBeDefined();

			// Verify warnings mention singular directory naming
			expect(content.warnings.join("\n")).toContain("singular");
		});

		it("should create datapack using packFormat", async () => {
			const { getDatapackSpecification } = await import(
				"./tools/getDatapackSpecification.js"
			);

			const result = await getDatapackSpecification({
				packFormat: 48,
				namespace: "test_pack",
			});

			const content = JSON.parse(getTextContent(result));
			expect(content.files["pack.mcmeta"].pack.pack_format).toBe(48);
		});

		it("should create datapack with load setup", async () => {
			const { getDatapackSpecification } = await import(
				"./tools/getDatapackSpecification.js"
			);

			const result = await getDatapackSpecification({
				minecraftVersion: "1.21",
				namespace: "my_pack",
				features: ["functions"],
				includeLoadSetup: true,
			});

			const content = JSON.parse(getTextContent(result));
			expect(
				content.files["data/minecraft/tag/function/load.json"],
			).toBeDefined();
			expect(
				content.files["data/my_pack/function/init.mcfunction"],
			).toBeDefined();
		});
	});

	describe("Pack format lookup workflow", () => {
		it("should get pack format info by version", async () => {
			const { getPackFormatInfo } = await import(
				"./tools/getPackFormatInfo.js"
			);

			const result = await getPackFormatInfo({
				minecraftVersion: "1.21.2",
			});

			const content = JSON.parse(getTextContent(result));
			expect(content.packFormat).toBe(57);
			expect(content.directoryNaming).toBe("singular");
		});

		it("should get pack format info by pack format number", async () => {
			const { getPackFormatInfo } = await import(
				"./tools/getPackFormatInfo.js"
			);

			const result = await getPackFormatInfo({
				packFormat: 48,
			});

			const content = JSON.parse(getTextContent(result));
			expect(content.minecraftVersions).toContain("1.21");
		});
	});

	describe("Version normalization", () => {
		it("should normalize 1.21.0 to 1.21", async () => {
			const { getPackFormat } = await import("./utils/versionMapping.js");

			const result = getPackFormat("1.21.0");
			expect(result).toBeDefined();
			expect(result?.packFormat).toBe(48);
		});

		it("should handle version ranges", async () => {
			const { getPackFormat } = await import("./utils/versionMapping.js");

			const result1 = getPackFormat("1.21");
			const result2 = getPackFormat("1.21.1");

			expect(result1).toEqual(result2);
		});
	});

	describe("Directory naming by version", () => {
		it("should use singular for 1.21+", async () => {
			const { getPackFormat } = await import("./utils/versionMapping.js");

			const result = getPackFormat("1.21.2");
			expect(result?.directoryNaming).toBe("singular");
		});

		it("should use plural for pre-1.21", async () => {
			const { getPackFormat } = await import("./utils/versionMapping.js");

			const result = getPackFormat("1.20.5");
			expect(result?.directoryNaming).toBe("plural");
		});
	});

	describe("Min/max format detection", () => {
		it("should detect min/max format for 1.21.9+", async () => {
			const { getPackFormat } = await import("./utils/versionMapping.js");

			const result = getPackFormat("1.21.9");
			expect(result?.usesMinMaxFormat).toBe(true);
			expect(Array.isArray(result?.packFormat)).toBe(true);
		});

		it("should not use min/max format for pre-1.21.9", async () => {
			const { getPackFormat } = await import("./utils/versionMapping.js");

			const result = getPackFormat("1.21.2");
			expect(result?.usesMinMaxFormat).toBe(false);
			expect(typeof result?.packFormat).toBe("number");
		});
	});

	describe("Feature directory generation", () => {
		it("should generate correct paths for singular naming", async () => {
			const { getFeatureDirectories } = await import(
				"./utils/fileGenerator.js"
			);

			const dirs = getFeatureDirectories(
				"my_pack",
				["functions", "recipes", "loot_tables"],
				"singular",
			);

			expect(dirs).toContain("data/my_pack/function");
			expect(dirs).toContain("data/my_pack/recipe");
			expect(dirs).toContain("data/my_pack/loot_table");
		});

		it("should generate correct paths for plural naming", async () => {
			const { getFeatureDirectories } = await import(
				"./utils/fileGenerator.js"
			);

			const dirs = getFeatureDirectories(
				"my_pack",
				["functions", "recipes", "loot_tables"],
				"plural",
			);

			expect(dirs).toContain("data/my_pack/functions");
			expect(dirs).toContain("data/my_pack/recipes");
			expect(dirs).toContain("data/my_pack/loot_tables");
		});
	});

	describe("JSON extraction", () => {
		it("should extract and parse JSON blocks", async () => {
			const { extractJsonBlocks } = await import("./utils/jsonExtractor.js");

			const wikitext = `
Some text
\`\`\`json
{"pack_format": 48}
\`\`\`
More text
			`;

			const blocks = extractJsonBlocks(wikitext);
			expect(blocks).toHaveLength(1);
			expect(blocks[0]).toEqual({ pack_format: 48 });
		});
	});

	describe("HTML stripping", () => {
		it("should strip HTML tags and decode entities", async () => {
			const { stripHtml } = await import("./utils/jsonExtractor.js");

			const html = "<p>Test &amp; Example</p>";
			const result = stripHtml(html);

			expect(result).toBe("Test & Example");
			expect(result).not.toContain("<");
		});
	});

	describe("Warning generation", () => {
		it("should generate warnings for unknown versions", async () => {
			const { generateWarnings } = await import("./utils/warningGenerator.js");

			const warnings = generateWarnings(
				"1.99.99",
				{
					packFormat: 48,
					minecraftVersions: ["1.21"],
					directoryNaming: "singular",
					usesMinMaxFormat: false,
				},
				false,
				"1.21.11",
				"fallback",
			);

			expect(warnings.join("\n")).toContain("UNKNOWN VERSION");
		});

		it("should generate warnings for 1.21+ directory naming", async () => {
			const { generateWarnings } = await import("./utils/warningGenerator.js");

			const warnings = generateWarnings(
				"1.21",
				{
					packFormat: 48,
					minecraftVersions: ["1.21"],
					directoryNaming: "singular",
					usesMinMaxFormat: false,
				},
				true,
				undefined,
				"hardcoded",
			);

			expect(warnings.join("\n")).toContain("singular directory names");
		});
	});

	describe("Schema generation", () => {
		it("should generate valid schema for standard versions", async () => {
			const { generatePackMcmetaSchema } = await import(
				"./utils/schemaGenerator.js"
			);

			const schema = generatePackMcmetaSchema(
				{
					packFormat: 48,
					minecraftVersions: ["1.21"],
					directoryNaming: "singular",
					usesMinMaxFormat: false,
				},
				"1.21",
				true,
			);

			expect(schema.$schema).toBe("http://json-schema.org/draft-07/schema#");
			expect(schema.required).toContain("pack");
		});

		it("should generate schema with min/max format for 1.21.9+", async () => {
			const { generatePackMcmetaSchema } = await import(
				"./utils/schemaGenerator.js"
			);

			const schema = generatePackMcmetaSchema(
				{
					packFormat: [88, 0],
					minecraftVersions: ["1.21.9"],
					directoryNaming: "singular",
					usesMinMaxFormat: true,
				},
				"1.21.9",
				true,
			);

			const packRequired = (schema.properties?.pack as { required: string[] })
				?.required;
			expect(packRequired).toContain("min_format");
			expect(packRequired).toContain("max_format");
		});
	});
});
