import { describe, expect, it } from "vitest";
import {
	InvalidNamespaceError,
	isValidNamespace,
	PageNotFoundError,
	VersionNotFoundError,
} from "./types.js";

describe("isValidNamespace", () => {
	it("should return true for valid namespace (lowercase alphanumeric with underscores)", () => {
		expect(isValidNamespace("my_datapack")).toBe(true);
		expect(isValidNamespace("datapack123")).toBe(true);
		expect(isValidNamespace("my_awesome_pack")).toBe(true);
		expect(isValidNamespace("pack_2024")).toBe(true);
	});

	it("should return true for valid namespace with hyphens", () => {
		expect(isValidNamespace("my-datapack")).toBe(true);
		expect(isValidNamespace("data-pack-v1")).toBe(true);
	});

	it("should return true for valid namespace with dots", () => {
		expect(isValidNamespace("my.datapack")).toBe(true);
		expect(isValidNamespace("datapack.v1.0")).toBe(true);
	});

	it("should return false for uppercase letters", () => {
		expect(isValidNamespace("MyDatapack")).toBe(false);
		expect(isValidNamespace("DATAPACK")).toBe(false);
		expect(isValidNamespace("myDataPack")).toBe(false);
	});

	it("should return false for special characters", () => {
		expect(isValidNamespace("my@datapack")).toBe(false);
		expect(isValidNamespace("data pack")).toBe(false);
		expect(isValidNamespace("my#pack")).toBe(false);
		expect(isValidNamespace("pack!")).toBe(false);
	});

	it("should return false for empty string", () => {
		expect(isValidNamespace("")).toBe(false);
	});

	it("should return false for namespaces starting with numbers", () => {
		expect(isValidNamespace("123pack")).toBe(false);
	});

	it("should return false for namespaces with multiple consecutive special chars", () => {
		expect(isValidNamespace("my__pack")).toBe(false);
		expect(isValidNamespace("my--pack")).toBe(false);
		expect(isValidNamespace("my..pack")).toBe(false);
	});
});

describe("InvalidNamespaceError", () => {
	it("should create error with correct message", () => {
		const error = new InvalidNamespaceError("Invalid@Name");
		expect(error.message).toBe(
			'Invalid namespace: "Invalid@Name". Namespace must contain only lowercase letters, numbers, underscores, hyphens, and dots.',
		);
		expect(error.name).toBe("InvalidNamespaceError");
		expect(error).toBeInstanceOf(Error);
	});
});

describe("VersionNotFoundError", () => {
	it("should create error with correct message", () => {
		const error = new VersionNotFoundError("1.99.99");
		expect(error.message).toBe("Version 1.99.99 not found in Pack format data");
		expect(error.name).toBe("VersionNotFoundError");
		expect(error).toBeInstanceOf(Error);
	});
});

describe("PageNotFoundError", () => {
	it("should create error with correct message", () => {
		const error = new PageNotFoundError("Nonexistent Page");
		expect(error.message).toBe('Page "Nonexistent Page" not found');
		expect(error.name).toBe("PageNotFoundError");
		expect(error).toBeInstanceOf(Error);
	});
});
