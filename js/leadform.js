/**
 * Shared helper for the 4 non-loan lead-capture pages (accounts-lead.html,
 * cards-lead.html, insurance-lead.html, investments-lead.html). Not used by
 * lead.html (Loans) - that page predates this and has its own inline
 * CITY_STATE_MAP/field logic; left as-is rather than refactored, since it's
 * already tested and the two flows don't need to share state.
 *
 * Each of the 4 pages defines its own PRODUCT_EXTRA_FIELDS map (one entry
 * per product, an array of field specs) and calls renderExtraFields() to
 * turn that spec into real <div class="field-row"> markup, matching the
 * hand-written field-row markup already used for the common personal-detail
 * fields on every lead page.
 */
const CITY_STATE_MAP = {
  "Mumbai": "Maharashtra", "Pune": "Maharashtra",
  "Delhi": "Delhi",
  "Bengaluru": "Karnataka",
  "Chennai": "Tamil Nadu",
  "Hyderabad": "Telangana",
  "Kolkata": "West Bengal",
  "Ahmedabad": "Gujarat", "Vadodara": "Gujarat", "Surat": "Gujarat",
  "Jaipur": "Rajasthan",
  "Lucknow": "Uttar Pradesh",
  "Chandigarh": "Chandigarh",
  "Kochi": "Kerala",
  "Indore": "Madhya Pradesh",
};

const LeadFormHelper = (function () {
  "use strict";

  // field spec shape: { id, label, type: "text"|"number"|"date"|"select",
  // options?: string[] (for select), min/max/step?, placeholder?, optional?: bool }
  function renderField(spec) {
    const wrap = document.createElement("div");
    wrap.className = "field";

    const label = document.createElement("label");
    label.setAttribute("for", spec.id);
    label.innerHTML = spec.label + (spec.optional ? "" : ' <span class="req">*</span>');
    wrap.appendChild(label);

    let input;
    if (spec.type === "select") {
      input = document.createElement("select");
      input.innerHTML = '<option value="" disabled selected>Select</option>' +
        spec.options.map(function (o) { return '<option value="' + o + '">' + o + '</option>'; }).join("");
    } else {
      input = document.createElement("input");
      input.type = spec.type;
      if (spec.min !== undefined) input.min = spec.min;
      if (spec.max !== undefined) input.max = spec.max;
      if (spec.step !== undefined) input.step = spec.step;
      if (spec.placeholder) input.placeholder = spec.placeholder;
    }
    input.id = spec.id;
    input.name = spec.id;
    if (!spec.optional) input.required = true;
    wrap.appendChild(input);
    return wrap;
  }

  function renderExtraFields(container, fields) {
    container.innerHTML = "";
    for (let i = 0; i < fields.length; i += 2) {
      const row = document.createElement("div");
      row.className = "field-row";
      row.appendChild(renderField(fields[i]));
      if (fields[i + 1]) row.appendChild(renderField(fields[i + 1]));
      container.appendChild(row);
    }
  }

  function collectValues(fields) {
    const values = {};
    fields.forEach(function (spec) {
      const el = document.getElementById(spec.id);
      values[spec.id] = spec.type === "number" ? (Number(el.value) || 0) : el.value.trim();
    });
    return values;
  }

  function populateCityDropdown(selectEl, stateEl) {
    Object.keys(CITY_STATE_MAP).sort().forEach(function (city) {
      const opt = document.createElement("option");
      opt.value = city; opt.textContent = city;
      selectEl.appendChild(opt);
    });
    selectEl.addEventListener("change", function () {
      stateEl.value = CITY_STATE_MAP[selectEl.value] || "";
    });
  }

  return { renderExtraFields, collectValues, populateCityDropdown };
})();
