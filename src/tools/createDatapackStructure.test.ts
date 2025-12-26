import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PackFormatMapping } from "../types.js";
import { createDatapackStructure } from "./createDatapackStructure.js";

// Mock dependencies
vi.mock("../utils/versionMapping.js", async () => {
	const actual = await vi.importActual<
		typeof import("../utils/versionMapping.js")
	>("../utils/versionMapping.js");
	return {
		...actual,
		getPackFormatWithFallback: vi.fn(),
	};
});

describe("createDatapackStructure", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const mockMapping121: PackFormatMapping = {
		packFormat: 48,
		minecraftVersions: ["1.21", "1.21.1"],
		directoryNaming: "singular",
		usesMinMaxFormat: false,
	};

	const mockMapping1219: PackFormatMapping = {
		packFormat: [88, 0],
		minecraftVersions: ["1.21.9", "1.21.10"],
		directoryNaming: "singular",
		usesMinMaxFormat: true,
	};

	it("should require namespace", async () => {
		await expect(
			createDatapackStructure({
				minecraftVersion: "1.21",
				namespace: "",
			}),
		).rejects.toThrow("namespace is required");
	});

	it("should require either minecraftVersion or packFormat", async () => {
		await expect(
			createDatapackStructure({
				namespace: "test",
			}),
		).rejects.toThrow("Either minecraftVersion or packFormat is required");
	});

	it("should validate namespace format", async () => {
		await expect(
			createDatapackStructure({
				minecraftVersion: "1.21",
				namespace: "Invalid_Namespace!",
			}),
		).rejects.toThrow("namespace must contain only lowercase letters");

		await expect(
			createDatapackStructure({
				minecraftVersion: "1.21",
				namespace: "Test",
			}),
		).rejects.toThrow("namespace must contain only lowercase letters");
	});

	it("should accept valid namespace formats", async () => {
		const { getPackFormatWithFallback } = await import(
			"../utils/versionMapping.js"
		);
		vi.mocked(getPackFormatWithFallback).mockResolvedValue({
			mapping: mockMapping121,
			isKnown: true,
			normalizedVersion: "1.21",
			source: "hardcoded",
		});

		const validNamespaces = [
			"test",
			"test_pack",
			"test-pack",
			"test.pack",
			"test123",
		];

		for (const namespace of validNamespaces) {
			await expect(
				createDatapackStructure({
					minecraftVersion: "1.21",
					namespace,
				}),
			).resolves.toBeDefined();
		}
	});

	it("should generate pack.mcmeta for known version", async () => {
		const { getPackFormatWithFallback } = await import(
			"../utils/versionMapping.js"
		);
		vi.mocked(getPackFormatWithFallback).mockResolvedValue({
			mapping: mockMapping121,
			isKnown: true,
			normalizedVersion: "1.21",
			source: "hardcoded",
		});

		const result = await createDatapackStructure({
			minecraftVersion: "1.21",
			namespace: "my_pack",
			description: "Test Pack",
		});

		expect(result.content).toHaveLength(1);
		const content = JSON.parse(result.content[0].text);

		expect(content.files["pack.mcmeta"]).toBeDefined();
		expect(content.files["pack.mcmeta"].pack.pack_format).toBe(48);
		expect(content.files["pack.mcmeta"].pack.description).toBe("Test Pack");
	});

	it("should generate min/max format for 1.21.9+", async () => {
		const { getPackFormatWithFallback } = await import(
			"../utils/versionMapping.js"
		);
		vi.mocked(getPackFormatWithFallback).mockResolvedValue({
			mapping: mockMapping1219,
			isKnown: true,
			normalizedVersion: "1.21.9",
			source: "hardcoded",
		});

		const result = await createDatapackStructure({
			minecraftVersion: "1.21.9",
			namespace: "test",
		});

		const content = JSON.parse(result.content[0].text);
		expect(content.files["pack.mcmeta"].pack.min_format).toEqual([88, 0]);
		expect(content.files["pack.mcmeta"].pack.max_format).toEqual([88, 0]);
		expect(content.files["pack.mcmeta"].pack.pack_format).toBeUndefined();
	});

	it("should include load setup when requested", async () => {
		const { getPackFormatWithFallback } = await import(
			"../utils/versionMapping.js"
		);
		vi.mocked(getPackFormatWithFallback).mockResolvedValue({
			mapping: mockMapping121,
			isKnown: true,
			normalizedVersion: "1.21",
			source: "hardcoded",
		});

		const result = await createDatapackStructure({
			minecraftVersion: "1.21",
			namespace: "my_pack",
			description: "My Pack",
			features: ["functions"],
			includeLoadSetup: true,
		});

		const content = JSON.parse(result.content[0].text);
		expect(
			content.files["data/minecraft/tag/function/load.json"],
		).toBeDefined();
		expect(content.files["data/my_pack/function/init.mcfunction"]).toContain(
			"My Pack loaded!",
		);
	});

	it("should include schema in output", async () => {
		const { getPackFormatWithFallback } = await import(
			"../utils/versionMapping.js"
		);
		vi.mocked(getPackFormatWithFallback).mockResolvedValue({
			mapping: mockMapping121,
			isKnown: true,
			normalizedVersion: "1.21",
			source: "hardcoded",
		});

		const result = await createDatapackStructure({
			minecraftVersion: "1.21",
			namespace: "test",
		});

		const content = JSON.parse(result.content[0].text);
		expect(content.packMcmetaSchema).toBeDefined();
		expect(content.packMcmetaSchema.$schema).toBe(
			"http://json-schema.org/draft-07/schema#",
		);
	});

	it("should include warnings in output", async () => {
		const { getPackFormatWithFallback } = await import(
			"../utils/versionMapping.js"
		);
		vi.mocked(getPackFormatWithFallback).mockResolvedValue({
			mapping: mockMapping121,
			isKnown: true,
			normalizedVersion: "1.21",
			source: "hardcoded",
		});

		const result = await createDatapackStructure({
			minecraftVersion: "1.21",
			namespace: "test",
		});

		const content = JSON.parse(result.content[0].text);
		expect(content.warnings).toBeDefined();
		expect(Array.isArray(content.warnings)).toBe(true);
	});

	it("should include unknown version warning when falling back", async () => {
		const { getPackFormatWithFallback } = await import(
			"../utils/versionMapping.js"
		);
		vi.mocked(getPackFormatWithFallback).mockResolvedValue({
			mapping: mockMapping121,
			isKnown: false,
			normalizedVersion: "1.99.99",
			latestKnownVersion: "1.21.11",
			source: "fallback",
		});

		const result = await createDatapackStructure({
			minecraftVersion: "1.99.99",
			namespace: "test",
		});

		const content = JSON.parse(result.content[0].text);
		expect(content.warnings.join("\n")).toContain("UNKNOWN VERSION");
		expect(content.warnings.join("\n")).toContain("1.99.99");
	});

	it("should use packFormat to determine version", async () => {
		const { getPackFormatWithFallback } = await import(
			"../utils/versionMapping.js"
		);
		vi.mocked(getPackFormatWithFallback).mockResolvedValue({
			mapping: mockMapping121,
			isKnown: true,
			normalizedVersion: "1.21",
			source: "hardcoded",
		});

		const _result = await createDatapackStructure({
			packFormat: 48,
			namespace: "test",
		});

		expect(getPackFormatWithFallback).toHaveBeenCalledWith("1.21");
	});

	it("should throw error for unknown packFormat", async () => {
		await expect(
			createDatapackStructure({
				packFormat: 9999,
				namespace: "test",
			}),
		).rejects.toThrow("Unknown pack format");
	});

	it("should handle multiple features", async () => {
		const { getPackFormatWithFallback } = await import(
			"../utils/versionMapping.js"
		);
		vi.mocked(getPackFormatWithFallback).mockResolvedValue({
			mapping: mockMapping121,
			isKnown: true,
			normalizedVersion: "1.21",
			source: "hardcoded",
		});

		const result = await createDatapackStructure({
			minecraftVersion: "1.21",
			namespace: "test",
			features: ["functions", "recipes", "loot_tables"],
		});

		expect(result.content).toHaveLength(1);
		const content = JSON.parse(result.content[0].text);
		expect(content.files["pack.mcmeta"]).toBeDefined();
	});

	it("should default to functions feature", async () => {
		const { getPackFormatWithFallback } = await import(
			"../utils/versionMapping.js"
		);
		vi.mocked(getPackFormatWithFallback).mockResolvedValue({
			mapping: mockMapping121,
			isKnown: true,
			normalizedVersion: "1.21",
			source: "hardcoded",
		});

		const result = await createDatapackStructure({
			minecraftVersion: "1.21",
			namespace: "test",
		});

		// Should use default features: ["functions"]
		expect(result.content).toHaveLength(1);
	});
});
