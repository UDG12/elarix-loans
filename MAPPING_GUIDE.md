# Elarix — Adobe Launch Data Layer Mapping Guide

One document, covering every data layer variable this site produces, exactly
how to pull each one into a Launch Data Element, and which AEP schema field
it maps to. Read this alongside `js/datalayer.js` (the actual implementation)
and `README.md` (how to run the site).

**This site's job stops at `window.adobeDataLayer.push(...)`.** ECID
generation and personalization decisioning are explicitly NOT implemented
here — see the two callout boxes at the end of this document for why, and
what Launch/Target need to do instead.

---

## 0. Copy-paste path list (for the Data Element "Path" field)

Every path below is exactly what to paste into a Launch Data Element's
**Path** field (Data Element type: **"Data Layer variable value"** if using
the ACDL extension, or the JS Object path if using Custom Code). One Data
Element per line — name them however your naming convention prefers; the
suggested names are in sections 2/3 below if you want them.

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

**`loan` object (present ONLY on the `loan.applicationSubmit` event):**
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

**Top-level (to identify which event fired, if you need it as its own Data Element rather than filtering on the rule trigger):**
```
event
```

---

## 1. Events this site pushes

| `event` name | Fires when | `event_type` value |
|---|---|---|
| `loan.pageView` | Every page load, all 3 pages | `page_view` |
| `loan.click` | Hero CTA buttons on Home | `cta_click` |
| `loan.productClick` | First hover/view of a product tile on Loan Products page | `product_click` |
| `loan.applyClick` | Clicking "Apply Now" on a product tile | `cta_click` |
| `loan.offerClick` | Reserved for promotional banners/offers (not currently used on any page, but the helper exists — call `BankDataLayer.offerClick(target, loanType)` from any new offer element) | `offer_click` |
| `loan.bannerClick` | Reserved for a Target-driven banner's CTA (see the Target callout below) | `banner_click` |
| `loan.applicationStart` | First focus into any field on the lead form | `application_start` |
| `loan.applicationSubmit` | Lead form successfully submitted | `application_submit` |

Every push has this shape:
```js
{
  event: "loan.pageView",      // one of the 8 names above
  web: { ...fields, see section 2 },
  loan: { ...fields, see section 3 }   // ONLY present on loan.applicationSubmit
}
```

---

## 2. `web` object → Data Elements → loan behavioral schema

Create each of these as a Launch **Data Element**, type **"Data Layer variable value"** (if using the ACDL extension) or **"Custom Code"** returning the path (if reading `window.adobeDataLayer` directly). Path shown is relative to the pushed object.

| Data Element name | Path | XDM field (schema column) | Type | Notes |
|---|---|---|---|---|
| `DL - Mobile Number` | `web.mobile_number` | `mobile_number` | string | Blank until `application_submit` sets it in `localStorage` for the session — see the identity callout below. |
| `DL - Application ID` | `web.application_id` | `application_id` | string | Blank until `application_submit`. See placeholder-generator callout below. |
| `DL - Event Type` | `web.event_type` | `event_type` | string | Drives which Launch rule condition matches — see section 4. |
| `DL - Event Timestamp` | `web.event_timestamp` | `event_timestamp` | string (ISO 8601, `+05:30`) | Business-layer timestamp. The AEP Web SDK will also stamp its own `timestamp` on the XDM event automatically — you likely want both: this one for parity with the demo schema, the SDK's own for the authoritative event time. |
| `DL - Page Name` | `web.page_name` | `page_name` | string | `"Home"` / `"Loan Products"` / `"Lead Submission"` |
| `DL - Page URL` | `web.page_url` | `page_url` | string | Path only (e.g. `/loans.html`), not full origin |
| `DL - Click Target` | `web.click_target` | `click_target` | string | Human-readable description, e.g. `"Home Loan - Apply Now"` |
| `DL - Loan Type Browsed` | `web.loan_type_browsed` | `loan_type_browsed` | string (enum) | `Personal Loan` / `Home Loan` / `Car Loan` / `Bike Loan` |
| `DL - Channel` | `web.channel` | `channel` | string | From `?utm_source=`, or `"Direct"`/`"Organic"` fallback |
| `DL - Campaign` | `web.campaign` | `campaign` | string | From `?utm_campaign=` |

