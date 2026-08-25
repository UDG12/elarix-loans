# Elarix — Adobe Launch Data Layer Mapping Guide

One document, covering every data layer variable this site produces, exactly
how to pull each one into a Launch Data Element, and which AEP schema field
it maps to. Read this alongside `js/datalayer.js` (shared logic) +
`js/leadform.js` (shared helper for the 4 non-loan lead forms) and
`README.md` (how to run the site).

**This site's job stops at `window.adobeDataLayer.push(...)`.** ECID
generation and personalization decisioning are explicitly NOT implemented
here — see the callout boxes at the end of this document for why, and what
Launch/Target need to do instead.

Every catalog category (Accounts & Deposits, Cards, Loans, Insurance,
Investments) now has the same two-step funnel: a catalog page listing its
products, and a dedicated lead-capture page (`<category>-lead.html`, or
`lead.html` for Loans specifically) with a real application form. Submitting
any of the 5 forms pushes a `*.applicationSubmit`-style event carrying a
category-specific nested object — `loan`, `account`, `card`, `insurance`, or
`investment` — built the same way each time: common personal-detail fields
(name, mobile, email, DOB, PAN, city, state) plus a handful of
product-specific fields that vary by which product was picked.

---

## 0. Copy-paste path list (for the Data Element "Path" field)

Every path below is exactly what to paste into a Launch Data Element's
**Path** field (Data Element type: **"Data Layer variable value"** if using
the ACDL extension, or the JS Object path if using Custom Code). One Data
Element per line — name them however your naming convention prefers; the
suggested names are in sections 2–7 below if you want them.

**`web` object (present on every event):**
```
web.mobile_number
web.application_id
web.event_type
web.event_timestamp
web.page_name
web.page_url
web.click_target
web.loan_type_browsed
web.channel
web.campaign
```

**`loan` object (present ONLY on the `bob.applicationSubmit` event):**
```
loan.mobile_number
loan.first_name
loan.last_name
loan.email_id
loan.pan
loan.dob
loan.city
loan.state
loan.country
loan.employment_type
loan.monthly_income_inr
loan.loan_type
loan.loan_amount_requested
loan.tenure_months
loan.loan_purpose
loan.existing_emi_inr
loan.application_id
loan.current_application_stage
loan.application_created_date
loan.campaign
```

**`account` object (present ONLY on `bob.accountOpenSubmit` — see section 4 for the per-product extra fields, which vary):**
```
account.mobile_number
account.first_name
account.last_name
account.email_id
account.pan
account.dob
account.city
account.state
account.country
account.product_type
account.reference_id
account.application_created_date
account.campaign
```

**`card` object (present ONLY on `bob.cardApplicationSubmit` — see section 5 for the per-product extra fields):**
```
card.mobile_number
card.first_name
card.last_name
card.email_id
card.pan
card.dob
card.city
card.state
card.country
card.card_type
card.reference_id
card.application_created_date
card.campaign
```

**`insurance` object (present ONLY on `bob.insuranceApplicationSubmit` — see section 6 for the per-product extra fields):**
```
insurance.mobile_number
insurance.first_name
insurance.last_name
insurance.email_id
insurance.pan
insurance.dob
insurance.city
insurance.state
insurance.country
insurance.insurance_type
insurance.reference_id
insurance.application_created_date
insurance.campaign
```

**`investment` object (present ONLY on `bob.investmentApplicationSubmit` — see section 7 for the per-product extra fields):**
```
investment.mobile_number
investment.first_name
investment.last_name
investment.email_id
investment.pan
investment.dob
investment.city
investment.state
investment.country
investment.investment_type
investment.reference_id
investment.application_created_date
investment.campaign
```

**Top-level (to identify which event fired, if you need it as its own Data Element rather than filtering on the rule trigger):**
```
event
```

---

## 1. Events this site pushes

