/*
  পণ্যের ডিটেইল পেজ (product.html?id=...)।
  ছবির গ্যালারি, অপশন বাছা, পরিমাণ, কার্টে যোগ, সম্পর্কিত পণ্য।
  সব তথ্য আসে js/products.js থেকে।
*/
(function () {
  var TK = (window.TapKoro = window.TapKoro || {});
  var el = TK.ui.el;

  function notFound(root) {
    root.textContent = "";
    var box = el("div", "empty");
    box.appendChild(el("p", "", "We could not find this product."));
    var back = el("a", "btn btn-primary", "See all products");
    back.href = "index.html#products";
    box.appendChild(back);
    root.appendChild(box);
    document.title = "Product not found — TapKoro";
  }

  function render(root, product) {
    var cfg = TK.config;
    var selected = {};
    var qty = 1;
    var imageIndex = 0;

    document.title = product.name + " — TapKoro";
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", product.shortDescription);

    root.textContent = "";

    /* ---- গ্যালারি ---- */
    var gallery = el("div", "gallery");
    var main = el("div", "gallery-main");
    var thumbs = el("div", "gallery-thumbs");
    var thumbButtons = [];

    function showImage(i) {
      imageIndex = i;
      main.textContent = "";
      main.appendChild(TK.ui.productImage(product, i));
      thumbButtons.forEach(function (b, j) { b.setAttribute("aria-pressed", String(j === i)); });
    }

    var count = (product.images || []).length;
    if (count > 1) {
      product.images.forEach(function (src, i) {
        var b = el("button", "thumb");
        b.type = "button";
        b.setAttribute("aria-label", "Show photo " + (i + 1));
        var img = document.createElement("img");
        img.src = src;
        img.alt = "";
        img.loading = "lazy";
        img.addEventListener("error", function () { b.hidden = true; });
        b.appendChild(img);
        b.addEventListener("click", function () { showImage(i); });
        thumbs.appendChild(b);
        thumbButtons.push(b);
      });
    }
    gallery.appendChild(main);
    if (count > 1) gallery.appendChild(thumbs);

    /* ---- তথ্য ---- */
    var info = el("div", "detail-info");
    var badges = el("div", "detail-badges");
    if (product.stock === "out_of_stock") badges.appendChild(el("span", "badge badge-out", "Out of stock"));
    else (product.badges || []).forEach(function (b) { badges.appendChild(el("span", "badge", b)); });
    info.appendChild(badges);
    info.appendChild(el("h1", "detail-title", product.name));
    info.appendChild(TK.ui.priceBlock(product));
    info.appendChild(el("p", "detail-desc", product.description));

    /* ---- অপশন ---- */
    var optionError = el("p", "form-error");
    optionError.setAttribute("role", "alert");
    optionError.hidden = true;

    (product.options || []).forEach(function (opt) {
      var set = el("fieldset", "option-set");
      set.appendChild(el("legend", "", opt.label));
      var row = el("div", "option-row");
      opt.choices.forEach(function (choice, ci) {
        var id = "opt-" + opt.id + "-" + ci;
        var label = el("label", "option-chip");
        label.setAttribute("for", id);
        var input = el("input");
        input.type = "radio";
        input.name = "opt-" + opt.id;
        input.id = id;
        input.value = choice.value;
        input.addEventListener("change", function () {
          selected[opt.id] = choice.value;
          optionError.hidden = true;
          if (typeof choice.image === "number" && product.images[choice.image]) showImage(choice.image);
        });
        label.appendChild(input);
        label.appendChild(el("span", "", choice.value));
        row.appendChild(label);
      });
      set.appendChild(row);
      info.appendChild(set);
    });
    info.appendChild(optionError);

    /* ---- পরিমাণ ও বাটন ---- */
    var inStock = product.stock !== "out_of_stock";
    var buy = el("div", "buy-row");

    var stepper = el("div", "stepper");
    stepper.setAttribute("role", "group");
    stepper.setAttribute("aria-label", "Quantity");
    var minus = el("button", "", "−");
    minus.type = "button";
    minus.setAttribute("aria-label", "Decrease quantity");
    var qtyOut = el("output", "stepper-qty", "1");
    qtyOut.setAttribute("aria-live", "polite");
    var plus = el("button", "", "+");
    plus.type = "button";
    plus.setAttribute("aria-label", "Increase quantity");
    function setQty(n) {
      qty = Math.max(1, Math.min(TK.cart.MAX_QTY, n));
      qtyOut.textContent = String(qty);
      minus.disabled = qty <= 1;
      plus.disabled = qty >= TK.cart.MAX_QTY;
    }
    minus.addEventListener("click", function () { setQty(qty - 1); });
    plus.addEventListener("click", function () { setQty(qty + 1); });
    setQty(1);
    stepper.appendChild(minus);
    stepper.appendChild(qtyOut);
    stepper.appendChild(plus);

    function missingOption() {
      var opts = product.options || [];
      for (var i = 0; i < opts.length; i++) {
        if (!selected[opts[i].id]) return opts[i];
      }
      return null;
    }

    // অপশন না বাছলে ভুল দেখায়, নইলে কার্টে যোগ করে
    function addToCart() {
      var miss = missingOption();
      if (miss) {
        optionError.textContent = "Please choose: " + miss.label + ".";
        optionError.hidden = false;
        var first = info.querySelector('input[name="opt-' + miss.id + '"]');
        if (first) first.focus();
        return false;
      }
      return TK.cart.add(product.id, selected, qty);
    }

    var addBtn = el("button", "btn btn-primary", inStock ? "Add to cart" : "Out of stock");
    addBtn.type = "button";
    addBtn.disabled = !inStock;
    addBtn.addEventListener("click", function () {
      if (addToCart()) TK.ui.toast("Added to cart.");
    });

    var buyNow = el("button", "btn btn-ghost", "Buy now");
    buyNow.type = "button";
    buyNow.disabled = !inStock;
    buyNow.addEventListener("click", function () {
      if (addToCart()) window.location.href = "cart.html";
    });

    buy.appendChild(stepper);
    buy.appendChild(addBtn);
    buy.appendChild(buyNow);
    info.appendChild(buy);

    var ask = el("a", "detail-ask", "Ask about this product on WhatsApp");
    if (TK.isWhatsappConfigured()) {
      ask.href = TK.whatsappUrl(TK.ui.orderMessage(product));
      ask.target = "_blank";
      ask.rel = "noopener noreferrer";
      info.appendChild(ask);
    }

    /* ---- বৈশিষ্ট্য, ডেলিভারি, পেমেন্ট ---- */
    if (product.features && product.features.length) {
      var f = el("section", "detail-block");
      f.appendChild(el("h2", "detail-h", "Highlights"));
      var ul = el("ul", "tick-list");
      product.features.forEach(function (t) { ul.appendChild(el("li", "", t)); });
      f.appendChild(ul);
      info.appendChild(f);
    }

    var d = el("section", "detail-block");
    d.appendChild(el("h2", "detail-h", "Delivery and payment"));
    d.appendChild(el("p", "muted",
      "Delivery: " + TK.formatPrice(cfg.delivery.insideDhaka) + " inside Dhaka, " +
      TK.formatPrice(cfg.delivery.outsideDhaka) + " outside Dhaka."));
    d.appendChild(el("p", "muted", "We confirm your order and payment details with you on WhatsApp."));
    info.appendChild(d);

    var grid = el("div", "detail-grid");
    grid.appendChild(gallery);
    grid.appendChild(info);
    root.appendChild(grid);
    showImage(0);

    /* ---- সম্পর্কিত পণ্য ---- */
    var others = TK.products.filter(function (p) { return p.id !== product.id; });
    others.sort(function (a, b) { return (b.category === product.category ? 1 : 0) - (a.category === product.category ? 1 : 0); });
    others = others.slice(0, 3);
    if (others.length) {
      var rel = el("section", "section related");
      rel.appendChild(el("h2", "", "You may also like"));
      var rg = el("div", "grid");
      others.forEach(function (p) { rg.appendChild(TK.ui.productCard(p)); });
      rel.appendChild(rg);
      root.appendChild(rel);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var root = document.getElementById("product-detail");
    if (!root) return;
    var id = new URLSearchParams(window.location.search).get("id");
    var product = id && TK.getProduct(id);
    if (!product) return notFound(root);
    render(root, product);
  });
})();