**Not present in `web`:** `ecid` — see the ECID callout below.

---

## 3. `loan` object → Data Elements → loan application schema

Only exists on the `loan.applicationSubmit` push. Same approach: one Data Element per field, path rooted at `loan.*`.

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
| `DL Loan - Tenure (Months)` | `loan.tenure_months` | `tenure_months` | integer | Capped client-side per product (60 for Personal, 360 for Home, 84 for Car, 48 for Bike) |
| `DL Loan - Purpose` | `loan.loan_purpose` | `loan_purpose` | string (enum) | Only collected for `Personal Loan`; empty string for the other 3 products |
| `DL Loan - Existing EMIs` | `loan.existing_emi_inr` | `existing_emi_inr` | integer | Defaults to `0` if left blank |
| `DL Loan - Application ID` | `loan.application_id` | `application_id` | string | See placeholder-generator callout below |
| `DL Loan - Current Stage` | `loan.current_application_stage` | `current_application_stage` | string (enum) | Always `"Stage1_OTP_Verified"` at submission — later stages get updated by your backend/LOS as the applicant progresses, not by this site |
| `DL Loan - Created Date` | `loan.application_created_date` | `application_created_date` | string (date) | |
| `DL Loan - Campaign` | `loan.campaign` | `campaign` | string | |

---

## 4. Suggested Launch rule structure

One rule per event, all using the same trigger pattern:

```
Event:     Core - Direct Call Rule  (name: matches the "event" string, e.g. "loan.pageView")
           — or, if using the ACDL extension: "Adobe Client Data Layer > Event pushed",
             filtered to Event Name = "loan.pageView"
Condition: (none needed - the event name match above is the filter)
Action:    AEP Web SDK > Send Event
           XDM data: map each Data Element from sections 2/3 to its schema field
```

Repeat for all 8 event names in section 1. The `loan.applicationSubmit` rule is
the only one whose action mapping includes the section-3 Data Elements.

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
   already produces — e.g. "has a `loan.applicationSubmit` event in the last
   7 days", or "`loan_type_browsed` equals `Home Loan`" for product-specific
   personalization.
2. **Activity**: author the actual banner content (headline, copy, the
   applicant's name/loan type if you want it dynamic) as a **Target
   activity** using the Visual Experience Composer, targeting the
   `#target-zone-home-loan-banner` element by CSS selector — not as
   hardcoded HTML/JS in this repo.
3. **Rendering**: Target's own `at.js` (or the Web SDK's personalization
   module, `alloy("sendEvent", { renderDecisions: true })`) fills the zone
   in at runtime. If you want a click on the resulting banner to register as
   a `loan.bannerClick` event, call `BankDataLayer.bannerClick(target)` from
   whatever markup Target actually renders in there — the helper function
   already exists in `datalayer.js`, ready for that.

The site also ships a **localStorage-based demo fallback** (in
`index.html`'s `personalizeHero()` / `personalize()` functions) that
rewrites the hero and shows the lower banner purely client-side, using
`BankDataLayer.getLastViewedProduct()` / `getApplicationProfile()` — this
guarantees the personalization *looks* real in a demo even before a real
Target activity is built.

## A note on `application_id`

`genApplicationId()` in `datalayer.js` produces a placeholder like
`LNAPPWEB482913` purely so the demo has something schema-shaped to show in
the inspector panel. In a real implementation this ID would come back from
your backend/LOS after actually processing the OTP-verified submission —
not be invented client-side. Swap `genApplicationId()`'s call site for
whatever your backend returns once one exists.
