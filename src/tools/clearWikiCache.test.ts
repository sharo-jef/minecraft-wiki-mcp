import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearWikiCache as clearCache } from "../utils/versionMapping.js";
import { clearWikiCache } from "./clearWikiCache.js";

vi.mock("../utils/versionMapping.js", () => ({
	clearWikiCache: vi.fn(),
}));

describe("clearWikiCache tool", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should call the cache clearing function", async () => {
		const result = await clearWikiCache();

		expect(clearCache).toHaveBeenCalledTimes(1);
		expect(result).toEqual({
			content: [
				{
					type: "text",
					text: "Wiki pack format cache has been cleared successfully. The cache will be rebuilt on the next Wiki query.",
				},
			],
		});
	});

	it("should return a success message", async () => {
		const result = await clearWikiCache();

		expect(result.content).toHaveLength(1);
		expect(result.content[0].type).toBe("text");
		expect(result.content[0].text).toContain("cleared successfully");
	});

	it("should handle multiple consecutive calls", async () => {
		await clearWikiCache();
		await clearWikiCache();
		await clearWikiCache();

		expect(clearCache).toHaveBeenCalledTimes(3);
	});
});
