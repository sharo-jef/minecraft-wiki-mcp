## ADDED Requirements

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
