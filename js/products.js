/*
  পণ্যের তালিকা — সব পণ্যের তথ্য এই এক ফাইলে।
  নতুন পণ্য যোগ করতে একটা { ... } ব্লক কপি করে নিচে বসাও।

  images: ছবির ফাইলের পথ। ছবি না থাকলে [] রাখো, সাইটে সুন্দর ফাঁকা জায়গা দেখাবে।
          ছবি এলে assets/images/products/ ফোল্ডারে রেখে এখানে লিখো, যেমন:
          images: ["assets/images/products/wifi-connect-tag-1.jpg"]
  stock:  "in_stock" (আছে) অথবা "out_of_stock" (শেষ)
  badges: যেমন ["Sale"], ["New"], ["Featured"]
  category: "wifi", "social" বা "pet" (নিচের categories তালিকার id)
  addedOn: যোগ করার তারিখ (YYYY-MM-DD), "Newest" সর্টে কাজে লাগে। ⚠️ এখনকার তারিখ নমুনা।
  options: (ঐচ্ছিক) কাস্টমারকে যা বেছে নিতে হবে, যেমন Facebook/Instagram বা রং।
           choices-এর image: ছবির নম্বর (০ থেকে শুরু), বেছে নিলে গ্যালারিতে ওই ছবি দেখায়।
  features: (ঐচ্ছিক) পণ্যের ছোট ছোট বৈশিষ্ট্যের তালিকা। শুধু বন্ধুর দেওয়া তথ্য লিখো।
*/
(function () {
  window.TapKoro = window.TapKoro || {};

  // ক্যাটাগরির তালিকা (ফিল্টারে দেখায়)। যে ক্যাটাগরিতে পণ্য নেই সেটা দেখাবে না।
  var categories = [
    { id: "wifi", label: "WiFi" },
    { id: "social", label: "Social" },
    { id: "pet", label: "Pet" },
  ];

  var products = [
    {
      id: "wifi-connect-tag",
      name: "TapKoro WiFi Connect Tag",
      category: "wifi",
      categoryLabel: "WiFi",
      regularPrice: 499,
      offerPrice: 380,
      images: ["assets/images/products/wifi-poster.webp"],
      features: ["Quick Wi-Fi connect", "NFC enabled", "No battery required", "Stand setup design", "Works on Android only, not on iOS"],
      shortDescription: "Guests tap their phone to connect to your WiFi.",
      description:
        "A TapKoro NFC stand for sharing your WiFi. Place it on a table or counter and let guests tap their phone instead of typing the password.",
      stock: "in_stock",
      badges: ["Sale"],
      addedOn: "2026-10-01",
      orderNote: "",
    },
    {
      id: "social-follow-stand",
      name: "TapKoro Facebook / Instagram Follow Stand",
      category: "social",
      categoryLabel: "Social stands",
      regularPrice: 650,
      offerPrice: 499,
      images: ["assets/images/products/stand-poster.webp", "assets/images/products/stand-real.webp"],
      features: ["Tap and follow instantly", "No battery, no charging", "Premium glossy board", "Wood stand, durable and stylish"],
      options: [
        { id: "platform", label: "Platform", choices: [{ value: "Facebook" }, { value: "Instagram" }] },
      ],
      shortDescription: "Customers tap their phone to open your Facebook or Instagram page.",
      description:
        "A TapKoro NFC display stand with a wooden base. Available as a Facebook Follow Stand or an Instagram Follow Stand.",
      stock: "in_stock",
      badges: ["Sale", "Featured"],
      addedOn: "2026-10-02",
      orderNote: "",
    },
    {
      id: "instagram-nfc-car-tag",
      name: "Instagram NFC Car Tag",
      category: "social",
      categoryLabel: "Social tags",
      regularPrice: 499,
      offerPrice: 380,
      images: ["assets/images/products/car-poster-1.webp", "assets/images/products/car-poster-2.webp", "assets/images/products/car-real.webp", "assets/images/products/car-window.webp", "assets/images/products/car-white.webp"],
      features: ["Just tap and open your Instagram", "Waterproof (rain or shine)", "Premium UV DTF sticker", "Full sticker size 1.5 inch x 2.7 inch"],
      shortDescription: "A car tag that opens your Instagram when tapped.",
      description:
        "An NFC tag for your car. Someone taps their phone on it to open your Instagram profile.",
      stock: "in_stock",
      badges: ["Sale"],
      addedOn: "2026-10-03",
      orderNote: "",
    },
    {
      id: "nfc-cat-collar-tag",
      name: "NFC Cat Collar Tag",
      category: "pet",
      categoryLabel: "Pet tags",
      regularPrice: 420,
      offerPrice: 350,
      images: ["assets/images/products/paw-both.webp", "assets/images/products/paw-red.webp", "assets/images/products/paw-white-black.webp", "assets/images/products/paw-black-white.webp", "assets/images/products/cat-poster-blue.webp", "assets/images/products/cat-poster-red.webp", "assets/images/products/cat-poster-grass.webp"],
      features: ["Just one tap", "Share location and contact", "Water-resistant and durable", "Lightweight, about 5 gram", "No battery, no charging"],
      options: [
        {
          id: "colour",
          label: "Colour",
          choices: [
            { value: "Red with white pads", image: 1 },
            { value: "White with black pads", image: 2 },
            { value: "Black with white pads", image: 3 },
          ],
        },
      ],
      shortDescription: "A paw-shaped NFC tag for your cat's collar.",
      description:
        "A paw-shaped NFC tag made for a cat collar. Available in red and white, and black and white.",
      stock: "in_stock",
      badges: ["Sale"],
      addedOn: "2026-10-04",
      orderNote: "",
    },
  ];

  /* ---------- সাহায্যকারী ফাংশন ---------- */

  function formatPrice(amount) {
    return window.TapKoro.config.currency + Number(amount).toLocaleString("en-US");
  }

  function discountPercent(p) {
    if (!p.regularPrice || p.offerPrice >= p.regularPrice) return 0;
    return Math.round(((p.regularPrice - p.offerPrice) / p.regularPrice) * 100);
  }

  function finalPrice(p) {
    return p.offerPrice > 0 && p.offerPrice < p.regularPrice ? p.offerPrice : p.regularPrice;
  }

  function getProduct(id) {
    for (var i = 0; i < products.length; i++) {
      if (products[i].id === id) return products[i];
    }
    return null;
  }

  window.TapKoro.categories = categories;
  window.TapKoro.products = products;
  window.TapKoro.formatPrice = formatPrice;
  window.TapKoro.discountPercent = discountPercent;
  window.TapKoro.finalPrice = finalPrice;
  window.TapKoro.getProduct = getProduct;
})();
