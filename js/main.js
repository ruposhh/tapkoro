/*
  হোম পেজের লজিক: পণ্যের তালিকা চালু করা ও "From ৳..." লাইন।
  পরের ভাগগুলোতে ফিল্টার, কার্ট ইত্যাদি এখানে বা আলাদা ফাইলে আসবে।
*/
(function () {
  var TK = window.TapKoro;

  document.addEventListener("DOMContentLoaded", function () {
    TK.catalog.mount(document.getElementById("catalog"));

    var line = document.getElementById("hero-price");
    if (line && TK.products.length) {
      var lowest = Math.min.apply(null, TK.products.map(TK.finalPrice));
      line.textContent = "Prices start from " + TK.formatPrice(lowest) + ". Order on WhatsApp.";
    }
  });
})();
