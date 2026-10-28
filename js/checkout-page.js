/*
  চেকআউট পেজ (checkout.html): তথ্য নেওয়া, যাচাই, WhatsApp-এ অর্ডার পাঠানো।
  অর্ডার সার্ভারে জমা হয় না। কাস্টমারের তৈরি করা বার্তা WhatsApp-এ খোলে, কাস্টমার "Send" চাপলে অর্ডার বন্ধুর কাছে যায়।
*/
(function () {
  var TK = (window.TapKoro = window.TapKoro || {});
  var el = TK.ui.el;

  /* ---------- যাচাই ---------- */
  function normalizePhone(raw) {
    var p = String(raw || "").replace(/[\s\-()]/g, "");
    if (p.indexOf("+880") === 0) p = "0" + p.slice(4);
    else if (p.indexOf("880") === 0) p = "0" + p.slice(3);
    return p;
  }
  function validPhone(p) { return /^01[3-9]\d{8}$/.test(p); }

  function newOrderRef() {
    var d = new Date();
    var pad = function (n) { return String(n).padStart(2, "0"); };
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var rand = "";
    var buf = new Uint8Array(4);
    (window.crypto || { getRandomValues: function (a) { for (var i = 0; i < a.length; i++) a[i] = Math.random() * 256; } }).getRandomValues(buf);
    for (var i = 0; i < 4; i++) rand += chars[buf[i] % chars.length];
    return "TK-" + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + rand;
  }

  /* ---------- WhatsApp বার্তা ---------- */
  function buildMessage(ref, c) {
    var lines = TK.cart.lines();
    var t = [];
    t.push("New order from the TapKoro website");
    t.push("Order ref: " + ref);
    t.push("");
    t.push("Items:");
    lines.forEach(function (l, i) {
      var opt = TK.cart.optionText(l.options);
      t.push((i + 1) + ". " + l.product.name + (opt ? " (" + opt + ")" : "") +
        " x" + l.qty + " = " + TK.formatPrice(TK.finalPrice(l.product) * l.qty));
    });
    t.push("");
    t.push("Subtotal: " + TK.formatPrice(TK.cart.subtotal()));
    if (TK.cart.discount() > 0) t.push("Discount (" + TK.cart.promo() + "): -" + TK.formatPrice(TK.cart.discount()));
    t.push("Delivery (" + TK.summary.zoneLabel(TK.cart.zone()) + "): " + TK.formatPrice(TK.cart.delivery()) +
      (TK.config.delivery.confirmedByOwner ? "" : " (to be confirmed)"));
    t.push("Total: " + TK.formatPrice(TK.cart.total()));
    t.push("");
    t.push("Name: " + c.name);
    t.push("Phone: " + c.phone);
    t.push("Delivery area: " + TK.summary.zoneLabel(TK.cart.zone()));
    t.push("Address: " + c.address);
    if (c.note) t.push("Note: " + c.note);
    t.push("");
    t.push("Please confirm my order and payment details.");
    return t.join("\n");
  }

  /* ---------- ফর্মের ছোট অংশ ---------- */
  function field(id, labelText, control, hint) {
    var wrap = el("div", "form-field");
    var label = el("label", "form-label", labelText);
    label.setAttribute("for", id);
    control.id = id;
    var err = el("p", "form-error");
    err.id = id + "-error";
    err.hidden = true;
    control.setAttribute("aria-describedby", err.id);
    wrap.appendChild(label);
    wrap.appendChild(control);
    if (hint) wrap.appendChild(el("p", "muted form-hint", hint));
    wrap.appendChild(err);
    return { wrap: wrap, control: control, error: err };
  }

  function setError(f, message) {
    f.error.textContent = message || "";
    f.error.hidden = !message;
    if (message) f.control.setAttribute("aria-invalid", "true");
    else f.control.removeAttribute("aria-invalid");
    return !message;
  }

  /* ---------- সফল স্ক্রিন ---------- */
  function showSuccess(root, ref, message, url) {
    root.textContent = "";
    var box = el("div", "success");
    box.appendChild(el("h2", "", "Almost done"));
    box.appendChild(el("p", "", "Your order is ready to send. Your order reference is:"));
    box.appendChild(el("p", "success-ref", ref));
    box.appendChild(el("p", "muted",
      "WhatsApp should open with your order message. Press Send there to place the order. " +
      "We will reply to confirm your order and payment details."));

    var open = el("a", "btn btn-primary", "Open WhatsApp");
    open.href = url;
    open.target = "_blank";
    open.rel = "noopener noreferrer";
    box.appendChild(open);

    var copy = el("button", "btn btn-ghost", "Copy order message");
    copy.type = "button";
    copy.addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message).then(
          function () { TK.ui.toast("Order message copied."); },
          function () { TK.ui.toast("Could not copy. Please use the Open WhatsApp button."); }
        );
      } else {
        TK.ui.toast("Could not copy. Please use the Open WhatsApp button.");
      }
    });
    box.appendChild(copy);

    var home = el("a", "card-more", "Back to shop");
    home.href = "index.html#products";
    box.appendChild(home);
    root.appendChild(box);
    box.setAttribute("tabindex", "-1");
    box.focus();
  }

  /* ---------- পেজ ---------- */
  function renderForm(root) {
    root.textContent = "";
    var layout = el("div", "cart-layout");

    var form = el("form", "checkout-form");
    form.noValidate = true;
    form.appendChild(el("h2", "summary-h", "Your details"));

    var nameIn = el("input", "input");
    nameIn.type = "text";
    nameIn.autocomplete = "name";
    nameIn.maxLength = 80;
    var fName = field("co-name", "Full name", nameIn);

    var phoneIn = el("input", "input");
    phoneIn.type = "tel";
    phoneIn.inputMode = "tel";
    phoneIn.autocomplete = "tel";
    phoneIn.maxLength = 20;
    var fPhone = field("co-phone", "Mobile number", phoneIn, "Example: 01XXXXXXXXX");

    var addrIn = el("textarea", "input textarea");
    addrIn.rows = 3;
    addrIn.autocomplete = "street-address";
    addrIn.maxLength = 300;
    var fAddr = field("co-address", "Full delivery address", addrIn, "House, road, area and district.");

    var noteIn = el("textarea", "input textarea");
    noteIn.rows = 2;
    noteIn.maxLength = 300;
    var fNote = field("co-note", "Order note (optional)", noteIn);

    var zoneWrap = el("div");
    var zoneError = el("p", "form-error");
    zoneError.setAttribute("role", "alert");
    zoneError.hidden = true;

    form.appendChild(fName.wrap);
    form.appendChild(fPhone.wrap);
    form.appendChild(zoneWrap);
    form.appendChild(zoneError);
    form.appendChild(fAddr.wrap);
    form.appendChild(fNote.wrap);

    var pay = el("div", "detail-block");
    pay.appendChild(el("h2", "detail-h", "Payment"));
    pay.appendChild(el("p", "muted", "No payment is taken on this website. We confirm your order and payment details with you on WhatsApp."));
    form.appendChild(pay);

    var submitError = el("p", "form-error");
    submitError.setAttribute("role", "alert");
    submitError.hidden = true;
    var submit = el("button", "btn btn-primary cart-checkout", "Send order on WhatsApp");
    submit.type = "submit";
    form.appendChild(submitError);
    form.appendChild(submit);
    var back = el("a", "card-more", "Back to cart");
    back.href = "cart.html";
    form.appendChild(back);

    layout.appendChild(form);

    var side = el("div", "cart-side");
    var sumSlot = el("div");
    side.appendChild(sumSlot);
    layout.appendChild(side);
    root.appendChild(layout);

    function drawSide() {
      TK.summary.render(sumSlot, { editable: false });
      zoneWrap.textContent = "";
      var set = el("fieldset", "option-set zone-set");
      set.appendChild(el("legend", "", "Delivery area"));
      var row = el("div", "option-row");
      TK.summary.ZONES.forEach(function (z) {
        var id = "co-zone-" + z.id;
        var label = el("label", "option-chip");
        label.setAttribute("for", id);
        var input = el("input");
        input.type = "radio";
        input.name = "co-zone";
        input.id = id;
        input.value = z.id;
        input.checked = TK.cart.zone() === z.id;
        input.addEventListener("change", function () {
          TK.cart.setZone(z.id);
          zoneError.hidden = true;
        });
        label.appendChild(input);
        var fee = z.id === "inside" ? TK.config.delivery.insideDhaka : TK.config.delivery.outsideDhaka;
        label.appendChild(el("span", "", z.label + " · " + TK.formatPrice(fee)));
        row.appendChild(label);
      });
      set.appendChild(row);
      zoneWrap.appendChild(set);
    }
    drawSide();
    // হিসাব বদলালে শুধু হিসাব ও এলাকার অংশ নতুন করে আঁকি, ফর্মের লেখা যেন না হারায়
    TK.cart.onChange(function () {
      if (!TK.cart.lines().length && !submitted) { renderPage(root); return; }
      if (!submitted) drawSide();
    });

    var submitted = false;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (submitted) return;
      submitError.hidden = true;

      var name = nameIn.value.trim().replace(/\s+/g, " ");
      var phone = normalizePhone(phoneIn.value);
      var address = addrIn.value.trim();
      var note = noteIn.value.trim();

      var bad = [];
      if (!setError(fName, name.length < 2 ? "Please enter your name." : "")) bad.push(nameIn);
      if (!setError(fPhone, !validPhone(phone) ? "Please enter a valid mobile number, like 01XXXXXXXXX." : "")) bad.push(phoneIn);
      if (TK.cart.delivery() == null) {
        zoneError.textContent = "Please choose your delivery area.";
        zoneError.hidden = false;
        bad.push(zoneWrap.querySelector("input"));
      } else {
        zoneError.hidden = true;
      }
      if (!setError(fAddr, address.length < 10 ? "Please enter your full address (at least 10 characters)." : "")) bad.push(addrIn);

      if (bad.length) {
        // পেজের ওপরের দিকের ভুলটায় ফোকাস
        bad.sort(function (a, b) { return a.compareDocumentPosition(b) & 4 ? -1 : 1; });
        bad[0].focus();
        return;
      }
      if (!TK.isWhatsappConfigured()) {
        submitError.textContent = "Ordering is not available right now. Please try again later.";
        submitError.hidden = false;
        return;
      }

      submitted = true;
      submit.disabled = true;
      submit.textContent = "Opening WhatsApp…";

      var ref = newOrderRef();
      var message = buildMessage(ref, { name: name, phone: phone, address: address, note: note });
      var url = TK.whatsappUrl(message);
      TK.cart.clear();
      showSuccess(root, ref, message, url);
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  function renderPage(root) {
    if (!TK.cart.lines().length) {
      root.textContent = "";
      var empty = el("div", "empty");
      empty.appendChild(el("p", "", "Your cart is empty."));
      var shop = el("a", "btn btn-primary", "Shop products");
      shop.href = "index.html#products";
      empty.appendChild(shop);
      root.appendChild(empty);
      return;
    }
    renderForm(root);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var root = document.getElementById("checkout-root");
    if (root) renderPage(root);
  });
})();
