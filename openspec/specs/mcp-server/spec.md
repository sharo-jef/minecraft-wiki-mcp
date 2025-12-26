# mcp-server Specification

## Purpose
TBD - created by archiving change implement-phase1-mvp. Update Purpose after archive.
## Requirements
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

### Requirement: Get Pack Format Info Tool
The system SHALL provide `get_pack_format_info` tool that retrieves pack format information for Minecraft versions.

#### Scenario: Query by Minecraft version
- **WHEN** tool is called with minecraftVersion="1.21.2"
- **THEN** it returns pack_format, releases, changes, and directory_naming
- **AND** directory_naming is "singular" for 1.21+

#### Scenario: Query by pack format number
- **WHEN** tool is called with packFormat=57
- **THEN** it returns corresponding Minecraft versions and changes

#### Scenario: Unknown version
- **WHEN** tool is called with unknown minecraftVersion
- **THEN** it returns error or prompts to fetch from Pack_format page

### Requirement: Search Wiki Page Tool
The system SHALL provide `search_wiki_page` tool that searches for pages in Minecraft Wiki.

#### Scenario: Basic search
- **WHEN** tool is called with query="Recipe"
- **THEN** it returns array of matching pages with title, pageId, snippet

#### Scenario: Search with namespace filter
- **WHEN** tool is called with query="Recipe" and namespace=0
- **THEN** it returns only main namespace pages

#### Scenario: Search with limit
- **WHEN** tool is called with query="Recipe" and limit=5
- **THEN** it returns at most 5 results

### Requirement: Enhanced Error Handling - Page Not Found
The system SHALL suggest similar pages when requested page does not exist.

#### Scenario: Page not found with suggestions
- **WHEN** get_wiki_page is called with non-existent title
- **THEN** error response includes suggested similar page titles

### Requirement: Enhanced Error Handling - Revision Not Found
The system SHALL suggest closest revision when requested revision does not exist.

#### Scenario: Revision not found with suggestion
- **WHEN** get_wiki_page is called with invalid revisionId
- **THEN** error response includes nearest revision suggestion

### Requirement: API Rate Limit Handling
The system SHALL implement retry logic for MediaWiki API rate limit errors.

#### Scenario: Rate limited request
- **WHEN** MediaWiki API returns rate limit error
- **THEN** system waits and retries the request
- **AND** retries up to configurable max attempts

### Requirement: Compare Versions Tool
The system SHALL provide `compare_versions` tool that compares changes between two Minecraft versions on a specific wiki page.

#### Scenario: Compare recipe format between versions
- **WHEN** tool is called with page="Recipe", fromVersion="1.20.5", toVersion="1.21.2"
- **THEN** it returns revision info for both versions
- **AND** includes changes object describing format differences
- **AND** includes example_diff showing before/after JSON

#### Scenario: Detect ingredient format change
- **WHEN** comparing Recipe page between 1.20.5 and 1.21.2
- **THEN** changes object shows ingredient format changed from object to string

#### Scenario: List new and removed fields
- **WHEN** comparing versions with field changes
- **THEN** changes object includes new_fields and removed_fields arrays

#### Scenario: Version revision not found
- **WHEN** tool cannot find revision for specified version
- **THEN** it returns error with suggestion to search revisions manually

