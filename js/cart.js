/*
  কার্টের হিসাব ও সংরক্ষণ। পেজ রিফ্রেশ করলেও কার্ট থাকে (ব্রাউজারের localStorage-এ)।
  দাম সবসময় js/products.js থেকে নতুন করে হিসাব হয়, তাই সংরক্ষিত দাম বদলে কেউ ঠকাতে পারে না।
  লাইন = একটা পণ্য + বেছে নেওয়া অপশন + পরিমাণ।
*/
(function () {
  var TK = (window.TapKoro = window.TapKoro || {});
  var KEY = "tapkoro-cart-v1";
  var MAX_QTY = 10;
  var listeners = [];

  var state = { lines: [], zone: "", promo: "" };

  /* ---------- সংরক্ষণ ---------- */
  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (raw && typeof raw === "object") {
        state.zone = raw.zone === "inside" || raw.zone === "outside" ? raw.zone : "";
        state.promo = typeof raw.promo === "string" ? raw.promo.slice(0, 40) : "";
        state.lines = Array.isArray(raw.lines) ? raw.lines : [];
      }
    } catch (e) {
      state = { lines: [], zone: "", promo: "" };
    }
    clean();
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) { /* প্রাইভেট মোডে সংরক্ষণ নাও চলতে পারে, কার্ট তখনও এই পেজে কাজ করবে */ }
  }

  // অচেনা পণ্য, শেষ হয়ে যাওয়া পণ্য, ভুল অপশন ও ভুল পরিমাণ ফেলে দেয়
  function clean() {
    var seen = {};
    state.lines = state.lines.filter(function (l) {
      if (!l || typeof l !== "object") return false;
      var p = TK.getProduct(l.id);
      if (!p || p.stock === "out_of_stock") return false;
      l.options = validOptions(p, l.options);
      if (!l.options) return false;
      l.qty = Math.floor(Number(l.qty));
      if (!(l.qty >= 1)) return false;
      if (l.qty > MAX_QTY) l.qty = MAX_QTY;
      l.key = lineKey(l.id, l.options);
      if (seen[l.key]) return false;
      seen[l.key] = true;
      return true;
    });
  }

  // প্রতিটি অপশনে ঠিক একটা বৈধ পছন্দ থাকতে হবে
  function validOptions(product, chosen) {
    var out = {};
    var opts = product.options || [];
    for (var i = 0; i < opts.length; i++) {
      var o = opts[i];
      var v = chosen && chosen[o.id];
      var ok = o.choices.some(function (c) { return c.value === v; });
      if (!ok) return null;
      out[o.id] = v;
    }
    return out;
  }

  function lineKey(id, options) {
    var parts = [id];
    Object.keys(options || {}).sort().forEach(function (k) { parts.push(k + "=" + options[k]); });
    return parts.join("|");
  }

  /* ---------- পরিবর্তন ---------- */
  function emit() {
    save();
    listeners.forEach(function (fn) { fn(); });
  }

  function onChange(fn) { listeners.push(fn); }

  function add(productId, options, qty) {
    var p = TK.getProduct(productId);
    if (!p || p.stock === "out_of_stock") return false;
    var opts = validOptions(p, options);
    if (!opts) return false;
    var key = lineKey(productId, opts);
    var n = Math.max(1, Math.min(MAX_QTY, Math.floor(Number(qty) || 1)));
    var found = state.lines.filter(function (l) { return l.key === key; })[0];
    if (found) found.qty = Math.min(MAX_QTY, found.qty + n);
    else state.lines.push({ key: key, id: productId, options: opts, qty: n });
    emit();
    return true;
  }

  function setQty(key, qty) {
    var l = state.lines.filter(function (x) { return x.key === key; })[0];
    if (!l) return;
    qty = Math.floor(Number(qty));
    if (!(qty >= 1)) return remove(key);
    l.qty = Math.min(MAX_QTY, qty);
    emit();
  }

  function remove(key) {
    state.lines = state.lines.filter(function (x) { return x.key !== key; });
    emit();
  }

  function clear() {
    state.lines = [];
    state.promo = "";
    emit();
  }

  function setZone(zone) {
    state.zone = zone === "inside" || zone === "outside" ? zone : "";
    emit();
  }

  /* ---------- প্রোমো কোড ---------- */
  function findPromo(code) {
    var c = String(code || "").trim().toUpperCase();
    if (!c) return null;
    var list = (TK.config.promoCodes || []);
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].code).toUpperCase() === c) return list[i];
    }
    return null;
  }

  // সফল হলে { ok: true }, নইলে { ok: false, message }
  function applyPromo(code) {
    var promo = findPromo(code);
    if (!promo || promo.active === false) return { ok: false, message: "This promo code is not valid." };
    var sub = subtotal();
    if (promo.minOrder && sub < promo.minOrder) {
      return { ok: false, message: "This code needs an order of at least " + TK.formatPrice(promo.minOrder) + "." };
    }
    state.promo = promo.code;
    emit();
    return { ok: true };
  }

  function removePromo() {
    state.promo = "";
    emit();
  }

  /* ---------- হিসাব ---------- */
  function subtotal() {
    return state.lines.reduce(function (sum, l) {
      return sum + TK.finalPrice(TK.getProduct(l.id)) * l.qty;
    }, 0);
  }

  function discount() {
    var promo = findPromo(state.promo);
    if (!promo || promo.active === false) return 0;
    var sub = subtotal();
    if (promo.minOrder && sub < promo.minOrder) return 0;
    var d = promo.type === "percent" ? Math.round((sub * promo.value) / 100) : promo.value;
    return Math.max(0, Math.min(sub, Math.round(d)));
  }

  // ডেলিভারি এলাকা না বাছলে null
  function delivery() {
    if (state.zone === "inside") return TK.config.delivery.insideDhaka;
    if (state.zone === "outside") return TK.config.delivery.outsideDhaka;
    return null;
  }

  function total() {
    return subtotal() - discount() + (delivery() || 0);
  }

  function count() {
    return state.lines.reduce(function (n, l) { return n + l.qty; }, 0);
  }

  function lines() {
    return state.lines.map(function (l) {
      return { key: l.key, product: TK.getProduct(l.id), options: l.options, qty: l.qty };
    });
  }

  load();
  // অন্য ট্যাবে কার্ট বদলালে এখানেও মিলিয়ে নেয়
  window.addEventListener("storage", function (e) {
    if (e.key === KEY) { load(); listeners.forEach(function (fn) { fn(); }); }
  });

  TK.cart = {
    MAX_QTY: MAX_QTY,
    add: add, setQty: setQty, remove: remove, clear: clear,
    setZone: setZone, applyPromo: applyPromo, removePromo: removePromo,
    subtotal: subtotal, discount: discount, delivery: delivery, total: total, count: count,
    lines: lines, onChange: onChange,
    zone: function () { return state.zone; },
    promo: function () { return state.promo; },
    optionText: function (options) {
      return Object.keys(options || {}).map(function (k) { return options[k]; }).join(", ");
    },
  };
})();
