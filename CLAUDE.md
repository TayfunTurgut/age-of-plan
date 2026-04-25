# Project notes for Claude

## Playwright screenshots / artifacts

When using the Playwright MCP tools (`browser_take_screenshot`, snapshot files, etc.), save outputs to `/tmp` rather than the repo. Pass an absolute path under `/tmp` for any `filename` parameter. The default `.playwright-mcp/` directory in the project root is gitignored, but writing to `/tmp` keeps the working tree clean and avoids accidental commits.
