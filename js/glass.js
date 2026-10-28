/*
  Liquid Glass-এর ছোট সহায়ক (বাইরের লাইব্রেরি নেই):
   ১. মাউস নড়লে কাচের ওপর আলোর ঝলক সরে (শুধু মাউস/ট্র্যাকপ্যাড থাকলে)।
   ২. সেকশনগুলো স্ক্রলে ধীরে ফুটে ওঠে (reduced-motion চালু থাকলে ওঠে না, সব আগে থেকেই দেখা যায়)।
   ৩. কম-শক্তির ফোনে html-এ "lite" বসে, ফলে ঝাপসা কাচ বন্ধ হয়ে ফোন হালকা চলে।
  JS না চললেও সাইট পুরো ঠিকঠাক দেখা যায়।
*/
(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var low = (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 3);
  if (low) root.classList.add("lite");

  // ---- ১. আলোর ঝলক ----
  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (fine && !reduce) {
    var SEL = ".glass, .card, .step, .benefit, .faq details, .cart-line, .summary";
    var pending = null, raf = 0;
    document.addEventListener("pointermove", function (e) {
      var t = e.target && e.target.closest ? e.target.closest(SEL) : null;
      if (!t) return;
      pending = { t: t, x: e.clientX, y: e.clientY };
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        if (!pending) return;
        var r = pending.t.getBoundingClientRect();
        pending.t.style.setProperty("--mx", ((pending.x - r.left) / r.width * 100).toFixed(1) + "%");
        pending.t.style.setProperty("--my", ((pending.y - r.top) / r.height * 100).toFixed(1) + "%");
        pending = null;
      });
    }, { passive: true });
  }

  // ---- ২. ফুটে ওঠা ----
  function setupReveal() {
    if (reduce || !("IntersectionObserver" in window)) return;
    var items = document.querySelectorAll(
      ".section > h2, .section > .lead, .steps .step, .benefits .benefit, .about .muted, .faq details, .contact-actions"
    );
    if (!items.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var n = en.target;
        io.unobserve(n);
        n.classList.add("rv-in");
        setTimeout(function () { n.classList.add("rv-done"); }, 1000);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach(function (n, i) {
      n.classList.add("rv");
      // একই সারির জিনিসে সামান্য দেরি, যাতে একে একে ফোটে
      var sib = n.parentNode ? Array.prototype.indexOf.call(n.parentNode.children, n) : 0;
      n.style.setProperty("--rv-d", Math.min(sib, 5) * 0.07 + "s");
      io.observe(n);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setupReveal);
  else setupReveal();
})();
