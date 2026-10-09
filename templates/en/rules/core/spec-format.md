# Core Rule: Specification Format

Each change must be structured with the following artifacts:

1. `proposal.md`:
   - `## Why`: Business justification and context.
   - `## What Changes`: List of behavioral additions and modifications.
   - `## Capabilities`: New or modified capability paths.
   - `## Impact`: Affected APIs, dependencies, and risks.

2. `design.md`:
   - Technical implementation details, architecture, and component design.

3. `specs/<capability>/spec.md`:
   - Requirement deltas using standard English headings:
     - `## ADDED Requirements`
     - `## MODIFIED Requirements`
     - `## REMOVED Requirements`
   - Requirement structure:
     ```markdown
     ### Requirement: <Requirement Name>
     The system SHALL <observable behavior>.

     #### Scenario: <Scenario Name>
     - **WHEN** <trigger condition>
     - **THEN** <expected result>
     ```

4. `specty.yaml`:
   - Governance status, approver metadata, and content hash.
