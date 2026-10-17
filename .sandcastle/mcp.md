# Sandcastle Host MCP Registry

This project utilizes Host-Level MCP (Model Context Protocol) servers executed via `agy`. The agents are authorized to interact with external environments according to their strict role boundaries.

## Active MCP Servers
- `google-colab`: Provision and execute remote notebook cells.
- `google-drive`: Manage and read remote files.
- `blender-mcp`: Execute 3D/rendering workflows.
- `postgres`: Execute relational PostgreSQL queries against configured databases.
- `neo4j-cypher`: Inspect Neo4j graph schemas and run Cypher queries.
- `playwright`: Automate and inspect browser state.
- `context7`, `huggingface`, `glbforge`, `threejs-devtools-mcp`, `threejsresources`, `telegram-api-mcp`, `telegram-bot-mcp`: Specialized domain and documentation servers.

## Schema Discovery
Because `agy` lazy-loads tools, do NOT guess parameters. You must read the exact JSON schema for the tool before calling it from the host MCP schema directories:
- `/Users/diesel/.gemini/antigravity-cli/mcp/<serverName>/<toolName>.json`
- `/Users/diesel/.gemini/antigravity-ide/mcp/<serverName>/<toolName>.json`

Example shell inspection:
`cat /Users/diesel/.gemini/antigravity-cli/mcp/<serverName>/<toolName>.json 2>/dev/null || cat /Users/diesel/.gemini/antigravity-ide/mcp/<serverName>/<toolName>.json`

## Role-Based Access Boundaries
1. **Planner (`plan.md`)**: You may prescribe MCP tool calls as acceptance criteria in decision tickets.
2. **Scanners (`plan-scan-1.md`, `plan-scan-2.md`, `plan-scan.md`)**: Strictly read-only reconnaissance. You may use read-only MCP tool calls to verify external schemas and capture ground-truth payloads. Never mutate remote state.
3. **Implementer (`implementer.md`)**: You are **authorized** to execute mutating actions via `call_mcp_tool` (e.g., creating files, running remote code) to fulfill ticket requirements. You must log created resource IDs/URLs in your handoff manifest.
4. **Reviewer (`reviewer.md`)**: STRICTLY READ-ONLY. You may use read-only MCP commands to verify schema contracts against the code. You must NEVER alter remote state.
5. **Tester (`tester.md`)**: You may define verification oracles that poll remote state or verify remote execution via MCP instead of relying solely on local `pytest`.
