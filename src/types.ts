export interface PackMcmeta {
	pack: {
		pack_format?: number | [number, number];
		min_format?: number | [number, number];
		max_format?: number | [number, number];
		description?: string | object;
		supported_formats?:
			| number
			| number[]
			| { min_inclusive: number; max_inclusive: number };
		features?: { enabled: string[] };
		filter?: { block: unknown[] };
		overlays?: { entries: unknown[] };
	};
}

export function isValidNamespace(namespace: string): boolean {
	// Minecraft namespace rules:
	// - Must be lowercase letters, numbers, underscores, hyphens, or dots
	// - Cannot have multiple consecutive special characters
	// - Cannot start with a number
	const namespacePattern = /^[a-z][a-z0-9_.-]*$/;
	const noConsecutiveSpecial = /^(?!.*[_.-]{2})[a-z][a-z0-9_.-]*$/;

	return (
		namespace.length > 0 &&
		namespacePattern.test(namespace) &&
		noConsecutiveSpecial.test(namespace)
	);
}

export class InvalidNamespaceError extends Error {
	constructor(namespace: string) {
		super(
			`Invalid namespace: "${namespace}". Namespace must contain only lowercase letters, numbers, underscores, hyphens, and dots.`,
		);
		this.name = "InvalidNamespaceError";
	}
}

export interface DirectoryStructure {
	data: {
		[namespace: string]: {
			[directory: string]: string[];
		};
	};
}

export interface VersionInfo {
	minecraft_version: string;
	pack_format: number;
	directory_naming: "singular" | "plural";
	uses_min_max_format: boolean;
}

export interface JSONSchema {
	$schema?: string;
	description?: string;
	type?: string;
	properties?: Record<string, unknown>;
	required?: string[];
	[key: string]: unknown;
}

export interface DatapackFile {
	path: string;
	content: string | object;
}

export interface CreateDatapackOutput {
	files: Record<string, unknown>;
	packMcmetaSchema: JSONSchema;
	warnings: string[];
}

export interface WikiPage {
	title: string;
	pageid: number;
	revid: number;
	content: string;
	jsonBlocks?: unknown[];
}

export interface WikiRevision {
	revisionId: number;
	timestamp: string;
	comment: string;
	user: string;
}

export interface SearchResult {
	title: string;
	pageId: number;
	snippet: string;
}

export class WikiAPIError extends Error {
	constructor(
		message: string,
		public code?: string,
		public details?: unknown,
	) {
		super(message);
		this.name = "WikiAPIError";
	}
}

export class VersionNotFoundError extends Error {
	constructor(version: string) {
		super(`Version ${version} not found in Pack format data`);
		this.name = "VersionNotFoundError";
	}
}

export class PageNotFoundError extends Error {
	constructor(title: string) {
		super(`Page "${title}" not found`);
		this.name = "PageNotFoundError";
	}
}

export interface PackFormatMapping {
	packFormat: number | [number, number];
	minecraftVersions: string[];
	directoryNaming: "singular" | "plural";
	usesMinMaxFormat: boolean;
}

export type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
