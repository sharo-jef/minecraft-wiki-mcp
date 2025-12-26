import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPackFormatInfo } from "./getPackFormatInfo.js";

// Mock dependencies
vi.mock("../utils/cache.js", () => ({
	cache: {
		generateKey: vi.fn((type, params) => JSON.stringify({ type, ...params })),
		get: vi.fn(() => null),
		set: vi.fn(),
	},
}));

describe("getPackFormatInfo", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should require either minecraftVersion or packFormat", async () => {
		const result = await getPackFormatInfo({});

		const content = JSON.parse(result.content[0].text);
		expect(content.error).toContain(
			"Either minecraftVersion or packFormat is required",
		);
		expect(content.availablePackFormats).toBeDefined();
	});

	it("should return pack format info for known version", async () => {
		const result = await getPackFormatInfo({
			minecraftVersion: "1.21.2",
		});

		const content = JSON.parse(result.content[0].text);
		expect(content.packFormat).toBe(57);
		expect(content.minecraftVersions).toContain("1.21.2");
		expect(content.directoryNaming).toBe("singular");
		expect(content.usesMinMaxFormat).toBe(false);
	});

	it("should return pack format info for pack format number", async () => {
		const result = await getPackFormatInfo({
			packFormat: 48,
		});

		const content = JSON.parse(result.content[0].text);
		expect(content.packFormat).toBe(48);
		expect(content.minecraftVersions).toContain("1.21");
		expect(content.directoryNaming).toBe("singular");
	});

	it("should handle unknown version", async () => {
		const result = await getPackFormatInfo({
			minecraftVersion: "1.99.99",
		});

		const content = JSON.parse(result.content[0].text);
		expect(content.error).toBeDefined();
		expect(content.error).toContain("Unknown");
		expect(content.suggestion).toContain("get_wiki_page");
		expect(content.knownPackFormats).toBeDefined();
	});

	it("should handle unknown pack format", async () => {
		const result = await getPackFormatInfo({
			packFormat: 9999,
		});

		const content = JSON.parse(result.content[0].text);
		expect(content.error).toBeDefined();
		expect(content.knownPackFormats).toBeDefined();
	});

	it("should normalize version 1.21.0 to 1.21", async () => {
		const result = await getPackFormatInfo({
			minecraftVersion: "1.21.0",
		});

		const content = JSON.parse(result.content[0].text);
		expect(content.packFormat).toBe(48);
		expect(content.minecraftVersions).toContain("1.21");
	});

	it("should handle plural directory naming for older versions", async () => {
		const result = await getPackFormatInfo({
			minecraftVersion: "1.20.5",
		});

		const content = JSON.parse(result.content[0].text);
		expect(content.directoryNaming).toBe("plural");
	});

	it("should handle min/max format versions", async () => {
		const result = await getPackFormatInfo({
			minecraftVersion: "1.21.9",
		});

		const content = JSON.parse(result.content[0].text);
		expect(content.packFormat).toEqual([88, 0]);
		expect(content.usesMinMaxFormat).toBe(true);
	});

	it("should list all known pack formats in error response", async () => {
		const result = await getPackFormatInfo({
			minecraftVersion: "unknown",
		});

		const content = JSON.parse(result.content[0].text);
		expect(content.knownPackFormats).toBeDefined();
		expect(Array.isArray(content.knownPackFormats)).toBe(true);
		expect(content.knownPackFormats.length).toBeGreaterThan(0);
	});

	it("should handle version ranges", async () => {
		const result1 = await getPackFormatInfo({
			minecraftVersion: "1.21",
		});
		const result2 = await getPackFormatInfo({
			minecraftVersion: "1.21.1",
		});

		const content1 = JSON.parse(result1.content[0].text);
		const content2 = JSON.parse(result2.content[0].text);

		expect(content1.packFormat).toBe(content2.packFormat);
		expect(content1.packFormat).toBe(48);
	});

	it("should use cache for repeated queries", async () => {
		const { cache } = await import("../utils/cache.js");

		// First call - cache miss
		await getPackFormatInfo({ minecraftVersion: "1.21.2" });
		expect(cache.set).toHaveBeenCalled();

		// Second call - would use cache if not mocked to return null
		vi.clearAllMocks();
		await getPackFormatInfo({ minecraftVersion: "1.21.2" });
		expect(cache.get).toHaveBeenCalled();
	});
});
