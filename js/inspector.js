/**
 * Data Layer Inspector — a dev/demo convenience panel, NOT part of the
 * actual Adobe Client Data Layer implementation. This just visualizes what's
 * already been pushed to window.adobeDataLayer in real time, so it's easy to
 * confirm the field names/values match the AEP schema before wiring up a
 * real Adobe Launch property.
 */
(function () {
  "use strict";

  function syntaxHighlight(obj) {
    const json = JSON.stringify(obj, null, 2);
    return json
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)/g, function (match) {
        const cls = /:$/.test(match) ? "k" : "s";
        return '<span class="' + cls + '">' + match + "</span>";
      });
  }

  function renderEvent(entry) {
    const list = document.getElementById("dl-events");
    if (!list) return;
    const item = document.createElement("div");
    item.className = "dl-event";
    const ts = (entry.web && entry.web.event_timestamp) || "";
    item.innerHTML =
      '<div class="dl-event-head">' +
        '<span class="dl-event-type">' + entry.event + "</span>" +
        '<span class="dl-event-time">' + ts + "</span>" +
      "</div>" +
      "<pre>" + syntaxHighlight(entry) + "</pre>";
    list.prepend(item);
    updateCount();
  }

  function updateCount() {
    const countEl = document.getElementById("dl-count");
    if (countEl) countEl.textContent = window.adobeDataLayer.length;
  }

  function init() {
    const toggle = document.getElementById("dl-toggle");
    const panel = document.getElementById("dl-inspector");
    if (toggle && panel) {
      toggle.addEventListener("click", function () {
        panel.classList.toggle("is-open");
      });
    }
    // Render anything already in the data layer (e.g. from this page's own
    // pageView call that fired before this script ran).
    window.adobeDataLayer.forEach(renderEvent);
    document.addEventListener("loan-dl-push", function (e) { renderEvent(e.detail); });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
