/**
 * ============================================================================
 * Elarix Demo — Adobe Client Data Layer (ACDL) Implementation
 * ============================================================================
 * window.adobeDataLayer is a plain array. Adobe Launch's ACDL extension (or
 * a Launch rule with a "Custom Code" / "Core - Direct Call" event type)
 * listens on this array for pushes and maps them to XDM fields via the AEP
 * Web SDK.
 *
 * Field names below are chosen to mirror a loan-lead schema the same way
 * the Cards site's fields mirror its card-lead schema — a "web" behavioral
 * object (event_type, page_name, click_target, loan_type_browsed, ...) and
 * a "loan" application object (loan_type, loan_amount_requested,
 * tenure_months, employment_type, ...), so mapping a Launch data element to
 * an XDM field requires no translation layer.
 * ============================================================================
 */

window.adobeDataLayer = window.adobeDataLayer || [];

const BankDataLayer = (function () {
  "use strict";

  const INT64_MAX = 9223372036854775807n;
  const STORAGE = {
    ecid: "loan_ecid",
    mobile: "loan_mobile_number",
    applicationId: "loan_application_id",
    applicationProfile: "loan_application_profile", // full submitted application, used for personalization
    lastProduct: "loan_last_product", // last loan product viewed, for browse-abandonment personalization
  };

  // ---- ECID: 38-digit, two-int64-half format. ----
  function randomInt64Half() {
    let n;
    do {
      let hex = "";
      for (let i = 0; i < 16; i++) hex += Math.floor(Math.random() * 16).toString(16);
      n = BigInt("0x" + hex) % (INT64_MAX + 1n);
    } while (n === 0n);
    return n.toString().padStart(19, "0");
  }

  function genECID() {
    return randomInt64Half() + randomInt64Half();
  }

  function getOrCreateECID() {
    let ecid = localStorage.getItem(STORAGE.ecid);
    if (!ecid) {
      ecid = genECID();
      localStorage.setItem(STORAGE.ecid, ecid);
    }
    return ecid;
  }

  // ---- Timestamp: strict ISO 8601 with IST +05:30 offset. ----
  function nowIST() {
    const d = new Date();
    const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
    const ist = new Date(utcMs + 5.5 * 3600000);
    const pad = (n) => String(n).padStart(2, "0");
    return (
      ist.getFullYear() + "-" + pad(ist.getMonth() + 1) + "-" + pad(ist.getDate()) +
      "T" + pad(ist.getHours()) + ":" + pad(ist.getMinutes()) + ":" + pad(ist.getSeconds()) +
      "+05:30"
    );
  }

  function genApplicationId() {
    const digits = String(Math.floor(Math.random() * 900000) + 100000);
    return "LNAPPWEB" + digits;
  }

  // ---- Campaign/channel attribution from URL query params. ----
  function getAttribution() {
    const params = new URLSearchParams(window.location.search);
    const campaign = params.get("utm_campaign") || "";
    let channel = "Direct";
    const source = params.get("utm_source");
    if (source) {
      const s = source.toLowerCase();
      if (s.includes("google") || s.includes("search")) channel = "Paid Search";
      else if (s.includes("fb") || s.includes("facebook") || s.includes("ig") || s.includes("social")) channel = "Paid Social";
      else if (s.includes("email")) channel = "Email";
      else channel = source;
    } else if (document.referrer && !document.referrer.includes(window.location.host)) {
      channel = "Organic";
    }
    return { campaign, channel };
  }

  function getMobile() { return localStorage.getItem(STORAGE.mobile) || ""; }
  function getApplicationId() { return localStorage.getItem(STORAGE.applicationId) || ""; }
  function getApplicationProfile() {
    const raw = localStorage.getItem(STORAGE.applicationProfile);
    return raw ? JSON.parse(raw) : null;
  }
  function getLastViewedProduct() {
    const raw = localStorage.getItem(STORAGE.lastProduct);
    return raw ? JSON.parse(raw) : null;
  }
  function setLastViewedProduct(loanType) {
    localStorage.setItem(STORAGE.lastProduct, JSON.stringify({ loan_type: loanType }));
  }

  function setKnownIdentity(mobile, applicationId) {
    if (mobile) localStorage.setItem(STORAGE.mobile, mobile);
    if (applicationId) localStorage.setItem(STORAGE.applicationId, applicationId);
  }

  function setApplicationProfile(profile) {
    localStorage.setItem(STORAGE.applicationProfile, JSON.stringify(profile));
  }

  // ---- Base "web" object shape - every event push extends this with
  // event-specific fields (page_name, click_target, etc). ----
  function baseWebObject(overrides) {
    const attribution = getAttribution();
    return Object.assign({
      ecid: getOrCreateECID(),
      mobile_number: getMobile(),
      application_id: getApplicationId(),
      event_type: "",
      event_timestamp: nowIST(),
      page_name: document.title.replace(" | Elarix", ""),
      page_url: window.location.pathname,
      click_target: "",
      loan_type_browsed: "",
      channel: attribution.channel,
      campaign: attribution.campaign,
    }, overrides || {});
  }

  function push(eventName, webOverrides, extra) {
    const entry = Object.assign({
      event: eventName,
      web: baseWebObject(webOverrides),
    }, extra || {});
    window.adobeDataLayer.push(entry);
    document.dispatchEvent(new CustomEvent("loan-dl-push", { detail: entry }));
    return entry;
  }

  // ---- Public event helpers - one per event_type in our schema ----
  function pageView(opts) {
    return push("loan.pageView", Object.assign({ event_type: "page_view" }, opts || {}));
  }
  function click(clickTarget, opts) {
    return push("loan.click", Object.assign({
      event_type: (opts && opts.event_type) || "cta_click",
      click_target: clickTarget,
    }, opts || {}));
  }
  function productClick(loanType) {
    setLastViewedProduct(loanType);
    return push("loan.productClick", {
      event_type: "product_click",
      click_target: loanType + " - View Details",
      loan_type_browsed: loanType,
    });
  }
  function applyClick(loanType) {
    return push("loan.applyClick", {
      event_type: "cta_click",
      click_target: loanType + " - Apply Now",
      loan_type_browsed: loanType,
    });
  }
  function offerClick(target, loanType) {
    return push("loan.offerClick", { event_type: "offer_click", click_target: target, loan_type_browsed: loanType || "" });
  }
  function bannerClick(target) {
    return push("loan.bannerClick", { event_type: "banner_click", click_target: target });
  }
  function applicationStart(loanType) {
    return push("loan.applicationStart", {
      event_type: "application_start",
      loan_type_browsed: loanType,
      click_target: loanType + " - Lead Form Opened",
    });
  }
  function applicationSubmit(applicationProfile) {
    const applicationId = genApplicationId();
    setKnownIdentity(applicationProfile.mobile_number, applicationId);
    const fullProfile = Object.assign({}, applicationProfile, {
      application_id: applicationId,
      current_application_stage: "Stage1_OTP_Verified",
      application_created_date: nowIST().slice(0, 10),
      country: "India",
    });
    setApplicationProfile(fullProfile);
    localStorage.removeItem(STORAGE.lastProduct);
    const attribution = getAttribution();
    fullProfile.campaign = fullProfile.campaign || attribution.campaign;
    return push("loan.applicationSubmit",
      { event_type: "application_submit", application_id: applicationId, loan_type_browsed: applicationProfile.loan_type,
        click_target: "Submit Application" },
      { loan: fullProfile }
    );
  }

  return {
    getOrCreateECID, nowIST, getAttribution, getMobile, getApplicationId, getApplicationProfile,
    getLastViewedProduct, setLastViewedProduct,
    pageView, click, productClick, applyClick, offerClick, bannerClick,
    applicationStart, applicationSubmit,
  };
})();
