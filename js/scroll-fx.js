/*
  ভাগ ৯ (নতুন নকশা) — পুরো পেজের স্ক্রল-চালিত কণার গল্প। শুধু Canvas, বাইরের লাইব্রেরি নেই।

  গল্পের ক্রম (সবকিছু স্ক্রলের সাথে বাঁধা):
    ১. হিরো (ওপরে): ৫টা কার্ড ধীরে ঘোরে ও ভাসে। (একই ৩ ধরনের কার্ড ৫ বার ব্যবহার)
    ২. স্ক্রল করলে কার্ডগুলো টুকরো হয়ে কণায় ভেঙে যায়।
    ৩. কণাগুলো পুরো ওয়েবসাইটের পেছনে (fixed ব্যাকগ্রাউন্ডে) ভাসতে থাকে — নিচে নামা পর্যন্ত।
    ৪. একদম নিচের #paws সেকশনে এলে কণারা জড়ো হয়ে ৪টা ক্যাট-পাও NFC ট্যাগ বানায়, তারপর ট্যাগগুলো ঘুরতে থাকে।

  ছবির ব্যাপার: কার্ড ও পাও ট্যাগের ছবি এই কোডই Canvas-এ নিজে এঁকে নেয় (assets/anim-এর ছবি লাগে না)।
  সত্যিকারের 3D মডেল নয়: প্রতিটা বস্তুকে পুরু পাতের মতো ধরে, পারস্পেক্টিভ হিসাব করে ঘোরানো হয়
  (সামনে, পেছন ও ধারের পুরুত্ব সহ)। তাই দেখতে 3D-র মতো লাগে, কিন্তু ফোনে হালকা চলে।

  না চললে (reduced-motion, Canvas নেই, কোড ব্যর্থ) আগের সাধারণ হিরো ও সাধারণ ছবির সেকশন দেখায়।
*/
(function () {
  "use strict";
  var TK = (window.TapKoro = window.TapKoro || {});
  var TAU = Math.PI * 2;

  function reduceMotionPref() { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }

  // ---------- ছোট গণিত ----------
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function sstep(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function range(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ====================================================================
  //  ১. নিজে আঁকা ছবি (টেক্সচার)
  // ====================================================================
  var FONT = '"Sora","Hind Siliguri",system-ui,"Segoe UI",Arial,sans-serif';
  function mk(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function arcs(g, cx, cy, radii, col, lw) {
    g.save();
    g.strokeStyle = col; g.lineWidth = lw; g.lineCap = "round";
    radii.forEach(function (r) { g.beginPath(); g.arc(cx, cy, r, Math.PI * 1.22, Math.PI * 1.78); g.stroke(); });
    g.restore();
  }

  // ফেসবুক / ইনস্টাগ্রাম ফলো-কার্ড (সামনে ও পেছন)
  function artSocial(kind, back) {
    var c = mk(400, 560), g = c.getContext("2d");
    var bg = g.createLinearGradient(0, 0, 400, 560);
    if (!back) { bg.addColorStop(0, "#ffffff"); bg.addColorStop(1, "#e8ecf3"); }
    else if (kind === "ig") { bg.addColorStop(0, "#f7e8ee"); bg.addColorStop(1, "#e9dfe8"); }
    else { bg.addColorStop(0, "#e6ecf8"); bg.addColorStop(1, "#d9e0ee"); }
    rr(g, 0, 0, 400, 560, 30); g.fillStyle = bg; g.fill();
    g.lineWidth = 3; g.strokeStyle = "rgba(110,122,145,0.35)"; rr(g, 2, 2, 396, 556, 28); g.stroke();
    g.textAlign = "center"; g.textBaseline = "alphabetic";

    if (back) {
      // পেছনে NFC কয়েলের ছাপ
      g.strokeStyle = "rgba(120,125,150,0.42)"; g.lineWidth = 3;
      for (var i = 0; i < 7; i++) { var s = 40 + i * 24; rr(g, 200 - s, 285 - s * 0.95, s * 2, s * 1.9, 14); g.stroke(); }
      g.fillStyle = "rgba(60,70,95,0.55)"; g.font = "700 26px " + FONT; g.fillText("TapKoro", 200, 520);
      return c;
    }

    g.fillStyle = "#14161b"; g.font = "700 34px " + FONT; g.fillText("Follow Us On", 200, 80);
    if (kind === "fb") {
      g.font = "800 60px " + FONT; g.fillText("Facebook", 200, 146);
      g.save(); g.beginPath(); g.arc(200, 296, 102, 0, TAU); g.clip();
      g.fillStyle = "#1877f2"; g.fillRect(90, 190, 220, 220);
      g.fillStyle = "#fff"; g.font = "bold 250px Arial, Helvetica, sans-serif"; g.textAlign = "center";
      g.fillText("f", 222, 438);
      g.restore();
    } else {
      var tg = g.createLinearGradient(80, 0, 320, 0);
      tg.addColorStop(0, "#f58529"); tg.addColorStop(0.45, "#dd2a7b"); tg.addColorStop(1, "#8134af");
      g.fillStyle = tg; g.font = "italic 800 58px " + FONT; g.fillText("Instagram", 200, 146);
      var lg = g.createLinearGradient(100, 400, 300, 190);
      lg.addColorStop(0, "#feda75"); lg.addColorStop(0.3, "#fa7e1e"); lg.addColorStop(0.6, "#d62976"); lg.addColorStop(1, "#4f5bd5");
      rr(g, 102, 192, 196, 196, 52); g.fillStyle = lg; g.fill();
      g.strokeStyle = "#fff"; g.lineWidth = 15;
      rr(g, 126, 216, 148, 148, 40); g.stroke();
      g.beginPath(); g.arc(200, 290, 36, 0, TAU); g.stroke();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(245, 245, 9, 0, TAU); g.fill();
    }
    // নিচে "Tap Your Phone"
    g.strokeStyle = "#14161b"; g.lineWidth = 3.2; g.lineCap = "round";
    rr(g, 62, 452, 30, 52, 7); g.stroke();
    g.beginPath(); g.arc(77, 496, 2.2, 0, TAU); g.fillStyle = "#14161b"; g.fill();
    arcs(g, 77, 452, [14, 26], "#14161b", 3.4);
    g.textAlign = "left"; g.fillStyle = "#14161b"; g.font = "700 24px " + FONT; g.fillText("Tap Your", 124, 480);
    g.fillStyle = kind === "fb" ? "#1877f2" : "#d62976"; g.fillText("Phone", 124, 508);
    g.strokeStyle = "rgba(20,22,27,0.3)"; g.lineWidth = 2; g.beginPath(); g.moveTo(112, 456); g.lineTo(112, 510); g.stroke();
    g.font = "600 15px " + FONT; g.fillStyle = "#14161b"; g.fillText("Tap", 30, 546);
    g.fillStyle = "#1557ff"; g.fillText("Koro", 54, 546);
    return c;
  }

  // কাঠের ঘর (স্ট্যান্ডের নিচের ব্লক)
  function artBase() {
    var c = mk(440, 80), g = c.getContext("2d");
    var gr = g.createLinearGradient(0, 0, 0, 80);
    gr.addColorStop(0, "#f3e9d3"); gr.addColorStop(0.5, "#e2d1ae"); gr.addColorStop(1, "#c7b189");
    rr(g, 0, 0, 440, 80, 12); g.fillStyle = gr; g.fill();
    g.strokeStyle = "rgba(125,92,50,0.2)"; g.lineWidth = 1.6;
    for (var i = 0; i < 6; i++) {
      g.beginPath(); g.moveTo(12, 14 + i * 11); g.bezierCurveTo(130, 8 + i * 11, 310, 20 + i * 11, 428, 12 + i * 11); g.stroke();
    }
    g.fillStyle = "rgba(255,255,255,0.4)"; g.fillRect(8, 3, 424, 4);
    return c;
  }

  // WiFi A-ফ্রেম স্ট্যান্ড
  function artWifi(back) {
    var c = mk(420, 620), g = c.getContext("2d");
    var body = g.createLinearGradient(0, 0, 0, 620);
    body.addColorStop(0, back ? "#ecedf0" : "#ffffff"); body.addColorStop(1, back ? "#cfd2d9" : "#e6e9ee");
    g.fillStyle = back ? "#d5d8de" : "#eceef2";
    rr(g, 92, 4, 74, 40, 12); g.fill(); rr(g, 254, 4, 74, 40, 12); g.fill();
    g.beginPath(); g.moveTo(74, 40); g.lineTo(346, 40); g.lineTo(402, 606); g.lineTo(18, 606); g.closePath();
    g.fillStyle = body; g.fill();
    g.lineJoin = "round"; g.lineWidth = 18; g.strokeStyle = back ? "#d9dce2" : "#eef0f4"; g.stroke();
    g.fillStyle = body; g.fill();
    // হাতল-ফাঁক
    rr(g, 134, 90, 152, 44, 22); g.fillStyle = back ? "#c4c8d0" : "#d3d7de"; g.fill();
    rr(g, 140, 98, 140, 34, 17); g.fillStyle = "rgba(255,255,255,0.55)"; g.fill();
    g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillStyle = "#101114";
    if (back) {
      g.font = "800 72px " + FONT; g.fillText("TapKoro", 210, 372);
    } else {
      g.font = "800 50px " + FONT; g.fillText("Tap For", 210, 236);
      arcs(g, 210, 392, [40, 82, 124], "#101114", 17);
      g.beginPath(); g.arc(210, 398, 14, 0, TAU); g.fill();
      g.font = "800 62px " + FONT; g.fillText("WiFi", 210, 548);
    }
    return c;
  }

  // ক্যাট-পাও: বাইরের আকার (সব উপ-পথ একই দিকে ঘোরে, তাই জোড়া লাগে)
  function pawPath(g) {
    g.beginPath();
    g.ellipse(240, 322, 160, 130, 0, 0, TAU);
    g.moveTo(152, 196); g.ellipse(96, 200, 56, 72, -0.38, 0, TAU);
    g.moveTo(240, 112); g.ellipse(188, 114, 52, 70, -0.12, 0, TAU);
    g.moveTo(344, 112); g.ellipse(292, 114, 52, 70, 0.12, 0, TAU);
    g.moveTo(440, 200); g.ellipse(384, 200, 56, 72, 0.38, 0, TAU);
    g.moveTo(104, 238); g.lineTo(188, 150); g.lineTo(292, 150); g.lineTo(376, 238); g.lineTo(394, 322); g.lineTo(86, 322); g.closePath();
    g.moveTo(270, 54); g.arc(240, 54, 30, 0, TAU);
    g.rect(212, 54, 56, 100);
  }
  var PAW_STYLE = {
    bw: { outer: "#f5f5f2", outer2: "#d6d6d1", detail: "#101114", rim: "rgba(0,0,0,0.16)" },
    red: { outer: "#d9222e", outer2: "#a30f1b", detail: "#f7f7f4", rim: "rgba(0,0,0,0.22)" },
  };
  function pawPad(g, drawFn, P, light) {
    g.save();
    drawFn(g); g.fillStyle = P.detail; g.fill();
    g.clip();
    var lg = g.createLinearGradient(0, 150, 0, 450);
    lg.addColorStop(0, light ? "rgba(255,255,255,0.0)" : "rgba(255,255,255,0.34)");
    lg.addColorStop(0.5, "rgba(255,255,255,0)");
    lg.addColorStop(1, light ? "rgba(90,95,110,0.28)" : "rgba(0,0,0,0.0)");
    g.fillStyle = lg; g.fillRect(0, 0, 480, 480);
    g.restore();
    g.save(); drawFn(g); g.lineWidth = 3; g.strokeStyle = P.rim; g.stroke(); g.restore();
  }
  function artPaw(kind, back) {
    var P = PAW_STYLE[kind], c = mk(480, 480), g = c.getContext("2d");
    var gr = g.createLinearGradient(40, 20, 440, 460);
    gr.addColorStop(0, P.outer); gr.addColorStop(1, P.outer2);
    pawPath(g); g.fillStyle = gr; g.fill();
    g.save(); pawPath(g); g.clip();
    // ধারের নরম ছায়া ও ওপরের আলো
    var sh = g.createLinearGradient(0, 0, 0, 480);
    sh.addColorStop(0, "rgba(255,255,255,0.28)"); sh.addColorStop(0.5, "rgba(255,255,255,0)"); sh.addColorStop(1, "rgba(0,0,0,0.18)");
    g.fillStyle = sh; g.fillRect(0, 0, 480, 480);
    if (kind === "red") {
      var rnd = mulberry(77);
      for (var i = 0; i < 260; i++) {
        g.fillStyle = "rgba(255,255,255," + (0.08 + rnd() * 0.3).toFixed(2) + ")";
        g.fillRect(rnd() * 480, rnd() * 480, 1.6 + rnd() * 1.6, 1.6 + rnd() * 1.6);
      }
    }
    g.restore();
    pawPath(g); g.lineWidth = 4; g.strokeStyle = P.rim; g.stroke();

    if (!back) {
      arcs(g, 240, 288, [34, 70, 106], P.detail, 17);
      g.fillStyle = P.detail; g.textAlign = "center"; g.textBaseline = "alphabetic";
      g.font = "800 76px " + FONT; g.fillText("NFC", 240, 398);
    } else {
      var light = kind === "red";
      pawPad(g, function (q) {
        q.beginPath(); q.moveTo(240, 274);
        q.bezierCurveTo(296, 274, 344, 326, 356, 372);
        q.bezierCurveTo(368, 416, 338, 436, 300, 428);
        q.bezierCurveTo(274, 422, 260, 410, 240, 410);
        q.bezierCurveTo(220, 410, 206, 422, 180, 428);
        q.bezierCurveTo(142, 436, 112, 416, 124, 372);
        q.bezierCurveTo(136, 326, 184, 274, 240, 274);
        q.closePath();
      }, P, light);
      [[102, 204, 34, 50, -0.38], [190, 120, 32, 48, -0.12], [290, 120, 32, 48, 0.12], [378, 204, 34, 50, 0.38]].forEach(function (t) {
        pawPad(g, function (q) { q.beginPath(); q.ellipse(t[0], t[1], t[2], t[3], t[4], 0, TAU); }, P, light);
      });
    }
    // চাবির ছিদ্র
    g.globalCompositeOperation = "destination-out";
    g.beginPath(); g.arc(240, 54, 13, 0, TAU); g.fill();
    g.globalCompositeOperation = "source-over";
    g.lineWidth = 3; g.strokeStyle = P.rim; g.beginPath(); g.arc(240, 54, 14, 0, TAU); g.stroke();
    return c;
  }

  function tint(img, color) {
    var c = mk(img.width, img.height), g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = "source-in"; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  // বস্তুর সংজ্ঞা: slab = একটা পুরু পাত (x,y = কেন্দ্র, w,h = মাপ, d = পুরুত্ব) — একক: বস্তুর "ইউনিট"
  function buildArt() {
    var base = artBase();
    function social(kind) {
      return {
        W: 1.1, H: 1.58,
        slabs: [
          { f: artSocial(kind, false), b: artSocial(kind, true), x: 0, y: -0.09, w: 1, h: 1.4, d: 0.05, edge: "#dfe5ef" },
          { f: base, b: base, x: 0, y: 0.68, w: 1.1, h: 0.18, d: 0.3, edge: "#bda77c" },
        ],
      };
    }
    function paw(kind) {
      var f = artPaw(kind, false), edge = kind === "bw" ? "#bcbcb6" : "#8c0b16";
      return { W: 1, H: 1, paw: kind, slabs: [{ f: f, b: artPaw(kind, true), e: tint(f, edge), x: 0, y: 0, w: 1, h: 1, d: 0.075, edge: edge }] };
    }
    return {
      ig: social("ig"), fb: social("fb"),
      wifi: (function () { var f = artWifi(false); return { W: 0.68, H: 1, slabs: [{ f: f, b: artWifi(true), e: tint(f, "#c9ccd3"), x: 0, y: 0, w: 0.68, h: 1, d: 0.16, edge: "#c9ccd3" }] }; })(),
      pawbw: paw("bw"), pawred: paw("red"),
    };
  }

  // ====================================================================
  //  ২. গল্পের সংজ্ঞা
  // ====================================================================
  // ওপরের ৫টা কার্ড (dx, dy = স্লটের প্রস্থের অনুপাতে, hs = উচ্চতা, w = ঘোরার গতি, ph = শুরুর কোণ)
  var HERO_ITEMS = [
    { t: "ig", dx: -0.20, dy: 0.02, hs: 0.64, w: 0.21, ph: 0.0, roll: -0.05 },
    { t: "fb", dx: 0.15, dy: -0.07, hs: 0.56, w: -0.17, ph: 1.9, roll: 0.05 },
    { t: "wifi", dx: 0.34, dy: 0.22, hs: 0.36, w: 0.25, ph: 3.4, roll: -0.04 },
    { t: "ig", dx: -0.37, dy: -0.25, hs: 0.30, w: -0.15, ph: 2.6, roll: 0.07 },
    { t: "fb", dx: -0.04, dy: 0.31, hs: 0.30, w: 0.23, ph: 4.5, roll: -0.08 },
  ];
  // নিচের ৪টা পাও-ট্যাগ (স্লটগুলো #paw-stage-এর ভেতরে)
  var PAW_ITEMS = [
    { t: "pawbw", w: 0.55, ph: 0.0, roll: -0.08 },
    { t: "pawred", w: -0.45, ph: 1.3, roll: 0.07 },
    { t: "pawbw", w: -0.4, ph: 2.4, roll: 0.06 },
    { t: "pawred", w: 0.5, ph: 3.5, roll: -0.07 },
  ];
  var PAW_OUTER = { pawbw: [245, 245, 242], pawred: [217, 34, 46] };
  var CAPTIONS = [
    { a: 0.34, b: 0.62, text: "Every tap starts as a spark." },
    { a: 0.68, b: 0.96, text: "Then it flows through everything." },
  ];

  // টেক্সচার থেকে অস্বচ্ছ পিক্সেলের নমুনা: [u, v, r, g, b]
  function sample(img, targetH) {
    var h = targetH, w = Math.max(8, Math.round(img.width * h / img.height));
    var c = mk(w, h), g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0, w, h);
    var d = g.getImageData(0, 0, w, h).data, list = [];
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        if (d[i + 3] > 200) list.push([(x + 0.5) / w, (y + 0.5) / h, d[i], d[i + 1], d[i + 2]]);
      }
    }
    return list;
  }

  // ভাঙার ক্রম: একই সূত্র টাইল ও কণা দুজনেই ব্যবহার করে, তাই একসাথে মেলে
  function dkey(xn, yn, k) {
    return 0.34 * (1 - xn) + 0.26 * yn + 0.40 * (Math.sin(xn * 11.7 + k * 2.1) * Math.cos(yn * 8.3 + k * 1.3) * 0.5 + 0.5);
  }
  function ddOf(dis, key) { return clamp((dis * 1.5 - key * 0.9) / 0.3, 0, 1); }

  // ====================================================================
  //  ৩. শুরু
  // ====================================================================
  function start(slot) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return false;
    var hero = slot.closest(".hero");
    var grid = hero && hero.querySelector(".hero-grid");
    if (!hero || !grid) return false;
    var probe = document.createElement("canvas");
    if (!probe.getContext || !probe.getContext("2d")) return false;

    var fonts = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    var timeout = new Promise(function (res) { setTimeout(res, 1200); });
    Promise.race([fonts, timeout]).then(function () {
      try { run(slot, hero, grid); } catch (e) {
        if (window.console) console.warn("Scroll animation off:", e && e.message);
        fallback(hero);
      }
    });
    return true;
  }

  function fallback(hero) {
    hero.classList.remove("is-story");
    var fin = document.getElementById("paws");
    if (fin) fin.classList.remove("is-live");
    var cv = document.getElementById("fx-canvas");
    if (cv && cv.parentNode) cv.parentNode.removeChild(cv);
  }

  function run(slot, hero, grid) {
    var fin = document.getElementById("paws");
    var stage = document.getElementById("paw-stage");
    var slots = stage ? stage.querySelectorAll(".paw-slot") : [];
    var finOK = !!(fin && stage && slots.length >= 4);

    // ---- ডিভাইস অনুযায়ী মান ----
    var lowPower = (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 3);
    var isNarrow = window.innerWidth < 860;
    var N = lowPower ? 800 : isNarrow ? 1500 : 2600;
    var DPR = Math.min(window.devicePixelRatio || 1, lowPower ? 1 : isNarrow ? 1.5 : 1.75);
    var STRIPS = lowPower ? 22 : isNarrow ? 34 : 52;
    var GX = lowPower ? 8 : 12, GY = lowPower ? 10 : 16;
    var FRAME_MS = lowPower ? 33 : 0;

    var art = buildArt();

    // ---- বস্তুর সংখ্যা ও নমুনা ----
    var heroObjs = HERO_ITEMS.map(function (it, i) { return mkObj(art[it.t], it, i); });
    var pawObjs = PAW_ITEMS.map(function (it, i) { return mkObj(art[it.t], it, i + 10); });
    function mkObj(def, it, id) {
      return { def: def, it: it, id: id, buf: null, bc: null, pose: { cx: 0, cy: 0, S: 1, D: 6, th: 0, roll: 0 }, acc: 0 };
    }
    heroObjs.forEach(function (o) {
      o.samples = o.def.slabs.map(function (sl) { return sample(sl.f, 70); });
    });
    var pawSamples = {}; // টাইপ → (পেছনের টেক্সচারের নমুনা)
    ["pawbw", "pawred"].forEach(function (t) { pawSamples[t] = sample(art[t].slabs[0].b, 90); });

    // ---- কণা ----
    var rnd = mulberry(20261029);
    var areaTotal = heroObjs.reduce(function (a, o) { return a + o.it.hs * o.it.hs; }, 0);
    var P = [];
    for (var i = 0; i < N; i++) {
      var r = rnd() * areaTotal, k = 0;
      while (k < heroObjs.length - 1 && r > heroObjs[k].it.hs * heroObjs[k].it.hs) { r -= heroObjs[k].it.hs * heroObjs[k].it.hs; k++; }
      var ho = heroObjs[k], def = ho.def;
      // কোন পাত (কার্ড নাকি ঘর) — ক্ষেত্রফল অনুযায়ী
      var sa = def.slabs.map(function (s) { return s.w * s.h; }), st = sa.reduce(function (a, b) { return a + b; }, 0);
      var rs = rnd() * st, si = 0;
      while (si < sa.length - 1 && rs > sa[si]) { rs -= sa[si]; si++; }
      var sl = def.slabs[si], L = ho.samples[si];
      var o = L[(rnd() * L.length) | 0];
      var lx = sl.x + (o[0] - 0.5) * sl.w, ly = sl.y + (o[1] - 0.5) * sl.h;

      var pj = i % 4, pt = pawObjs[pj], ps = pawSamples[pt.it.t], psl = pt.def.slabs[0];
      var t = ps[(rnd() * ps.length) | 0];
      var oc = PAW_OUTER[pt.it.t];
      var detail = Math.abs(t[2] - oc[0]) + Math.abs(t[3] - oc[1]) + Math.abs(t[4] - oc[2]) > 150;
      var ang = rnd() * TAU, zd = 0.4 + rnd() * 0.6;
      var warm = rnd();
      P.push({
        k: k, lx: lx, ly: ly, lz: sl.d / 2,
        xn: lx / def.W + 0.5, yn: ly / def.H + 0.5,
        oc: [o[2], o[3], o[4]],
        pj: pj, tx: psl.x + (0.5 - t[0]) * psl.w, ty: psl.y + (t[1] - 0.5) * psl.h, tz: psl.d / 2,
        tc: [t[2], t[3], t[4]],
        gth: (detail ? 0.5 : 0) + rnd() * 0.5,
        ax: rnd(), ay: rnd(), vx: (rnd() - 0.35) * 0.9, vy: (rnd() - 0.5) * 0.5,
        sp: 0.5 + rnd() * 1.1, ph: rnd() * TAU, sz: 0.8 + rnd() * 1.5, zd: zd,
        dx: Math.cos(ang), dy: Math.sin(ang), sw: (rnd() - 0.5) * 2,
        // শান্ত ব্যাকগ্রাউন্ডের রং: বেশিরভাগ উষ্ণ-সাদা, কিছু নীলচে, মাঝে মাঝে কমলা
        ac: warm < 0.68 ? [255, 238, 214] : warm < 0.88 ? [150, 190, 255] : [255, 150, 70],
        ci: warm < 0.68 ? 0 : warm < 0.88 ? 1 : 2,
        gl: i % 11 === 0,   // প্রতি ১১টার একটা নরম আলোর ঝলক পায় (সংযত)
        al: 0.18 + zd * 0.5,
      });
    }

    // ---- আগে থেকে বানানো রঙ (প্রতি ফ্রেমে স্ট্রিং বানানোর খরচ বাঁচাতে) ----
    var ACOL = [[255, 238, 214], [150, 190, 255], [255, 150, 70]];
    var STEADY = ACOL.map(function (c) {
      var a = [];
      for (var q = 0; q < 20; q++) a.push("rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + ((q + 0.5) / 20).toFixed(3) + ")");
      return a;
    });
    // নরম আলোর ঝলকের ছোট ছবি (radial gradient একবারই আঁকা)
    var GLOW = ACOL.map(function (c) {
      var s = mk(48, 48), g = s.getContext("2d");
      var rg = g.createRadialGradient(24, 24, 0, 24, 24, 24);
      rg.addColorStop(0, "rgba(" + c[0] + "," + c[1] + "," + c[2] + ",0.95)");
      rg.addColorStop(0.25, "rgba(" + c[0] + "," + c[1] + "," + c[2] + ",0.28)");
      rg.addColorStop(1, "rgba(" + c[0] + "," + c[1] + "," + c[2] + ",0)");
      g.fillStyle = rg; g.fillRect(0, 0, 48, 48);
      return s;
    });
    var glN = 0, glX = new Float32Array(N), glY = new Float32Array(N), glA = new Float32Array(N), glC = new Uint8Array(N), glS = new Float32Array(N);

    // ---- DOM: পিন, ক্যানভাস, ক্যাপশন ----
    var pin = document.createElement("div");
    pin.className = "story-pin";
    hero.insertBefore(pin, grid);
    pin.appendChild(grid);
    var canvas = document.createElement("canvas");
    canvas.id = "fx-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.insertBefore(canvas, document.body.firstChild);
    slot.classList.add("is-live");
    slot.setAttribute("aria-hidden", "true");
    slot.removeAttribute("role");

    var caps = CAPTIONS.map(function (c) {
      var d = document.createElement("p");
      d.className = "story-caption"; d.setAttribute("aria-hidden", "true"); d.textContent = c.text;
      pin.appendChild(d);
      return d;
    });

    var pawCopy = null, pawPin = null;
    if (finOK) {
      pawCopy = fin.querySelector(".paw-copy");
      pawPin = fin.querySelector(".paw-pin");
      var cta = fin.querySelector("#paw-cta");
      var cat = TK.getProduct && TK.getProduct("nfc-cat-collar-tag");
      if (cta && cat && TK.ui && TK.ui.detailUrl) cta.href = TK.ui.detailUrl(cat);
      fin.classList.add("is-live");
    }
    hero.classList.add("is-story");
    hero.style.setProperty("--story-len", (isNarrow ? 215 : 240) + "vh");
    if (finOK) fin.style.setProperty("--paw-len", (isNarrow ? 290 : 320) + "vh");

    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, STICK = 64, pinH = 1, pinFH = 1;

    function resize() {
      var hdr = document.getElementById("site-header");
      STICK = hdr ? hdr.offsetHeight || 64 : 64;
      W = Math.max(1, document.documentElement.clientWidth);
      H = Math.max(1, window.innerHeight);
      canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      pinH = pin.offsetHeight || 1;
      pinFH = pawPin ? pawPin.offsetHeight || 1 : 1;
    }
    resize();

    // ====================================================================
    //  ৪. 3D-র মতো আঁকা: পাত, পারস্পেক্টিভ, ধার
    // ====================================================================
    var PX = 0, PY = 0; // proj-এর ফলাফল
    // বস্তুর স্থানীয় বিন্দু (x,y,z) → পর্দা (roll সহ)
    function proj(pose, x, y, z) {
      var c = Math.cos(pose.th), s = Math.sin(pose.th);
      var xr = x * c - z * s, zc = x * s + z * c;
      var f = pose.D / (pose.D + zc * pose.S);
      var X = xr * pose.S * f, Y = y * pose.S * f;
      var cr = pose.cr, sr = pose.sr;
      PX = pose.cx + X * cr - Y * sr; PY = pose.cy + X * sr + Y * cr;
    }

    // একটা মুখ (সামনে বা পেছন) টাইল/স্ট্রিপে ভেঙে আঁকা
    function drawFace(c2, sl, def, th, S, D, img, front, zf, cols, rows, dis, k) {
      var iw = img.width, ih = img.height;
      var cs = Math.cos(th), sn = Math.sin(th);
      var tiles = dis > 0.0001;
      for (var iy = 0; iy < rows; iy++) {
        var v0 = iy / rows, v1 = (iy + 1) / rows;
        for (var ix = 0; ix < cols; ix++) {
          var u0 = ix / cols, u1 = (ix + 1) / cols;
          var xa = sl.x + (front ? u0 - 0.5 : 0.5 - u0) * sl.w, xb = sl.x + (front ? u1 - 0.5 : 0.5 - u1) * sl.w;
          var za = xa * sn + zf * cs, zb = xb * sn + zf * cs;
          var fa = D / (D + za * S), fb = D / (D + zb * S), fm = (fa + fb) / 2;
          var Xa = (xa * cs - zf * sn) * S * fa, Xb = (xb * cs - zf * sn) * S * fb;
          var dw = Xb - Xa;
          if (dw < 0.02) continue;
          var ya = (sl.y + (v0 - 0.5) * sl.h) * S * fm, yb = (sl.y + (v1 - 0.5) * sl.h) * S * fm;
          var dh = yb - ya;
          var sc = 1, off = 0;
          if (tiles) {
            var xn = ((xa + xb) / 2) / def.W + 0.5, yn = ((sl.y + ((v0 + v1) / 2 - 0.5) * sl.h)) / def.H + 0.5;
            var dd = ddOf(dis, dkey(xn, yn, k));
            if (dd >= 1) continue;
            sc = 1 - dd * 0.5; off = dd * dd * S * 0.05;
            c2.globalAlpha = 1 - dd;
          }
          var cx = Xa + dw / 2, cy = ya + dh / 2 - off;
          c2.drawImage(img, u0 * iw, v0 * ih, (u1 - u0) * iw + 0.8, (v1 - v0) * ih + 0.4,
            cx - dw * sc / 2, cy - dh * sc / 2, dw * sc + 0.9, dh * sc + 0.9);
        }
      }
      c2.globalAlpha = 1;
    }

    function drawSide(c2, sl, th, S, D) {
      var sn = Math.sin(th);
      if (Math.abs(sn) < 0.02) return;
      var cs = Math.cos(th), xe = sl.x + (sn > 0 ? -1 : 1) * sl.w / 2;
      var yt = sl.y - sl.h / 2, yb = sl.y + sl.h / 2, z1 = -sl.d / 2, z2 = sl.d / 2;
      function pt(x, y, z) {
        var zc = x * sn + z * cs, f = D / (D + zc * S);
        return [(x * cs - z * sn) * S * f, y * S * f];
      }
      var a = pt(xe, yt, z1), b = pt(xe, yt, z2), c = pt(xe, yb, z2), d = pt(xe, yb, z1);
      c2.beginPath(); c2.moveTo(a[0], a[1]); c2.lineTo(b[0], b[1]); c2.lineTo(c[0], c[1]); c2.lineTo(d[0], d[1]); c2.closePath();
      c2.fillStyle = sl.edge; c2.fill();
      c2.lineWidth = 1; c2.strokeStyle = "rgba(255,255,255,0.35)"; c2.stroke();
    }

    // একটা বস্তু অফস্ক্রিন ক্যানভাসে এঁকে, আলো-ছায়া মিশিয়ে মূল ক্যানভাসে বসায়
    function drawObj(o, dis, alpha) {
      var def = o.def, pose = o.pose, S = pose.S, D = pose.D, th = pose.th;
      if (S < 8 || alpha <= 0.004) return;
      var Wb = Math.ceil(def.W * S * 1.45) + 10, Hb = Math.ceil(def.H * S * 1.3) + 10;
      var bw = Math.ceil(Wb * DPR), bh = Math.ceil(Hb * DPR);
      if (!o.buf || o.buf.width !== bw || o.buf.height !== bh) {
        o.buf = mk(bw, bh); o.bc = o.buf.getContext("2d");
      }
      var c2 = o.bc;
      c2.setTransform(1, 0, 0, 1, 0, 0); c2.clearRect(0, 0, bw, bh);
      c2.setTransform(DPR, 0, 0, DPR, bw / 2, bh / 2);
      var cs = Math.cos(th), front = cs >= 0, absCos = Math.abs(cs);
      var intact = dis <= 0.0001;
      for (var s = 0; s < def.slabs.length; s++) {
        var sl = def.slabs[s];
        var zf = front ? -sl.d / 2 : sl.d / 2;
        if (intact) {
          if (sl.e) {
            // বাঁকা আকারের (পাও, WiFi) পুরুত্ব: আকৃতির ছায়া-রঙা কয়েকটা স্তর পেছন থেকে সামনে সাজানো
            for (var L = 0; L < 4; L++) drawFace(c2, sl, def, th, S, D, sl.e, front, lerp(-zf, zf, L / 4), 10, 1, 0, o.id);
          } else drawSide(c2, sl, th, S, D);
        }
        var cols = intact ? STRIPS : Math.max(2, Math.round(GX * sl.w / def.W));
        var rows = intact ? 1 : Math.max(1, Math.round(GY * sl.h / def.H));
        drawFace(c2, sl, def, th, S, D, front ? sl.f : sl.b, front, zf, cols, rows, dis, o.id);
      }
      // আলো-ছায়া (শুধু বস্তুর আঁকা অংশের ওপর)
      c2.globalCompositeOperation = "source-atop";
      var shade = (1 - absCos) * 0.42;
      if (shade > 0.01) { c2.fillStyle = "rgba(6,9,16," + shade.toFixed(3) + ")"; c2.fillRect(-Wb / 2, -Hb / 2, Wb, Hb); }
      var gx = Math.sin(th * 1.0 + o.it.ph) * 0.55;
      var lg = c2.createLinearGradient(-S * 0.75 + gx * S, -S * 0.9, S * 0.75 + gx * S, S * 0.9);
      lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(0.44, "rgba(255,255,255,0)");
      lg.addColorStop(0.5, "rgba(255,255,255," + (0.26 * absCos).toFixed(3) + ")");
      lg.addColorStop(0.56, "rgba(255,255,255,0)"); lg.addColorStop(1, "rgba(255,255,255,0)");
      c2.fillStyle = lg; c2.fillRect(-Wb / 2, -Hb / 2, Wb, Hb);
      c2.globalCompositeOperation = "source-over";

      ctx.save();
      ctx.translate(pose.cx, pose.cy); ctx.rotate(pose.roll);
      ctx.globalAlpha = alpha;
      ctx.drawImage(o.buf, -Wb / 2, -Hb / 2, Wb, Hb);
      ctx.restore();
    }

    function drawFloorShadow(pose, def, a) {
      if (a <= 0.01) return;
      var y = pose.cy + def.H * pose.S * 0.58, w = def.W * pose.S * 0.7;
      ctx.save();
      ctx.globalAlpha = a * 0.5;
      ctx.translate(pose.cx, y); ctx.scale(1, 0.16);
      var g = ctx.createRadialGradient(0, 0, 0, 0, 0, w);
      g.addColorStop(0, "rgba(0,0,0,0.6)"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(-w, -w, w * 2, w * 2);
      ctx.restore();
    }

    // চাবির ধাতব রিং (পাও-এর পেছনে, ছিদ্রের ভেতর দিয়ে দেখা যায়)
    function drawRing(o, alpha) {
      var pose = o.pose;
      var c = Math.abs(Math.cos(pose.th));
      proj(pose, 0, (54 / 480 - 0.5), 0);
      var hx = PX, hy = PY;
      var R = pose.S * 0.095;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(hx, hy); ctx.rotate(pose.roll);
      var g = ctx.createLinearGradient(-R, -R * 2, R, 0);
      g.addColorStop(0, "#f6f8fb"); g.addColorStop(0.45, "#98a1ae"); g.addColorStop(0.7, "#eef1f6"); g.addColorStop(1, "#7a8390");
      ctx.strokeStyle = g; ctx.lineWidth = Math.max(2, R * 0.2);
      ctx.beginPath(); ctx.ellipse(0, -R * 0.55, R * Math.max(0.3, c), R * 1.05, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    }

    // ====================================================================
    //  ৫. প্রতি ফ্রেমের হিসাব ও আঁকা
    // ====================================================================
    var time = 0, lastT = performance.now(), lastDraw = 0, running = false, raf = 0;
    // মসৃণ স্ক্রল-অবস্থান: আসল স্ক্রল যেমন আছে তেমনই চলে (আমরা আটকাই না)।
    // শুধু অ্যানিমেশনের অগ্রগতি এই "পিছিয়ে-আসা" মান থেকে হিসাব হয়, তাই মাউস-হুইলের ঝাঁকুনিতেও কণারা মাখনের মতো গলে।
    var ssy = window.pageYOffset || 0;
    var SMOOTH = reduceMotionPref() ? 0 : 7.5;   // যত বেশি, তত দ্রুত ধরে ফেলে
    var capA = [-1, -1], copyA = -1, pawA = -1;
    var cached = { hero: null };

    function frame(now) {
      raf = 0;
      if (FRAME_MS && now - lastDraw < FRAME_MS) { schedule(); return; }
      lastDraw = now;
      var dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now; time += dt;
      var sy = window.pageYOffset || 0;
      if (SMOOTH > 0) {
        ssy += (sy - ssy) * (1 - Math.exp(-dt * SMOOTH));
        if (Math.abs(sy - ssy) < 0.05) ssy = sy;
      } else ssy = sy;
      var lag = sy - ssy;   // আসল স্ক্রল থেকে কতটা পিছিয়ে

      // ---- সব মাপ আগে পড়ি (লেআউট একবারই) ----
      var hr = hero.getBoundingClientRect();
      var sr = slot.getBoundingClientRect();
      var fr = finOK ? fin.getBoundingClientRect() : null;
      var slotR = [];
      if (finOK) { for (var q = 0; q < 4; q++) slotR.push(slots[q].getBoundingClientRect()); }

      // ---- স্ক্রল-অগ্রগতি ----
      var spanH = Math.max(1, hr.height - pinH);
      var ph = clamp((STICK - (hr.top + lag)) / spanH, 0, 1);
      var dis = range(ph, 0.10, 0.80);
      var heroLive = hr.bottom > -40 && dis < 0.999;

      var G = 0, reveal = 0, rel = 0, pf = 0, approach = 0;
      if (finOK) {
        var spanF = Math.max(1, fr.height - pinFH);
        pf = clamp((STICK - (fr.top + lag)) / spanF, 0, 1);
        approach = sstep(range(H - (fr.top + lag), 0, H * 0.9));
        G = 0.25 * approach + 0.75 * range(pf, 0.0, 0.55);
        reveal = sstep(range(pf, 0.5, 0.78));
        rel = sstep(range(H - (fr.bottom + lag), H * 0.12, H * 0.9));
      }
      var hide = reveal * (1 - rel);
      var Geff = G * (1 - rel);

      // ---- লেখা ও ক্যাপশনের স্বচ্ছতা (শুধু বদলালে লিখি) ----
      var ca = 1 - sstep(range(ph, 0.1, 0.26));
      if (Math.abs(ca - copyA) > 0.01) {
        copyA = ca; grid.style.setProperty("--copy-a", ca.toFixed(3)); grid.classList.toggle("is-faded", ca < 0.05);
      }
      for (var c = 0; c < CAPTIONS.length; c++) {
        var cv = CAPTIONS[c];
        var a = sstep(range(ph, cv.a, cv.a + 0.06)) * (1 - sstep(range(ph, cv.b - 0.06, cv.b)));
        if (Math.abs(a - capA[c]) > 0.01) { capA[c] = a; caps[c].style.opacity = a.toFixed(3); }
      }
      if (finOK) {
        var pa = sstep(range(pf, 0.22, 0.5));
        if (Math.abs(pa - pawA) > 0.01) {
          pawA = pa; fin.style.setProperty("--paw-a", pa.toFixed(3));
          fin.classList.toggle("paw-copy-on", pa > 0.6);
        }
      }

      ctx.clearRect(0, 0, W, H);

      // ---- বস্তুর অবস্থা ----
      var Uh = sr.width;
      heroObjs.forEach(function (o) {
        var it = o.it, p = o.pose;
        p.S = it.hs * Uh / o.def.H; p.D = p.S * 6;
        p.cx = sr.left + (0.5 + it.dx) * sr.width;
        p.cy = sr.top + sr.height * 0.5 + it.dy * sr.width + Math.sin(time * 0.8 + it.ph) * Uh * 0.014;
        p.th = it.ph + time * it.w; p.roll = it.roll + Math.sin(time * 0.5 + it.ph) * 0.03;
        p.cr = Math.cos(p.roll); p.sr = Math.sin(p.roll);
      });
      if (finOK) {
        var spin = sstep(range(pf, 0.58, 0.85)) * (1 - rel * 0.0);
        pawObjs.forEach(function (o, j) {
          var it = o.it, p = o.pose, r = slotR[j];
          p.S = r.width * (W < 860 ? 0.95 : 1.05); p.D = p.S * 6;
          p.cx = r.left + r.width / 2;
          p.cy = r.top + r.height / 2 + Math.sin(time * 0.9 + it.ph * 2) * r.width * 0.02 * (0.3 + spin);
          o.acc += dt * it.w * spin;
          p.th = Math.PI + o.acc + Math.sin(time * 0.6 + it.ph) * 0.12 * spin;
          p.roll = it.roll * (0.4 + 0.6 * spin) + Math.sin(time * 0.7 + it.ph) * 0.04 * spin;
          p.cr = Math.cos(p.roll); p.sr = Math.sin(p.roll);
        });
      }

      // ---- ওপরের কার্ড ----
      if (heroLive) {
        // পেছনের আলোর আভা
        var gcx = sr.left + sr.width * 0.5, gcy = sr.top + sr.height * 0.5, gR = Uh * 0.8;
        var rg = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, gR);
        var gA = 0.3 * (1 - sstep(range(dis, 0.0, 0.9)));
        rg.addColorStop(0, "rgba(40,100,255," + gA.toFixed(3) + ")"); rg.addColorStop(0.55, "rgba(255,140,70," + (gA * 0.22).toFixed(3) + ")"); rg.addColorStop(1, "rgba(40,100,255,0)");
        ctx.fillStyle = rg; ctx.fillRect(gcx - gR, gcy - gR, gR * 2, gR * 2);

        var order = heroObjs.slice().sort(function (x, y) { return x.it.hs - y.it.hs; });
        order.forEach(function (o) { drawFloorShadow(o.pose, o.def, 1 - dis / 0.6 > 0 ? 1 - dis / 0.6 : 0); });
        order.forEach(function (o) {
          var far = 0.72 + 0.28 * clamp((o.it.hs - 0.3) / 0.34, 0, 1);
          drawObj(o, dis, far);
        });
      }

      // ---- কণা ----
      var Uf = Math.min(W, H);
      var sizeBase = lowPower ? 1.35 : 1.15;
      var anyParticles = dis > 0.0001;
      if (anyParticles) {
        glN = 0;
        var lastStyle = "";
        for (var i = 0; i < P.length; i++) {
          var p = P[i];
          var dd = ddOf(dis, dkey(p.xn, p.yn, p.k));
          var gE = Geff > 0 ? sstep(clamp((Geff - p.gth * 0.55) / 0.45, 0, 1)) : 0;
          if (dd <= 0 && gE <= 0) continue;

          // শান্ত ব্যাকগ্রাউন্ডের অবস্থান (স্ক্রলের সাথে সামান্য প্যারালাক্স)
          var axp = ((p.ax * W + time * p.vx * 14 * (0.4 + p.zd) + Math.sin(time * 0.3 * p.sp + p.ph) * 18 * p.zd) % W + W) % W;
          var ayp = (((p.ay * H + time * p.vy * 10 - ssy * (0.05 + 0.13 * p.zd)) % H) + H) % H;
          var x, y, e = sstep(dd);
          if (dd >= 1 && gE <= 0) {
            // শান্ত ভাসমান কণা: দ্রুত পথ (আগে-বানানো রঙ, স্ট্রিং বানানো নেই)
            var qa = p.al * (1 - hide);
            if (p.gl) qa *= 0.6 + 0.4 * Math.sin(time * p.sp * 1.7 + p.ph);   // মৃদু ঝিকিমিকি
            if (qa < 0.03) continue;
            var sz0 = sizeBase * p.sz * (0.7 + p.zd * 0.6);
            if (p.gl && glN < glX.length) {
              glX[glN] = axp; glY[glN] = ayp; glA[glN] = qa; glC[glN] = p.ci; glS[glN] = sz0 * 8; glN++;
            }
            var st = STEADY[p.ci][Math.min(19, (qa * 20) | 0)];
            if (st !== lastStyle) { ctx.fillStyle = st; lastStyle = st; }
            ctx.fillRect(axp - sz0 / 2, ayp - sz0 / 2, sz0, sz0);
            continue;
          }
          if (dd >= 1) { x = axp; y = ayp; }
          else {
            var po = heroObjs[p.k].pose, cz = Math.cos(po.th) >= 0 ? -p.lz : p.lz;
            proj(po, p.lx, p.ly, cz);
            var arc = Math.sin(Math.PI * e) * Uf * 0.09;
            x = lerp(PX, axp, e) + p.dx * arc; y = lerp(PY, ayp, e) + p.dy * arc;
          }
          var oc = p.oc, ac = p.ac, tc = p.tc;
          var rr_ = lerp(oc[0], ac[0], e), gg = lerp(oc[1], ac[1], e), bb = lerp(oc[2], ac[2], e);
          var al = lerp(0.95, p.al, sstep(dd * 1.6));
          var size = sizeBase * p.sz * (0.7 + p.zd * 0.6);

          if (gE > 0) {
            var pp = pawObjs[p.pj].pose;
            proj(pp, p.tx, p.ty, p.tz);
            var swirl = Math.sin(gE * Math.PI) * Uf * 0.14 * p.sw;
            x = lerp(x, PX, gE) + swirl * (1 - gE * 0.3);
            y = lerp(y, PY, gE) - swirl * 0.6;
            rr_ = lerp(rr_, Math.max(tc[0], 58), gE); gg = lerp(gg, Math.max(tc[1], 58), gE); bb = lerp(bb, Math.max(tc[2], 62), gE);
            al = lerp(al, 0.95, gE);
            size = lerp(size, size * 1.4 + 0.8, gE);
          }
          al *= (1 - hide);
          if (al < 0.02) continue;
          ctx.fillStyle = "rgba(" + (rr_ | 0) + "," + (gg | 0) + "," + (bb | 0) + "," + al.toFixed(2) + ")";
          lastStyle = "";
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
        }
        // নরম আলোর ঝলক: যোগ-মিশ্রণে (glow), আলাদা একবারে আঁকা
        if (glN > 0 && !lowPower) {
          ctx.globalCompositeOperation = "lighter";
          for (var gi = 0; gi < glN; gi++) {
            ctx.globalAlpha = Math.min(0.55, glA[gi] * 0.8);
            ctx.drawImage(GLOW[glC[gi]], glX[gi] - glS[gi] / 2, glY[gi] - glS[gi] / 2, glS[gi], glS[gi]);
          }
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
        }
      }

      // ---- নিচের ৪টা পাও-ট্যাগ (কণা জড়ো হয়ে ঠিক হলে ফুটে ওঠে) ----
      if (finOK && reveal > 0.003) {
        pawObjs.forEach(function (o) { drawRing(o, reveal); });
        pawObjs.forEach(function (o) { drawObj(o, 0, reveal); });
      }

      schedule();
    }

    function schedule() { if (!running || document.hidden || raf) return; raf = requestAnimationFrame(frame); }
    function startLoop() { if (running) return; running = true; lastT = performance.now(); schedule(); }
    function stopLoop() { running = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    function onVis() { if (document.hidden) stopLoop(); else startLoop(); }

    var rz, lastW = W, lastH = H;
    function onResize() {
      clearTimeout(rz);
      rz = setTimeout(function () {
        var w = document.documentElement.clientWidth, h = window.innerHeight;
        // মোবাইলে ঠিকানা-বার ওঠানামা করলে বারবার নতুন করে বানাই না
        if (w !== lastW || Math.abs(h - lastH) > 150) { lastW = w; lastH = h; resize(); }
      }, 140);
    }
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    startLoop();

    TK.heroAnimation.stop = function () {
      stopLoop();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      heroObjs.concat(pawObjs).forEach(function (o) { o.buf = null; o.bc = null; });
      P.length = 0;
    };
    TK.heroAnimation.debug = function () { return { N: P.length, W: W, H: H, DPR: DPR }; };
  }

  TK.heroAnimation = { start: start };
})();
