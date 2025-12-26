import { beforeEach, describe, expect, it, vi } from "vitest";
import { callMediaWikiAPI } from "../api/mediawiki.js";
import type { PackFormatMapping } from "../types.js";
import {
	clearWikiCache,
	getDirectoryNames,
	getPackFormat,
	getPackFormatWithFallback,
	KNOWN_PACK_FORMATS,
} from "./versionMapping.js";

// Mock the MediaWiki API
vi.mock("../api/mediawiki.js", () => ({
	callMediaWikiAPI: vi.fn(),
}));

describe("versionMapping", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearWikiCache(); // Clear cache before each test
	});

	describe("getPackFormat", () => {
		it("should return pack format for known version", () => {
			const result = getPackFormat("1.21.2");
			expect(result).toBeDefined();
			expect(result?.packFormat).toBe(57);
			expect(result?.directoryNaming).toBe("singular");
		});

		it("should return pack format for version with .0 suffix", () => {
			const result = getPackFormat("1.21.0");
			expect(result).toBeDefined();
			expect(result?.packFormat).toBe(48);
		});

		it("should return pack format for version range", () => {
			const result = getPackFormat("1.21.1");
			expect(result).toBeDefined();
			expect(result?.packFormat).toBe(48);
		});

		it("should handle plural directory naming for older versions", () => {
			const result = getPackFormat("1.20.5");
			expect(result).toBeDefined();
			expect(result?.packFormat).toBe(41);
			expect(result?.directoryNaming).toBe("plural");
		});

		it("should return null for unknown version", () => {
			const result = getPackFormat("1.99.99");
			expect(result).toBeNull();
		});

		it("should handle Pre-Release notation", () => {
			const result = getPackFormat("1.21 Pre-Release 1");
			// This should normalize to "1.21-pre1" but won't match any known version
			expect(result).toBeNull();
		});

		it("should handle Snapshot notation", () => {
			const result = getPackFormat("1.20 Snapshot 1");
			expect(result).toBeNull();
		});

		it("should handle Release Candidate notation", () => {
			const result = getPackFormat("1.21 Release Candidate 1");
			expect(result).toBeNull();
		});

		it("should handle min/max format versions", () => {
			const result = getPackFormat("1.21.9");
			expect(result).toBeDefined();
			expect(result?.packFormat).toEqual([88, 0]);
			expect(result?.usesMinMaxFormat).toBe(true);
		});

		it("should handle all versions in a pack format range", () => {
			const mapping = KNOWN_PACK_FORMATS.find((pf) => pf.packFormat === 48);
			expect(mapping).toBeDefined();
			expect(mapping?.minecraftVersions).toContain("1.21");
			expect(mapping?.minecraftVersions).toContain("1.21.1");

			const result1 = getPackFormat("1.21");
			const result2 = getPackFormat("1.21.1");
			expect(result1).toEqual(result2);
		});
	});

	describe("getPackFormatWithFallback", () => {
		it("should return known version from hardcoded list", async () => {
			const result = await getPackFormatWithFallback("1.21.2");
			expect(result.isKnown).toBe(true);
			expect(result.source).toBe("hardcoded");
			expect(result.mapping.packFormat).toBe(57);
			expect(result.normalizedVersion).toBe("1.21.2");
		});

		it("should normalize version 1.21.0 to 1.21", async () => {
			const result = await getPackFormatWithFallback("1.21.0");
			expect(result.normalizedVersion).toBe("1.21");
			expect(result.isKnown).toBe(true);
			expect(result.mapping.packFormat).toBe(48);
		});

		it("should fallback to latest version for unknown version", async () => {
			const result = await getPackFormatWithFallback("1.99.99");
			expect(result.isKnown).toBe(false);
			expect(result.source).toBe("fallback");
			expect(result.latestKnownVersion).toBe(
				KNOWN_PACK_FORMATS[0].minecraftVersions[0],
			);
			expect(result.mapping).toEqual(KNOWN_PACK_FORMATS[0]);
		});

		it("should normalize Pre-Release notation", async () => {
			const result = await getPackFormatWithFallback("1.21.11 Pre-Release 1");
			expect(result.normalizedVersion).toBe("1.21.11-pre1");
			// Will fallback since -pre1 is not in known versions
			expect(result.isKnown).toBe(false);
		});

		it("should normalize Snapshot notation", async () => {
			const result = await getPackFormatWithFallback("26.1 Snapshot 1");
			expect(result.normalizedVersion).toBe("26.1-snap1");
		});

		it("should normalize RC notation", async () => {
			const result = await getPackFormatWithFallback("1.21 RC 1");
			expect(result.normalizedVersion).toBe("1.21-rc1");
		});

		it("should return latest version info when falling back", async () => {
			const result = await getPackFormatWithFallback("2.0.0");
			expect(result.isKnown).toBe(false);
			expect(result.latestKnownVersion).toBeDefined();
			expect(result.source).toBe("fallback");
		});

		it("should use Wiki lookup when hardcoded version not found", async () => {
			const mockWikiResponse = {
				parse: {
					text: `
						<table class="wikitable">
							<tr>
								<th>Value</th>
								<th>Versions</th>
							</tr>
							<tr>
								<td>100</td>
								<td>1.99.99</td>
							</tr>
						</table>
					`,
				},
			};

			vi.mocked(callMediaWikiAPI).mockResolvedValueOnce(mockWikiResponse);

			const result = await getPackFormatWithFallback("1.99.99");
			expect(result.isKnown).toBe(true);
			expect(result.source).toBe("wiki");
			expect(result.mapping.packFormat).toBe(100);
		});

		it("should fallback when Wiki lookup fails", async () => {
			vi.mocked(callMediaWikiAPI).mockRejectedValueOnce(
				new Error("Network error"),
			);

			const consoleErrorSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			const result = await getPackFormatWithFallback("1.99.99");
			expect(result.isKnown).toBe(false);
			expect(result.source).toBe("fallback");
			// parseWikiPackFormats catches the error and logs it
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"Failed to parse Wiki pack formats:",
				expect.any(Error),
			);

			consoleErrorSpy.mockRestore();
		});

		it("should handle parseWikiPackFormats invalid response", async () => {
			vi.mocked(callMediaWikiAPI).mockResolvedValueOnce(null);

			const consoleErrorSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			const result = await getPackFormatWithFallback("1.99.99");
			expect(result.isKnown).toBe(false);
			expect(result.source).toBe("fallback");
			// parseWikiPackFormats throws "Invalid API response" error which is caught
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"Failed to parse Wiki pack formats:",
				expect.any(Error),
			);

			consoleErrorSpy.mockRestore();
		});

		it("should handle Wiki response with min/max format", async () => {
			const mockWikiResponse = {
				parse: {
					text: `
						<table class="wikitable">
							<tr>
								<th>Value</th>
								<th>Versions</th>
							</tr>
							<tr>
								<td>99.5</td>
								<td>1.99.99, 1.99.100</td>
							</tr>
						</table>
					`,
				},
			};

			vi.mocked(callMediaWikiAPI).mockResolvedValueOnce(mockWikiResponse);

			const result = await getPackFormatWithFallback("1.99.99");
			expect(result.isKnown).toBe(true);
			expect(result.source).toBe("wiki");
			expect(result.mapping.packFormat).toEqual([99, 5]);
			expect(result.mapping.usesMinMaxFormat).toBe(true);
		});

		it("should parse version ranges from Wiki", async () => {
			const mockWikiResponse = {
				parse: {
					text: `
						<table class="wikitable">
							<tr>
								<th>Value</th>
								<th>Versions</th>
							</tr>
							<tr>
								<td>42</td>
								<td>1.18.5 – 1.18.8</td>
							</tr>
						</table>
					`,
				},
			};

			vi.mocked(callMediaWikiAPI).mockResolvedValueOnce(mockWikiResponse);

			const result = await getPackFormatWithFallback("1.18.5");
			expect(result.isKnown).toBe(true);
			expect(result.mapping.minecraftVersions).toContain("1.18.5");
			expect(result.mapping.minecraftVersions).toContain("1.18.8");
		});

		it("should handle snapshot versions in Wiki data", async () => {
			const mockWikiResponse = {
				parse: {
					text: `
						<table class="wikitable">
							<tr>
								<th>Value</th>
								<th>Versions</th>
							</tr>
							<tr>
								<td>99</td>
								<td>25w41a, 25w42a</td>
							</tr>
						</table>
					`,
				},
			};

			vi.mocked(callMediaWikiAPI).mockResolvedValueOnce(mockWikiResponse);

			const result = await getPackFormatWithFallback("25w41a");
			expect(result.isKnown).toBe(true);
			expect(result.mapping.minecraftVersions).toContain("25w41a");
			expect(result.mapping.minecraftVersions).toContain("25w42a");
		});

		it("should skip invalid Wiki table rows", async () => {
			const mockWikiResponse = {
				parse: {
					text: `
						<table class="wikitable">
							<tr>
								<th>Value</th>
								<th>Versions</th>
							</tr>
							<tr>
								<td>invalid</td>
								<td>1.99.99</td>
							</tr>
							<tr>
								<td>100</td>
								<td>no valid version here</td>
							</tr>
							<tr>
								<td>101</td>
								<td>1.99.99</td>
							</tr>
						</table>
					`,
				},
			};

			vi.mocked(callMediaWikiAPI).mockResolvedValueOnce(mockWikiResponse);

			const result = await getPackFormatWithFallback("1.99.99");
			expect(result.isKnown).toBe(true);
			expect(result.mapping.packFormat).toBe(101);
		});

		it("should handle Wiki tables without correct headers", async () => {
			const mockWikiResponse = {
				parse: {
					text: `
						<table class="wikitable">
							<tr>
								<th>Wrong</th>
								<th>Headers</th>
							</tr>
							<tr>
								<td>100</td>
								<td>1.99.99</td>
							</tr>
						</table>
						<table class="wikitable">
							<tr>
								<th>Value</th>
								<th>Versions</th>
							</tr>
							<tr>
								<td>101</td>
								<td>1.99.99</td>
							</tr>
						</table>
					`,
				},
			};

			vi.mocked(callMediaWikiAPI).mockResolvedValueOnce(mockWikiResponse);

			const result = await getPackFormatWithFallback("1.99.99");
			expect(result.isKnown).toBe(true);
			expect(result.mapping.packFormat).toBe(101);
		});

		it("should handle invalid API response", async () => {
			vi.mocked(callMediaWikiAPI).mockResolvedValueOnce(null);

			const consoleErrorSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			const result = await getPackFormatWithFallback("1.99.99");
			expect(result.isKnown).toBe(false);
			expect(result.source).toBe("fallback");

			consoleErrorSpy.mockRestore();
		});

		it("should handle missing page content in API response", async () => {
			const mockWikiResponse = {
				parse: {},
			};

			vi.mocked(callMediaWikiAPI).mockResolvedValueOnce(mockWikiResponse);

			const consoleErrorSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			const result = await getPackFormatWithFallback("1.99.99");
			expect(result.isKnown).toBe(false);
			expect(result.source).toBe("fallback");

			consoleErrorSpy.mockRestore();
		});

		it("should cache Wiki responses", async () => {
			const mockWikiResponse = {
				parse: {
					text: `
						<table class="wikitable">
							<tr>
								<th>Value</th>
								<th>Versions</th>
							</tr>
							<tr>
								<td>100</td>
								<td>1.99.99</td>
							</tr>
						</table>
					`,
				},
			};

			vi.mocked(callMediaWikiAPI).mockResolvedValueOnce(mockWikiResponse);

			// First call - should fetch from Wiki
			const result1 = await getPackFormatWithFallback("1.99.99");
			expect(result1.source).toBe("wiki");

			// Second call - should use cache (callMediaWikiAPI should only be called once)
			const result2 = await getPackFormatWithFallback("1.99.99");
			expect(result2.source).toBe("wiki");

			expect(callMediaWikiAPI).toHaveBeenCalledTimes(1);
		});

		it("should determine directory naming based on version", async () => {
			const mockWikiResponse121 = {
				parse: {
					text: `
						<table class="wikitable">
							<tr>
								<th>Value</th>
								<th>Versions</th>
							</tr>
							<tr>
								<td>100</td>
								<td>1.21.99</td>
							</tr>
						</table>
					`,
				},
			};

			const mockWikiResponse120 = {
				parse: {
					text: `
						<table class="wikitable">
							<tr>
								<th>Value</th>
								<th>Versions</th>
							</tr>
							<tr>
								<td>99</td>
								<td>1.20.99</td>
							</tr>
						</table>
					`,
				},
			};

			vi.mocked(callMediaWikiAPI).mockResolvedValueOnce(mockWikiResponse121);
			const result121 = await getPackFormatWithFallback("1.21.99");
			expect(result121.mapping.directoryNaming).toBe("singular");

			// Clear cache to ensure fresh fetch for 1.20.99
			clearWikiCache();
			vi.mocked(callMediaWikiAPI).mockResolvedValueOnce(mockWikiResponse120);
			const result120 = await getPackFormatWithFallback("1.20.99");
			expect(result120.mapping.directoryNaming).toBe("plural");
		});
	});

	describe("getDirectoryNames", () => {
		it("should return singular directory names for 1.21+", () => {
			const dirs = getDirectoryNames("singular");
			expect(dirs.loot_table).toBe("loot_table");
			expect(dirs.function).toBe("function");
			expect(dirs.recipe).toBe("recipe");
			expect(dirs.advancement).toBe("advancement");
		});

		it("should return plural directory names for pre-1.21", () => {
			const dirs = getDirectoryNames("plural");
			expect(dirs.loot_tables).toBe("loot_tables");
			expect(dirs.functions).toBe("functions");
			expect(dirs.recipes).toBe("recipes");
			expect(dirs.advancements).toBe("advancements");
		});

		it("should include all required directory types", () => {
			const singular = getDirectoryNames("singular");
			const plural = getDirectoryNames("plural");

			// Check common directories exist
			expect(singular).toHaveProperty("function");
			expect(plural).toHaveProperty("functions");

			expect(singular).toHaveProperty("predicate");
			expect(plural).toHaveProperty("predicates");

			expect(singular).toHaveProperty("dimension");
			expect(plural).toHaveProperty("dimension");
		});

		it("should handle tag directories", () => {
			const singular = getDirectoryNames("singular");
			const plural = getDirectoryNames("plural");

			expect(singular["tag/function"]).toBe("tag/function");
			expect(plural["tags/functions"]).toBe("tags/functions");
		});
	});

	describe("KNOWN_PACK_FORMATS edge cases", () => {
		it("should have formats sorted newest first", () => {
			for (let i = 0; i < KNOWN_PACK_FORMATS.length - 1; i++) {
				const current = KNOWN_PACK_FORMATS[i];
				const next = KNOWN_PACK_FORMATS[i + 1];

				const currentFormat = Array.isArray(current.packFormat)
					? current.packFormat[0] * 100 + current.packFormat[1]
					: current.packFormat;
				const nextFormat = Array.isArray(next.packFormat)
					? next.packFormat[0] * 100 + next.packFormat[1]
					: next.packFormat;

				expect(currentFormat).toBeGreaterThan(nextFormat);
			}
		});

		it("should have all 1.21+ versions use singular naming", () => {
			const post121Versions = KNOWN_PACK_FORMATS.filter((pf) =>
				pf.minecraftVersions.some((v) => {
					const match = v.match(/^1\.(\d+)/);
					return match && Number.parseInt(match[1], 10) >= 21;
				}),
			);

			for (const mapping of post121Versions) {
				expect(mapping.directoryNaming).toBe("singular");
			}
		});

		it("should have all pre-1.21 versions use plural naming", () => {
			const pre121Versions = KNOWN_PACK_FORMATS.filter((pf) =>
				pf.minecraftVersions.every((v) => {
					const match = v.match(/^1\.(\d+)/);
					return match && Number.parseInt(match[1], 10) < 21;
				}),
			);

			for (const mapping of pre121Versions) {
				expect(mapping.directoryNaming).toBe("plural");
			}
		});

		it("should have 1.21.9+ versions use min/max format", () => {
			const minMaxVersions = KNOWN_PACK_FORMATS.filter(
				(pf) => pf.usesMinMaxFormat,
			);

			for (const mapping of minMaxVersions) {
				expect(Array.isArray(mapping.packFormat)).toBe(true);
			}
		});

		it("should not have duplicate versions across mappings", () => {
			const allVersions = new Map<string, PackFormatMapping>();

			for (const mapping of KNOWN_PACK_FORMATS) {
				for (const version of mapping.minecraftVersions) {
					if (allVersions.has(version)) {
						throw new Error(
							`Duplicate version ${version} found in KNOWN_PACK_FORMATS`,
						);
					}
					allVersions.set(version, mapping);
				}
			}
		});
	});
});
