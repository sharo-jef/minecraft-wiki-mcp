import { describe, expect, it } from "vitest";
import { extractJsonBlocks, stripHtml } from "./jsonExtractor.js";

describe("jsonExtractor", () => {
	describe("extractJsonBlocks", () => {
		it("should extract valid JSON blocks from wikitext", () => {
			const wikitext = `
Some text before

\`\`\`json
{
  "name": "test",
  "value": 42
}
\`\`\`

Some text after
			`;

			const result = extractJsonBlocks(wikitext);
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				name: "test",
				value: 42,
			});
		});

		it("should extract multiple JSON blocks", () => {
			const wikitext = `
\`\`\`json
{"first": 1}
\`\`\`

Some text

\`\`\`json
{"second": 2}
\`\`\`
			`;

			const result = extractJsonBlocks(wikitext);
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({ first: 1 });
			expect(result[1]).toEqual({ second: 2 });
		});

		it("should skip invalid JSON blocks", () => {
			const wikitext = `
\`\`\`json
{invalid json}
\`\`\`

\`\`\`json
{"valid": true}
\`\`\`
			`;

			const result = extractJsonBlocks(wikitext);
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({ valid: true });
		});

		it("should return empty array when no JSON blocks found", () => {
			const wikitext = "Just plain text without any JSON blocks";
			const result = extractJsonBlocks(wikitext);
			expect(result).toEqual([]);
		});

		it("should handle empty JSON blocks", () => {
			const wikitext = `
\`\`\`json

\`\`\`
			`;

			const result = extractJsonBlocks(wikitext);
			expect(result).toEqual([]);
		});

		it("should handle complex nested JSON", () => {
			const wikitext = `
\`\`\`json
{
  "pack": {
    "pack_format": 48,
    "description": {
      "text": "My Datapack",
      "color": "gold"
    }
  }
}
\`\`\`
			`;

			const result = extractJsonBlocks(wikitext);
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				pack: {
					pack_format: 48,
					description: {
						text: "My Datapack",
						color: "gold",
					},
				},
			});
		});

		it("should handle JSON arrays", () => {
			const wikitext = `
\`\`\`json
[1, 2, 3, 4, 5]
\`\`\`
			`;

			const result = extractJsonBlocks(wikitext);
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual([1, 2, 3, 4, 5]);
		});

		it("should handle whitespace in code blocks", () => {
			const wikitext = `
\`\`\`json
   
   {"test": "value"}
   
\`\`\`
			`;

			const result = extractJsonBlocks(wikitext);
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({ test: "value" });
		});
	});

	describe("stripHtml", () => {
		it("should remove HTML tags from text", () => {
			const html = "<p>Hello <strong>world</strong></p>";
			const result = stripHtml(html);
			expect(result).toBe("Hello world");
		});

		it("should remove script tags and content", () => {
			const html =
				"<p>Content</p><script>alert('test');</script><p>More content</p>";
			const result = stripHtml(html);
			expect(result).toBe("Content More content");
		});

		it("should remove style tags and content", () => {
			const html = "<style>body { color: red; }</style><p>Content</p>";
			const result = stripHtml(html);
			expect(result).toBe("Content");
		});

		it("should decode HTML entities", () => {
			const html = "&lt;div&gt;Test &amp; Example&lt;/div&gt;";
			const result = stripHtml(html);
			expect(result).toBe("<div>Test & Example</div>");
		});

		it("should replace &nbsp; with space", () => {
			const html = "Hello&nbsp;World";
			const result = stripHtml(html);
			expect(result).toBe("Hello World");
		});

		it("should handle quotes and apostrophes", () => {
			const html = "&quot;Test&quot; &#039;example&#039;";
			const result = stripHtml(html);
			expect(result).toBe("\"Test\" 'example'");
		});

		it("should handle mixed HTML and entities", () => {
			const html = "<p>Price: &lt;$100&gt;</p><br/>&nbsp;";
			const result = stripHtml(html);
			expect(result).toBe("Price: <$100>");
		});

		it("should handle empty string", () => {
			const html = "";
			const result = stripHtml(html);
			expect(result).toBe("");
		});

		it("should handle nested tags", () => {
			const html =
				"<div><p><span>Nested <strong>content</strong></span></p></div>";
			const result = stripHtml(html);
			expect(result).toBe("Nested content");
		});

		it("should trim whitespace", () => {
			const html = "  <p>Test</p>  ";
			const result = stripHtml(html);
			expect(result).toBe("Test");
		});
	});
});
