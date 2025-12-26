import { beforeEach, describe, expect, it, vi } from "vitest";
import { compareVersions } from "./compareVersions.js";

// Mock dependencies
vi.mock("../api/mediawiki.js", () => ({
	callMediaWikiAPI: vi.fn(),
}));

describe("compareVersions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should require title parameter", async () => {
		await expect(
			compareVersions({
				title: "",
				version1: "1.20",
				version2: "1.21",
			}),
		).rejects.toThrow("title is required");
	});

	it("should require version1 parameter", async () => {
		await expect(
			compareVersions({
				title: "Pack format",
				version1: "",
				version2: "1.21",
			}),
		).rejects.toThrow("version1 is required");
	});

	it("should require version2 parameter", async () => {
		await expect(
			compareVersions({
				title: "Pack format",
				version1: "1.20",
				version2: "",
			}),
		).rejects.toThrow("version2 is required");
	});

	it("should find revisions for both versions", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");

		// Mock revision list for version1
		vi.mocked(callMediaWikiAPI)
			.mockResolvedValueOnce({
				query: {
					pages: {
						"123": {
							pageid: 123,
							title: "Pack format",
							revisions: [
								{
									revid: 1000,
									timestamp: "2024-01-01T00:00:00Z",
									comment: "Updated for 1.20",
									user: "User1",
								},
							],
						},
					},
				},
			})
			// Mock revision list for version2
			.mockResolvedValueOnce({
				query: {
					pages: {
						"123": {
							pageid: 123,
							title: "Pack format",
							revisions: [
								{
									revid: 2000,
									timestamp: "2024-02-01T00:00:00Z",
									comment: "Updated for 1.21",
									user: "User2",
								},
							],
						},
					},
				},
			})
			// Mock parse for version1
			.mockResolvedValueOnce({
				parse: {
					title: "Pack format",
					pageid: 123,
					revid: 1000,
					wikitext: { "*": '```json\n{"format": 15}\n```' },
				},
			})
			// Mock parse for version2
			.mockResolvedValueOnce({
				parse: {
					title: "Pack format",
					pageid: 123,
					revid: 2000,
					wikitext: { "*": '```json\n{"format": 48}\n```' },
				},
			});

		const result = await compareVersions({
			title: "Pack format",
			version1: "1.20",
			version2: "1.21",
		});

		const content = JSON.parse(result.content[0].text);
		expect(content.version1.revision).toBeDefined();
		expect(content.version2.revision).toBeDefined();
		expect(content.version1.revision.revisionId).toBe(1000);
		expect(content.version2.revision.revisionId).toBe(2000);
	});

	it("should compare JSON differences", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");

		vi.mocked(callMediaWikiAPI)
			.mockResolvedValueOnce({
				query: {
					pages: {
						"123": {
							pageid: 123,
							title: "Recipe",
							revisions: [
								{
									revid: 1000,
									timestamp: "2024-01-01T00:00:00Z",
									comment: "1.20",
									user: "User",
								},
								{
									revid: 2000,
									timestamp: "2024-02-01T00:00:00Z",
									comment: "1.21",
									user: "User",
								},
							],
						},
					},
				},
			})
			.mockResolvedValueOnce({
				parse: {
					title: "Recipe",
					pageid: 123,
					revid: 1000,
					wikitext: { "*": '```json\n{"type": "crafting", "count": 1}\n```' },
				},
			})
			.mockResolvedValueOnce({
				parse: {
					title: "Recipe",
					pageid: 123,
					revid: 2000,
					wikitext: {
						"*": '```json\n{"type": "crafting", "count": 1, "category": "misc"}\n```',
					},
				},
			});

		const result = await compareVersions({
			title: "Recipe",
			version1: "1.20",
			version2: "1.21",
		});

		const content = JSON.parse(result.content[0].text);
		expect(content.jsonDiffs).toBeDefined();
		expect(content.summary).toBeDefined();
	});

	it("should handle version not found", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");

		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			query: {
				pages: {
					"123": {
						pageid: 123,
						title: "Test",
						revisions: [
							{
								revid: 1000,
								timestamp: "2024-01-01T00:00:00Z",
								comment: "Some other change",
								user: "User",
							},
						],
					},
				},
			},
		});

		const result = await compareVersions({
			title: "Test",
			version1: "1.99",
			version2: "2.00",
		});

		const content = JSON.parse(result.content[0].text);
		expect(content.version1.revision).toBeNull();
		expect(content.version2.revision).toBeNull();
	});

	it("should handle page not found", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");

		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			query: {
				pages: {
					"-1": {
						title: "NonExistent",
						missing: true,
					},
				},
			},
		});

		const result = await compareVersions({
			title: "NonExistent",
			version1: "1.20",
			version2: "1.21",
		});

		const content = JSON.parse(result.content[0].text);
		expect(content.version1.revision).toBeNull();
		expect(content.version2.revision).toBeNull();
	});

	it("should support regex patterns", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");

		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			query: {
				pages: {
					"123": {
						pageid: 123,
						title: "Test",
						revisions: [
							{
								revid: 1000,
								timestamp: "2024-01-01T00:00:00Z",
								comment: "Version 1.20.5",
								user: "User",
							},
						],
					},
				},
			},
		});

		const result = await compareVersions({
			title: "Test",
			version1: "1\\.20\\.",
			version2: "1\\.21\\.",
		});

		const content = JSON.parse(result.content[0].text);
		expect(content.version1.pattern).toBe("1\\.20\\.");
		expect(content.version1.revision).toBeDefined();
	});

	it("should handle empty JSON blocks", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");

		vi.mocked(callMediaWikiAPI)
			// Mock revision list for version1
			.mockResolvedValueOnce({
				query: {
					pages: {
						"123": {
							pageid: 123,
							title: "Test",
							revisions: [
								{
									revid: 1000,
									timestamp: "2024-01-01T00:00:00Z",
									comment: "1.20",
									user: "User",
								},
							],
						},
					},
				},
			})
			// Mock revision list for version2
			.mockResolvedValueOnce({
				query: {
					pages: {
						"123": {
							pageid: 123,
							title: "Test",
							revisions: [
								{
									revid: 2000,
									timestamp: "2024-02-01T00:00:00Z",
									comment: "1.21",
									user: "User",
								},
							],
						},
					},
				},
			})
			.mockResolvedValueOnce({
				parse: {
					title: "Test",
					pageid: 123,
					revid: 1000,
					wikitext: { "*": "No JSON here" },
				},
			})
			.mockResolvedValueOnce({
				parse: {
					title: "Test",
					pageid: 123,
					revid: 2000,
					wikitext: { "*": "Still no JSON" },
				},
			});

		const result = await compareVersions({
			title: "Test",
			version1: "1.20",
			version2: "1.21",
		});

		const content = JSON.parse(result.content[0].text);
		expect(content.jsonDiffs).toEqual([]);
		expect(content.summary).toContain("No JSON format changes");
	});
});
