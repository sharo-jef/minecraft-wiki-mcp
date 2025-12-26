import { beforeEach, describe, expect, it, vi } from "vitest";
import { PageNotFoundError } from "../types.js";
import { getWikiPage } from "./getWikiPage.js";

// Mock dependencies
vi.mock("../api/mediawiki.js", () => ({
	callMediaWikiAPI: vi.fn(),
	findNearestRevision: vi.fn(),
	searchSimilarPages: vi.fn(),
}));

vi.mock("../utils/cache.js", () => ({
	cache: {
		generateKey: vi.fn((type, params) => JSON.stringify({ type, ...params })),
		get: vi.fn(() => null),
		set: vi.fn(),
	},
}));

describe("getWikiPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should require title", async () => {
		await expect(getWikiPage({ title: "" })).rejects.toThrow(
			"title is required",
		);
	});

	it("should fetch page content", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			parse: {
				title: "Data pack",
				pageid: 12345,
				revid: 67890,
				text: { "*": "<p>Test content</p>" },
				wikitext: { "*": "Test wikitext" },
			},
		});

		const result = await getWikiPage({ title: "Data pack" });

		const content = JSON.parse(result.content[0].text);
		expect(content.title).toBe("Data pack");
		expect(content.pageId).toBe(12345);
		expect(content.revisionId).toBe(67890);
		expect(content.content).toBe("Test content");
	});

	it("should extract JSON blocks when requested", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			parse: {
				title: "Recipe",
				pageid: 123,
				revid: 456,
				text: { "*": "<p>Test</p>" },
				wikitext: { "*": '```json\n{"test": true}\n```' },
			},
		});

		const result = await getWikiPage({ title: "Recipe", extractJson: true });

		const content = JSON.parse(result.content[0].text);
		expect(content.jsonBlocks).toBeDefined();
		expect(content.jsonBlocks).toHaveLength(1);
		expect(content.jsonBlocks[0]).toEqual({ test: true });
	});

	it("should not extract JSON when disabled", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			parse: {
				title: "Test",
				pageid: 123,
				revid: 456,
				text: { "*": "<p>Test</p>" },
				wikitext: { "*": '```json\n{"test": true}\n```' },
			},
		});

		const result = await getWikiPage({ title: "Test", extractJson: false });

		const content = JSON.parse(result.content[0].text);
		expect(content.jsonBlocks).toBeUndefined();
	});

	it("should fetch specific revision", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			parse: {
				title: "Test",
				pageid: 123,
				revid: 999,
				text: { "*": "<p>Old content</p>" },
				wikitext: { "*": "Old wikitext" },
			},
		});

		await getWikiPage({ title: "Test", revisionId: 999 });

		expect(callMediaWikiAPI).toHaveBeenCalledWith(
			expect.objectContaining({ oldid: 999 }),
		);
	});

	it("should suggest nearest revision when revision not found", async () => {
		const { callMediaWikiAPI, findNearestRevision } = await import(
			"../api/mediawiki.js"
		);
		const { WikiAPIError } = await import("../types.js");

		// First call fails with nosuchrevid
		const error = new WikiAPIError("Revision not found", "nosuchrevid");
		vi.mocked(callMediaWikiAPI)
			.mockRejectedValueOnce(error)
			.mockResolvedValueOnce({
				query: {
					pages: {
						"123": { pageid: 123 },
					},
				},
			});

		vi.mocked(findNearestRevision).mockResolvedValue({
			revid: 1000,
			timestamp: "2024-01-01T00:00:00Z",
		});

		const result = await getWikiPage({ title: "Test", revisionId: 999 });

		const content = JSON.parse(result.content[0].text);
		expect(content.error).toContain("Revision 999 not found");
		expect(content.suggestion.nearestRevision).toBe(1000);
	});

	it("should suggest similar pages when page not found", async () => {
		const { callMediaWikiAPI, searchSimilarPages } = await import(
			"../api/mediawiki.js"
		);

		vi.mocked(callMediaWikiAPI).mockResolvedValue({});
		vi.mocked(searchSimilarPages).mockResolvedValue([
			"Data pack",
			"Resource pack",
		]);

		const result = await getWikiPage({ title: "Datapack" });

		const content = JSON.parse(result.content[0].text);
		expect(content.error).toContain('Page "Datapack" not found');
		expect(content.suggestions).toContain("Data pack");
		expect(content.suggestions).toContain("Resource pack");
	});

	it("should throw PageNotFoundError when no suggestions", async () => {
		const { callMediaWikiAPI, searchSimilarPages } = await import(
			"../api/mediawiki.js"
		);

		vi.mocked(callMediaWikiAPI).mockResolvedValue({});
		vi.mocked(searchSimilarPages).mockResolvedValue([]);

		await expect(getWikiPage({ title: "NonExistent" })).rejects.toThrow(
			PageNotFoundError,
		);
	});

	it("should support wikitext format", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			parse: {
				title: "Test",
				pageid: 123,
				revid: 456,
				wikitext: { "*": "== Heading ==\nContent" },
			},
		});

		const result = await getWikiPage({ title: "Test", format: "wikitext" });

		const content = JSON.parse(result.content[0].text);
		expect(content.content).toBe("== Heading ==\nContent");
	});

	it("should support HTML format", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			parse: {
				title: "Test",
				pageid: 123,
				revid: 456,
				text: { "*": "<h2>Heading</h2><p>Content</p>" },
				wikitext: { "*": "== Heading ==\nContent" },
			},
		});

		const result = await getWikiPage({ title: "Test", format: "html" });

		const content = JSON.parse(result.content[0].text);
		expect(content.content).toBe("<h2>Heading</h2><p>Content</p>");
	});

	it("should strip HTML in plain format (default)", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			parse: {
				title: "Test",
				pageid: 123,
				revid: 456,
				text: { "*": "<h2>Heading</h2><p>Content</p>" },
				wikitext: { "*": "== Heading ==\nContent" },
			},
		});

		const result = await getWikiPage({ title: "Test", format: "plain" });

		const content = JSON.parse(result.content[0].text);
		expect(content.content).not.toContain("<");
		expect(content.content).toContain("Heading");
		expect(content.content).toContain("Content");
	});

	it("should fetch specific section", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			parse: {
				title: "Test",
				pageid: 123,
				revid: 456,
				text: { "*": "<p>Section content</p>" },
				wikitext: { "*": "Section wikitext" },
			},
		});

		await getWikiPage({ title: "Test", section: 2 });

		expect(callMediaWikiAPI).toHaveBeenCalledWith(
			expect.objectContaining({ section: 2 }),
		);
	});

	it("should use cache for repeated requests", async () => {
		const { cache } = await import("../utils/cache.js");
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");

		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			parse: {
				title: "Test",
				pageid: 123,
				revid: 456,
				text: { "*": "<p>Test</p>" },
				wikitext: { "*": "Test" },
			},
		});

		await getWikiPage({ title: "Test" });
		expect(cache.set).toHaveBeenCalled();

		vi.clearAllMocks();
		await getWikiPage({ title: "Test" });
		expect(cache.get).toHaveBeenCalled();
	});

	it("should throw error when title is empty", async () => {
		await expect(getWikiPage({ title: "" })).rejects.toThrow(
			"title is required",
		);
	});

	it("should handle extractJson:false when no JSON is present", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			parse: {
				title: "Test",
				pageid: 123,
				revid: 456,
				text: { "*": "<p>No JSON here</p>" },
				wikitext: { "*": "No JSON here" },
			},
		});

		const result = await getWikiPage({ title: "Test", extractJson: false });

		const content = JSON.parse(result.content[0].text);
		expect(content.jsonBlocks).toBeUndefined();
		expect(content.content).toBeDefined();
	});
});
