import { describe, expect, it } from "vitest";
import type { PackFormatMapping } from "../types.js";
import {
	generateDatapackFiles,
	getFeatureDirectories,
} from "./fileGenerator.js";

describe("fileGenerator", () => {
	describe("generateDatapackFiles", () => {
		const mockMapping121: PackFormatMapping = {
			packFormat: 48,
			minecraftVersions: ["1.21", "1.21.1"],
			directoryNaming: "singular",
			usesMinMaxFormat: false,
		};

		const mockMapping120: PackFormatMapping = {
			packFormat: 15,
			minecraftVersions: ["1.20", "1.20.1"],
			directoryNaming: "plural",
			usesMinMaxFormat: false,
		};

		const mockMappingMinMax: PackFormatMapping = {
			packFormat: [88, 0],
			minecraftVersions: ["1.21.9", "1.21.10"],
			directoryNaming: "singular",
			usesMinMaxFormat: true,
		};

		it("should generate pack.mcmeta with pack_format for standard versions", () => {
			const files = generateDatapackFiles(
				"test_pack",
				"Test Description",
				["functions"],
				mockMapping121,
				false,
			);

			expect(files["pack.mcmeta"]).toBeDefined();
			const packMcmeta = files["pack.mcmeta"] as {
				pack: { pack_format?: number; description?: string };
			};
			expect(packMcmeta.pack.pack_format).toBe(48);
			expect(packMcmeta.pack.description).toBe("Test Description");
		});

		it("should generate pack.mcmeta with min/max format for 1.21.9+", () => {
			const files = generateDatapackFiles(
				"test_pack",
				"Test",
				["functions"],
				mockMappingMinMax,
				false,
			);

			const packMcmeta = files["pack.mcmeta"] as {
				pack: {
					min_format?: number | [number, number];
					max_format?: number | [number, number];
				};
			};
			expect(packMcmeta.pack.min_format).toEqual([88, 0]);
			expect(packMcmeta.pack.max_format).toEqual([88, 0]);
			expect(packMcmeta.pack).not.toHaveProperty("pack_format");
		});

		it("should omit description if not provided", () => {
			const files = generateDatapackFiles(
				"test_pack",
				undefined,
				["functions"],
				mockMapping121,
				false,
			);

			const packMcmeta = files["pack.mcmeta"] as {
				pack: { description?: string };
			};
			expect(packMcmeta.pack.description).toBeUndefined();
		});

		it("should not include load setup by default", () => {
			const files = generateDatapackFiles(
				"test_pack",
				undefined,
				["functions"],
				mockMapping121,
				false,
			);

			expect(files).toHaveProperty("pack.mcmeta");
			expect(files).not.toHaveProperty("data/minecraft/tag/function/load.json");
			expect(files).not.toHaveProperty(
				"data/test_pack/function/init.mcfunction",
			);
		});

		it("should include load setup when requested with singular directories", () => {
			const files = generateDatapackFiles(
				"my_pack",
				"My Pack",
				["functions"],
				mockMapping121,
				true,
			);

			expect(files["data/minecraft/tag/function/load.json"]).toEqual({
				values: ["my_pack:init"],
			});
			expect(files["data/my_pack/function/init.mcfunction"]).toContain(
				"My Pack loaded!",
			);
		});

		it("should include load setup with plural directories for older versions", () => {
			const files = generateDatapackFiles(
				"my_pack",
				"My Pack",
				["functions"],
				mockMapping120,
				true,
			);

			expect(files["data/minecraft/tags/functions/load.json"]).toEqual({
				values: ["my_pack:init"],
			});
			expect(files["data/my_pack/functions/init.mcfunction"]).toContain(
				"My Pack loaded!",
			);
		});

		it("should use namespace in init message if no description", () => {
			const files = generateDatapackFiles(
				"test_namespace",
				undefined,
				["functions"],
				mockMapping121,
				true,
			);

			const initContent = files["data/test_namespace/function/init.mcfunction"];
			expect(initContent).toContain("test_namespace loaded!");
		});

		it("should only include load setup if functions feature is requested", () => {
			const filesWithFunctions = generateDatapackFiles(
				"test_pack",
				undefined,
				["functions"],
				mockMapping121,
				true,
			);

			const filesWithoutFunctions = generateDatapackFiles(
				"test_pack",
				undefined,
				["recipes"],
				mockMapping121,
				true,
			);

			expect(filesWithFunctions).toHaveProperty(
				"data/minecraft/tag/function/load.json",
			);
			expect(filesWithoutFunctions).not.toHaveProperty(
				"data/minecraft/tag/function/load.json",
			);
		});

		it("should always include pack.mcmeta", () => {
			const files1 = generateDatapackFiles(
				"test",
				undefined,
				[],
				mockMapping121,
				false,
			);
			const files2 = generateDatapackFiles(
				"test",
				undefined,
				["functions", "recipes"],
				mockMapping121,
				true,
			);

			expect(files1).toHaveProperty("pack.mcmeta");
			expect(files2).toHaveProperty("pack.mcmeta");
		});
	});

	describe("getFeatureDirectories", () => {
		it("should return singular directory paths for 1.21+", () => {
			const dirs = getFeatureDirectories(
				"my_pack",
				["functions", "recipes", "loot_tables"],
				"singular",
			);

			expect(dirs).toContain("data/my_pack/function");
			expect(dirs).toContain("data/my_pack/recipe");
			expect(dirs).toContain("data/my_pack/loot_table");
		});

		it("should return plural directory paths for pre-1.21", () => {
			const dirs = getFeatureDirectories(
				"my_pack",
				["functions", "recipes", "loot_tables"],
				"plural",
			);

			expect(dirs).toContain("data/my_pack/functions");
			expect(dirs).toContain("data/my_pack/recipes");
			expect(dirs).toContain("data/my_pack/loot_tables");
		});

		it("should handle advancements and predicates", () => {
			const singularDirs = getFeatureDirectories(
				"test",
				["advancements", "predicates"],
				"singular",
			);
			const pluralDirs = getFeatureDirectories(
				"test",
				["advancements", "predicates"],
				"plural",
			);

			expect(singularDirs).toContain("data/test/advancement");
			expect(singularDirs).toContain("data/test/predicate");

			expect(pluralDirs).toContain("data/test/advancements");
			expect(pluralDirs).toContain("data/test/predicates");
		});

		it("should handle tags (always plural in path)", () => {
			const singularDirs = getFeatureDirectories("test", ["tags"], "singular");
			const pluralDirs = getFeatureDirectories("test", ["tags"], "plural");

			expect(singularDirs).toContain("data/test/tag");
			expect(pluralDirs).toContain("data/test/tags");
		});

		it("should handle dimension and worldgen", () => {
			const dirs = getFeatureDirectories(
				"test",
				["dimension", "dimension_type", "worldgen"],
				"singular",
			);

			expect(dirs).toContain("data/test/dimension");
			expect(dirs).toContain("data/test/dimension_type");
			expect(dirs).toContain("data/test/worldgen");
		});

		it("should handle structures", () => {
			const singularDirs = getFeatureDirectories(
				"test",
				["structures"],
				"singular",
			);
			const pluralDirs = getFeatureDirectories(
				"test",
				["structures"],
				"plural",
			);

			expect(singularDirs).toContain("data/test/structure");
			expect(pluralDirs).toContain("data/test/structures");
		});

		it("should ignore unknown features", () => {
			const dirs = getFeatureDirectories(
				"test",
				["functions", "unknown_feature", "invalid"],
				"singular",
			);

			expect(dirs).toContain("data/test/function");
			expect(dirs).toHaveLength(1);
		});

		it("should return empty array for empty features", () => {
			const dirs = getFeatureDirectories("test", [], "singular");
			expect(dirs).toEqual([]);
		});

		it("should handle multiple features", () => {
			const features = [
				"functions",
				"recipes",
				"loot_tables",
				"advancements",
				"predicates",
			];
			const dirs = getFeatureDirectories("my_namespace", features, "singular");

			expect(dirs).toHaveLength(5);
			expect(dirs).toContain("data/my_namespace/function");
			expect(dirs).toContain("data/my_namespace/recipe");
			expect(dirs).toContain("data/my_namespace/loot_table");
			expect(dirs).toContain("data/my_namespace/advancement");
			expect(dirs).toContain("data/my_namespace/predicate");
		});

		it("should handle enchantments and painting_variants", () => {
			const dirs = getFeatureDirectories(
				"test",
				["enchantments", "painting_variants"],
				"singular",
			);

			expect(dirs).toContain("data/test/enchantment");
			expect(dirs).toContain("data/test/painting_variant");
		});
	});
});
