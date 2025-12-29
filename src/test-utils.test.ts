import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { describe, expect, it } from "vitest";
import { getTextContent } from "./test-utils.js";

describe("test-utils", () => {
	describe("getTextContent", () => {
		it("should extract text content from result", () => {
			const result: CallToolResult = {
				content: [{ type: "text", text: "Hello" }],
			};
			expect(getTextContent(result)).toBe("Hello");
		});

		it("should extract text content from specified index", () => {
			const result: CallToolResult = {
				content: [
					{ type: "text", text: "First" },
					{ type: "text", text: "Second" },
				],
			};
			expect(getTextContent(result, 1)).toBe("Second");
		});

		it("should throw error when content at index doesn't exist", () => {
			const result: CallToolResult = {
				content: [{ type: "text", text: "Hello" }],
			};
			expect(() => getTextContent(result, 5)).toThrow("No content at index 5");
		});

		it("should throw error when content is not text type", () => {
			const result: CallToolResult = {
				content: [{ type: "image", data: "base64data", mimeType: "image/png" }],
			};
			expect(() => getTextContent(result)).toThrow(
				"Expected text content at index 0, got image",
			);
		});
	});
});
