# Automating the job hunt

TrackMyself owns the data and the rules: deduplication, the AI allowance and the $10 ceiling,
status history, and "a person always presses Submit". Everything else plugs in from outside
through one versioned API and signed webhooks.

| Piece | What it is for | How it connects |
|---|---|---|
| Daily cron | Search saved searches every morning, auto-prepare, send the report | `vercel.json` → `/api/cron/job-hunt` |
| Browser extension | LinkedIn / XING / StepStone capture and assisted form filling | Extension token |
| MCP server | Work the pipeline in conversation with Claude | Personal access token → `/api/v1` |
| n8n | Extra inputs (job-alert emails), extra schedules, chat notifications | Personal access token → `/api/v1`, webhooks ← TrackMyself |
| Notebook | Weekly analysis of what works | Read-only token → `/api/v1/insights` |

Create tokens in **Settings → Integrations**. Use one token per tool so you can revoke them
separately, and give each only the scopes it needs.

## The API

Base URL: `https://<your deployment>/api/v1`. Every request sends
`Authorization: Bearer tm_pat_…`. Limits: 120 requests a minute per token, plus the per-account
limits of the action itself.

| Method | Path | Scope | Notes |
|---|---|---|---|
| GET | `/me` | leads:read | Token check |
| GET | `/leads?status=open&platform=stepstone&minFit=60&sort=fit&page=1` | leads:read | Pagination envelope |
| POST | `/leads` | leads:write | `{ source, leads: [...] }`, at most 50 per call, `Idempotency-Key` header supported |
| GET | `/leads/:id` | leads:read | Includes description and gap questions |
| PATCH | `/leads/:id` | leads:write | `{ action: "shortlist" \| "dismiss" \| "restore" \| "answers", answers? }` |
| POST | `/leads/:id/prepare` | prepare | Tailored CV, cover letter, gap check. Up to a minute. 20 per hour |
| POST | `/hunt/run` | hunt:run | Runs saved searches now. 4 per hour |
| GET | `/report?date=YYYY-MM-DD` | report:read | The daily report |
| GET | `/insights?days=180` | report:read | One row per application, for analysis |
| GET | `/applications?status=Submitted` | applications:read | |
| PATCH | `/applications/:id` | applications:write | `applicationStatus`, `notes`, `followUpDate`, `priority` |

Approving a prepared application and marking it submitted are deliberately **not** in the API.

Lead ingest body:

```json
{
  "source": "email-alert",
  "leads": [
    {
      "title": "Frontend Developer (m/w/d)",
      "company": "Beispiel GmbH",
      "url": "https://www.linkedin.com/jobs/view/4012345678",
      "location": "Hamburg",
      "postedAt": "2026-10-12",
      "deadline": "2026-10-31",
      "description": "optional, up to 24,000 characters"
    }
  ]
}
```

The response reports `created`, `merged` (same job already in the inbox), `tracked` (already an
application) and `rejected` (missing title, company or link).

## Webhooks

Settings → Integrations → Webhook. Set the URL, pick events, create a signing secret, send a
test. Each delivery is a `POST` with JSON `{ "event", "at", "data" }` and two headers:

- `X-TM-Event`: `lead.created`, `lead.ready`, `application.submitted` or `report.daily`
- `X-TM-Signature`: `sha256=<hex HMAC-SHA256 of the raw body with your secret>`

Payloads hold headlines, ids and links, never CV text or letters. A receiver that needs more
calls the API. Delivery is best effort with one retry; the last status shows in Settings.

Verify the signature in an n8n **Code** node (the Webhook node must pass the raw body, option
"Raw Body"):

```js
const crypto = require("crypto");
const secret = $env.TM_WEBHOOK_SECRET;
const raw = $input.first().binary?.data
  ? Buffer.from($input.first().binary.data.data, "base64").toString("utf8")
  : JSON.stringify($input.first().json.body);
const expected = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
const given = $input.first().json.headers["x-tm-signature"];
if (!given || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
  throw new Error("Bad signature");
}
return [{ json: JSON.parse(raw) }];
```

## n8n recipes

Store the token as an n8n credential of type **Header Auth** (`Authorization` /
`Bearer tm_pat_…`) and use it in every HTTP Request node.

### 1. Job-alert emails into the inbox (the best LinkedIn source)

LinkedIn, XING and StepStone all email you job alerts. Reading your own inbox is the cleanest way
to get their postings without automating their websites.

1. **Gmail Trigger** (or IMAP Email): every 30 minutes, label or search
   `from:(jobalerts-noreply@linkedin.com OR jobs@xing.com OR noreply@stepstone.de) newer_than:1d`.
2. **Code** node: pull job links and titles out of the HTML. Starting point:

   ```js
   const html = $json.html ?? $json.textHtml ?? "";
   const out = [];
   const re = /<a[^>]+href="(https:\/\/(?:www\.)?(?:linkedin\.com\/(?:comm\/)?jobs\/view\/\d+|xing\.com\/jobs\/[^"?]+|stepstone\.de\/stellenangebote--[^"?]+))[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
   for (const m of html.matchAll(re)) {
     const title = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
     if (title.length > 3) out.push({ url: m[1].replace("/comm/", "/"), title });
   }
   return out.map((j) => ({ json: j }));
   ```

   Company names sit in different places in each sender's template; add them in a second step,
   or open the link and read the page title. Leads without a company are rejected, so check one
   real email per sender first.
3. **Aggregate** the items into one array, then **HTTP Request** `POST /api/v1/leads` with
   body `{ "source": "email-alert", "leads": {{$json.items}} }` and header
   `Idempotency-Key: {{$('Gmail Trigger').item.json.id}}`.

### 2. Search more often than once a day

**Schedule Trigger** every 3 hours from 07:00 to 19:00, then **HTTP Request**
`POST /api/v1/hunt/run`. The account limit is four runs an hour.

### 3. Ping your phone when applications are ready

**Webhook** node (POST, raw body) → **Code** (signature check above) → **IF**
`{{$json.event}} == "lead.ready"` → **Telegram** / **Slack**:
`Ready to review: {{$json.data.title}} at {{$json.data.company}} – https://<deployment>/me/jobs/{{$json.data.id}}`.

### 4. Daily report to chat

Subscribe to `report.daily`, or call `GET /api/v1/report` from a Schedule Trigger at 08:00 and
post the `summary` lines to your channel.

### 5. Follow-up nudges into your calendar

Subscribe to `application.submitted`, then **Google Calendar → Create event** seven days later:
"Follow up with {{$json.data.company}}".

## What not to automate

- Do not let n8n or any script submit applications on LinkedIn, XING or StepStone. All three
  forbid it, and LinkedIn restricts accounts that do it.
- Do not write to MongoDB from n8n. Everything goes through the API, so deduplication, limits
  and the AI budget stay in one place.
- Do not copy prompts or AI keys into n8n. Preparation runs in TrackMyself through the gateway.

## Running n8n

Self-hosted n8n (Docker on a small VPS) is free under its Sustainable Use License for your own
use. n8n Cloud is a paid subscription. The webhook URL must be public https; TrackMyself refuses
private and local addresses.
