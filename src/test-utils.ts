import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Helper function to safely extract text content from MCP CallToolResult
 * Handles type narrowing for the content union type
 */
export function getTextContent(result: CallToolResult, index = 0): string {
	const contentItem = result.content[index];
	if (!contentItem) {
		throw new Error(`No content at index ${index}`);
	}
	if (contentItem.type !== "text") {
		throw new Error(
			`Expected text content at index ${index}, got ${contentItem.type}`,
		);
	}
	return contentItem.text;
}
