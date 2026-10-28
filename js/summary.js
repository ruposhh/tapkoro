/*
  অর্ডারের হিসাবের বক্স (সাবটোটাল, ছাড়, ডেলিভারি, মোট)। কার্ট ও চেকআউট দুই পেজেই একই।
  options.editable = true হলে এখানেই ডেলিভারি এলাকা বাছা ও প্রোমো কোড বসানো যায়।
*/
(function () {
  var TK = (window.TapKoro = window.TapKoro || {});
  var el = TK.ui.el;

  var ZONES = [
    { id: "inside", label: "Inside Dhaka" },
    { id: "outside", label: "Outside Dhaka" },
  ];

  function zoneLabel(id) {
    var z = ZONES.filter(function (x) { return x.id === id; })[0];
    return z ? z.label : "";
  }

  function row(label, value, className) {
    var r = el("div", "sum-row" + (className ? " " + className : ""));
    r.appendChild(el("span", "", label));
    r.appendChild(el("span", "", value));
    return r;
  }

  function zoneSet(name) {
    var set = el("fieldset", "option-set zone-set");
    set.appendChild(el("legend", "", "Delivery area"));
    var rowEl = el("div", "option-row");
    ZONES.forEach(function (z) {
      var id = name + "-" + z.id;
      var label = el("label", "option-chip");
      label.setAttribute("for", id);
      var input = el("input");
      input.type = "radio";
      input.name = name;
      input.id = id;
      input.value = z.id;
      input.checked = TK.cart.zone() === z.id;
      input.addEventListener("change", function () { TK.cart.setZone(z.id); });
      label.appendChild(input);
      var fee = z.id === "inside" ? TK.config.delivery.insideDhaka : TK.config.delivery.outsideDhaka;
      label.appendChild(el("span", "", z.label + " · " + TK.formatPrice(fee)));
      rowEl.appendChild(label);
    });
    set.appendChild(rowEl);
    return set;
  }

  function promoBox() {
    var box = el("div", "promo");
    var current = TK.cart.promo();
    var msg = el("p", "promo-msg");
    msg.setAttribute("role", "status");

    if (current && TK.cart.discount() > 0) {
      msg.textContent = "Code " + current + " applied.";
      box.appendChild(msg);
      var rm = el("button", "link-btn", "Remove code");
      rm.type = "button";
      rm.addEventListener("click", function () { TK.cart.removePromo(); });
      box.appendChild(rm);
      return box;
    }

    var form = el("form", "promo-form");
    form.noValidate = true;
    var label = el("label", "visually-hidden", "Promo code");
    label.setAttribute("for", "promo-input");
    var input = el("input", "input");
    input.id = "promo-input";
    input.placeholder = "Promo code";
    input.autocomplete = "off";
    input.maxLength = 40;
    var btn = el("button", "btn btn-ghost", "Apply");
    btn.type = "submit";
    form.appendChild(label);
    form.appendChild(input);
    form.appendChild(btn);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var result = TK.cart.applyPromo(input.value);
      if (!result.ok) {
        msg.textContent = result.message;
        msg.classList.add("is-error");
        input.focus();
      }
    });
    box.appendChild(form);
    box.appendChild(msg);
    // কোড আছে কিন্তু এখন আর খাটছে না (যেমন ন্যূনতম অর্ডার কমে গেছে)
    if (current) {
      msg.textContent = "Code " + current + " does not apply to this order.";
      msg.classList.add("is-error");
    }
    // এলাকায় কোনো প্রোমো কোড না থাকলে বক্সটাই দেখাই না
    if (!(TK.config.promoCodes || []).length) box.hidden = true;
    return box;
  }

  function render(root, options) {
    options = options || {};
    root.textContent = "";
    var box = el("div", "summary");
    box.appendChild(el("h2", "summary-h", "Order summary"));

    if (options.editable) {
      box.appendChild(zoneSet("zone-cart"));
      box.appendChild(promoBox());
    }

    var sub = TK.cart.subtotal();
    var disc = TK.cart.discount();
    var fee = TK.cart.delivery();
    var list = el("div", "sum-rows");
    list.appendChild(row("Subtotal", TK.formatPrice(sub)));
    if (disc > 0) list.appendChild(row("Discount (" + TK.cart.promo() + ")", "−" + TK.formatPrice(disc), "sum-good"));
    list.appendChild(row("Delivery", fee == null ? "Choose area" : TK.formatPrice(fee)));
    list.appendChild(row("Total", TK.formatPrice(TK.cart.total()), "sum-total"));
    box.appendChild(list);

    if (!TK.config.delivery.confirmedByOwner) {
      box.appendChild(el("p", "muted sum-note", "Delivery charge will be confirmed on WhatsApp."));
    }
    root.appendChild(box);
    return box;
  }

  TK.summary = { render: render, ZONES: ZONES, zoneLabel: zoneLabel };
})();
