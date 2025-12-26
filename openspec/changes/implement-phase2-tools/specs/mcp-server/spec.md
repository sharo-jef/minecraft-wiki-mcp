## ADDED Requirements

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
