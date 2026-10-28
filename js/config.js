/*
  TapKoro সাইটের সেটিংস — এই ফাইলে বদলালে পুরো সাইটে বদলে যাবে।
  কোডের নিয়ম না জানলেও শুধু "" বা সংখ্যার ভেতরের মান বদলালেই চলবে।
*/
(function () {
  window.TapKoro = window.TapKoro || {};

  window.TapKoro.config = {
    brandName: "TapKoro",
    tagline: "Tap your phone. Connect instantly.",
    currency: "৳",

    // WhatsApp নম্বর: দেশের কোডসহ, + বা ফাঁকা ছাড়া। যেমন 8801XXXXXXXXX
    whatsappNumber: "8801726002547",

    // ডেলিভারি চার্জ (টাকায়)। ⚠️ সাময়িক: বন্ধুকে নিশ্চিত করতে হবে।
    delivery: {
      insideDhaka: 80,
      outsideDhaka: 120,
      confirmedByOwner: false,
    },

    // প্রোমো কোড। এখন ফাঁকা, কারণ আসল কোড বন্ধুর কাছ থেকে জানা বাকি।
    // উদাহরণ (চালু করতে // তুলে দাও):
    // { code: "WELCOME10", type: "percent", value: 10, minOrder: 0, active: true }
    promoCodes: [],

    // WhatsApp খুললে প্রথমে যে লেখা বসে থাকবে
    whatsappGreeting: "Hi TapKoro, I want to know more about your products.",

    // নীতিমালা পেজের লেখা। ফাঁকা থাকলে সাধারণ বার্তা দেখায়, বানিয়ে কিছু লেখা হয় না।
    // বন্ধু রিটার্ন/রিফান্ড/ডেলিভারি সময়ের নিয়ম ঠিক করলে "" এর ভেতরে ইংরেজিতে লিখো।
    policies: {
      returns: "",
      deliveryTime: "",
    },

    // সোশ্যাল লিংক: খালি থাকলে সাইটে দেখাবে না।
    social: {
      facebook: "",
      instagram: "",
    },
  };

  // নম্বর নমুনা থাকলে সত্যি বলে ধরা হবে না
  window.TapKoro.isWhatsappConfigured = function () {
    return /^\d{10,15}$/.test(window.TapKoro.config.whatsappNumber);
  };

  // WhatsApp লিংক বানায়। message না দিলে ডিফল্ট শুভেচ্ছা বসে।
  window.TapKoro.whatsappUrl = function (message) {
    var text = message || window.TapKoro.config.whatsappGreeting;
    return "https://wa.me/" + window.TapKoro.config.whatsappNumber + "?text=" + encodeURIComponent(text);
  };
})();
