# Elarix — Demo Website for Adobe Launch / AEP Web SDK Testing

A 3-page test site for a fictional bank, Elarix, that produces real,
in-browser behavioral and lead data for a loans (Personal / Home / Car /
Bike) funnel, in a shape built to be 1:1 mapped onto an AEP schema. Built
so you can validate an Adobe Launch → AEP Web SDK → Adobe Target
implementation end-to-end before pointing it at production traffic.

**For the field-by-field Launch Data Element mapping, read `MAPPING_GUIDE.md`
— that's the one document for wiring this up, kept separate from this
README so there's a single source of truth rather than two documents that
can drift out of sync.**

## Running it locally

No build step, no dependencies. From this folder:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/index.html`. (Any static file server works.
Opening the HTML files directly via `file://` mostly works too, but some
browsers block `localStorage` on `file://` origins, so a local server is safer.)

## The 3 pages

| Page | File | Purpose |
|---|---|---|
| Home | `index.html` | Landing page. Has an empty Target personalization zone — see `MAPPING_GUIDE.md`. |
| Loan Products | `loans.html` | All 8 loan products (Personal, Home, Car, Bike, Education, Gold, Business, Loan Against Property). Clicking "Apply Now" carries the chosen product into the lead form. |
| Apply | `lead.html` | The application form. Submitting it fires `application_submit`. |

## What this site does and doesn't do

**Does:** push page-view, click, and form-submission data onto
`window.adobeDataLayer` in a shape that matches a loan-lead AEP schema.
That's the entire scope of `js/datalayer.js` — read it, it's short.

**Does NOT:**
- Generate or manage ECID. That's the AEP Web SDK's job once installed via Launch.
- Decide what personalized content to show. That's Adobe Target's job,
  driven by a real Target activity + audience.

Both of the above are covered in `MAPPING_GUIDE.md`.

## Data Layer Inspector

`js/inspector.js` + the dark bar at the bottom of every page is a **demo
convenience only**, not part of a real Launch implementation. It renders
`window.adobeDataLayer` live so you can confirm field names/values while
testing, before wiring up real Launch rules. Click the bar to open it.

## Known limitations of this demo build

- No backend — nothing is actually sent anywhere. Open the browser console
  or the inspector panel to see what *would* be sent.
- PAN/mobile number validation is client-side pattern-matching only, not real eKYC.
- `application_id` is a client-generated placeholder (`LNAPPWEB######`) — in
  production this comes back from your backend/LOS (loan origination system)
  after processing the submission, not the browser. See `MAPPING_GUIDE.md`.
- No Adobe Launch embed script is active yet — each page has a commented-out
  placeholder `<script>` tag (right after `js/datalayer.js`). Swap in the
  real Elarix Launch property embed URL once one exists.
- Google Fonts (Sora/Inter/JetBrains Mono) require internet access to load;
  the site has system-font fallbacks if they don't load.
