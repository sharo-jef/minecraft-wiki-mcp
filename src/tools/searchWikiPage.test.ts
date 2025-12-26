import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTextContent } from "../test-utils.js";
import { searchWikiPage } from "./searchWikiPage.js";

// Mock dependencies
vi.mock("../api/mediawiki.js", () => ({
	callMediaWikiAPI: vi.fn(),
}));

describe("searchWikiPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should require query parameter", async () => {
		await expect(searchWikiPage({ query: "" })).rejects.toThrow(
			"query is required",
		);
	});

	it("should search for pages", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			query: {
				search: [
					{
						title: "Data pack",
						pageid: 1234,
						snippet: "A <b>data pack</b> is...",
					},
					{
						title: "Resource pack",
						pageid: 5678,
						snippet: "A <b>resource pack</b> is...",
					},
				],
			},
		});

		const result = await searchWikiPage({ query: "pack" });

		const content = JSON.parse(getTextContent(result));
		expect(content.query).toBe("pack");
		expect(content.resultCount).toBe(2);
		expect(content.results).toHaveLength(2);
		expect(content.results[0].title).toBe("Data pack");
		expect(content.results[0].pageId).toBe(1234);
	});

	it("should strip HTML from snippets", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			query: {
				search: [
					{
						title: "Test",
						pageid: 123,
						snippet: "Text with <span>HTML</span> tags",
					},
				],
			},
		});

		const result = await searchWikiPage({ query: "test" });

		const content = JSON.parse(getTextContent(result));
		expect(content.results[0].snippet).toBe("Text with HTML tags");
		expect(content.results[0].snippet).not.toContain("<");
	});

	it("should use default limit of 10", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			query: { search: [] },
		});

		await searchWikiPage({ query: "test" });

		expect(callMediaWikiAPI).toHaveBeenCalledWith(
			expect.objectContaining({ srlimit: 10 }),
		);
	});

	it("should respect custom limit", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			query: { search: [] },
		});

		await searchWikiPage({ query: "test", limit: 25 });

		expect(callMediaWikiAPI).toHaveBeenCalledWith(
			expect.objectContaining({ srlimit: 25 }),
		);
	});

	it("should cap limit at 50", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			query: { search: [] },
		});

		await searchWikiPage({ query: "test", limit: 100 });

		expect(callMediaWikiAPI).toHaveBeenCalledWith(
			expect.objectContaining({ srlimit: 50 }),
		);
	});

	it("should support namespace filtering", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			query: { search: [] },
		});

		await searchWikiPage({ query: "test", namespace: 0 });

		expect(callMediaWikiAPI).toHaveBeenCalledWith(
			expect.objectContaining({ srnamespace: 0 }),
		);
	});

	it("should not include namespace when not specified", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			query: { search: [] },
		});

		await searchWikiPage({ query: "test" });

		expect(callMediaWikiAPI).toHaveBeenCalledWith(
			expect.not.objectContaining({ srnamespace: expect.anything() }),
		);
	});

	it("should handle empty search results", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			query: { search: [] },
		});

		const result = await searchWikiPage({ query: "nonexistent" });

		const content = JSON.parse(getTextContent(result));
		expect(content.resultCount).toBe(0);
		expect(content.results).toEqual([]);
	});

	it("should handle missing query data", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		vi.mocked(callMediaWikiAPI).mockResolvedValue({});

		const result = await searchWikiPage({ query: "test" });

		const content = JSON.parse(getTextContent(result));
		expect(content.results).toEqual([]);
	});

	it("should include query in output", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			query: { search: [] },
		});

		const result = await searchWikiPage({ query: "minecraft" });

		const content = JSON.parse(getTextContent(result));
		expect(content.query).toBe("minecraft");
	});
});
