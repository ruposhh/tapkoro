/*
  ভাগ ৯ — স্ক্রল-চালিত হিরো অ্যানিমেশন (শুধু Canvas, কোনো বাইরের লাইব্রেরি নেই)।

  ধাপ (p = স্ক্রল-অগ্রগতি, 0 থেকে 1):
    0.00–0.10  পণ্য ধীরে ঘোরে ও ভাসে
    0.08–0.52  পণ্য কণায় ভেঙে যায়
    0.40–0.66  কণা প্রবাহের মতো ভেসে বেড়ায়
    0.58–0.90  কণা জড়ো হয়ে পাও-ট্যাগের আকার নেয় (আগে বাইরের রেখা, পরে প্যাড)
    0.84–1.00  আসল ছবি ফুটে ওঠে, চাবির রিং আসে

  সত্যি 3D নয়: সামনে-পেছনের আসল ছবি দিয়ে "কার্ড ঘোরানো" 3D-র মতো দেখানো হয়।
  চললে true ফেরত দেয়; না চললে (reduced-motion, Canvas নেই, ছবি লোড হয়নি) false,
  তখন hero.js আগের সাধারণ ভার্সন দেখায়।
*/
(function () {
  var TK = (window.TapKoro = window.TapKoro || {});
  var BASE = "assets/anim/";
  var TAU = Math.PI * 2;

  // ---------- ছোট গণিত ----------
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function sstep(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function range(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // ---------- ছবির তালিকা ----------
  var FILES = ["ig-front", "ig-back", "fb-front", "wifi-front", "wifi-back",
    "paw-bw-front", "paw-bw-back", "paw-red-front", "paw-red-back"];

  // কোন পণ্য কোথায়: dx/dy ইউনিটে, h = উচ্চতা, ω = ঘোরার গতি, z = গভীরতা-মাপ
  var STANDS = [
    { front: "ig-front", back: "ig-back", dx: -0.30, dy: -0.02, h: 0.80, w: 0.1, ph: 0.0, tilt: -0.28, z: 1.0 },
    { front: "fb-front", back: "ig-back", dx: 0.12, dy: 0.07, h: 0.72, w: -0.085, ph: 1.7, tilt: 0.24, z: 0.9 },
    { front: "wifi-front", back: "wifi-back", dx: 0.44, dy: 0.15, h: 0.50, w: 0.115, ph: 3.1, tilt: -0.2, z: 0.78 },
  ];
  // পাও-ট্যাগ: hole = (x, y, ব্যাসার্ধ) প্রস্থের অনুপাতে (ছবি থেকে মাপা)
  var PAWS = [
    { front: "paw-bw-front", back: "paw-bw-back", dx: -0.5, hole: [0.4673, 0.1037, 0.0336], ring: "#c9ced6" },
    { front: "paw-red-front", back: "paw-red-back", dx: 0.5, hole: [0.4639, 0.0979, 0.0359], ring: "#c9ced6" },
  ];

  var CAPTIONS = [
    { a: 0.20, b: 0.46, text: "Every tap starts as a spark." },
    { a: 0.52, b: 0.78, text: "Then it takes shape." },
  ];

  function loadImage(name) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("missing " + name)); };
      img.src = BASE + name + ".webp";
    });
  }

  // ছবির অস্বচ্ছ পিক্সেল থেকে (u, v, রং) নমুনা তোলে
  function samplePixels(img, targetH) {
    var h = targetH, w = Math.max(8, Math.round(img.width * h / img.height));
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0, w, h);
    var d = g.getImageData(0, 0, w, h).data; // সীমানা-পার ছবি হলে এখানে ভুল ছুঁড়বে (try/catch বাইরে)
    var list = [];
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        if (d[i + 3] > 200) list.push([x / w, y / h, d[i], d[i + 1], d[i + 2]]);
      }
    }
    return { list: list, w: w, h: h, data: d };
  }

  function start(slot) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return false;
    var hero = slot.closest(".hero");
    var grid = hero && hero.querySelector(".hero-grid");
    if (!hero || !grid) return false;

    var testCanvas = document.createElement("canvas");
    if (!testCanvas.getContext || !testCanvas.getContext("2d")) return false;

    // ধীর/কম-শক্তির ফোনে হালকা ভার্সন
    var lowPower = (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 3);
    var isNarrow = window.innerWidth < 860;
    var COUNT = lowPower ? 700 : isNarrow ? 1300 : 2200;
    var DPR = Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.75);
    var STRIPS = lowPower ? 14 : 28;
    var GRID_X = lowPower ? 9 : 14, GRID_Y = lowPower ? 13 : 20;
    

    // ছবি লোড; ব্যর্থ হলে সাধারণ ভার্সনেই থাকে
    Promise.all(FILES.map(loadImage)).then(function (imgs) {
      var im = {};
      FILES.forEach(function (n, i) { im[n] = imgs[i]; });
      try { build(im); } catch (e) {
        if (window.console) console.warn("Hero animation off:", e && e.message);
        teardownFallback();
      }
    }).catch(function () { /* সাধারণ ভার্সন আগেই আঁকা আছে */ });

    function teardownFallback() {
      if (hero.classList.contains("is-story")) hero.classList.remove("is-story");
    }

    function build(im) {
      // ---- পাও-ট্যাগের কণার লক্ষ্য, চাবির ছিদ্র ও "বাইরের রং" ----
      var pawSamples = PAWS.map(function (p) {
        var s = samplePixels(im[p.front], 110);
        var hx = Math.round(p.hole[0] * s.w), hy = Math.round(p.hole[1] * s.h);
        var rr = Math.round(p.hole[2] * s.w * 1.9);
        var sx = clamp(hx - rr, 0, s.w - 1), sy = clamp(hy + rr, 0, s.h - 1);
        var k = (sy * s.w + sx) * 4;
        // ছিদ্রের পাশের রং = বাইরের রং; এর থেকে দূরের রং = প্যাড/ডিটেইল
        s.outer = [s.data[k], s.data[k + 1], s.data[k + 2]];
        return s;
      });
      var standSamples = STANDS.map(function (st) { return samplePixels(im[st.front], 120); });

      // ---- কণা তৈরি ----
      var N = COUNT;
      var P = [];
      var totalArea = standSamples.reduce(function (a, s) { return a + s.list.length; }, 0);
      for (var i = 0; i < N; i++) {
        // মূল পণ্য বেছে নিই (আকার অনুযায়ী)
        var r = Math.random() * totalArea, k = 0;
        while (k < standSamples.length - 1 && r > standSamples[k].list.length) { r -= standSamples[k].list.length; k++; }
        var o = standSamples[k].list[(Math.random() * standSamples[k].list.length) | 0];
        var j = i % 2; // দুই পাও-ট্যাগে সমান ভাগ
        var ps = pawSamples[j];
        var t = ps.list[(Math.random() * ps.list.length) | 0];
        var dr = t[2] - ps.outer[0], dg = t[3] - ps.outer[1], db = t[4] - ps.outer[2];
        var detail = Math.sqrt(dr * dr + dg * dg + db * db) > 90;
        var ang = Math.random() * TAU;
        P.push({
          s: k, ou: o[0], ov: o[1], oc: [o[2], o[3], o[4]],
          pj: j, tu: clamp(t[0] + (Math.random() - 0.5) / ps.w, 0, 1), tv: clamp(t[1] + (Math.random() - 0.5) / ps.h, 0, 1),
          tc: [t[2], t[3], t[4]],
          th: Math.random(),                         // ভাঙার ক্রম
          gth: (detail ? 0.5 : 0) + Math.random() * 0.5, // জড়ো হওয়ার ক্রম (বাইরের রেখা আগে)
          dx: Math.cos(ang), dy: Math.sin(ang),
          sp: 0.5 + Math.random() * 1.1,
          ph: Math.random() * TAU,
          sz: 0.7 + Math.random() * 1.6,
          zd: 0.45 + Math.random() * 0.55,           // গভীরতা: ছোট = দূরে
          sw: (Math.random() - 0.5) * 2,
        });
      }

      // ---- DOM: পিন করা মঞ্চ ও ক্যানভাস ----
      var pin = document.createElement("div");
      pin.className = "story-pin";
      hero.insertBefore(pin, grid);
      pin.appendChild(grid);
      var canvas = document.createElement("canvas");
      canvas.className = "story-canvas";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", "TapKoro NFC stands turning into particles, then forming cat paw NFC tags");
      pin.insertBefore(canvas, grid);
      slot.classList.add("is-live");
      slot.setAttribute("aria-hidden", "true");
      slot.removeAttribute("role");

      var caps = CAPTIONS.map(function (c) {
        var d = document.createElement("p");
        d.className = "story-caption";
        d.setAttribute("aria-hidden", "true");
        d.textContent = c.text;
        pin.appendChild(d);
        return d;
      });
      var finale = document.createElement("div");
      finale.className = "story-finale";
      var fh = document.createElement("h2");
      fh.textContent = "Cat paw NFC tags";
      var fp = document.createElement("p");
      fp.textContent = "Tap once. Your pet's details travel with the tag.";
      var fa = document.createElement("a");
      fa.className = "btn btn-primary";
      var cat = TK.getProduct && TK.getProduct("nfc-cat-collar-tag");
      fa.href = cat && TK.ui && TK.ui.detailUrl ? TK.ui.detailUrl(cat) : "#products";
      fa.textContent = "See the cat tags";
      finale.appendChild(fh); finale.appendChild(fp); finale.appendChild(fa);
      pin.appendChild(finale);

      hero.classList.add("is-story");
      hero.style.setProperty("--story-len", (isNarrow ? 380 : 460) + "vh");

      var ctx = canvas.getContext("2d");
      var W = 0, H = 0, U = 1, layout = null;

      function resize() {
        var r = pin.getBoundingClientRect();
        W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
        canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
        canvas.style.width = W + "px"; canvas.style.height = H + "px";
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        var narrow = W < 860;
        var availW = narrow ? W * 0.94 : W * 0.5;
        var availH = narrow ? H * 0.34 : H * 0.8;
        U = Math.min(availW / 1.2, availH / 0.95);
        layout = {
          narrow: narrow,
          // শুরুর কেন্দ্র (লেখার পাশে) → মাঝখান (লেখা মিলিয়ে গেলে)
          c0: narrow ? [W * 0.5, H * 0.8] : [W * 0.7, H * 0.52],
          c1: [W * 0.5, narrow ? H * 0.46 : H * 0.5],
          pawU: narrow ? Math.min(W * 0.42, H * 0.3) : Math.min(W * 0.2, H * 0.4),
          pawY: narrow ? H * 0.38 : H * 0.44,
        };
      }
      resize();

      // ---- রূপান্তর: কার্ডের বিন্দু → স্ক্রিন ----
      // θ ঘূর্ণন, f = পারস্পেক্টিভ। front=true হলে সামনের ছবি।
      function faceInfo(theta) {
        var c = Math.cos(theta);
        return { cos: c, sin: Math.sin(theta), front: c >= 0 };
      }

      // স্ট্যান্ডের অবস্থা (প্রতি ফ্রেমে হিসাব)
      var stands = STANDS.map(function (st) {
        var fi = im[st.front];
        return { def: st, rot: st.ph, k: null, aspect: fi.width / fi.height };
      });

      function standPose(s, time, e1) {
        // e1: ঘোরা থামিয়ে সামনে ফেরার মাত্রা (0..1)
        var d = s.def;
        var cx = lerp(layout.c0[0], layout.c1[0], e1Move) + d.dx * U;
        var cy = lerp(layout.c0[1], layout.c1[1], e1Move) + d.dy * U + Math.sin(time * 0.9 + d.ph) * U * 0.018 * (1 - e1 * 0.5);
        var h = d.h * U;
        var w = h * s.aspect;
        var th = s.rot;
        if (e1 > 0) {
          if (s.k === null) s.k = Math.round(s.rot / TAU);
          th = lerp(s.rot, s.k * TAU + d.tilt, e1);
        } else { s.k = null; }
        return { cx: cx, cy: cy, w: w, h: h, th: th, z: d.z };
      }

      var e1Move = 0;

      // একটা ছবি স্ট্রিপে স্ট্রিপে আঁকা: সত্যিকারের পারস্পেক্টিভে ঘোরা কার্ড
      function drawCard(frontImg, backImg, pose, alpha, shadow) {
        var fi = faceInfo(pose.th);
        var img = fi.front ? frontImg : backImg;
        var absCos = Math.abs(fi.cos);
        var D = pose.h * 4.2; // ক্যামেরার দূরত্ব
        var n = STRIPS;
        var sw = img.width / n;
        ctx.save();
        ctx.globalAlpha = alpha;
        for (var i = 0; i < n; i++) {
          var u0 = i / n - 0.5, u1 = (i + 1) / n - 0.5;
          var x0 = u0 * pose.w, x1 = u1 * pose.w;
          var sgn = fi.front ? 1 : -1;
          var Z0 = x0 * fi.sin * sgn, Z1 = x1 * fi.sin * sgn;
          var f0 = D / (D + Z0), f1 = D / (D + Z1);
          var X0 = x0 * absCos * f0, X1 = x1 * absCos * f1;
          var hh0 = pose.h * f0, hh1 = pose.h * f1;
          var dw = X1 - X0;
          var dh = (hh0 + hh1) / 2;
          if (dw < 0.05) continue;
          // দুই পাশের উচ্চতা আলাদা: ছোট স্ট্রিপে গড় উচ্চতা ব্যবহার করে ট্র্যাপিজিয়াম আনুমানিকভাবে বোঝানো
          ctx.drawImage(img, i * sw, 0, Math.min(sw + 1, img.width - i * sw), img.height, pose.cx + X0, pose.cy - dh / 2, dw + 1, dh);
        }
        ctx.restore();
        // পাশের পুরুত্ব (কার্ড প্রায় পাশ ফিরলে সরু একটা ধার)
        if (absCos < 0.2) {
          var a = (0.2 - absCos) / 0.2;
          ctx.save();
          ctx.globalAlpha = alpha * a * 0.9;
          ctx.fillStyle = "#cfd3da";
          var ew = Math.max(1.5, pose.w * 0.035 * (1 - absCos));
          ctx.fillRect(pose.cx - ew / 2, pose.cy - pose.h / 2 + pose.h * 0.01, ew, pose.h * 0.98);
          ctx.restore();
        }
      }

      // স্ট্যান্ডের একটা বিন্দুর (u,v) স্ক্রিন-অবস্থান (সামনে-মুখী ধরে)
      function standPoint(pose, u, v) {
        var fi = faceInfo(pose.th);
        var D = pose.h * 4.2;
        var x = (u - 0.5) * pose.w;
        var Z = x * fi.sin * (fi.front ? 1 : -1);
        var f = D / (D + Z);
        return [pose.cx + x * Math.abs(fi.cos) * f, pose.cy + (v - 0.5) * pose.h * f];
      }

      // ---- ভাঙার টাইল: প্রতিটা পণ্যের টাইল-গ্রিড ----
      function drawTiles(img, pose, dissolveOf, alphaAll) {
        var gx = GRID_X, gy = GRID_Y;
        var fi = faceInfo(pose.th);
        var absCos = Math.abs(fi.cos);
        var tw = img.width / gx, thh = img.height / gy;
        var ctr = pose; // সামনে-মুখী ধরে সরল রূপান্তর
        for (var iy = 0; iy < gy; iy++) {
          for (var ix = 0; ix < gx; ix++) {
            var u = (ix + 0.5) / gx, v = (iy + 0.5) / gy;
            var dd = dissolveOf(u, v);
            if (dd >= 1) continue;
            var pt = standPoint(ctr, u, v);
            var D = ctr.h * 4.2, x = (u - 0.5) * ctr.w;
            var f = D / (D + x * fi.sin);
            var dw = (ctr.w / gx) * absCos * f, dh = (ctr.h / gy) * f;
            var sc = 1 - dd * 0.55;
            // ভাঙার সময় টাইল সামান্য ওপরে উঠে আলগা হয়
            var off = dd * dd * U * 0.05;
            ctx.globalAlpha = (1 - dd) * alphaAll;
            ctx.drawImage(img, ix * tw, iy * thh, tw + 0.5, thh + 0.5,
              pt[0] - dw * sc / 2, pt[1] - dh * sc / 2 - off, dw * sc + 0.7, dh * sc + 0.7);
          }
        }
        ctx.globalAlpha = 1;
      }

      // ---- পাও-ট্যাগের অবস্থা ----
      var paws = PAWS.map(function (p) {
        var fi = im[p.front];
        return { def: p, aspect: fi.width / fi.height };
      });
      function pawPose(pw, time, sway) {
        var d = pw.def;
        var w = layout.pawU, h = w / pw.aspect;
        var gap = layout.narrow ? layout.pawU * 0.62 : layout.pawU * 0.7;
        var cx = W * 0.5 + d.dx * (w + gap * 0.0) * 1.0 + d.dx * gap * 0.35;
        var cy = layout.pawY + Math.sin(time * 0.8 + d.dx * 3) * U * 0.012;
        var th = Math.sin(time * 0.55 + d.dx * 2) * 0.55 * sway + (d.dx < 0 ? -0.1 : 0.1) * sway;
        return { cx: cx, cy: cy, w: w, h: h, th: th };
      }

      function drawRing(pose, def, alpha) {
        // চাবির ধাতব রিং: ছিদ্রের মধ্য দিয়ে, পাও-এর পেছনে আঁকি যাতে ছিদ্রে দেখা যায়
        var th = pose.th, absCos = Math.abs(Math.cos(th));
        var hx = pose.cx + (def.hole[0] - 0.5) * pose.w * Math.cos(th);
        var hy = pose.cy + (def.hole[1] - 0.5) * pose.h;
        var R = def.hole[2] * pose.w * 2.3;
        var cyc = hy - R * 0.45;
        ctx.save();
        ctx.globalAlpha = alpha;
        var g = ctx.createLinearGradient(hx - R, cyc - R, hx + R, cyc + R);
        g.addColorStop(0, "#f4f6fa"); g.addColorStop(0.45, "#9aa3b0"); g.addColorStop(0.7, "#e9edf3"); g.addColorStop(1, "#7e8794");
        ctx.strokeStyle = g;
        ctx.lineWidth = Math.max(2, R * 0.24);
        ctx.beginPath();
        ctx.ellipse(hx, cyc, R * Math.max(0.35, absCos), R, 0, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      // ---- মূল আঁকার লুপ ----
      var progress = 0, shown = 0;
      var lastT = performance.now(), time = 0, running = false, visible = true, raf = 0;
      var GLOW = [140, 190, 255];

      function readProgress() {
        var r = hero.getBoundingClientRect();
        var span = hero.offsetHeight - pin.offsetHeight;
        progress = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
      }

      function frame(now) {
        raf = 0;
        var dt = Math.min(0.05, (now - lastT) / 1000);
        lastT = now; time += dt;
        readProgress();
        shown += (progress - shown) * Math.min(1, dt * 9); // নরম অনুসরণ
        if (Math.abs(progress - shown) < 0.0004) shown = progress;
        var p = shown;

        ctx.clearRect(0, 0, W, H);

        // ধাপের মান
        var damp = sstep(range(p, 0.03, 0.09));        // ঘোরা থামে
        var move = sstep(range(p, 0.02, 0.18));        // কেন্দ্রে সরে
        e1Move = move;
        var dis = range(p, 0.08, 0.52);                 // ভাঙন
        var flowOn = sstep(range(p, 0.36, 0.5)) * (1 - sstep(range(p, 0.82, 0.94)));
        var gatherP = range(p, 0.58, 0.9);
        var reveal = sstep(range(p, 0.84, 0.97));
        var swayAmt = sstep(range(p, 0.93, 1.0));

        // হেডলাইন লেখা মিলায়
        var copyA = 1 - sstep(range(p, 0.04, 0.14));
        grid.style.setProperty("--copy-a", copyA.toFixed(3));
        grid.classList.toggle("is-faded", copyA < 0.05);

        // ক্যাপশন ও ফাইনাল
        for (var c = 0; c < CAPTIONS.length; c++) {
          var cv = CAPTIONS[c];
          var a = sstep(range(p, cv.a, cv.a + 0.05)) * (1 - sstep(range(p, cv.b - 0.05, cv.b)));
          caps[c].style.opacity = a.toFixed(3);
        }
        var fa2 = sstep(range(p, 0.9, 0.99));
        finale.style.opacity = fa2.toFixed(3);
        finale.style.pointerEvents = fa2 > 0.6 ? "auto" : "none";
        finale.style.visibility = fa2 > 0.01 ? "visible" : "hidden";

        // পেছনের নীল আভা
        var gcx = lerp(layout.c0[0], layout.c1[0], move), gcy = lerp(layout.c0[1], layout.c1[1], move);
        var gR = U * 0.95;
        var rg = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, gR);
        var gAlpha = 0.34 * (1 - sstep(range(p, 0.55, 0.9)) * 0.5);
        rg.addColorStop(0, "rgba(21,87,255," + gAlpha.toFixed(3) + ")");
        rg.addColorStop(1, "rgba(21,87,255,0)");
        ctx.fillStyle = rg;
        ctx.fillRect(gcx - gR, gcy - gR, gR * 2, gR * 2);

        // স্ট্যান্ডের ভঙ্গি
        var poses = stands.map(function (s) {
          s.rot += dt * s.def.w * (1 - damp);
          return standPose(s, time, damp);
        });

        // মেঝের নরম ছায়া (প্রতিফলনের আভাস)
        if (dis < 0.6) {
          ctx.save();
          ctx.globalAlpha = (1 - dis / 0.6) * 0.5;
          poses.forEach(function (ps) {
            var rg2 = ctx.createRadialGradient(ps.cx, ps.cy + ps.h * 0.6, 0, ps.cx, ps.cy + ps.h * 0.6, ps.w * 0.9);
            rg2.addColorStop(0, "rgba(0,0,0,0.55)"); rg2.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = rg2;
            ctx.save(); ctx.translate(ps.cx, ps.cy + ps.h * 0.6); ctx.scale(1, 0.18); ctx.translate(-ps.cx, -(ps.cy + ps.h * 0.6));
            ctx.fillRect(ps.cx - ps.w, ps.cy + ps.h * 0.6 - ps.w, ps.w * 2, ps.w * 2);
            ctx.restore();
          });
          ctx.restore();
        }

        // পণ্য আঁকা: ভাঙন শুরু না হলে নিখুঁত স্ট্রিপ, শুরু হলে টাইল
        if (dis < 1) {
          // দূরেরটা আগে
          [2, 1, 0].forEach(function (si) {
            var s = stands[si], ps = poses[si], d = s.def;
            if (dis <= 0.0001) {
              drawCard(im[d.front], im[d.back], ps, 1, true);
            } else {
              drawTiles(im[d.front], ps, function (u, v) {
                // ভাঙার ক্রম: পাশ থেকে শুরু + এলোমেলো
                var key = (1 - u) * 0.35 + (Math.sin(u * 17.3 + v * 9.1 + si * 3) * 0.5 + 0.5) * 0.4 + v * 0.25;
                return clamp((dis * 1.55 - key * 0.9) / 0.35, 0, 1);
              }, 1);
            }
          });
        }

        // কণা
        var pw0 = pawPose(paws[0], time, swayAmt), pw1 = pawPose(paws[1], time, swayAmt);
        var pawPoses = [pw0, pw1];
        var solidA = reveal;
        // রিং আগে (পাও-এর পেছনে)
        if (reveal > 0.02) {
          for (var q = 0; q < 2; q++) drawRing(pawPoses[q], paws[q].def, reveal);
        }

        var pAlphaGlobal = 1 - solidA;
        if (pAlphaGlobal > 0.01 && dis > 0.0001) {
          var sizeBase = lowPower ? 2.0 : 1.7;
          for (var i = 0; i < N; i++) {
            var pt = P[i];
            var dd = clamp((dis * 1.55 - ((1 - pt.ou) * 0.35 + (Math.sin(pt.ou * 17.3 + pt.ov * 9.1 + pt.s * 3) * 0.5 + 0.5) * 0.4 + pt.ov * 0.25) * 0.9 - pt.th * 0.08) / 0.3, 0, 1);
            if (dd <= 0) continue;
            var ps2 = poses[pt.s];
            var o = standPoint(ps2, pt.ou, pt.ov);
            // ভেসে যাওয়া: বাইরের দিকে + প্রবাহ
            var out = sstep(dd) * U * (0.25 + pt.sp * 0.55);
            var fx = Math.sin(time * 0.35 * pt.sp + pt.ph + o[1] * 0.006) * U * 0.22 * flowOn * pt.zd;
            var fy = Math.cos(time * 0.3 * pt.sp + pt.ph * 1.3 + o[0] * 0.006) * U * 0.16 * flowOn * pt.zd;
            // সাধারণ ডান-থেকে-বাঁ প্রবাহ-টান
            var drift = (dis > 0.6 ? 1 : dis / 0.6) * (p > 0.5 ? 1 : 0);
            var mx = o[0] + pt.dx * out + fx + (pt.sw * U * 0.18) * sstep(range(p, 0.4, 0.62));
            var my = o[1] + pt.dy * out * 0.8 + fy - U * 0.1 * sstep(range(p, 0.3, 0.6)) * pt.zd;

            // জড়ো হওয়া
            var g = sstep(clamp((gatherP * 1.6 - pt.gth * 0.6) / 0.4, 0, 1));
            var pp = pawPoses[pt.pj];
            var tx = pp.cx + (pt.tu - 0.5) * pp.w * Math.cos(pp.th);
            var ty = pp.cy + (pt.tv - 0.5) * pp.h;
            // বাঁকা পথে আসে (ঘূর্ণি)
            var swirl = Math.sin(g * Math.PI) * U * 0.25 * pt.sw;
            var x = lerp(mx, tx, g) + swirl * (1 - g * 0.2);
            var y = lerp(my, ty, g) - swirl * 0.6;

            // রং: আসল → নীলচে-সাদা আভা → পাও-এর আসল রং
            var tg = sstep(dd), tgl = g;
            var rr = lerp(pt.oc[0], GLOW[0], tg * (1 - tgl * 0.0)), gg = lerp(pt.oc[1], GLOW[1], tg), bb = lerp(pt.oc[2], GLOW[2], tg);
            rr = lerp(rr, pt.tc[0], tgl); gg = lerp(gg, pt.tc[1], tgl); bb = lerp(bb, pt.tc[2], tgl);
            var al = (0.35 + 0.65 * Math.min(1, dd * 3)) * (0.55 + 0.45 * pt.zd) * pAlphaGlobal;
            var size = (sizeBase * pt.sz * (0.6 + pt.zd * 0.7)) * (1 - g * 0.35);
            ctx.fillStyle = "rgba(" + (rr | 0) + "," + (gg | 0) + "," + (bb | 0) + "," + al.toFixed(2) + ")";
            ctx.fillRect(x - size / 2, y - size / 2, size, size);
          }
        }

        // আসল পাও-ট্যাগ ফুটে ওঠে + একবার চকচকে আভা
        if (solidA > 0.001) {
          for (var q2 = 0; q2 < 2; q2++) {
            var pose = pawPoses[q2], def = paws[q2].def;
            drawCard(im[def.front], im[def.back], pose, solidA, false);
          }
          // চকচকে আভা: বাঁ থেকে ডানে একবার ঝিলিক
          var sh = range(p, 0.9, 1.0);
          if (sh > 0 && sh < 1) {
            for (var q3 = 0; q3 < 2; q3++) {
              var pp3 = pawPoses[q3];
              var sx = pp3.cx - pp3.w / 2 + pp3.w * (sh * 1.4 - 0.2);
              var lg = ctx.createRadialGradient(sx, pp3.cy, 0, sx, pp3.cy, pp3.w * 0.35);
              lg.addColorStop(0, "rgba(255,255,255," + (0.28 * Math.sin(sh * Math.PI)).toFixed(3) + ")");
              lg.addColorStop(1, "rgba(255,255,255,0)");
              ctx.fillStyle = lg;
              ctx.fillRect(sx - pp3.w * 0.35, pp3.cy - pp3.w * 0.35, pp3.w * 0.7, pp3.w * 0.7);
            }
          }
        }

        schedule();
      }

      function schedule() {
        if (!running || !visible || document.hidden || raf) return;
        raf = requestAnimationFrame(frame);
      }
      function startLoop() { if (running) return; running = true; lastT = performance.now(); schedule(); }
      function stopLoop() { running = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }

      // হিরো স্ক্রিনের বাইরে থাকলে আঁকা বন্ধ
      var io = ("IntersectionObserver" in window) ? new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible) { startLoop(); schedule(); } else { stopLoop(); }
      }, { rootMargin: "100px" }) : null;
      if (io) io.observe(hero); else startLoop();

      function onVis() { if (document.hidden) stopLoop(); else if (visible) { startLoop(); } }
      var rz;
      function onResize() { clearTimeout(rz); rz = setTimeout(function () { resize(); }, 120); }
      document.addEventListener("visibilitychange", onVis);
      window.addEventListener("resize", onResize);
      window.addEventListener("orientationchange", onResize);
      // পেজ আবার খুললে ঠিক জায়গা থেকে শুরু (reload-এ ব্রাউজার স্ক্রল ফিরিয়ে দেয়)
      readProgress(); shown = progress;
      startLoop();

      TK.heroAnimation.stop = function () {
        stopLoop();
        if (io) io.disconnect();
        document.removeEventListener("visibilitychange", onVis);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("orientationchange", onResize);
      };
    }

    return true;
  }

  TK.heroAnimation = { start: start };
})();
