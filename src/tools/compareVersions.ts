import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { callMediaWikiAPI } from "../api/mediawiki.js";
import { extractJsonBlocks } from "../utils/jsonExtractor.js";

interface CompareVersionsArgs {
	title: string;
	version1: string;
	version2: string;
}

interface RevisionInfo {
	revisionId: number;
	timestamp: string;
	comment: string;
	user: string;
}

interface JsonDiff {
	path: string;
	type: "added" | "removed" | "changed";
	oldValue?: unknown;
	newValue?: unknown;
}

interface CompareVersionsOutput {
	title: string;
	version1: {
		pattern: string;
		revision: RevisionInfo | null;
	};
	version2: {
		pattern: string;
		revision: RevisionInfo | null;
	};
	jsonDiffs: JsonDiff[];
	summary: string;
}

interface QueryResponse {
	query?: {
		pages?: Record<
			string,
			{
				pageid?: number;
				title: string;
				missing?: boolean;
				revisions?: Array<{
					revid: number;
					parentid?: number;
					user: string;
					timestamp: string;
					comment?: string;
				}>;
			}
		>;
	};
}

interface ParseResponse {
	parse?: {
		title: string;
		pageid: number;
		revid: number;
		wikitext?: { "*": string };
	};
}

async function findRevisionForVersion(
	title: string,
	versionPattern: string,
): Promise<RevisionInfo | null> {
	const params: Record<string, string | number | boolean | undefined> = {
		action: "query",
		prop: "revisions",
		titles: title,
		rvprop: "ids|timestamp|comment|user",
		rvlimit: 500,
	};

	const data = (await callMediaWikiAPI(params)) as QueryResponse;

	if (!data.query?.pages) {
		return null;
	}

	const pages = data.query.pages;
	const pageIds = Object.keys(pages);

	if (pageIds.length === 0) {
		return null;
	}

	const page = pages[pageIds[0]];

	if (page.missing) {
		return null;
	}

	const revisions = page.revisions ?? [];
	const pattern = new RegExp(versionPattern, "i");

	for (const rev of revisions) {
		if (rev.comment && pattern.test(rev.comment)) {
			return {
				revisionId: rev.revid,
				timestamp: rev.timestamp,
				comment: rev.comment,
				user: rev.user,
			};
		}
	}

	return null;
}

async function getRevisionContent(revisionId: number): Promise<string> {
	const params: Record<string, string | number | boolean | undefined> = {
		action: "parse",
		oldid: revisionId,
		prop: "wikitext",
		disablelimitreport: 1,
	};

	const data = (await callMediaWikiAPI(params)) as ParseResponse;

	return data.parse?.wikitext?.["*"] ?? "";
}

function getObjectPaths(obj: unknown, prefix = ""): Map<string, unknown> {
	const paths = new Map<string, unknown>();

	if (obj === null || typeof obj !== "object") {
		paths.set(prefix || ".", obj);
		return paths;
	}

	if (Array.isArray(obj)) {
		paths.set(prefix || ".", obj);
		return paths;
	}

	for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
		const newPrefix = prefix ? `${prefix}.${key}` : key;
		if (value !== null && typeof value === "object" && !Array.isArray(value)) {
			const nestedPaths = getObjectPaths(value, newPrefix);
			for (const [path, val] of nestedPaths) {
				paths.set(path, val);
			}
		} else {
			paths.set(newPrefix, value);
		}
	}

	return paths;
}

function compareJsonBlocks(
	oldBlocks: unknown[],
	newBlocks: unknown[],
): JsonDiff[] {
	const diffs: JsonDiff[] = [];

	const maxLength = Math.max(oldBlocks.length, newBlocks.length);

	for (let i = 0; i < maxLength; i++) {
		const oldBlock = oldBlocks[i];
		const newBlock = newBlocks[i];

		if (oldBlock === undefined && newBlock !== undefined) {
			diffs.push({
				path: `block[${i}]`,
				type: "added",
				newValue: newBlock,
			});
			continue;
		}

		if (oldBlock !== undefined && newBlock === undefined) {
			diffs.push({
				path: `block[${i}]`,
				type: "removed",
				oldValue: oldBlock,
			});
			continue;
		}

		const oldPaths = getObjectPaths(oldBlock);
		const newPaths = getObjectPaths(newBlock);

		for (const [path, newValue] of newPaths) {
			const fullPath = `block[${i}].${path}`;
			if (!oldPaths.has(path)) {
				diffs.push({
					path: fullPath,
					type: "added",
					newValue,
				});
			} else {
				const oldValue = oldPaths.get(path);
				if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
					diffs.push({
						path: fullPath,
						type: "changed",
						oldValue,
						newValue,
					});
				}
			}
		}

		for (const [path, oldValue] of oldPaths) {
			const fullPath = `block[${i}].${path}`;
			if (!newPaths.has(path)) {
				diffs.push({
					path: fullPath,
					type: "removed",
					oldValue,
				});
			}
		}
	}

	return diffs;
}

function generateSummary(diffs: JsonDiff[]): string {
	if (diffs.length === 0) {
		return "No JSON format changes detected between the two versions.";
	}

	const added = diffs.filter((d) => d.type === "added").length;
	const removed = diffs.filter((d) => d.type === "removed").length;
	const changed = diffs.filter((d) => d.type === "changed").length;

	const parts: string[] = [];
	if (added > 0) parts.push(`${added} additions`);
	if (removed > 0) parts.push(`${removed} removals`);
	if (changed > 0) parts.push(`${changed} modifications`);

	return `Found ${diffs.length} changes: ${parts.join(", ")}.`;
}

export async function compareVersions(
	args: CompareVersionsArgs,
): Promise<CallToolResult> {
	const { title, version1, version2 } = args;

	if (!title) {
		throw new Error("title is required");
	}
	if (!version1) {
		throw new Error("version1 is required");
	}
	if (!version2) {
		throw new Error("version2 is required");
	}

	const [rev1, rev2] = await Promise.all([
		findRevisionForVersion(title, version1),
		findRevisionForVersion(title, version2),
	]);

	const output: CompareVersionsOutput = {
		title,
		version1: {
			pattern: version1,
			revision: rev1,
		},
		version2: {
			pattern: version2,
			revision: rev2,
		},
		jsonDiffs: [],
		summary: "",
	};

	if (!rev1 && !rev2) {
		output.summary =
			`No revisions found matching version patterns "${version1}" or "${version2}". ` +
			"Try using search_page_revisions to find available version-related revisions.";
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(output, null, 2),
				},
			],
		};
	}

	if (!rev1) {
		output.summary =
			`No revision found matching version pattern "${version1}". ` +
			`Found revision for "${version2}".`;
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(output, null, 2),
				},
			],
		};
	}

	if (!rev2) {
		output.summary =
			`No revision found matching version pattern "${version2}". ` +
			`Found revision for "${version1}".`;
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(output, null, 2),
				},
			],
		};
	}

	const [content1, content2] = await Promise.all([
		getRevisionContent(rev1.revisionId),
		getRevisionContent(rev2.revisionId),
	]);

	const jsonBlocks1 = extractJsonBlocks(content1);
	const jsonBlocks2 = extractJsonBlocks(content2);

	output.jsonDiffs = compareJsonBlocks(jsonBlocks1, jsonBlocks2);
	output.summary = generateSummary(output.jsonDiffs);

	return {
		content: [
			{
				type: "text",
				text: JSON.stringify(output, null, 2),
			},
		],
	};
}
