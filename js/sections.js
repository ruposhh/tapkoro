/*
  হোম ও নীতিমালা পেজের ছোট ছোট অংশ ভরে দেয়: ডেলিভারি চার্জ, ফোন নম্বর, সোশ্যাল লিংক, নীতিমালার লেখা।
  সব তথ্য আসে js/config.js থেকে, তাই ওখানে বদলালে এখানেও বদলে যায়।
*/
(function () {
  var TK = (window.TapKoro = window.TapKoro || {});

  document.addEventListener("DOMContentLoaded", function () {
    var cfg = TK.config;

    document.querySelectorAll("[data-fee]").forEach(function (node) {
      var fee = node.getAttribute("data-fee") === "inside" ? cfg.delivery.insideDhaka : cfg.delivery.outsideDhaka;
      node.textContent = TK.formatPrice(fee);
    });

    // 8801XXXXXXXXX থেকে 01XXXXXXXXX বানিয়ে দেখায়
    var phone = document.getElementById("contact-phone");
    if (phone && TK.isWhatsappConfigured()) {
      var num = cfg.whatsappNumber;
      var local = num.indexOf("880") === 0 ? "0" + num.slice(3) : num;
      phone.textContent = "Call " + local;
      phone.href = "tel:+" + num;
      phone.hidden = false;
    }

    var social = document.getElementById("contact-social");
    if (social) {
      [["facebook", "Facebook"], ["instagram", "Instagram"]].forEach(function (s) {
        var url = cfg.social && cfg.social[s[0]];
        if (!url) return;
        var a = document.createElement("a");
        a.href = url;
        a.textContent = s[1];
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        social.appendChild(a);
      });
    }

    // নীতিমালা: বন্ধু লিখে না দিলে বানানো নিয়ম না দেখিয়ে WhatsApp-এ যোগাযোগ করতে বলে
    var returns = document.getElementById("returns-text");
    if (returns) {
      returns.textContent = cfg.policies.returns ||
        "If there is a problem with your order, please message us on WhatsApp as soon as you receive it and we will help.";
    }
    var time = document.getElementById("delivery-time");
    if (time) {
      time.textContent = cfg.policies.deliveryTime ||
        "We tell you the expected delivery time when we confirm your order on WhatsApp.";
    }
    var confirm = document.getElementById("delivery-confirm");
    if (confirm && !cfg.delivery.confirmedByOwner) {
      confirm.textContent = "Delivery charges may change. We confirm the final charge with you on WhatsApp.";
    }
  });
})();
