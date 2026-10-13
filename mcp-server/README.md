# TrackMyself MCP server

Lets Claude (Claude Desktop, Claude Code or any MCP client) work your TrackMyself job hunt in
conversation: "show today's StepStone jobs over 70% fit", "shortlist these three and prepare
them", "what is waiting for me?", "Siemens invited me to an interview, update it".

It runs locally over stdio and talks to TrackMyself only through the token-scoped automation
API (`/api/v1`). It never holds database credentials. Approving and submitting an application
are not exposed: you still review in TrackMyself and press Submit yourself.

## 1. Create a token

TrackMyself → **Settings → Integrations → API tokens**. Pick the **MCP server (Claude)** preset,
create the token and copy it (it is shown once).

## 2. Build

```bash
cd mcp-server
npm install
npm run build
```

Requires Node 22+.

## 3. Connect a client

### Claude Code

```bash
claude mcp add trackmyself \
  --env TRACKMYSELF_TOKEN=tm_pat_... \
  --env TRACKMYSELF_URL=https://trackmyself.webarden.tech \
  -- node "/absolute/path/to/track-myself/mcp-server/dist/index.js"
```

### Claude Desktop

Add to `claude_desktop_config.json` (Settings → Developer → Edit config):

```json
{
  "mcpServers": {
    "trackmyself": {
      "command": "node",
      "args": ["E:\Track Myself 2026\track-myself\mcp-server\dist\index.js"],
      "env": {
        "TRACKMYSELF_TOKEN": "tm_pat_...",
        "TRACKMYSELF_URL": "https://trackmyself.webarden.tech"
      }
    }
  }
}
```

Restart Claude Desktop. For local development point `TRACKMYSELF_URL` at `http://localhost:3000`.

## Tools

| Tool | Scope | What it does |
|---|---|---|
| `list_leads` | leads:read | Inbox, filtered by status, platform, fit, search |
| `get_lead` | leads:read | One lead with description, gaps and prepared notes |
| `shortlist_leads` / `dismiss_leads` | leads:write | Triage |
| `answer_gap_questions` | leads:write | Your own answers to gap questions, used by the next tailoring |
| `prepare_lead` | prepare | Tracked application + tailored CV + cover letter + gap check (uses AI) |
| `add_leads` | leads:write | Add jobs from a link or an alert email |
| `run_hunt` | hunt:run | Run saved searches now (4 per hour) |
| `daily_report` | report:read | Today's report |
| `insights` | report:read | Per-application outcomes for analysis |
| `list_applications` | applications:read | Tracked applications |
| `update_application_status` | applications:write | Status, notes, follow-up date, priority |

## Security

- The token lives only in your client's config. Revoke it in Settings → Integrations at any time.
- Give the token only the scopes you need. A read-only token cannot change anything.
- Pausing your account, losing job-hunt access or deleting the account stops the token at once.
