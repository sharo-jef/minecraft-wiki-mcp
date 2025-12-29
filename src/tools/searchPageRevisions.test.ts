import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTextContent } from "../test-utils.js";
import { PageNotFoundError } from "../types.js";
import { searchPageRevisions } from "./searchPageRevisions.js";

// Mock dependencies
vi.mock("../api/mediawiki.js", () => ({
	callMediaWikiAPI: vi.fn(),
}));

vi.mock("../utils/cache.js", () => ({
	cache: {
		generateKey: vi.fn((type, params) => JSON.stringify({ type, ...params })),
		get: vi.fn(() => null),
		set: vi.fn(),
	},
}));

describe("searchPageRevisions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should require title parameter", async () => {
		await expect(searchPageRevisions({ title: "" })).rejects.toThrow(
			"title is required",
		);
	});

	it("should fetch page revisions", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			query: {
				pages: {
					"123": {
						pageid: 123,
						title: "Pack format",
						revisions: [
							{
								revid: 1000,
								timestamp: "2024-01-01T00:00:00Z",
								comment: "Updated for 1.21",
								user: "TestUser",
							},
							{
								revid: 1001,
								timestamp: "2024-01-02T00:00:00Z",
								comment: "Updated for 1.20",
								user: "TestUser2",
							},
						],
					},
				},
			},
		});

		const result = await searchPageRevisions({ title: "Pack format" });

		const content = JSON.parse(getTextContent(result));
		expect(content.title).toBe("Pack format");
		expect(content.revisions).toHaveLength(2);
		expect(content.revisions[0].revisionId).toBe(1000);
	});

	it("should filter revisions by version pattern", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			query: {
				pages: {
					"123": {
						pageid: 123,
						title: "Pack format",
						revisions: [
							{
								revid: 1000,
								timestamp: "2024-01-01T00:00:00Z",
								comment: "Updated for 1.21",
								user: "TestUser",
							},
							{
								revid: 1001,
								timestamp: "2024-01-02T00:00:00Z",
								comment: "Updated for 1.20",
								user: "TestUser2",
							},
							{
								revid: 1002,
								timestamp: "2024-01-03T00:00:00Z",
								comment: "Fixed typo",
								user: "TestUser3",
							},
						],
					},
				},
			},
		});

		const result = await searchPageRevisions({
			title: "Pack format",
			versionPattern: "1.21",
		});

		const content = JSON.parse(getTextContent(result));
		expect(content.revisions).toHaveLength(1);
		expect(content.revisions[0].comment).toContain("1.21");
		expect(content.filtered).toBe(true);
	});

	it("should throw PageNotFoundError when query.pages is undefined", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			query: {},
		});

		await expect(
			searchPageRevisions({
				title: "NonExistent",
			}),
		).rejects.toThrow(PageNotFoundError);
	});

	it("should throw PageNotFoundError when page is missing", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			query: {
				pages: {
					"-1": {
						missing: true,
					},
				},
			},
		});

		await expect(
			searchPageRevisions({
				title: "NonExistentPage",
			}),
		).rejects.toThrow(PageNotFoundError);
	});

	it("should throw PageNotFoundError when no pages returned", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			query: {
				pages: {},
			},
		});

		await expect(
			searchPageRevisions({
				title: "NonExistentPage",
			}),
		).rejects.toThrow(PageNotFoundError);
	});

	it("should support regex pattern matching", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
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
								comment: "Version 1.20",
								user: "User",
							},
							{
								revid: 2,
								timestamp: "2024-01-02T00:00:00Z",
								comment: "Version 1.21",
								user: "User",
							},
							{
								revid: 3,
								timestamp: "2024-01-03T00:00:00Z",
								comment: "Other change",
								user: "User",
							},
						],
					},
				},
			},
		});

		const result = await searchPageRevisions({
			title: "Test",
			versionPattern: "1\\.(20|21)",
		});

		const content = JSON.parse(getTextContent(result));
		expect(content.revisions).toHaveLength(2);
	});

	it("should respect limit parameter", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
		const revisions = Array.from({ length: 30 }, (_, i) => ({
			revid: i,
			timestamp: "2024-01-01T00:00:00Z",
			comment: "Test",
			user: "User",
		}));

		vi.mocked(callMediaWikiAPI).mockResolvedValue({
			query: {
				pages: {
					"123": {
						pageid: 123,
						title: "Test",
						revisions,
					},
				},
			},
		});

		const result = await searchPageRevisions({ title: "Test", limit: 10 });

		const content = JSON.parse(getTextContent(result));
		expect(content.revisions).toHaveLength(10);
	});

	it("should use default limit of 20", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
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

		await searchPageRevisions({ title: "Test" });

		expect(callMediaWikiAPI).toHaveBeenCalledWith(
			expect.objectContaining({ rvlimit: 100 }), // limit * 5
		);
	});

	it("should support date range filtering", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
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

		await searchPageRevisions({
			title: "Test",
			startDate: "2024-01-01T00:00:00Z",
			endDate: "2024-12-31T23:59:59Z",
		});

		expect(callMediaWikiAPI).toHaveBeenCalledWith(
			expect.objectContaining({
				rvstart: "2024-01-01T00:00:00Z",
				rvend: "2024-12-31T23:59:59Z",
			}),
		);
	});

	it("should throw PageNotFoundError for missing page", async () => {
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

		await expect(searchPageRevisions({ title: "NonExistent" })).rejects.toThrow(
			PageNotFoundError,
		);
	});

	it("should handle empty revisions array", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
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

		const result = await searchPageRevisions({ title: "Test" });

		const content = JSON.parse(getTextContent(result));
		expect(content.revisions).toEqual([]);
		expect(content.totalFound).toBe(0);
	});

	it("should handle missing comment field", async () => {
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
								user: "TestUser",
							},
						],
					},
				},
			},
		});

		const result = await searchPageRevisions({ title: "Test" });

		const content = JSON.parse(getTextContent(result));
		expect(content.revisions[0].comment).toBe("");
	});

	it("should mark as not filtered when no pattern specified", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
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

		const result = await searchPageRevisions({ title: "Test" });

		const content = JSON.parse(getTextContent(result));
		expect(content.filtered).toBe(false);
	});

	it("should use cache for repeated requests", async () => {
		const { cache } = await import("../utils/cache.js");
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");

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

		await searchPageRevisions({ title: "Test" });
		expect(cache.set).toHaveBeenCalled();

		vi.clearAllMocks();
		await searchPageRevisions({ title: "Test" });
		expect(cache.get).toHaveBeenCalled();
	});

	it("should cap rvlimit at 500", async () => {
		const { callMediaWikiAPI } = await import("../api/mediawiki.js");
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

		await searchPageRevisions({ title: "Test", limit: 200 });

		expect(callMediaWikiAPI).toHaveBeenCalledWith(
			expect.objectContaining({ rvlimit: 500 }), // min(200 * 5, 500)
		);
	});
});
