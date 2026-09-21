# Contact Form via Web3Forms — Setup Guide

How `dipuhaider.me/contact` sends mail, and how to wire the same thing into any
other static / JAMstack project (Next.js export, Vite, Astro, plain HTML).

---

## 1. How it works

There is **no backend, no SMTP, no API route**. The browser POSTs the form
straight to Web3Forms, and Web3Forms emails it to the inbox that owns the
access key.

```
Browser form
   │  POST https://api.web3forms.com/submit
   │  { access_key, subject, from_name, name, email, message, ... }
   ▼
Web3Forms servers
   │  looks up the inbox registered to that access_key
   ▼
Your Gmail inbox
```

This is why the site can stay `output: 'export'` (fully static, deployed to
Netlify as a folder of files) and still have a working contact form.

**Where the mail lands:** the email address you typed when you generated the
access key at https://web3forms.com. For this portfolio that is
`dipuhaider@gmail.com`. You never configure the destination in code — the key
*is* the destination. To change the recipient, generate a new key for the new
address.

---

## 2. Reference implementation (this repo)

**`.env.local`**
```bash
NEXT_PUBLIC_WEB3FORMS_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**`app/contact/page.tsx`**
```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsSubmitting(true)
  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: process.env.NEXT_PUBLIC_WEB3FORMS_KEY,
        subject: `[Portfolio] ${formData.subject}`,
        from_name: formData.name,
        name: formData.name,
        email: formData.email,
        message: formData.message,
        projectType: formData.projectType,
      }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
    setIsSubmitted(true)
  } catch {
    alert('Something went wrong. Please email me directly at dipuhaider@gmail.com')
  } finally {
    setIsSubmitting(false)
  }
}
```

Any extra key in the JSON body (like `projectType`) shows up as its own row in
the email. The payload shape is free-form apart from the reserved fields below.

---

## 3. Setting it up in a new project (e.g. webarden.tech)

### Step 1 — Get an access key
1. Go to https://web3forms.com
2. Enter the inbox that should receive the mail (e.g. `hello@webarden.tech`)
3. Check that inbox, copy the access key from the email

The key is free, no account/dashboard required. One key per destination inbox.

### Step 2 — Store the key
```bash
# .env.local  (Next.js)
NEXT_PUBLIC_WEB3FORMS_KEY=your-key-here

# .env  (Vite)
VITE_WEB3FORMS_KEY=your-key-here
```

Add `.env.local` to `.gitignore`, and commit a `.env.example` with the name but
no value so the next person knows the variable exists.

### Step 3 — Add the same variable to the host
Local `.env` files are **not** uploaded. Set it in the dashboard too:
- **Netlify** → Site configuration → Environment variables
- **Vercel** → Settings → Environment Variables (tick all environments)
- **Cloudflare Pages** → Settings → Variables and Secrets

Then redeploy — the value is inlined at build time, so an existing build will
not pick it up.

### Step 4 — Drop in the handler
Copy the `handleSubmit` above, swap the env var name and the fallback email.

---

## 4. Reserved field names

| Field | Purpose |
|---|---|
| `access_key` | **Required.** Identifies the destination inbox. |
| `subject` | Email subject line. Prefix it (`[Webarden] …`) so you can filter. |
| `from_name` | Display name on the email. |
| `replyto` | Set to the sender's address so **Reply** goes to them, not to you. |
| `botcheck` | Honeypot. If truthy, the submission is silently dropped. |
| `redirect` | URL to redirect to. Omit for the JSON/AJAX flow used here. |
| `ccemail` | Copy a second address. |

Everything else is passed through into the email body as a labelled row.

---

## 5. Two improvements worth adding

The current portfolio implementation is missing both of these — add them to any
new project from the start.

**Reply-to**, so hitting Reply in Gmail actually answers the sender:
```tsx
body: JSON.stringify({
  access_key: process.env.NEXT_PUBLIC_WEB3FORMS_KEY,
  replyto: formData.email,     // ← add this
  // ...
})
```

**Honeypot**, to kill the bulk of bot spam. Render a field no human can see and
pass it through:
```tsx
<input
  type="checkbox"
  name="botcheck"
  className="hidden"
  style={{ display: 'none' }}
  tabIndex={-1}
  autoComplete="off"
/>
```
```tsx
botcheck: '',   // in the JSON body
```

---

## 6. Things to know before you rely on it

- **The key is public by design.** `NEXT_PUBLIC_` / `VITE_` variables are baked
  into the JavaScript bundle — anyone can read it in DevTools. This is fine for
  Web3Forms: the key only grants "send a message to the inbox that owns this
  key." It cannot read mail or change the destination. Do **not** treat it like
  a secret API key, and never reuse this pattern for keys that *are* secret
  (Stripe, database, OpenAI, etc.) — those need a real server route.
- **Free tier is 250 submissions/month.** Enough for a portfolio; check the
  pricing page if you expect real volume.
- **Mail can land in spam** the first few times. Send yourself a test and mark
  it "Not spam" so Gmail learns.
- **Always keep a fallback.** If the request fails, show a real `mailto:` so
  the visitor is never stranded — the `catch` block above does this.
- **Verify after every deploy.** A missing host env var makes `access_key`
  `undefined`, and the form fails at runtime with no build error.

---

## 7. Alternatives if you outgrow it

| Service | Good for |
|---|---|
| **Web3Forms** | Static sites, zero backend, free. What's used here. |
| **Formspree** | Similar, nicer dashboard, lower free tier. |
| **Netlify Forms** | Already on Netlify; just add `data-netlify="true"`. 100/mo free. |
| **Resend + API route** | Full control, custom templates. Needs a server runtime — drop `output: 'export'`. |
