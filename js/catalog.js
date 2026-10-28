/*
  পণ্যের তালিকা: সার্চ, ক্যাটাগরি ফিল্টার, সর্ট।
  পণ্যের তথ্য আসে js/products.js থেকে, তাই নতুন পণ্য যোগ করলে এখানে কিছু বদলাতে হয় না।
*/
(function () {
  var TK = (window.TapKoro = window.TapKoro || {});
  var el = TK.ui.el;

  var SORTS = [
    { id: "featured", label: "Featured" },
    { id: "price-asc", label: "Price: low to high" },
    { id: "price-desc", label: "Price: high to low" },
    { id: "newest", label: "Newest" },
  ];

  function isFeatured(p) {
    return (p.badges || []).indexOf("Featured") !== -1;
  }

  function sortList(list, sort) {
    // মূল তালিকার ক্রম ঠিক রাখতে index সঙ্গে রাখা হয়
    var items = list.map(function (p, i) { return { p: p, i: i }; });
    items.sort(function (a, b) {
      var x = a.p, y = b.p, d = 0;
      if (sort === "price-asc") d = TK.finalPrice(x) - TK.finalPrice(y);
      else if (sort === "price-desc") d = TK.finalPrice(y) - TK.finalPrice(x);
      else if (sort === "newest") d = String(y.addedOn || "").localeCompare(String(x.addedOn || ""));
      else d = (isFeatured(y) ? 1 : 0) - (isFeatured(x) ? 1 : 0);
      return d || a.i - b.i;
    });
    return items.map(function (it) { return it.p; });
  }

  function matchesQuery(p, q) {
    if (!q) return true;
    var hay = [p.name, p.shortDescription, p.description, p.categoryLabel].join(" ").toLowerCase();
    return q.toLowerCase().split(/\s+/).every(function (word) { return hay.indexOf(word) !== -1; });
  }

  function mount(root) {
    if (!root) return;
    var state = { category: "all", query: "", sort: "featured" };

    // যে ক্যাটাগরিতে অন্তত একটা পণ্য আছে শুধু সেগুলো
    var cats = [{ id: "all", label: "All" }].concat(
      TK.categories.filter(function (c) {
        return TK.products.some(function (p) { return p.category === c.id; });
      })
    );

    /* ---- টুলবার ---- */
    var toolbar = el("div", "toolbar");

    var searchWrap = el("div", "field field-search");
    var searchLabel = el("label", "visually-hidden", "Search products");
    searchLabel.setAttribute("for", "catalog-search");
    var search = el("input", "input");
    search.type = "search";
    search.id = "catalog-search";
    search.placeholder = "Search products";
    search.autocomplete = "off";
    searchWrap.appendChild(searchLabel);
    searchWrap.appendChild(search);

    var sortWrap = el("div", "field field-sort");
    var sortLabel = el("label", "visually-hidden", "Sort products");
    sortLabel.setAttribute("for", "catalog-sort");
    var select = el("select", "input");
    select.id = "catalog-sort";
    SORTS.forEach(function (s) {
      var o = el("option", "", s.label);
      o.value = s.id;
      select.appendChild(o);
    });
    sortWrap.appendChild(sortLabel);
    sortWrap.appendChild(select);

    var chips = el("div", "chips");
    chips.setAttribute("role", "group");
    chips.setAttribute("aria-label", "Filter by category");
    var chipButtons = cats.map(function (c) {
      var b = el("button", "chip", c.label);
      b.type = "button";
      b.setAttribute("data-cat", c.id);
      b.addEventListener("click", function () {
        state.category = c.id;
        render();
      });
      chips.appendChild(b);
      return b;
    });

    toolbar.appendChild(chips);
    toolbar.appendChild(searchWrap);
    toolbar.appendChild(sortWrap);

    var status = el("p", "muted catalog-status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    var grid = el("div", "grid");

    var empty = el("div", "empty");
    empty.hidden = true;
    empty.appendChild(el("p", "", "No products match your search."));
    var clear = el("button", "btn btn-ghost", "Clear filters");
    clear.type = "button";
    clear.addEventListener("click", function () {
      state.category = "all";
      state.query = "";
      state.sort = "featured";
      search.value = "";
      select.value = "featured";
      render();
    });
    empty.appendChild(clear);

    search.addEventListener("input", function () {
      state.query = search.value.trim();
      render();
    });
    select.addEventListener("change", function () {
      state.sort = select.value;
      render();
    });

    root.textContent = "";
    root.appendChild(toolbar);
    root.appendChild(status);
    root.appendChild(grid);
    root.appendChild(empty);

    function render() {
      chipButtons.forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-cat") === state.category));
      });

      var list = TK.products.filter(function (p) {
        return (state.category === "all" || p.category === state.category) && matchesQuery(p, state.query);
      });
      list = sortList(list, state.sort);

      grid.textContent = "";
      list.forEach(function (p) { grid.appendChild(TK.ui.productCard(p)); });

      empty.hidden = list.length > 0;
      grid.hidden = list.length === 0;
      status.textContent = list.length + (list.length === 1 ? " product" : " products");
    }

    render();
  }

  TK.catalog = { mount: mount, sortList: sortList };
})();
