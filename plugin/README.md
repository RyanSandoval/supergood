# Supergood Solutions agent plugin

An [Agent Plugins](https://agent-plugins.org) package for Supergood Solutions. It bundles:

- `skills/supergood`: when and how to read the rate card, the service list and the fit check.
- `skills/submit-fit-check`: the one call that emails an inquiry to Ryan.
- `mcp.json`: the hosted MCP server at `https://api.supergood.solutions/api/mcp` (Streamable HTTP, no key). Tools: `get_pricing`, `get_services`, `submit_fit_check`.

The skill files are copies of the ones served under `/.well-known/agent-skills/`. When you change one there, copy it here too.
