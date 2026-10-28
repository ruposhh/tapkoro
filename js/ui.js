/*
  ছোট ছোট UI সাহায্যকারী: ছবির ফাঁকা জায়গা ও পণ্য কার্ড।
  ডাটা সবসময় textContent দিয়ে বসে, তাই কোনো লেখা কোড হিসেবে চলতে পারে না।
*/
(function () {
  var TK = (window.TapKoro = window.TapKoro || {});
  var SVG_NS = "http://www.w3.org/2000/svg";

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // ছবি না থাকলে নীল আভার ফাঁকা জায়গা (NFC তরঙ্গের আইকনসহ)
  function placeholder(label) {
    var box = el("div", "ph");
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.6");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("aria-hidden", "true");
    ["M5 9a8 8 0 0 1 0 6", "M9 7a11 11 0 0 1 0 10", "M13 5a14 14 0 0 1 0 14"].forEach(function (d) {
      var path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", d);
      svg.appendChild(path);
    });
    box.appendChild(svg);
    box.appendChild(el("span", "", label || "Photo coming soon"));
    return box;
  }

  // ছবি বসায়; না থাকলে বা লোড না হলে ফাঁকা জায়গা দেখায়
  function productImage(product, index, fallbackLabel) {
    var label = fallbackLabel || "Photo coming soon";
    var src = product.images && product.images[index || 0];
    if (!src) return placeholder(label);
    var img = document.createElement("img");
    img.src = src;
    img.alt = product.name;
    img.loading = "lazy";
    img.decoding = "async";
    img.addEventListener("error", function () {
      img.replaceWith(placeholder(label));
    });
    return img;
  }

  function priceBlock(product) {
    var wrap = el("div", "price");
    wrap.appendChild(el("span", "price-now", TK.formatPrice(TK.finalPrice(product))));
    var off = TK.discountPercent(product);
    if (off > 0) {
      wrap.appendChild(el("span", "price-was", TK.formatPrice(product.regularPrice)));
      wrap.appendChild(el("span", "price-off", off + "% off"));
    }
    return wrap;
  }

  // প্রতিটি পণ্যের "WhatsApp-এ অর্ডার" বাটন। নম্বর না থাকলে ছোট বার্তা দেখায়।
  function orderMessage(product, options) {
    var extra = options ? TK.cart.optionText(options) : "";
    return "Hi TapKoro, I have a question about: " + product.name + (extra ? " (" + extra + ")" : "") + ".";
  }

  function orderButton(product) {
    if (product.stock === "out_of_stock") {
      var off = el("button", "btn btn-ghost card-btn", "Out of stock");
      off.type = "button";
      off.disabled = true;
      return off;
    }
    if (TK.isWhatsappConfigured()) {
      var a = el("a", "btn btn-primary card-btn", "Order on WhatsApp");
      a.href = TK.whatsappUrl(orderMessage(product));
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      return a;
    }
    var b = el("button", "btn btn-primary card-btn", "Order on WhatsApp");
    b.type = "button";
    b.addEventListener("click", function () {
      toast("WhatsApp number is not set yet. The owner adds it in js/config.js.");
    });
    return b;
  }

  function detailUrl(product) {
    return "product.html?id=" + encodeURIComponent(product.id);
  }

  // কার্ডের বাটন: অপশন না থাকলে সরাসরি কার্টে, থাকলে ডিটেইল পেজে গিয়ে বাছতে হয়
  function cardButton(product) {
    if (product.stock === "out_of_stock") {
      var off = el("button", "btn btn-ghost card-btn", "Out of stock");
      off.type = "button";
      off.disabled = true;
      return off;
    }
    if (product.options && product.options.length) {
      var choose = el("a", "btn btn-primary card-btn", "Choose options");
      choose.href = detailUrl(product);
      return choose;
    }
    var add = el("button", "btn btn-primary card-btn", "Add to cart");
    add.type = "button";
    add.addEventListener("click", function () {
      if (TK.cart.add(product.id, {}, 1)) toast(product.name + " added to cart.");
    });
    return add;
  }

  function productCard(product) {
    var card = el("article", "card");

    var media = el("a", "card-media");
    media.href = detailUrl(product);
    media.setAttribute("aria-label", "View " + product.name);
    media.appendChild(productImage(product, 0));
    var badges = el("div", "card-badges");
    if (product.stock === "out_of_stock") {
      badges.appendChild(el("span", "badge badge-out", "Out of stock"));
    } else {
      (product.badges || []).forEach(function (b) {
        badges.appendChild(el("span", "badge", b));
      });
    }
    media.appendChild(badges);
    card.appendChild(media);

    var body = el("div", "card-body");
    var title = el("h3");
    var titleLink = el("a", "card-title", product.name);
    titleLink.href = detailUrl(product);
    title.appendChild(titleLink);
    body.appendChild(title);
    body.appendChild(el("p", "", product.shortDescription));
    if (product.orderNote) body.appendChild(el("p", "card-note", product.orderNote));
    body.appendChild(priceBlock(product));
    body.appendChild(cardButton(product));
    var more = el("a", "card-more", "View details");
    more.href = detailUrl(product);
    body.appendChild(more);
    card.appendChild(body);
    return card;
  }

  // ছোট বার্তা (যেমন "নম্বর এখনো বসানো হয়নি")
  var toastTimer;
  function toast(message) {
    var box = document.getElementById("toast");
    if (!box) {
      box = el("div", "toast");
      box.id = "toast";
      box.setAttribute("role", "status");
      box.setAttribute("aria-live", "polite");
      document.body.appendChild(box);
    }
    box.textContent = message;
    box.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.classList.remove("show"); }, 4000);
  }

  TK.ui = { detailUrl: detailUrl, orderButton: orderButton, orderMessage: orderMessage, toast: toast, el: el, placeholder: placeholder, productImage: productImage, priceBlock: priceBlock, productCard: productCard };
})();
