import { describe, expect, it } from "vitest";
import type { PackFormatMapping } from "../types.js";
import { generateWarnings } from "./warningGenerator.js";

describe("warningGenerator", () => {
	describe("generateWarnings", () => {
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

		const mockMapping1202: PackFormatMapping = {
			packFormat: 18,
			minecraftVersions: ["1.20.2"],
			directoryNaming: "plural",
			usesMinMaxFormat: false,
		};

		const mockMapping1219: PackFormatMapping = {
			packFormat: [88, 0],
			minecraftVersions: ["1.21.9", "1.21.10"],
			directoryNaming: "singular",
			usesMinMaxFormat: true,
		};

		it("should warn about unknown versions with fallback", () => {
			const warnings = generateWarnings(
				"1.99.99",
				mockMapping121,
				false,
				"1.21.11",
				"fallback",
			);

			expect(warnings.length).toBeGreaterThan(0);
			expect(warnings.join("\n")).toContain("UNKNOWN VERSION");
			expect(warnings.join("\n")).toContain("1.99.99");
			expect(warnings.join("\n")).toContain("1.21.11");
		});

		it("should provide pre-release notation tips for unknown versions", () => {
			const warnings = generateWarnings(
				"1.99.99",
				mockMapping121,
				false,
				"1.21.11",
				"fallback",
			);

			const warningText = warnings.join("\n");
			expect(warningText).toContain("Pre-Release:");
			expect(warningText).toContain("-pre1");
			expect(warningText).toContain("Snapshot:");
			expect(warningText).toContain("-snap1");
			expect(warningText).toContain("Release Candidate:");
			expect(warningText).toContain("-rc1");
		});

		it("should warn about singular directory naming for 1.21+", () => {
			const warnings = generateWarnings(
				"1.21",
				mockMapping121,
				true,
				undefined,
				"hardcoded",
			);

			const warningText = warnings.join("\n");
			expect(warningText).toContain("singular directory names");
			expect(warningText).toContain("function/");
			expect(warningText).toContain("NOT functions/");
			expect(warningText).toContain("recipe/");
			expect(warningText).toContain("NOT recipes/");
		});

		it("should not warn about directory naming for pre-1.21", () => {
			const warnings = generateWarnings(
				"1.20",
				mockMapping120,
				true,
				undefined,
				"hardcoded",
			);

			const warningText = warnings.join("\n");
			expect(warningText).not.toContain("singular directory names");
		});

		it("should warn about min/max format for 1.21.9+", () => {
			const warnings = generateWarnings(
				"1.21.9",
				mockMapping1219,
				true,
				undefined,
				"hardcoded",
			);

			const warningText = warnings.join("\n");
			expect(warningText).toContain("min_format/max_format");
			expect(warningText).toContain("instead of pack_format");
		});

		it("should warn about supported_formats deprecation for 1.21.9+", () => {
			const warnings = generateWarnings(
				"1.21.9",
				mockMapping1219,
				true,
				undefined,
				"hardcoded",
			);

			const warningText = warnings.join("\n");
			expect(warningText).toContain("supported_formats is deprecated");
		});

		it("should inform about supported_formats availability for 1.20.2-1.21.8", () => {
			const warnings = generateWarnings(
				"1.20.2",
				mockMapping1202,
				true,
				undefined,
				"hardcoded",
			);

			const warningText = warnings.join("\n");
			expect(warningText).toContain("supported_formats");
			expect(warningText).toContain("compatibility ranges");
		});

		it("should not warn about supported_formats for pre-1.20.2", () => {
			const warnings = generateWarnings(
				"1.20",
				mockMapping120,
				true,
				undefined,
				"hardcoded",
			);

			const warningText = warnings.join("\n");
			expect(warningText).not.toContain("supported_formats");
		});

		it("should add wiki source info for wiki-sourced data", () => {
			const warnings = generateWarnings(
				"1.21.9",
				mockMapping1219,
				true,
				undefined,
				"wiki",
			);

			const warningText = warnings.join("\n");
			expect(warningText).toContain("retrieved from Minecraft Wiki");
			expect(warningText).toContain("development version");
		});

		it("should not add wiki source info for hardcoded data", () => {
			const warnings = generateWarnings(
				"1.21",
				mockMapping121,
				true,
				undefined,
				"hardcoded",
			);

			const warningText = warnings.join("\n");
			expect(warningText).not.toContain("retrieved from Minecraft Wiki");
		});

		it("should return early for unknown versions without other warnings", () => {
			const warnings = generateWarnings(
				"1.99.99",
				mockMapping121,
				false,
				"1.21.11",
				"fallback",
			);

			const warningText = warnings.join("\n");
			// Should only have unknown version warnings, not version-specific ones
			expect(warningText).toContain("UNKNOWN VERSION");
			// The directory naming warning should not appear after unknown version warning
			const unknownIndex = warningText.indexOf("UNKNOWN VERSION");
			const directoryIndex = warningText.indexOf("singular directory");
			if (directoryIndex !== -1) {
				expect(directoryIndex).toBeLessThan(unknownIndex);
			}
		});

		it("should handle array pack format in warning text", () => {
			const warnings = generateWarnings(
				"1.99.99",
				mockMapping1219,
				false,
				"1.21.11",
				"fallback",
			);

			const warningText = warnings.join("\n");
			expect(warningText).toContain("[88, 0]");
		});

		it("should handle single pack format in warning text", () => {
			const warnings = generateWarnings(
				"1.99.99",
				mockMapping121,
				false,
				"1.21.11",
				"fallback",
			);

			const warningText = warnings.join("\n");
			expect(warningText).toContain("48");
		});

		it("should provide verification methods for unknown versions", () => {
			const warnings = generateWarnings(
				"1.99.99",
				mockMapping121,
				false,
				"1.21.11",
				"fallback",
			);

			const warningText = warnings.join("\n");
			expect(warningText).toContain("verify manually");
			expect(warningText).toContain("release notes");
			expect(warningText).toContain("/reload");
			expect(warningText).toContain("get_wiki_page");
		});

		it("should return empty array for known version without special features", () => {
			const mapping113: PackFormatMapping = {
				packFormat: 4,
				minecraftVersions: ["1.13"],
				directoryNaming: "plural",
				usesMinMaxFormat: false,
			};

			const warnings = generateWarnings(
				"1.13",
				mapping113,
				true,
				undefined,
				"hardcoded",
			);

			// Should have no warnings for basic old version
			expect(warnings).toEqual([]);
		});
	});
});
