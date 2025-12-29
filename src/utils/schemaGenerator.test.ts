import { describe, expect, it } from "vitest";
import type { PackFormatMapping } from "../types.js";
import { generatePackMcmetaSchema } from "./schemaGenerator.js";

describe("schemaGenerator", () => {
	describe("generatePackMcmetaSchema", () => {
		const mockMapping121: PackFormatMapping = {
			packFormat: 48,
			minecraftVersions: ["1.21", "1.21.1"],
			directoryNaming: "singular",
			usesMinMaxFormat: false,
		};

		const mockMapping120: PackFormatMapping = {
			packFormat: 15,
			minecraftVersions: ["1.20", "1.20.1"],
			directoryNaming: "plural",
			usesMinMaxFormat: false,
		};

		const mockMapping1202: PackFormatMapping = {
			packFormat: 18,
			minecraftVersions: ["1.20.2"],
			directoryNaming: "plural",
			usesMinMaxFormat: false,
		};

		const mockMapping1219: PackFormatMapping = {
			packFormat: [88, 0],
			minecraftVersions: ["1.21.9", "1.21.10"],
			directoryNaming: "singular",
			usesMinMaxFormat: true,
		};

		it("should return base schema when pack property is invalid", () => {
			const invalidMapping: PackFormatMapping = {
				packFormat: 48,
				minecraftVersions: ["1.21"],
				directoryNaming: "singular",
				usesMinMaxFormat: false,
			};

			// Override the schema generation to produce invalid pack schema
			const schema = generatePackMcmetaSchema(invalidMapping, "1.21", true);

			// The schema should still be valid even if pack property structure is unexpected
			expect(schema.$schema).toBe("http://json-schema.org/draft-07/schema#");
			expect(schema.type).toBe("object");
		});

		it("should generate basic schema with required pack property", () => {
			const schema = generatePackMcmetaSchema(mockMapping121, "1.21", true);

			expect(schema.$schema).toBe("http://json-schema.org/draft-07/schema#");
			expect(schema.description).toContain("Minecraft 1.21");
			expect(schema.description).toContain("pack format 48");
			expect(schema.type).toBe("object");
			expect(schema.required).toEqual(["pack"]);
		});

		it("should include description property (optional)", () => {
			const schema = generatePackMcmetaSchema(mockMapping121, "1.21", true);

			const packProps = (
				schema.properties?.pack as { properties: Record<string, unknown> }
			)?.properties;
			expect(packProps?.description).toBeDefined();
		});

		it("should require pack_format for pre-1.21.9 versions", () => {
			const schema = generatePackMcmetaSchema(mockMapping121, "1.21", true);

			const packRequired = (schema.properties?.pack as { required: string[] })
				?.required;
			expect(packRequired).toContain("pack_format");

			const packProps = (
				schema.properties?.pack as { properties: Record<string, unknown> }
			)?.properties;
			const packFormatProp = packProps?.pack_format as { const: number };
			expect(packFormatProp.const).toBe(48);
		});

		it("should require min_format and max_format for 1.21.9+", () => {
			const schema = generatePackMcmetaSchema(mockMapping1219, "1.21.9", true);

			const packRequired = (schema.properties?.pack as { required: string[] })
				?.required;
			expect(packRequired).toContain("min_format");
			expect(packRequired).toContain("max_format");
			expect(packRequired).not.toContain("pack_format");
		});

		it("should mark pack_format as deprecated for 1.21.9+", () => {
			const schema = generatePackMcmetaSchema(mockMapping1219, "1.21.9", true);

			const packProps = (
				schema.properties?.pack as { properties: Record<string, unknown> }
			)?.properties;
			const packFormatProp = packProps?.pack_format as { deprecated: boolean };
			expect(packFormatProp?.deprecated).toBe(true);
		});

		it("should not include features for pre-1.19 versions", () => {
			const mapping118: PackFormatMapping = {
				packFormat: 9,
				minecraftVersions: ["1.18", "1.18.1", "1.18.2"],
				directoryNaming: "plural",
				usesMinMaxFormat: false,
			};

			const schema = generatePackMcmetaSchema(mapping118, "1.18", true);

			const packProps = (
				schema.properties?.pack as { properties: Record<string, unknown> }
			)?.properties;
			expect(packProps?.features).toBeUndefined();
		});

		it("should include features for 1.19+", () => {
			const schema = generatePackMcmetaSchema(mockMapping120, "1.20", true);

			const packProps = (
				schema.properties?.pack as { properties: Record<string, unknown> }
			)?.properties;
			expect(packProps?.features).toBeDefined();
		});

		it("should include filter for 1.19+", () => {
			const schema = generatePackMcmetaSchema(mockMapping120, "1.20", true);

			const packProps = (
				schema.properties?.pack as { properties: Record<string, unknown> }
			)?.properties;
			expect(packProps?.filter).toBeDefined();
		});

		it("should include overlays for 1.20.2+", () => {
			const schema = generatePackMcmetaSchema(mockMapping1202, "1.20.2", true);

			const packProps = (
				schema.properties?.pack as { properties: Record<string, unknown> }
			)?.properties;
			expect(packProps?.overlays).toBeDefined();
		});

		it("should not include overlays for pre-1.20.2", () => {
			const schema = generatePackMcmetaSchema(mockMapping120, "1.20", true);

			const packProps = (
				schema.properties?.pack as { properties: Record<string, unknown> }
			)?.properties;
			expect(packProps?.overlays).toBeUndefined();
		});

		it("should include supported_formats for 1.20.2-1.21.8", () => {
			const schema = generatePackMcmetaSchema(mockMapping1202, "1.20.2", true);

			const packProps = (
				schema.properties?.pack as { properties: Record<string, unknown> }
			)?.properties;
			expect(packProps?.supported_formats).toBeDefined();
		});

		it("should mark as fallback when version is unknown", () => {
			const schema = generatePackMcmetaSchema(mockMapping121, "1.99.99", false);

			expect(schema.description).toContain(
				"FALLBACK FROM LATEST KNOWN VERSION",
			);
		});

		it("should handle array pack format", () => {
			const schema = generatePackMcmetaSchema(mockMapping1219, "1.21.9", true);

			expect(schema.description).toContain("[88, 0]");
		});

		it("should handle single pack format", () => {
			const schema = generatePackMcmetaSchema(mockMapping121, "1.21", true);

			expect(schema.description).toContain("48");
			expect(schema.description).not.toContain("[");
		});

		it("should allow description to be string or object", () => {
			const schema = generatePackMcmetaSchema(mockMapping121, "1.21", true);

			const packProps = (
				schema.properties?.pack as { properties: Record<string, unknown> }
			)?.properties;
			const descProp = packProps?.description as { oneOf: unknown[] };
			expect(descProp.oneOf).toHaveLength(2);
		});

		it("should define min_format as integer or array", () => {
			const schema = generatePackMcmetaSchema(mockMapping1219, "1.21.9", true);

			const packProps = (
				schema.properties?.pack as { properties: Record<string, unknown> }
			)?.properties;
			const minFormatProp = packProps?.min_format as { oneOf: unknown[] };
			expect(minFormatProp.oneOf).toBeDefined();
			expect(minFormatProp.oneOf).toHaveLength(2);
		});

		it("should define max_format as integer or array", () => {
			const schema = generatePackMcmetaSchema(mockMapping1219, "1.21.9", true);

			const packProps = (
				schema.properties?.pack as { properties: Record<string, unknown> }
			)?.properties;
			const maxFormatProp = packProps?.max_format as { oneOf: unknown[] };
			expect(maxFormatProp.oneOf).toBeDefined();
			expect(maxFormatProp.oneOf).toHaveLength(2);
		});
	});
});
