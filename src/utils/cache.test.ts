import { beforeEach, describe, expect, it } from "vitest";

// Import cache module
const cacheModule = await import("./cache.js");

describe("Cache", () => {
	beforeEach(() => {
		// Clear cache before each test
		cacheModule.cache.clear();
	});

	describe("get and set", () => {
		it("should store and retrieve values", () => {
			cacheModule.cache.set("key1", "value1");
			expect(cacheModule.cache.get("key1")).toBe("value1");
		});

		it("should return undefined for non-existent keys", () => {
			expect(cacheModule.cache.get("nonexistent")).toBeUndefined();
		});

		it("should overwrite existing values", () => {
			cacheModule.cache.set("key1", "value1");
			cacheModule.cache.set("key1", "value2");
			expect(cacheModule.cache.get("key1")).toBe("value2");
		});

		it("should handle different types of values", () => {
			const obj = { foo: "bar" };
			const arr = [1, 2, 3];
			const num = 42;

			cacheModule.cache.set("obj", obj);
			cacheModule.cache.set("arr", arr);
			cacheModule.cache.set("num", num);

			expect(cacheModule.cache.get("obj")).toEqual(obj);
			expect(cacheModule.cache.get("arr")).toEqual(arr);
			expect(cacheModule.cache.get("num")).toBe(num);
		});
	});

	describe("delete", () => {
		it("should remove key from cache", () => {
			cacheModule.cache.set("key1", "value1");
			expect(cacheModule.cache.get("key1")).toBeDefined();

			cacheModule.cache.delete("key1");
			expect(cacheModule.cache.get("key1")).toBeUndefined();
		});

		it("should not throw when deleting non-existent key", () => {
			expect(() => cacheModule.cache.delete("nonexistent")).not.toThrow();
		});
	});

	describe("clear", () => {
		it("should remove all entries from cache", () => {
			cacheModule.cache.set("key1", "value1");
			cacheModule.cache.set("key2", "value2");
			cacheModule.cache.set("key3", "value3");

			expect(cacheModule.cache.get("key1")).toBeDefined();
			expect(cacheModule.cache.get("key2")).toBeDefined();
			expect(cacheModule.cache.get("key3")).toBeDefined();

			cacheModule.cache.clear();

			expect(cacheModule.cache.get("key1")).toBeUndefined();
			expect(cacheModule.cache.get("key2")).toBeUndefined();
			expect(cacheModule.cache.get("key3")).toBeUndefined();
		});
	});

	describe("clearExpired", () => {
		it("should remove expired entries", async () => {
			// Use very short TTL for testing
			const shortTTL = 10; // 10ms

			cacheModule.cache.set("key1", "value1", shortTTL);
			cacheModule.cache.set("key2", "value2", 10000); // Long TTL

			// Wait for key1 to expire
			await new Promise((resolve) => setTimeout(resolve, 20));

			cacheModule.cache.clearExpired();

			expect(cacheModule.cache.get("key1")).toBeUndefined();
			expect(cacheModule.cache.get("key2")).toBeDefined();
		});

		it("should not affect non-expiring entries", () => {
			cacheModule.cache.set("key1", "value1"); // Default TTL
			cacheModule.cache.clearExpired();
			expect(cacheModule.cache.get("key1")).toBeDefined();
		});
	});

	describe("size", () => {
		it("should return cache size", () => {
			expect(cacheModule.cache.size()).toBe(0);
			cacheModule.cache.set("key1", "value1");
			expect(cacheModule.cache.size()).toBe(1);
			cacheModule.cache.set("key2", "value2");
			expect(cacheModule.cache.size()).toBe(2);
			cacheModule.cache.delete("key1");
			expect(cacheModule.cache.size()).toBe(1);
		});
	});

	describe("TTL (Time To Live)", () => {
		it("should expire entries after TTL", async () => {
			const ttl = 50; // 50ms
			cacheModule.cache.set("key1", "value1", ttl);

			expect(cacheModule.cache.get("key1")).toBe("value1");

			// Wait for TTL to expire
			await new Promise((resolve) => setTimeout(resolve, 60));

			// Get should return undefined for expired entry
			expect(cacheModule.cache.get("key1")).toBeUndefined();
		});

		it("should not expire entries within TTL", async () => {
			const ttl = 10000; // 10 seconds

			cacheModule.cache.set("key1", "value1", ttl);

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(cacheModule.cache.get("key1")).toBe("value1");
		});
	});
});
