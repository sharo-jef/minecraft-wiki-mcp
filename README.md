# minecraft-wiki-mcp

> [!Important]
> This project uses OpenSpec for design and specifications.

Minecraft Wiki MCP provides a small MCP (Minecraft Content Provider) server
and helper tools to interact with the Minecraft Wiki (MediaWiki). It is
designed to help tooling and AI agents extract, compare, and generate
datapack-related data from wiki pages.

## Features

- `create_datapack_structure` — generate `pack.mcmeta` and directory structure
  for a target Minecraft version
  - auto-select `pack_format` for supported versions
  - support array-style `pack_format` (e.g. `[94, 1]`) and min/max formats
  - automatic directory naming (singular vs plural)
  - JSON Schema generation and version-specific warnings
- `get_pack_format_info` — mapping between Minecraft versions and pack formats
- `get_wiki_page` — fetch page content and extract JSON code blocks
- `search_wiki_page` — search pages with pagination
- `search_page_revisions` — query page revisions with filters (version/date)
- `compare_versions` — compare JSON-format diffs between versions

## MCP Server configuration example

For consumers that embed this MCP Server (example: Claude Desktop), add
the following to your MCP config so the server can be run via `npx`:

```json
{
  "mcpServers": {
    "minecraft-wiki": {
      "command": "npx",
      "args": ["minecraft-wiki-mcp"]
    }
  }
}
```

## Development Quickstart

### 1. Install dependencies

```bash
npm install
```

### 2. Build and run checks (recommended after code changes)

```bash
npm run check && npm run build
```

### 3. Run locally (if available)

```bash
npm start
```

## Development

```bash
npm run dev    # TypeScript watch mode
npm run check  # lint and format checks
npm test       # run tests (vitest)
```

## Notes

- After updating code used by the running MCP Server, restart the MCP Server
  to pick up the new code.
- For design decisions and change history see the `openspec/` directory.

## Repository layout

- `src/` — implementation and tests
- `tools/` — utility scripts
- `openspec/` — proposals and specs

## License

- MIT
