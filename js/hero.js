/*
  হিরোর ডান পাশের ছবির জায়গা (id="hero-animation")।

  এই জায়গাটা আলাদা করে রাখা হয়েছে, যাতে ভাগ ৯-এ স্ক্রল অ্যানিমেশন (কণা, পাও রিভিল)
  বসানোর সময় বাকি সাইট না ছুঁয়েই এটা বদলানো যায়।

  এখন এখানে সাধারণ CSS দিয়ে ভাসমান পণ্যের কার্ড দেখায়।
  WebGL/Canvas না চললে বা reduced-motion চালু থাকলে এই সহজ ভার্সনই থাকবে।
*/
(function () {
  var TK = (window.TapKoro = window.TapKoro || {});

  // কোন পণ্য কোন জায়গায় ভাসবে
  var FLOATERS = [
    { id: "social-follow-stand", pos: "pos-a" },
    { id: "wifi-connect-tag", pos: "pos-b" },
    { id: "nfc-cat-collar-tag", pos: "pos-c" },
  ];

  function renderStatic(slot) {
    slot.textContent = "";
    var stage = TK.ui.el("div", "stage");
    stage.appendChild(TK.ui.el("div", "stage-glow"));
    FLOATERS.forEach(function (f) {
      var product = TK.getProduct(f.id);
      if (!product) return;
      var card = TK.ui.el("div", "float-card " + f.pos);
      card.appendChild(TK.ui.productImage(product, 0, product.categoryLabel));
      stage.appendChild(card);
    });
    slot.appendChild(stage);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var slot = document.getElementById("hero-animation");
    if (!slot) return;

    // আগে সাধারণ ভার্সন আঁকি: অ্যানিমেশন না চললে (reduced-motion, ছবি লোড ব্যর্থ ইত্যাদি) এটাই থাকে।
    renderStatic(slot);
    TK.heroSlot = { el: slot, renderStatic: function () { renderStatic(slot); } };

    // ভাগ ৯: স্ক্রল অ্যানিমেশন। চালু হলে সাধারণ ভার্সন লুকিয়ে যায় (.is-live)।
    if (TK.heroAnimation) TK.heroAnimation.start(slot);
  });
})();
