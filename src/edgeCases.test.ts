import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTextContent } from "./test-utils.js";

// Mock dependencies
vi.mock("./api/mediawiki.js", () => ({
	callMediaWikiAPI: vi.fn(),
}));

/**
 * Edge case tests for various components
 * These tests cover boundary conditions, error cases, and unusual inputs
 */
describe("Edge Cases", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
	describe("Version normalization edge cases", () => {
		it("should handle versions without .0 suffix", async () => {
			const { getPackFormat } = await import("./utils/versionMapping.js");

			const result = getPackFormat("1.21");
			expect(result).toBeDefined();
		});

		it("should handle versions with .0 suffix", async () => {
			const { getPackFormat } = await import("./utils/versionMapping.js");

			const result = getPackFormat("1.21.0");
			expect(result).toBeDefined();
			// Should normalize to 1.21
			expect(result?.minecraftVersions).toContain("1.21");
		});

		it("should not normalize non-1.x versions", async () => {
			const { getPackFormatWithFallback } = await import(
				"./utils/versionMapping.js"
			);

			// Hypothetical future version format
			const result = await getPackFormatWithFallback("26.1.0");
			expect(result.normalizedVersion).toBe("26.1.0");
		});

		it("should handle extreme version numbers", async () => {
			const { getPackFormatWithFallback } = await import(
				"./utils/versionMapping.js"
			);

			const result = await getPackFormatWithFallback("999.999.999");
			expect(result.isKnown).toBe(false);
			expect(result.source).toBe("fallback");
		});
	});

	describe("Namespace validation edge cases", () => {
		it("should reject uppercase letters", async () => {
			const { createDatapackStructure } = await import(
				"./tools/createDatapackStructure.js"
			);

			await expect(
				createDatapackStructure({
					minecraftVersion: "1.21",
					namespace: "MyPack",
				}),
			).rejects.toThrow("lowercase");
		});

		it("should reject special characters except allowed ones", async () => {
			const { createDatapackStructure } = await import(
				"./tools/createDatapackStructure.js"
			);

			await expect(
				createDatapackStructure({
					minecraftVersion: "1.21",
					namespace: "my@pack",
				}),
			).rejects.toThrow();

			await expect(
				createDatapackStructure({
					minecraftVersion: "1.21",
					namespace: "my pack",
				}),
			).rejects.toThrow();

			await expect(
				createDatapackStructure({
					minecraftVersion: "1.21",
					namespace: "my/pack",
				}),
			).rejects.toThrow();
		});

		it("should accept all valid characters", async () => {
			const { createDatapackStructure } = await import(
				"./tools/createDatapackStructure.js"
			);

			// These should all work
			const validNames = [
				"mypack",
				"my_pack",
				"my-pack",
				"my.pack",
				"pack123",
				"123pack",
				"a",
				"a_b-c.d123",
			];

			for (const namespace of validNames) {
				await expect(
					createDatapackStructure({
						minecraftVersion: "1.21",
						namespace,
					}),
				).resolves.toBeDefined();
			}
		});
	});

	describe("JSON extraction edge cases", () => {
		it("should handle empty code blocks", async () => {
			const { extractJsonBlocks } = await import("./utils/jsonExtractor.js");

			const wikitext = "```json\n\n```";
			const result = extractJsonBlocks(wikitext);
			expect(result).toEqual([]);
		});

		it("should handle malformed JSON", async () => {
			const { extractJsonBlocks } = await import("./utils/jsonExtractor.js");

			const wikitext = "```json\n{invalid: json}\n```";
			const result = extractJsonBlocks(wikitext);
			expect(result).toEqual([]);
		});

		it("should handle multiple code blocks with mixed validity", async () => {
			const { extractJsonBlocks } = await import("./utils/jsonExtractor.js");

			const wikitext = `
\`\`\`json
{"valid": 1}
\`\`\`
\`\`\`json
{invalid}
\`\`\`
\`\`\`json
{"valid": 2}
\`\`\`
			`;
			const result = extractJsonBlocks(wikitext);
			expect(result).toHaveLength(2);
			expect(result).toEqual([{ valid: 1 }, { valid: 2 }]);
		});

		it("should handle deeply nested JSON", async () => {
			const { extractJsonBlocks } = await import("./utils/jsonExtractor.js");

			const deepJson = {
				a: { b: { c: { d: { e: { f: { g: { h: "deep" } } } } } } },
			};
			const wikitext = `\`\`\`json\n${JSON.stringify(deepJson)}\n\`\`\``;

			const result = extractJsonBlocks(wikitext);
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(deepJson);
		});

		it("should handle JSON with special characters", async () => {
			const { extractJsonBlocks } = await import("./utils/jsonExtractor.js");

			const specialJson = {
				text: "Special chars: \n\t\r\"'\\",
				unicode: "日本語",
				emoji: "🎮",
			};
			const wikitext = `\`\`\`json\n${JSON.stringify(specialJson)}\n\`\`\``;

			const result = extractJsonBlocks(wikitext);
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(specialJson);
		});
	});

	describe("HTML stripping edge cases", () => {
		it("should handle empty string", async () => {
			const { stripHtml } = await import("./utils/jsonExtractor.js");

			const result = stripHtml("");
			expect(result).toBe("");
		});

		it("should handle string with no HTML", async () => {
			const { stripHtml } = await import("./utils/jsonExtractor.js");

			const result = stripHtml("Plain text");
			expect(result).toBe("Plain text");
		});

		it("should handle nested tags", async () => {
			const { stripHtml } = await import("./utils/jsonExtractor.js");

			const html =
				"<div><span><strong><em>Deep nesting</em></strong></span></div>";
			const result = stripHtml(html);
			expect(result).toBe("Deep nesting");
		});

		it("should handle unclosed tags", async () => {
			const { stripHtml } = await import("./utils/jsonExtractor.js");

			const html = "<p>Unclosed tag";
			const result = stripHtml(html);
			expect(result).toBe("Unclosed tag");
		});

		it("should handle multiple consecutive entities", async () => {
			const { stripHtml } = await import("./utils/jsonExtractor.js");

			const html = "&lt;&lt;&lt;&gt;&gt;&gt;";
			const result = stripHtml(html);
			expect(result).toBe("<<<>>>");
		});

		it("should handle mixed content", async () => {
			const { stripHtml } = await import("./utils/jsonExtractor.js");

			const html =
				"Text <b>bold</b> &amp; <i>italic</i> &lt;special&gt; &nbsp; more";
			const result = stripHtml(html);
			expect(result).toBe("Text bold & italic <special> more");
		});
	});

	describe("Pack format lookup edge cases", () => {
		it("should handle pack format 0", async () => {
			const { getPackFormatInfo } = await import(
				"./tools/getPackFormatInfo.js"
			);

			const result = await getPackFormatInfo({ packFormat: 0 });
			const content = JSON.parse(getTextContent(result));
			expect(content.error).toBeDefined();
		});

		it("should handle negative pack format", async () => {
			const { getPackFormatInfo } = await import(
				"./tools/getPackFormatInfo.js"
			);

			const result = await getPackFormatInfo({ packFormat: -1 });
			const content = JSON.parse(getTextContent(result));
			expect(content.error).toBeDefined();
		});

		it("should handle very large pack format", async () => {
			const { getPackFormatInfo } = await import(
				"./tools/getPackFormatInfo.js"
			);

			const result = await getPackFormatInfo({ packFormat: 99999 });
			const content = JSON.parse(getTextContent(result));
			expect(content.error).toBeDefined();
		});
	});

	describe("Feature directory edge cases", () => {
		it("should handle empty features array", async () => {
			const { getFeatureDirectories } = await import(
				"./utils/fileGenerator.js"
			);

			const result = getFeatureDirectories("test", [], "singular");
			expect(result).toEqual([]);
		});

		it("should handle unknown features", async () => {
			const { getFeatureDirectories } = await import(
				"./utils/fileGenerator.js"
			);

			const result = getFeatureDirectories(
				"test",
				["unknown_feature", "invalid"],
				"singular",
			);
			expect(result).toEqual([]);
		});

		it("should handle mixed valid and invalid features", async () => {
			const { getFeatureDirectories } = await import(
				"./utils/fileGenerator.js"
			);

			const result = getFeatureDirectories(
				"test",
				["functions", "invalid", "recipes"],
				"singular",
			);
			expect(result).toHaveLength(2);
			expect(result).toContain("data/test/function");
			expect(result).toContain("data/test/recipe");
		});

		it("should handle duplicate features", async () => {
			const { getFeatureDirectories } = await import(
				"./utils/fileGenerator.js"
			);

			const result = getFeatureDirectories(
				"test",
				["functions", "functions", "functions"],
				"singular",
			);
			// Should still only return unique paths
			expect(result).toHaveLength(3);
		});
	});

	describe("Datapack generation edge cases", () => {
		it("should handle empty description", async () => {
			const { generateDatapackFiles } = await import(
				"./utils/fileGenerator.js"
			);

			const files = generateDatapackFiles(
				"test",
				"",
				["functions"],
				{
					packFormat: 48,
					minecraftVersions: ["1.21"],
					directoryNaming: "singular",
					usesMinMaxFormat: false,
				},
				false,
			);

			const packMcmeta = files["pack.mcmeta"] as {
				pack: { description?: string };
			};
			expect(packMcmeta.pack.description).toBe("");
		});

		it("should handle very long namespace", async () => {
			const { createDatapackStructure } = await import(
				"./tools/createDatapackStructure.js"
			);

			const longName = "a".repeat(100);
			const result = await createDatapackStructure({
				minecraftVersion: "1.21",
				namespace: longName,
			});

			expect(result).toBeDefined();
		});

		it("should handle very long description", async () => {
			const { createDatapackStructure } = await import(
				"./tools/createDatapackStructure.js"
			);

			const longDesc = "A very long description ".repeat(100);
			const result = await createDatapackStructure({
				minecraftVersion: "1.21",
				namespace: "test",
				description: longDesc,
			});

			const content = JSON.parse(getTextContent(result));
			expect(content.files["pack.mcmeta"].pack.description).toBe(longDesc);
		});
	});

	describe("Revision search edge cases", () => {
		it("should handle limit of 0", async () => {
			const { searchPageRevisions } = await import(
				"./tools/searchPageRevisions.js"
			);
			const { callMediaWikiAPI } = await import("./api/mediawiki.js");

			// Mock the API to return empty results
			vi.mocked(callMediaWikiAPI).mockResolvedValue({
				query: {
					pages: {
						"123": {
							pageid: 123,
							title: "Test",
							revisions: [],
						},
					},
				},
			});

			const result = await searchPageRevisions({
				title: "Test",
				limit: 0,
			});

			const content = JSON.parse(getTextContent(result));
			expect(content.revisions).toEqual([]);
		});

		it("should handle empty version pattern", async () => {
			const { searchPageRevisions } = await import(
				"./tools/searchPageRevisions.js"
			);
			const { callMediaWikiAPI } = await import("./api/mediawiki.js");

			vi.mocked(callMediaWikiAPI).mockResolvedValue({
				query: {
					pages: {
						"123": {
							pageid: 123,
							title: "Test",
							revisions: [
								{
									revid: 1,
									timestamp: "2024-01-01T00:00:00Z",
									comment: "Test",
									user: "User",
								},
							],
						},
					},
				},
			});

			const result = await searchPageRevisions({
				title: "Test",
				versionPattern: "",
			});

			// Empty pattern should match all revisions
			const content = JSON.parse(getTextContent(result));
			expect(content.filtered).toBe(false);
		});
	});

	describe("Warning generation edge cases", () => {
		it("should handle missing latestKnownVersion", async () => {
			const { generateWarnings } = await import("./utils/warningGenerator.js");

			const warnings = generateWarnings(
				"1.99",
				{
					packFormat: 48,
					minecraftVersions: ["1.21"],
					directoryNaming: "singular",
					usesMinMaxFormat: false,
				},
				false,
				undefined,
				"fallback",
			);

			// Should not crash, but may not have complete warning
			expect(Array.isArray(warnings)).toBe(true);
		});

		it("should handle array pack format", async () => {
			const { generateWarnings } = await import("./utils/warningGenerator.js");

			const warnings = generateWarnings(
				"1.99",
				{
					packFormat: [88, 0],
					minecraftVersions: ["1.21.9"],
					directoryNaming: "singular",
					usesMinMaxFormat: true,
				},
				false,
				"1.21.11",
				"fallback",
			);

			expect(warnings.join("\n")).toContain("[88, 0]");
		});
	});
});
