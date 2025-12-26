# Project Context

## Purpose

MCP (Model Context Protocol) Server for Minecraft Datapack creation support using Minecraft Wiki API. Provides AI agents with tools to explore version-specific datapack formats, pack.mcmeta generation, and JSON schema retrieval through MediaWiki API.

## Tech Stack

- TypeScript 5.9+ with ES2022 modules
- Node.js 18+ runtime
- @modelcontextprotocol/sdk for MCP implementation
- Biome for formatting and linting
- MediaWiki API (minecraft.wiki) for data retrieval

## Project Conventions

### Code Style

- Use Biome for formatting (tab indentation, double quotes)
- Organize imports automatically
- ES Modules only (`type: "module"` in package.json)
- Strict TypeScript with all compiler checks enabled
- Prefer async/await over promises

### Architecture Patterns

- **Tool-based design**: Each MCP tool is a self-contained module in `src/tools/`
- **API layer**: MediaWiki API wrapper in `src/api/mediawiki.ts` handles all HTTP requests
- **Utility separation**: Reusable functions in `src/utils/` (version mapping, JSON extraction)
- **AI agent self-service**: No static version mappings - provide exploration tools instead
- **Primitive operations**: Tools should be composable building blocks

### Tool Design Philosophy

1. **No static mappings**: Avoid hardcoding version→revision mappings (too much maintenance)
2. **Exploration over automation**: Let AI agents search revision history themselves
3. **Priority on correctness**: `create_datapack_structure` ensures pack.mcmeta accuracy
4. **Version-aware**: Handle directory name changes (1.21+: `loot_table` vs older: `loot_tables`)

### Testing Strategy

- Manual testing during development
- Integration tests with actual MediaWiki API responses
- Validate JSON extraction accuracy
- Test version detection logic with known Pack format values

### Git Workflow

- Main branch: `master`
- Direct commits for initial development
- Future: Feature branches for major changes
- Conventional commits preferred

## Domain Context

### Minecraft Datapack Versioning

- **Pack format**: Integer version number in pack.mcmeta
  - Format 1-87: Single `pack_format` field
  - Format 88.0+: `min_format`/`max_format` with minor versions
- **Directory naming changes**:
  - 1.21+ (format 48+): Singular names (`loot_table`, `function`, `recipe`, `tag/item`)
  - Pre-1.21: Plural names (`loot_tables`, `functions`, `recipes`, `tags/items`)
- **JSON schema evolution**: Formats change between versions (e.g., ingredient format in 1.21.2)

### MediaWiki API Endpoints

- Base URL: `https://minecraft.wiki/api.php`
- `action=query&list=search`: Search pages
- `action=parse&page={title}`: Get latest page content (HTML/wikitext)
- `action=parse&oldid={revid}`: Get specific revision
- `action=query&prop=revisions`: Get page edit history
- Template system: Pages use `{{Template}}` syntax (complex to parse)

### Key Wiki Pages

- **Pack_format**: Version history and breaking changes
- **Recipe**, **Loot table**, **Advancement**, etc.: JSON format examples
- **Data_pack**: Directory structure documentation

### Version Detection Strategy

AI agents should:

1. Search page revisions with `versionPattern` (e.g., "1.21.2")
2. Find revision ID from edit comments
3. Retrieve that specific revision for accurate format

## Important Constraints

- **No bundled data**: Don't package static version mappings (will become stale)
- **Rate limiting**: Respect MediaWiki API rate limits (consider caching)
- **Network dependency**: Requires internet access to function
- **Wiki structure changes**: Template rendering may change without notice
- **ES Modules only**: No CommonJS support (use `.js` extensions in imports for Node.js)

## External Dependencies

- **Minecraft Wiki** (minecraft.wiki): Primary data source via MediaWiki API
- **MediaWiki API**: RESTful API for page content and revision history
- **MCP SDK**: Protocol implementation for tool registration and execution
- **Node.js built-ins**: `http`/`https` for API requests (no external HTTP library needed)
