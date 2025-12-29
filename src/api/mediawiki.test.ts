import { beforeEach, describe, expect, it, vi } from "vitest";
import { WikiAPIError } from "../types.js";
import {
	callMediaWikiAPI,
	findNearestRevision,
	searchSimilarPages,
} from "./mediawiki.js";

// Mock global fetch
global.fetch = vi.fn();

describe("mediawiki", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("callMediaWikiAPI", () => {
		it("should call API with correct parameters", async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: async () => ({ success: true }),
			};
			vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

			const result = await callMediaWikiAPI({
				action: "query",
				titles: "Test",
			});

			expect(fetch).toHaveBeenCalledTimes(1);
			const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
			expect(callUrl).toContain("action=query");
			expect(callUrl).toContain("titles=Test");
			expect(callUrl).toContain("format=json");
			expect(callUrl).toContain("origin=*");
			expect(result).toEqual({ success: true });
		});

		it("should handle API errors", async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: async () => ({
					error: {
						code: "nosuchpage",
						info: "The page you specified doesn't exist.",
					},
				}),
			};
			vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

			await expect(
				callMediaWikiAPI({ action: "query", titles: "NonExistent" }),
			).rejects.toThrow(WikiAPIError);
		});

		it("should handle HTTP errors", async () => {
			const mockResponse = {
				ok: false,
				status: 404,
				statusText: "Not Found",
			};
			vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

			await expect(callMediaWikiAPI({ action: "query" })).rejects.toThrow(
				WikiAPIError,
			);
		});

		it("should retry on rate limit (429)", async () => {
			const rateLimitResponse = {
				ok: false,
				status: 429,
				statusText: "Too Many Requests",
			};
			const successResponse = {
				ok: true,
				status: 200,
				json: async () => ({ success: true }),
			};

			vi.mocked(fetch)
				.mockResolvedValueOnce(rateLimitResponse as Response)
				.mockResolvedValueOnce(successResponse as Response);

			const result = await callMediaWikiAPI(
				{ action: "query" },
				{ maxRetries: 3, retryDelayMs: 100 },
			);

			expect(fetch).toHaveBeenCalledTimes(2);
			expect(result).toEqual({ success: true });
		});

		it("should retry on ratelimited error code", async () => {
			const rateLimitResponse = {
				ok: true,
				status: 200,
				json: async () => ({
					error: {
						code: "ratelimited",
						info: "You've exceeded your rate limit.",
					},
				}),
			};
			const successResponse = {
				ok: true,
				status: 200,
				json: async () => ({ success: true }),
			};

			vi.mocked(fetch)
				.mockResolvedValueOnce(rateLimitResponse as Response)
				.mockResolvedValueOnce(successResponse as Response);

			const result = await callMediaWikiAPI(
				{ action: "query" },
				{ maxRetries: 3, retryDelayMs: 100 },
			);

			expect(fetch).toHaveBeenCalledTimes(2);
			expect(result).toEqual({ success: true });
		});

		it("should fail after max retries", async () => {
			const rateLimitResponse = {
				ok: false,
				status: 429,
				statusText: "Too Many Requests",
			};

			vi.mocked(fetch).mockResolvedValue(rateLimitResponse as Response);

			await expect(
				callMediaWikiAPI(
					{ action: "query" },
					{ maxRetries: 2, retryDelayMs: 10 },
				),
			).rejects.toThrow(WikiAPIError);

			expect(fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
		});

		it("should filter undefined parameters", async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: async () => ({ success: true }),
			};
			vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

			await callMediaWikiAPI({
				action: "query",
				titles: "Test",
				revids: undefined,
			});

			const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
			expect(callUrl).not.toContain("revids");
			expect(callUrl).toContain("titles=Test");
		});

		it("should convert parameters to strings", async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: async () => ({ success: true }),
			};
			vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

			await callMediaWikiAPI({
				action: "query",
				pageids: 12345,
				rvlimit: 10,
			});

			const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
			expect(callUrl).toContain("pageids=12345");
			expect(callUrl).toContain("rvlimit=10");
		});

		it("should handle boolean parameters", async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: async () => ({ success: true }),
			};
			vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

			await callMediaWikiAPI({
				action: "query",
				redirects: true,
			});

			const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
			expect(callUrl).toContain("redirects=true");
		});

		it("should throw non-WikiAPIError errors", async () => {
			const error = new Error("Network error");
			vi.mocked(fetch).mockRejectedValue(error);

			await expect(callMediaWikiAPI({ action: "query" })).rejects.toThrow(
				"Network error",
			);
		});

		it("should convert non-Error exceptions to Error in lastError", async () => {
			vi.mocked(fetch).mockRejectedValue("string error");

			try {
				await callMediaWikiAPI({ action: "query" });
				expect.fail("Should have thrown");
			} catch (error) {
				// Original error is thrown, but lastError is converted internally
				expect(error).toBe("string error");
			}
		});
	});

	describe("searchSimilarPages", () => {
		it("should search for similar pages", async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: async () => ({
					query: {
						search: [
							{ title: "Data pack" },
							{ title: "Resource pack" },
							{ title: "Pack format" },
						],
					},
				}),
			};
			vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

			const results = await searchSimilarPages("pack", 5);

			expect(results).toEqual(["Data pack", "Resource pack", "Pack format"]);
			expect(fetch).toHaveBeenCalledTimes(1);
		});

		it("should return empty array when no results", async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: async () => ({
					query: {
						search: [],
					},
				}),
			};
			vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

			const results = await searchSimilarPages("nonexistent");
			expect(results).toEqual([]);
		});

		it("should handle missing query data", async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: async () => ({}),
			};
			vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

			const results = await searchSimilarPages("test");
			expect(results).toEqual([]);
		});

		it("should use custom limit", async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: async () => ({
					query: {
						search: [{ title: "Test1" }, { title: "Test2" }],
					},
				}),
			};
			vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

			await searchSimilarPages("test", 10);

			const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
			expect(callUrl).toContain("srlimit=10");
		});
	});

	describe("findNearestRevision", () => {
		it("should find nearest revision", async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: async () => ({
					query: {
						pages: {
							"12345": {
								revisions: [
									{ revid: 1000, timestamp: "2024-01-01T00:00:00Z" },
									{ revid: 1010, timestamp: "2024-01-02T00:00:00Z" },
									{ revid: 1020, timestamp: "2024-01-03T00:00:00Z" },
								],
							},
						},
					},
				}),
			};
			vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

			const result = await findNearestRevision(12345, 1015);

			expect(result).toEqual({
				revid: 1010,
				timestamp: "2024-01-02T00:00:00Z",
			});
		});

		it("should return exact match if exists", async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: async () => ({
					query: {
						pages: {
							"12345": {
								revisions: [
									{ revid: 1000, timestamp: "2024-01-01T00:00:00Z" },
									{ revid: 1010, timestamp: "2024-01-02T00:00:00Z" },
								],
							},
						},
					},
				}),
			};
			vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

			const result = await findNearestRevision(12345, 1010);

			expect(result).toEqual({
				revid: 1010,
				timestamp: "2024-01-02T00:00:00Z",
			});
		});

		it("should return null when no revisions", async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: async () => ({
					query: {
						pages: {
							"12345": {
								revisions: [],
							},
						},
					},
				}),
			};
			vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

			const result = await findNearestRevision(12345, 1000);
			expect(result).toBeNull();
		});

		it("should return null when no pages data", async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: async () => ({
					query: {},
				}),
			};
			vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

			const result = await findNearestRevision(12345, 1000);
			expect(result).toBeNull();
		});

		it("should find closest revision when target is lower", async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: async () => ({
					query: {
						pages: {
							"12345": {
								revisions: [
									{ revid: 1000, timestamp: "2024-01-01T00:00:00Z" },
									{ revid: 2000, timestamp: "2024-01-02T00:00:00Z" },
								],
							},
						},
					},
				}),
			};
			vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

			const result = await findNearestRevision(12345, 500);

			expect(result).toEqual({
				revid: 1000,
				timestamp: "2024-01-01T00:00:00Z",
			});
		});

		it("should find closest revision when target is higher", async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: async () => ({
					query: {
						pages: {
							"12345": {
								revisions: [
									{ revid: 1000, timestamp: "2024-01-01T00:00:00Z" },
									{ revid: 2000, timestamp: "2024-01-02T00:00:00Z" },
								],
							},
						},
					},
				}),
			};
			vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

			const result = await findNearestRevision(12345, 2500);

			expect(result).toEqual({
				revid: 2000,
				timestamp: "2024-01-02T00:00:00Z",
			});
		});
	});
});