Every event name uses a `bob.*` prefix — this site reuses the BOB Cards
demo site's Adobe Launch property (see the README's known-limitations
section and the `js/leadform.js` note below), and that property's existing
Launch rules are built to match `bob.*` event names specifically. The
prefix isn't loan-specific — `bob.click` fires from every page, not just
Loans — it's just the namespace this Launch property recognizes. If this
site ever gets its own dedicated Launch property, the prefix can become
whatever's convenient (`elarix.*`, `loan.*`/`bank.*` split by category,
etc.) since nothing else in the codebase depends on the literal string.

| `event` name | Fires when | `event_type` value |
|---|---|---|
| `bob.pageView` | Every page load, all 13 pages | `page_view` |
| `bob.click` | Hero CTA buttons on Home; "Know More" toggles and tile hover on all 5 catalog pages; "Application Form Opened" on all 4 non-loan lead pages (reused with `event_type: "application_start"` instead of a dedicated function — see section 4-7 notes) | `cta_click`, `product_click`, or `application_start` |
| `bob.productClick` | First hover/view of a product tile on the Loan Products page specifically | `product_click` |
| `bob.applyClick` | Clicking "Apply Now" on a Loans product tile | `cta_click` |
| `bob.offerClick` | Reserved for promotional banners/offers (not currently used on any page, but the helper exists — call `BankDataLayer.offerClick(target, loanType)` from any new offer element) | `offer_click` |
| `bob.bannerClick` | Reserved for a Target-driven banner's CTA (see the Target callout below) | `banner_click` |
| `bob.applicationStart` | First focus into any field on the Loans lead form | `application_start` |
| `bob.applicationSubmit` | Loans lead form successfully submitted | `application_submit` |
| `bob.accountOpenSubmit` | Accounts & Deposits lead form successfully submitted | `application_submit` |
| `bob.cardApplicationSubmit` | Cards lead form successfully submitted | `application_submit` |
| `bob.insuranceApplicationSubmit` | Insurance lead form successfully submitted | `application_submit` |
| `bob.investmentApplicationSubmit` | Investments lead form successfully submitted | `application_submit` |

