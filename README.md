# Elarix — Demo Website for Adobe Launch / AEP Web SDK Testing

A test site for a fictional bank, Elarix, covering the full HDFC-Bank-style
product taxonomy (Accounts & Deposits, Cards, Loans, Insurance,
Investments) — 25 products across 5 categories, each with a real
lead-capture application form, producing behavioral + lead data in a shape
built to be 1:1 mapped onto an AEP schema. Built so you can validate an
Adobe Launch → AEP Web SDK → Adobe Target implementation end-to-end before
pointing it at production traffic.

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

## The pages

Every category follows the same two-step pattern: a catalog page listing
its products, and a dedicated lead-capture page with a real application
form (common personal-detail fields + a few fields specific to whichever
product was picked).

| Page | File | Purpose |
|---|---|---|
| Home | `index.html` | Landing page. Has an empty Target personalization zone — see `MAPPING_GUIDE.md`. |
| Accounts & Deposits | `accounts.html` | Savings, Salary, Current accounts + Fixed/Recurring Deposits (5 products). "Open Account" leads to `accounts-lead.html`. |
| — Accounts lead form | `accounts-lead.html` | Submitting fires `bank.accountOpenSubmit`. |
| Cards | `cards.html` | Credit, Debit, Forex, Prepaid cards (4 products). "Apply Now" leads to `cards-lead.html`. |
| — Cards lead form | `cards-lead.html` | Submitting fires `bank.cardApplicationSubmit`. |
| Loans | `loans.html` | 8 loan products (Personal, Home, Car, Bike, Education, Gold, Business, Loan Against Property). "Apply Now" leads to `lead.html`. |
| — Loans lead form | `lead.html` | Submitting fires `loan.applicationSubmit`. |
| Insurance | `insurance.html` | Life, Health, Motor, Travel insurance (4 products). "Get Insured" leads to `insurance-lead.html`. |
| — Insurance lead form | `insurance-lead.html` | Submitting fires `bank.insuranceApplicationSubmit`. |
| Investments | `investments.html` | Mutual Funds, Demat & Trading, IPO, PPF & NPS (4 products). "Invest Now" leads to `investments-lead.html`. |
| — Investments lead form | `investments-lead.html` | Submitting fires `bank.investmentApplicationSubmit`. |

## What this site does and doesn't do

**Does:** push page-view, click, and form-submission data onto
`window.adobeDataLayer` in a shape that matches an AEP lead schema, for all
5 categories. That's the entire scope of `js/datalayer.js` — read it, it's
short. `js/leadform.js` is a small shared helper (city/state lookup +
dynamic per-product field rendering) used by the 4 non-loan lead pages;
`lead.html` (Loans) predates it and has its own inline copy.

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
- Reference IDs (`LNAPPWEB######` for Loans, `ACCWEB######` / `CARDWEB######`
  / `INSWEB######` / `INVWEB######` for the other 4) are client-generated
  placeholders — in production these come back from your backend after
  processing the submission, not the browser. See `MAPPING_GUIDE.md`.
- No Adobe Launch embed script is active yet — each page has a commented-out
  placeholder `<script>` tag (right after `js/datalayer.js`). Swap in the
  real Elarix Launch property embed URL once one exists.
- Google Fonts (Sora/Inter/JetBrains Mono) require internet access to load;
  the site has system-font fallbacks if they don't load.
