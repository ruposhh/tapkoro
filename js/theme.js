/*
  ডার্ক / লাইট মোড। এই ফাইল <head>-এ সবার আগে চলে, যাতে পেজ খোলার সময় রং ঝলকে না যায়।
  পছন্দ ব্রাউজারে মনে থাকে। প্রথমবার ডার্ক মোড দেখায়।
*/
(function () {
  "use strict";
  var KEY = "tk-theme";
  var root = document.documentElement;
  var TK = (window.TapKoro = window.TapKoro || {});

  function read() {
    try { var v = localStorage.getItem(KEY); return v === "light" || v === "dark" ? v : null; } catch (e) { return null; }
  }
  function paint(t) {
    root.setAttribute("data-theme", t);
    root.style.colorScheme = t;
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", t === "light" ? "#f3f6fb" : "#07090d");
  }

  var current = read() || "dark";
  paint(current);
  document.addEventListener("DOMContentLoaded", function () { paint(current); });

  TK.theme = {
    get: function () { return current; },
    set: function (t) {
      if (t !== "light" && t !== "dark") return;
      root.classList.add("theme-anim");
      current = t;
      paint(t);
      try { localStorage.setItem(KEY, t); } catch (e) {}
      setTimeout(function () { root.classList.remove("theme-anim"); }, 600);
      try { document.dispatchEvent(new CustomEvent("tk-theme", { detail: t })); } catch (e) {}
    },
    toggle: function () { TK.theme.set(current === "dark" ? "light" : "dark"); }
  };
})();