Every push has this shape (only one of `loan`/`account`/`card`/`insurance`/`investment` is ever present on a given event, and only on that category's `*Submit` event):
```js
{
  event: "bob.pageView",      // one of the 11 names above
  web: { ...fields, see section 2 },
  loan: { ...fields, see section 3 },         // ONLY on bob.applicationSubmit
  account: { ...fields, see section 4 },      // ONLY on bob.accountOpenSubmit
  card: { ...fields, see section 5 },         // ONLY on bob.cardApplicationSubmit
  insurance: { ...fields, see section 6 },    // ONLY on bob.insuranceApplicationSubmit
  investment: { ...fields, see section 7 }    // ONLY on bob.investmentApplicationSubmit
}
```

---

## 2. `web` object → Data Elements → shared behavioral schema

Create each of these as a Launch **Data Element**, type **"Data Layer variable value"** (if using the ACDL extension) or **"Custom Code"** returning the path (if reading `window.adobeDataLayer` directly). Path shown is relative to the pushed object.

| Data Element name | Path | XDM field (schema column) | Type | Notes |
|---|---|---|---|---|
| `DL - Mobile Number` | `web.mobile_number` | `mobile_number` | string | Blank until any category's submit sets it in `localStorage` for the session — see the identity callout below. |
| `DL - Application ID` | `web.application_id` | `application_id` | string | Blank until a submit event. Holds the loan `application_id` or the other categories' `reference_id`, whichever fired most recently — see placeholder-generator callout below. |
| `DL - Event Type` | `web.event_type` | `event_type` | string | Drives which Launch rule condition matches — see section 8. |
| `DL - Event Timestamp` | `web.event_timestamp` | `event_timestamp` | string (ISO 8601, `+05:30`) | Business-layer timestamp. The AEP Web SDK will also stamp its own `timestamp` on the XDM event automatically — you likely want both: this one for parity with the demo schema, the SDK's own for the authoritative event time. |
| `DL - Page Name` | `web.page_name` | `page_name` | string | `"Home"` / `"Accounts & Deposits"` / `"Cards"` / `"Loan Products"` / `"Insurance"` / `"Investments"` / `"Lead Submission"` / `"Lead Submission - Accounts & Deposits"` / `"Lead Submission - Cards"` / `"Lead Submission - Insurance"` / `"Lead Submission - Investments"` |
| `DL - Page URL` | `web.page_url` | `page_url` | string | Path only (e.g. `/loans.html`), not full origin |
| `DL - Click Target` | `web.click_target` | `click_target` | string | Human-readable description, e.g. `"Home Loan - Apply Now"` |
| `DL - Loan Type Browsed` | `web.loan_type_browsed` | `loan_type_browsed` | string (enum) | Only meaningfully populated on Loans pages: `Personal Loan` / `Home Loan` / `Car Loan` / `Bike Loan` / `Education Loan` / `Gold Loan` / `Business Loan` / `Loan Against Property`. Blank on the other 4 categories' events — their product name lives in `click_target` text and in the category object's `*_type` field instead (there's no equivalent `*_type_browsed` field on `web` for them). |
| `DL - Channel` | `web.channel` | `channel` | string | From `?utm_source=`, or `"Direct"`/`"Organic"` fallback |
| `DL - Campaign` | `web.campaign` | `campaign` | string | From `?utm_campaign=` |

**Not present in `web`:** `ecid` — see the ECID callout below.

---

## 3. `loan` object → Data Elements → loan application schema

Only exists on the `bob.applicationSubmit` push. Same approach: one Data Element per field, path rooted at `loan.*`.

| Data Element name | Path | XDM field | Type | Notes |
|---|---|---|---|---|
| `DL Loan - Mobile Number` | `loan.mobile_number` | `mobile_number` | string | |
| `DL Loan - First Name` | `loan.first_name` | `first_name` | string | |
| `DL Loan - Last Name` | `loan.last_name` | `last_name` | string | |
| `DL Loan - Email` | `loan.email_id` | `email_id` | string | |
| `DL Loan - PAN` | `loan.pan` | `pan` | string | Client-validated format `[A-Z]{5}[0-9]{4}[A-Z]{1}` only — not real eKYC |
| `DL Loan - DOB` | `loan.dob` | `dob` | string (date, `yyyy-MM-dd`) | |
| `DL Loan - City` | `loan.city` | `city` | string | One of the 15 cities in `CITY_STATE_MAP` |
| `DL Loan - State` | `loan.state` | `state` | string | Auto-filled from city client-side |
| `DL Loan - Country` | `loan.country` | `country` | string | Always `"India"` |
| `DL Loan - Employment Type` | `loan.employment_type` | `employment_type` | string (enum) | `Salaried` / `Self-Employed` / `Self-Employed Professional` |
| `DL Loan - Monthly Income` | `loan.monthly_income_inr` | `monthly_income_inr` | integer | |
| `DL Loan - Loan Type` | `loan.loan_type` | `loan_type` | string (enum) | e.g. `"Home Loan"` |
| `DL Loan - Amount Requested` | `loan.loan_amount_requested` | `loan_amount_requested` | integer | |
| `DL Loan - Tenure (Months)` | `loan.tenure_months` | `tenure_months` | integer | Capped client-side per product: 60 (Personal), 360 (Home), 84 (Car), 48 (Bike), 180 (Education), 36 (Gold), 96 (Business), 240 (Loan Against Property) |
| `DL Loan - Purpose` | `loan.loan_purpose` | `loan_purpose` | string (enum) | Only collected for `Personal Loan` and `Business Loan` (each with its own option list — see `PURPOSE_OPTIONS` in `lead.html`); empty string for the other 6 products |
| `DL Loan - Existing EMIs` | `loan.existing_emi_inr` | `existing_emi_inr` | integer | Defaults to `0` if left blank |
| `DL Loan - Application ID` | `loan.application_id` | `application_id` | string | Placeholder format `LNAPPWEB######` — see placeholder-generator callout below |
| `DL Loan - Current Stage` | `loan.current_application_stage` | `current_application_stage` | string (enum) | Always `"Stage1_OTP_Verified"` at submission — later stages get updated by your backend/LOS as the applicant progresses, not by this site |
| `DL Loan - Created Date` | `loan.application_created_date` | `application_created_date` | string (date) | |
| `DL Loan - Campaign` | `loan.campaign` | `campaign` | string | |

---

## 4. `account` object → Data Elements → Accounts & Deposits schema

Only exists on `bob.accountOpenSubmit`, fired from `accounts-lead.html`. The
common fields (mobile/name/email/pan/dob/city/state/country/reference_id/
created_date/campaign) are identical in shape to the `loan` object above —
only the product-specific fields differ by which of the 5 products was
selected (`PRODUCT_EXTRA_FIELDS` in `accounts-lead.html`).

| Data Element name | Path | XDM field | Type | Notes |
|---|---|---|---|---|
| `DL Account - Mobile Number` | `account.mobile_number` | `mobile_number` | string | |
| `DL Account - First Name` | `account.first_name` | `first_name` | string | |
| `DL Account - Last Name` | `account.last_name` | `last_name` | string | |
| `DL Account - Email` | `account.email_id` | `email_id` | string | |
| `DL Account - PAN` | `account.pan` | `pan` | string | |
| `DL Account - DOB` | `account.dob` | `dob` | string (date) | |
| `DL Account - City` | `account.city` | `city` | string | |
| `DL Account - State` | `account.state` | `state` | string | |
| `DL Account - Country` | `account.country` | `country` | string | Always `"India"` |
| `DL Account - Product Type` | `account.product_type` | `product_type` | string (enum) | `Savings Account` / `Salary Account` / `Current Account` / `Fixed Deposit` / `Recurring Deposit` |
| `DL Account - Occupation` | `account.occupation` | `occupation` | string (enum) | Savings Account only |
| `DL Account - Initial Deposit` | `account.initial_deposit_inr` | `initial_deposit_inr` | integer | Savings Account only |
| `DL Account - Employer Name` | `account.employer_name` | `employer_name` | string | Salary Account only |
| `DL Account - Monthly Income` | `account.monthly_income_inr` | `monthly_income_inr` | integer | Salary Account only |
| `DL Account - Business Name` | `account.business_name` | `business_name` | string | Current Account only |
| `DL Account - GSTIN` | `account.gstin` | `gstin` | string | Current Account only, optional |
| `DL Account - Deposit Amount` | `account.deposit_amount_inr` | `deposit_amount_inr` | integer | Fixed Deposit only |
| `DL Account - Tenure (Months)` | `account.tenure_months` | `tenure_months` | integer | Fixed Deposit and Recurring Deposit only |
| `DL Account - Payout Option` | `account.payout_option` | `payout_option` | string (enum) | Fixed Deposit only |
| `DL Account - Monthly Installment` | `account.monthly_installment_inr` | `monthly_installment_inr` | integer | Recurring Deposit only |
| `DL Account - Reference ID` | `account.reference_id` | `reference_id` | string | Placeholder format `ACCWEB######` |
| `DL Account - Created Date` | `account.application_created_date` | `application_created_date` | string (date) | |
| `DL Account - Campaign` | `account.campaign` | `campaign` | string | |

---

## 5. `card` object → Data Elements → Cards schema

Only exists on `bob.cardApplicationSubmit`, fired from `cards-lead.html`.

| Data Element name | Path | XDM field | Type | Notes |
|---|---|---|---|---|
| `DL Card - Mobile Number` | `card.mobile_number` | `mobile_number` | string | |
| `DL Card - First Name` | `card.first_name` | `first_name` | string | |
| `DL Card - Last Name` | `card.last_name` | `last_name` | string | |
| `DL Card - Email` | `card.email_id` | `email_id` | string | |
| `DL Card - PAN` | `card.pan` | `pan` | string | |
| `DL Card - DOB` | `card.dob` | `dob` | string (date) | |
| `DL Card - City` | `card.city` | `city` | string | |
| `DL Card - State` | `card.state` | `state` | string | |
| `DL Card - Country` | `card.country` | `country` | string | Always `"India"` |
| `DL Card - Card Type` | `card.card_type` | `card_type` | string (enum) | `Credit Card` / `Debit Card` / `Forex Card` / `Prepaid Card` |
| `DL Card - Employment Type` | `card.employment_type` | `employment_type` | string (enum) | Credit Card only |
| `DL Card - Monthly Income` | `card.monthly_income_inr` | `monthly_income_inr` | integer | Credit Card only |
| `DL Card - Linked Account Type` | `card.linked_account_type` | `linked_account_type` | string (enum) | Debit Card only |
| `DL Card - Destination Country` | `card.destination_country` | `destination_country` | string | Forex Card only |
| `DL Card - Load Amount (USD)` | `card.load_amount_usd` | `load_amount_usd` | integer | Forex Card only |
| `DL Card - Preload Amount` | `card.preload_amount_inr` | `preload_amount_inr` | integer | Prepaid Card only |
| `DL Card - Reference ID` | `card.reference_id` | `reference_id` | string | Placeholder format `CARDWEB######` |
| `DL Card - Created Date` | `card.application_created_date` | `application_created_date` | string (date) | |
| `DL Card - Campaign` | `card.campaign` | `campaign` | string | |

---

## 6. `insurance` object → Data Elements → Insurance schema

Only exists on `bob.insuranceApplicationSubmit`, fired from `insurance-lead.html`.

| Data Element name | Path | XDM field | Type | Notes |
|---|---|---|---|---|
| `DL Insurance - Mobile Number` | `insurance.mobile_number` | `mobile_number` | string | |
| `DL Insurance - First Name` | `insurance.first_name` | `first_name` | string | |
| `DL Insurance - Last Name` | `insurance.last_name` | `last_name` | string | |
| `DL Insurance - Email` | `insurance.email_id` | `email_id` | string | |
| `DL Insurance - PAN` | `insurance.pan` | `pan` | string | |
| `DL Insurance - DOB` | `insurance.dob` | `dob` | string (date) | |
| `DL Insurance - City` | `insurance.city` | `city` | string | |
| `DL Insurance - State` | `insurance.state` | `state` | string | |
| `DL Insurance - Country` | `insurance.country` | `country` | string | Always `"India"` |
| `DL Insurance - Insurance Type` | `insurance.insurance_type` | `insurance_type` | string (enum) | `Life Insurance` / `Health Insurance` / `Motor Insurance` / `Travel Insurance` |
| `DL Insurance - Sum Assured` | `insurance.sum_assured_inr` | `sum_assured_inr` | integer | Life Insurance only |
| `DL Insurance - Policy Term (Years)` | `insurance.policy_term_years` | `policy_term_years` | integer | Life Insurance only |
| `DL Insurance - Smoker` | `insurance.smoker` | `smoker` | string (enum: `Yes`/`No`) | Life Insurance only |
| `DL Insurance - Annual Income` | `insurance.annual_income_inr` | `annual_income_inr` | integer | Life Insurance only |
| `DL Insurance - Sum Insured` | `insurance.sum_insured_inr` | `sum_insured_inr` | integer | Health Insurance only |
| `DL Insurance - Family Members` | `insurance.family_members_count` | `family_members_count` | integer | Health Insurance only |
| `DL Insurance - Pre-Existing Condition` | `insurance.pre_existing_condition` | `pre_existing_condition` | string (enum: `Yes`/`No`) | Health Insurance only |
| `DL Insurance - Vehicle Type` | `insurance.vehicle_type` | `vehicle_type` | string (enum: `Car`/`Bike`) | Motor Insurance only |
| `DL Insurance - Vehicle Reg. Number` | `insurance.vehicle_registration_number` | `vehicle_registration_number` | string | Motor Insurance only |
| `DL Insurance - Manufacture Year` | `insurance.vehicle_manufacture_year` | `vehicle_manufacture_year` | integer | Motor Insurance only |
| `DL Insurance - Destination Country` | `insurance.destination_country` | `destination_country` | string | Travel Insurance only |
| `DL Insurance - Travel Start Date` | `insurance.travel_start_date` | `travel_start_date` | string (date) | Travel Insurance only |
| `DL Insurance - Travel End Date` | `insurance.travel_end_date` | `travel_end_date` | string (date) | Travel Insurance only |
| `DL Insurance - Traveler Count` | `insurance.traveler_count` | `traveler_count` | integer | Travel Insurance only |
| `DL Insurance - Reference ID` | `insurance.reference_id` | `reference_id` | string | Placeholder format `INSWEB######` |
| `DL Insurance - Created Date` | `insurance.application_created_date` | `application_created_date` | string (date) | |
| `DL Insurance - Campaign` | `insurance.campaign` | `campaign` | string | |

---

## 7. `investment` object → Data Elements → Investments schema

Only exists on `bob.investmentApplicationSubmit`, fired from `investments-lead.html`.

| Data Element name | Path | XDM field | Type | Notes |
|---|---|---|---|---|
| `DL Investment - Mobile Number` | `investment.mobile_number` | `mobile_number` | string | |
| `DL Investment - First Name` | `investment.first_name` | `first_name` | string | |
| `DL Investment - Last Name` | `investment.last_name` | `last_name` | string | |
| `DL Investment - Email` | `investment.email_id` | `email_id` | string | |
| `DL Investment - PAN` | `investment.pan` | `pan` | string | |
| `DL Investment - DOB` | `investment.dob` | `dob` | string (date) | |
| `DL Investment - City` | `investment.city` | `city` | string | |
| `DL Investment - State` | `investment.state` | `state` | string | |
| `DL Investment - Country` | `investment.country` | `country` | string | Always `"India"` |
| `DL Investment - Investment Type` | `investment.investment_type` | `investment_type` | string (enum) | `Mutual Funds` / `Demat & Trading` / `IPO` / `PPF & NPS` |
| `DL Investment - Investment Mode` | `investment.investment_mode` | `investment_mode` | string (enum: `SIP (Monthly)`/`Lumpsum`) | Mutual Funds only |
| `DL Investment - Investment Amount` | `investment.investment_amount_inr` | `investment_amount_inr` | integer | Mutual Funds only |
| `DL Investment - Risk Appetite` | `investment.risk_appetite` | `risk_appetite` | string (enum) | Mutual Funds only |
| `DL Investment - Trading Experience` | `investment.trading_experience` | `trading_experience` | string (enum) | Demat & Trading only |
| `DL Investment - Existing Demat A/c` | `investment.existing_demat_account` | `existing_demat_account` | string (enum: `Yes`/`No`) | Demat & Trading only |
| `DL Investment - UPI ID` | `investment.upi_id` | `upi_id` | string | IPO only |
| `DL Investment - Application Amount` | `investment.application_amount_inr` | `application_amount_inr` | integer | IPO only |
| `DL Investment - Account Type` | `investment.account_type` | `account_type` | string (enum: `PPF`/`NPS`) | PPF & NPS only |
| `DL Investment - Annual Contribution` | `investment.annual_contribution_inr` | `annual_contribution_inr` | integer | PPF & NPS only |
| `DL Investment - Reference ID` | `investment.reference_id` | `reference_id` | string | Placeholder format `INVWEB######` |
| `DL Investment - Created Date` | `investment.application_created_date` | `application_created_date` | string (date) | |
| `DL Investment - Campaign` | `investment.campaign` | `campaign` | string | |

---

## 8. Suggested Launch rule structure

One rule per event, all using the same trigger pattern:

```
Event:     Core - Direct Call Rule  (name: matches the "event" string, e.g. "bob.pageView")
           — or, if using the ACDL extension: "Adobe Client Data Layer > Event pushed",
             filtered to Event Name = "bob.pageView"
Condition: (none needed - the event name match above is the filter)
Action:    AEP Web SDK > Send Event
           XDM data: map each Data Element from sections 2-7 to its schema field
```

Repeat for all 11 event names in section 1. Each category's `*Submit` rule
is the only one whose action mapping includes that category's section (3
for `loan`, 4 for `account`, 5 for `card`, 6 for `insurance`, 7 for
`investment`) — never map more than one category's Data Elements onto the
same rule, since only one of those objects is ever present on a given event.

---

## ⚠️ Callout: ECID — do NOT recreate this in the data layer

This site's data layer has **no `ecid` field at all** in the pushed events
(the internal `loan_ecid` in `localStorage` only exists to give the Data
Layer Inspector panel something stable to show per browser). Once you
install the AEP Web SDK (via the Launch extension), it manages its own real
ECID — its own cookie, its own identity graph — automatically on every
`sendEvent` call. You don't need a Data Element for it, and pushing this
site's client-generated one into XDM would just create a fake identity that
collides with nothing and means nothing to Platform.

If you need to read the real ECID for debugging, that comes from the Web
SDK itself post-install:
```js
alloy("getIdentity").then(function (result) {
  console.log(result.identity.ECID);
});
```
— not from anything this repo's JavaScript builds.

## ⚠️ Callout: Personalization — do NOT recreate this in the data layer

`index.html` has an empty element, `<div id="target-zone-home-loan-banner" data-target-zone="home-loan-banner"></div>`,
with **zero JavaScript deciding what goes in it**. That's deliberate:

1. **Audience**: build a Target/AEP audience on the signal this data layer
   already produces — e.g. "has a `bob.applicationSubmit` event in the last
   7 days", or "`loan_type_browsed` equals `Home Loan`" for product-specific
   personalization. The same pattern extends to the other 4 categories using
   their own `*Submit` events (section 1).
2. **Activity**: author the actual banner content (headline, copy, the
   applicant's name/loan type if you want it dynamic) as a **Target
   activity** using the Visual Experience Composer, targeting the
   `#target-zone-home-loan-banner` element by CSS selector — not as
   hardcoded HTML/JS in this repo.
3. **Rendering**: Target's own `at.js` (or the Web SDK's personalization
   module, `alloy("sendEvent", { renderDecisions: true })`) fills the zone
   in at runtime. If you want a click on the resulting banner to register as
   a `bob.bannerClick` event, call `BankDataLayer.bannerClick(target)` from
   whatever markup Target actually renders in there — the helper function
   already exists in `datalayer.js`, ready for that.

The site also ships a **localStorage-based demo fallback** (in
`index.html`'s `personalizeHero()` / `personalize()` functions) that
rewrites the hero and shows the lower banner purely client-side, using
`BankDataLayer.getLastViewedProduct()` / `getApplicationProfile()` — this
guarantees the personalization *looks* real in a demo even before a real
Target activity is built. This fallback is Loans-specific; it hasn't been
extended to the other 4 categories' submits.

## A note on reference IDs (`application_id` / `reference_id`)

`genApplicationId()` (Loans) and `genRefId()` (the other 4 categories, in
`datalayer.js`) produce placeholders like `LNAPPWEB482913` / `ACCWEB119042`
purely so the demo has something schema-shaped to show in the inspector
panel. In a real implementation these IDs would come back from your
backend (LOS for loans, core banking/CRM for the others) after actually
processing the OTP-verified submission — not be invented client-side. Swap
the relevant generator's call site for whatever your backend returns once
one exists.
