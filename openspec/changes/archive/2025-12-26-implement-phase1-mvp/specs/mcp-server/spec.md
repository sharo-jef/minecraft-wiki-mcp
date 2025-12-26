## ADDED Requirements

### Requirement: MCP Server Initialization
The system SHALL initialize as an MCP server using StdioServerTransport, exposing tools for Minecraft Wiki data retrieval.

#### Scenario: Server startup
- **WHEN** the server process starts
- **THEN** it connects to stdio transport
- **AND** registers all available tools

### Requirement: Tool Registration
The system SHALL register all implemented tools with their input schemas when ListToolsRequest is received.

#### Scenario: List tools request
- **WHEN** MCP client sends ListToolsRequest
- **THEN** server returns array of tool definitions
- **AND** each tool includes name, description, and inputSchema

### Requirement: Tool Execution
The system SHALL execute the appropriate tool handler when CallToolRequest is received.

#### Scenario: Valid tool call
- **WHEN** MCP client calls a registered tool with valid arguments
- **THEN** server executes the tool handler
- **AND** returns result in MCP content format

#### Scenario: Unknown tool call
- **WHEN** MCP client calls an unknown tool name
- **THEN** server returns error message indicating unknown tool

### Requirement: Create Datapack Structure Tool
The system SHALL provide `create_datapack_structure` tool that generates pack.mcmeta and directory structure for a specific Minecraft version.

#### Scenario: Generate for 1.21+ version
- **WHEN** tool is called with minecraftVersion="1.21.2"
- **THEN** it returns pack_format for that version
- **AND** uses singular directory names (loot_table, function, recipe)

#### Scenario: Generate for pre-1.21 version
- **WHEN** tool is called with minecraftVersion="1.20.5"
- **THEN** it returns pack_format for that version
- **AND** uses plural directory names (loot_tables, functions, recipes)

#### Scenario: Generate with optional features
- **WHEN** tool is called with features=["recipes", "loot_tables"]
- **THEN** directory structure includes only specified feature directories

### Requirement: Get Wiki Page Tool
The system SHALL provide `get_wiki_page` tool that retrieves wiki page content from Minecraft Wiki.

#### Scenario: Get latest page content
- **WHEN** tool is called with title="Recipe"
- **THEN** it returns the latest revision content
- **AND** includes revisionId in response

#### Scenario: Get specific revision
- **WHEN** tool is called with title="Recipe" and revisionId=3269126
- **THEN** it returns content for that specific revision

#### Scenario: Extract JSON blocks
- **WHEN** tool is called with extractJson=true
- **THEN** response includes jsonBlocks array with parsed JSON from code blocks

#### Scenario: Plain text format
- **WHEN** tool is called with format="plain"
- **THEN** HTML tags are stripped from content

### Requirement: Search Page Revisions Tool
The system SHALL provide `search_page_revisions` tool that searches page edit history for version-specific revisions.

#### Scenario: Search with version pattern
- **WHEN** tool is called with title="Recipe" and versionPattern="1.21.2"
- **THEN** it returns revisions where comment contains "1.21.2"

#### Scenario: Search with date range
- **WHEN** tool is called with startDate and endDate
- **THEN** it returns only revisions within that date range

#### Scenario: Limit results
- **WHEN** tool is called with limit=5
- **THEN** it returns at most 5 revisions
