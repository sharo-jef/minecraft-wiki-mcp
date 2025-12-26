## ADDED Requirements

### Requirement: MediaWiki API Base Configuration
The system SHALL use `https://minecraft.wiki/api.php` as the base URL for all MediaWiki API requests.

#### Scenario: Default parameters
- **WHEN** any API call is made
- **THEN** request includes format=json and origin=* parameters

### Requirement: API Request Execution
The system SHALL execute HTTP GET requests to MediaWiki API and return parsed JSON responses.

#### Scenario: Successful API call
- **WHEN** callMediaWikiAPI is called with valid parameters
- **THEN** it returns parsed JSON response object

#### Scenario: API error response
- **WHEN** MediaWiki API returns error object
- **THEN** function throws WikiAPIError with code and message

#### Scenario: HTTP error
- **WHEN** HTTP request fails (non-2xx status)
- **THEN** function throws error with status code and message

### Requirement: Parameter Handling
The system SHALL convert all parameter values to strings and exclude undefined values.

#### Scenario: Mixed parameter types
- **WHEN** params include string, number, and boolean values
- **THEN** all values are converted to string in query string

#### Scenario: Undefined parameters
- **WHEN** params include undefined values
- **THEN** those parameters are omitted from request

### Requirement: Page Search API
The system SHALL support searching pages using action=query&list=search.

#### Scenario: Search pages
- **WHEN** search is performed with query text
- **THEN** request uses srsearch parameter
- **AND** returns array of matching pages with title, pageid, snippet

### Requirement: Page Content API
The system SHALL support retrieving page content using action=parse.

#### Scenario: Get latest page content
- **WHEN** page parameter is provided
- **THEN** returns latest revision with text and wikitext

#### Scenario: Get specific revision content
- **WHEN** oldid parameter is provided
- **THEN** returns content for that specific revision

### Requirement: Page Revision History API
The system SHALL support retrieving page revision history using action=query&prop=revisions.

#### Scenario: Get revision history
- **WHEN** titles parameter is provided
- **THEN** returns revisions with revid, timestamp, comment, user
