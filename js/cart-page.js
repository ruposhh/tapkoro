/*
  কার্ট পেজ (cart.html): কার্টের পণ্য, পরিমাণ বদলানো, মুছে ফেলা, হিসাব।
*/
(function () {
  var TK = (window.TapKoro = window.TapKoro || {});
  var el = TK.ui.el;

  function lineItem(line) {
    var p = line.product;
    var li = el("li", "cart-line");

    var media = el("a", "cart-media");
    media.href = TK.ui.detailUrl(p);
    media.setAttribute("aria-label", p.name);
    var imgIndex = 0;
    (p.options || []).forEach(function (o) {
      var c = o.choices.filter(function (x) { return x.value === line.options[o.id]; })[0];
      if (c && typeof c.image === "number") imgIndex = c.image;
    });
    media.appendChild(TK.ui.productImage(p, imgIndex));
    li.appendChild(media);

    var body = el("div", "cart-body");
    var name = el("a", "cart-name", p.name);
    name.href = TK.ui.detailUrl(p);
    body.appendChild(name);
    var optText = TK.cart.optionText(line.options);
    if (optText) body.appendChild(el("p", "muted cart-opt", optText));
    body.appendChild(el("p", "muted cart-unit", TK.formatPrice(TK.finalPrice(p)) + " each"));

    var controls = el("div", "cart-controls");
    var stepper = el("div", "stepper");
    stepper.setAttribute("role", "group");
    stepper.setAttribute("aria-label", "Quantity for " + p.name);
    var minus = el("button", "", "−");
    minus.type = "button";
    minus.setAttribute("aria-label", "Decrease quantity");
    minus.disabled = line.qty <= 1;
    minus.addEventListener("click", function () { TK.cart.setQty(line.key, line.qty - 1); });
    var q = el("output", "stepper-qty", String(line.qty));
    var plus = el("button", "", "+");
    plus.type = "button";
    plus.setAttribute("aria-label", "Increase quantity");
    plus.disabled = line.qty >= TK.cart.MAX_QTY;
    plus.addEventListener("click", function () { TK.cart.setQty(line.key, line.qty + 1); });
    stepper.appendChild(minus);
    stepper.appendChild(q);
    stepper.appendChild(plus);
    controls.appendChild(stepper);

    var rm = el("button", "link-btn", "Remove");
    rm.type = "button";
    rm.setAttribute("aria-label", "Remove " + p.name + " from cart");
    rm.addEventListener("click", function () { TK.cart.remove(line.key); });
    controls.appendChild(rm);
    body.appendChild(controls);
    li.appendChild(body);

    li.appendChild(el("p", "cart-total", TK.formatPrice(TK.finalPrice(p) * line.qty)));
    return li;
  }

  function render(root) {
    var lines = TK.cart.lines();
    root.textContent = "";

    if (!lines.length) {
      var empty = el("div", "empty");
      empty.appendChild(el("p", "", "Your cart is empty."));
      var shop = el("a", "btn btn-primary", "Shop products");
      shop.href = "index.html#products";
      empty.appendChild(shop);
      root.appendChild(empty);
      return;
    }

    var layout = el("div", "cart-layout");
    var list = el("ul", "cart-list");
    lines.forEach(function (l) { list.appendChild(lineItem(l)); });
    layout.appendChild(list);

    var side = el("div", "cart-side");
    var sumSlot = el("div");
    TK.summary.render(sumSlot, { editable: true });
    side.appendChild(sumSlot);

    var hint = el("p", "form-error");
    hint.setAttribute("role", "alert");
    hint.hidden = true;
    var go = el("a", "btn btn-primary cart-checkout", "Go to checkout");
    go.href = "checkout.html";
    go.addEventListener("click", function (e) {
      if (TK.cart.delivery() == null) {
        e.preventDefault();
        hint.textContent = "Please choose your delivery area first.";
        hint.hidden = false;
        var first = side.querySelector('input[name="zone-cart"]');
        if (first) first.focus();
      }
    });
    side.appendChild(hint);
    side.appendChild(go);
    var more = el("a", "card-more", "Continue shopping");
    more.href = "index.html#products";
    side.appendChild(more);
    layout.appendChild(side);
    root.appendChild(layout);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var root = document.getElementById("cart-root");
    if (!root) return;
    // রিফ্রেশের সময় ফোকাস হারিয়ে না যায়, তাই বদলালে পুরো পেজ নতুন করে আঁকি
    function redraw() {
      var active = document.activeElement;
      var name = active && active.name;
      var value = active && active.value;
      render(root);
      if (name) {
        var again = root.querySelector('input[name="' + name + '"][value="' + value + '"]');
        if (again) again.focus();
      }
    }
    redraw();
    TK.cart.onChange(redraw);
  });
})();
