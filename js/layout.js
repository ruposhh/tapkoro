/*
  সব পেজের একই হেডার, মোবাইল মেনু, ফুটার ও ভাসমান WhatsApp বাটন।
  এক জায়গায় বদলালে সব পেজে বদলে যায়।

  নতুন মেনু আইটেম যোগ করতে নিচের NAV তালিকায় একটা লাইন বাড়াও।
  শুধু সেই সেকশনের লিংক দাও যেটা সত্যিই পেজে আছে।
*/
(function () {
  var TK = (window.TapKoro = window.TapKoro || {});
  var el = TK.ui.el;
  var cfg = TK.config;
  var isHome = !!document.querySelector('[data-page="home"]');

  var NAV = [
    { label: "Home", hash: "#top" },
    { label: "Products", hash: "#products" },
    { label: "How it works", hash: "#how" },
    { label: "FAQ", hash: "#faq" },
    { label: "About", hash: "#about" },
    { label: "Contact", hash: "#contact" },
  ];

  // হোম ছাড়া অন্য পেজে থাকলে লিংক index.html-এ ফিরে যাবে
  function href(hash) {
    return (isHome ? "" : "index.html") + hash;
  }

  function link(className, text, hash) {
    var a = el("a", className, text);
    a.href = href(hash);
    return a;
  }

  /* আসল TapKoro লোগো: ডার্কে "Tap" সাদা লোগো, লাইটে আসল লোগো (theme.css একটা লুকিয়ে রাখে) */
  function oneLogo(cls, file, mode) {
    var img = document.createElement("img");
    img.className = "brand-logo " + cls + " " + mode;
    img.src = "assets/brand/" + file;
    img.alt = mode === "logo-dark-only" ? cfg.brandName : "";
    if (mode !== "logo-dark-only") img.setAttribute("aria-hidden", "true");
    img.width = 1200; img.height = 301;
    img.decoding = "async";
    return img;
  }
  function logoImg(cls) {
    var f = document.createDocumentFragment();
    f.appendChild(oneLogo(cls, "logo-on-dark.webp", "logo-dark-only"));
    f.appendChild(oneLogo(cls, "logo.webp", "logo-light-only"));
    return f;
  }

  /* ---------- হেডার ও মোবাইল মেনু ---------- */
  function buildHeader() {
    var header = el("header", "site-header");
    var bar = el("div", "wrap bar");

    var brand = el("a", "brand");
    brand.href = href("#top");
    brand.setAttribute("aria-label", cfg.brandName + " home");
    brand.appendChild(logoImg("header-logo"));

    var nav = el("nav", "nav");
    nav.setAttribute("aria-label", "Main");
    NAV.forEach(function (item) {
      nav.appendChild(link("nav-link", item.label, item.hash));
    });

    var cta = link("btn btn-primary nav-cta", "Shop now", "#products");

    var cartLink = el("a", "cart-link");
    cartLink.href = "cart.html";
    var cartIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    cartIcon.setAttribute("viewBox", "0 0 24 24");
    cartIcon.setAttribute("fill", "none");
    cartIcon.setAttribute("stroke", "currentColor");
    cartIcon.setAttribute("stroke-width", "1.8");
    cartIcon.setAttribute("stroke-linecap", "round");
    cartIcon.setAttribute("stroke-linejoin", "round");
    cartIcon.setAttribute("aria-hidden", "true");
    ["M3 4h2.2l2.1 10.2a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.8L19.5 8H6.1", "M9.5 19.5h.01", "M16.5 19.5h.01"].forEach(function (d) {
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      cartIcon.appendChild(path);
    });
    var cartCount = el("span", "cart-count", "0");
    cartLink.appendChild(cartIcon);
    cartLink.appendChild(cartCount);
    function updateCart() {
      var n = TK.cart.count();
      cartCount.textContent = String(n);
      cartCount.hidden = n === 0;
      cartLink.setAttribute("aria-label", "Cart, " + n + (n === 1 ? " item" : " items"));
    }
    updateCart();
    TK.cart.onChange(updateCart);

    var themeBtn = el("button", "theme-toggle");
    themeBtn.type = "button";
    themeBtn.innerHTML =
      '<svg class="ic-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.5 4.5l1.4 1.4M18.1 18.1l1.4 1.4M2.5 12h2M19.5 12h2M4.5 19.5l1.4-1.4M18.1 5.9l1.4-1.4"/></svg>' +
      '<svg class="ic-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/></svg>';
    function syncTheme() {
      var light = TK.theme && TK.theme.get() === "light";
      themeBtn.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");
      themeBtn.setAttribute("aria-pressed", String(!!light));
    }
    syncTheme();
    themeBtn.addEventListener("click", function () {
      if (TK.theme) TK.theme.toggle();
      syncTheme();
    });

    var burger = el("button", "burger");
    burger.type = "button";
    burger.id = "menu-button";
    burger.setAttribute("aria-label", "Open menu");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-controls", "mobile-menu");
    for (var i = 0; i < 3; i++) burger.appendChild(el("span"));

    bar.appendChild(brand);
    bar.appendChild(nav);
    bar.appendChild(cta);
    bar.appendChild(themeBtn);
    bar.appendChild(cartLink);
    bar.appendChild(burger);
    header.appendChild(bar);

    var menu = el("div", "mobile-menu");
    menu.id = "mobile-menu";
    menu.hidden = true;
    NAV.forEach(function (item) {
      menu.appendChild(link("mobile-link", item.label, item.hash));
    });
    menu.appendChild(link("btn btn-primary mobile-cta", "Shop now", "#products"));
    header.appendChild(menu);

    function setOpen(open, returnFocus) {
      menu.hidden = !open;
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.classList.toggle("menu-open", open);
      if (open) {
        var first = menu.querySelector("a");
        if (first) first.focus();
      } else if (returnFocus) {
        burger.focus();
      }
    }

    burger.addEventListener("click", function () {
      setOpen(menu.hidden, false);
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false, false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menu.hidden) setOpen(false, true);
    });
    // বড় স্ক্রিনে গেলে মেনু বন্ধ করে দাও
    window.matchMedia("(min-width: 960px)").addEventListener("change", function (e) {
      if (e.matches && !menu.hidden) setOpen(false, false);
    });

    return header;
  }

  /* ---------- ফুটার ---------- */
  function buildFooter() {
    var footer = el("footer", "site-footer");
    var wrap = el("div", "wrap footer-grid");

    var about = el("div", "footer-col");
    var logo = el("p", "brand footer-brand");
    logo.appendChild(logoImg("footer-logo"));
    about.appendChild(logo);
    about.appendChild(el("p", "muted", "NFC stands and tags. Tap your phone and connect."));
    wrap.appendChild(about);

    var shop = el("div", "footer-col");
    shop.appendChild(el("h2", "footer-h", "Shop"));
    shop.appendChild(link("footer-link", "All products", "#products"));
    var cartFooter = el("a", "footer-link", "Cart");
    cartFooter.href = "cart.html";
    shop.appendChild(cartFooter);
    wrap.appendChild(shop);

    var help = el("div", "footer-col");
    help.appendChild(el("h2", "footer-h", "Help"));
    help.appendChild(link("footer-link", "How it works", "#how"));
    help.appendChild(link("footer-link", "FAQ", "#faq"));
    [["Delivery and payment", "delivery"], ["Returns and refunds", "returns"], ["Privacy", "privacy"], ["Terms", "terms"]].forEach(function (p) {
      var a = el("a", "footer-link", p[0]);
      a.href = "policies.html#" + p[1];
      help.appendChild(a);
    });
    wrap.appendChild(help);

    var contact = el("div", "footer-col");
    contact.appendChild(el("h2", "footer-h", "Contact"));
    if (TK.isWhatsappConfigured()) {
      var wa = el("a", "footer-link", "Message us on WhatsApp");
      wa.href = TK.whatsappUrl();
      wa.target = "_blank";
      wa.rel = "noopener noreferrer";
      contact.appendChild(wa);
    } else {
      contact.appendChild(el("p", "muted", "Contact details coming soon."));
    }
    [["facebook", "Facebook"], ["instagram", "Instagram"]].forEach(function (s) {
      var url = cfg.social && cfg.social[s[0]];
      if (!url) return;
      var a = el("a", "footer-link", s[1]);
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      contact.appendChild(a);
    });
    wrap.appendChild(contact);

    footer.appendChild(wrap);
    var legal = el("div", "wrap footer-legal muted");
    legal.textContent = "© " + new Date().getFullYear() + " " + cfg.brandName + ". All rights reserved.";
    footer.appendChild(legal);
    return footer;
  }

  /* ---------- ভাসমান WhatsApp বাটন ---------- */
  function buildWhatsappButton() {
    var configured = TK.isWhatsappConfigured();
    var node = el(configured ? "a" : "button", "wa-float");
    node.setAttribute("aria-label", "Chat on WhatsApp");
    node.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M4 20l1.2-4.1A8 8 0 1 1 8.2 19L4 20z"/>' +
      '<path d="M9.5 9.2c.3 2.2 2.4 4.3 4.6 4.6l1.3-1.2-1.8-1-.8.7c-.8-.3-1.7-1.2-2-2l.7-.8-1-1.8-1 1.5z"/></svg>';
    if (configured) {
      node.href = TK.whatsappUrl();
      node.target = "_blank";
      node.rel = "noopener noreferrer";
    } else {
      node.type = "button";
      node.addEventListener("click", function () {
        TK.ui.toast("WhatsApp number is not set yet. The owner adds it in js/config.js.");
      });
    }
    return node;
  }

  /* data-whatsapp লেখা বাটন/লিংকগুলো WhatsApp-এর সঙ্গে জুড়ে দেয় */
  function wireWhatsappLinks() {
    var configured = TK.isWhatsappConfigured();
    document.querySelectorAll("[data-whatsapp]").forEach(function (a) {
      if (configured) {
        a.href = TK.whatsappUrl(a.getAttribute("data-whatsapp") || undefined);
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      } else {
        a.href = "#contact";
        a.addEventListener("click", function () {
          TK.ui.toast("WhatsApp number is not set yet. The owner adds it in js/config.js.");
        });
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var headerSlot = document.getElementById("site-header");
    var footerSlot = document.getElementById("site-footer");
    if (headerSlot) headerSlot.appendChild(buildHeader());
    if (footerSlot) footerSlot.appendChild(buildFooter());
    document.body.appendChild(buildWhatsappButton());
    wireWhatsappLinks();
  });
})();
