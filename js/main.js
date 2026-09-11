/* Archway Hospitality Group — site behaviour.
   No framework, no build step: the pages are already complete HTML, this only
   adds interaction on top. Everything here degrades to a readable page if it
   never runs. */
(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- mobile drawer ---------- */
  (function () {
    var burger = $("[data-burger]"), drawer = $("[data-drawer]");
    if (!burger || !drawer) return;
    function set(open) {
      drawer.hidden = !open;
      burger.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    }
    set(false);
    burger.addEventListener("click", function () {
      set(burger.getAttribute("aria-expanded") !== "true");
    });
    drawer.addEventListener("click", function (e) {
      if (e.target.closest("a")) set(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && burger.getAttribute("aria-expanded") === "true") {
        set(false); burger.focus();
      }
    });
    // a drawer left open while the layout switches back to the desktop nav
    // would keep the body scroll-locked
    window.matchMedia("(min-width:901px)").addEventListener("change", function (m) {
      if (m.matches) set(false);
    });
  })();

  /* ---------- hero slideshow ---------- */
  (function () {
    var root = $("[data-slides]");
    if (!root) return;
    var slides = $$("[data-slide]", root), dots = $$("[data-dot]", root);
    if (slides.length < 2) return;
    var i = 0, timer = null;
    var STEP = 6000;

    function show(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) {
        s.classList.toggle("is-on", k === i);
        s.setAttribute("aria-hidden", String(k !== i));
      });
      dots.forEach(function (d, k) {
        if (k === i) d.setAttribute("aria-current", "true");
        else d.removeAttribute("aria-current");
      });
    }
    function start() { stop(); timer = setInterval(function () { show(i + 1); }, STEP); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    dots.forEach(function (d, k) {
      d.addEventListener("click", function () { show(k); start(); });
    });
    // don't advance under someone's cursor, or while the tab is in the background
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });

    if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) { show(0); return; }
    show(0); start();
  })();

  /* ---------- back to top ---------- */
  (function () {
    var btn = $("[data-totop]");
    if (!btn) return;
    function sync() { btn.classList.toggle("is-on", window.scrollY > window.innerHeight * 0.9); }
    btn.addEventListener("click", function () {
      var reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
    window.addEventListener("scroll", sync, { passive: true });
    sync();
  })();

  /* ---------- desktop nav dropdown ---------- */
  (function () {
    var groups = $$("[data-navgroup]");
    if (!groups.length) return;

    function close(g) {
      $("[data-navmenu]", g).hidden = true;
      $("[data-navtoggle]", g).setAttribute("aria-expanded", "false");
    }
    function open(g) {
      groups.forEach(function (o) { if (o !== g) close(o); });
      $("[data-navmenu]", g).hidden = false;
      $("[data-navtoggle]", g).setAttribute("aria-expanded", "true");
    }

    groups.forEach(function (g) {
      var toggle = $("[data-navtoggle]", g);
      close(g);
      toggle.addEventListener("click", function () {
        if (toggle.getAttribute("aria-expanded") === "true") close(g); else open(g);
      });
      // Click only, deliberately. Opening on hover as well means the pointer
      // move that precedes a click has already opened the panel, so the click
      // itself closes it again — the button then looks broken to a mouse user
      // while working for touch. One trigger, same behaviour everywhere.
      // keyboard: leaving the group entirely closes it
      g.addEventListener("focusout", function (ev) {
        if (!g.contains(ev.relatedTarget)) close(g);
      });
    });

    document.addEventListener("click", function (ev) {
      groups.forEach(function (g) { if (!g.contains(ev.target)) close(g); });
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key !== "Escape") return;
      groups.forEach(function (g) {
        if ($("[data-navtoggle]", g).getAttribute("aria-expanded") === "true") {
          close(g); $("[data-navtoggle]", g).focus();
        }
      });
    });
  })();

  /* ---------- menu page: restaurant + menu tabs ---------- */
  (function () {
    var root = $("[data-menus]");
    if (!root) return;

    var brandTabs = $$("[data-brand-tab]", root);
    var menuTabRow = $("[data-menu-tabs]", root);
    var panels = $$("[data-panel]", root);

    function show(brand, menu) {
      brandTabs.forEach(function (b) {
        b.setAttribute("aria-selected", String(b.dataset.brandTab === brand));
      });
      // rebuild the menu tab row for this restaurant
      $$("[data-menu-tab]", menuTabRow).forEach(function (t) {
        var mine = t.dataset.brand === brand;
        t.hidden = !mine;
        t.setAttribute("aria-selected", String(mine && t.dataset.menuTab === menu));
      });
      panels.forEach(function (p) {
        p.hidden = !(p.dataset.brand === brand && p.dataset.panel === menu);
      });
      menuTabRow.hidden = false;
    }

    function firstMenuOf(brand) {
      var t = $("[data-menu-tab][data-brand='" + brand + "']", menuTabRow);
      return t ? t.dataset.menuTab : null;
    }

    // The switcher is sticky, so a tab can be clicked from anywhere down the
    // page. Land the reader at the top of the menu they just chose rather than
    // halfway into it at whatever offset they happened to be at.
    function toPanelTop() {
      var bar = $(".menubar");
      var panel = $("[data-panel]:not([hidden])", root);
      if (!panel || !bar) return;
      var top = window.scrollY + panel.getBoundingClientRect().top
                - bar.getBoundingClientRect().height - 84;
      if (window.scrollY > top) {
        var reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
        window.scrollTo({ top: Math.max(top, 0), behavior: reduce ? "auto" : "smooth" });
      }
    }

    brandTabs.forEach(function (b) {
      b.addEventListener("click", function () {
        var brand = b.dataset.brandTab;
        show(brand, firstMenuOf(brand));
        history.replaceState(null, "", "?restaurant=" + brand);
        toPanelTop();
      });
    });
    $$("[data-menu-tab]", menuTabRow).forEach(function (t) {
      t.addEventListener("click", function () {
        show(t.dataset.brand, t.dataset.menuTab);
        history.replaceState(null, "", "?restaurant=" + t.dataset.brand +
          "&menu=" + encodeURIComponent(t.dataset.menuTab));
        toPanelTop();
      });
    });

    // deep link: /menu/?restaurant=robata, as the previous site linked it, plus
    // &menu=<name> so the restaurant pages can point at one specific menu
    var q = new URLSearchParams(location.search);
    var want = (q.get("restaurant") || "").replace("jc-hwangs", "jc");
    var brand = $("[data-brand-tab='" + want + "']", root) ? want : brandTabs[0].dataset.brandTab;
    var wantMenu = q.get("menu");
    var hasMenu = wantMenu && $$("[data-menu-tab][data-brand='" + brand + "']", menuTabRow)
      .some(function (t) { return t.dataset.menuTab === wantMenu; });
    show(brand, hasMenu ? wantMenu : firstMenuOf(brand));
  })();

  /* ---------- collapsible menu sections (open by default) ---------- */
  $$("[data-msec]").forEach(function (btn) {
    var list = document.getElementById(btn.getAttribute("aria-controls"));
    if (!list) return;
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      list.hidden = open;
    });
  });

  /* ---------- reveal on scroll ---------- */
  (function () {
    var els = $$(".reveal");
    if (!els.length) return;
    if (!("IntersectionObserver" in window) ||
        window.matchMedia("(prefers-reduced-motion:reduce)").matches) {
      els.forEach(function (e) { e.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: .08 });
    els.forEach(function (e) { io.observe(e); });
  })();

  /* ---------- contact form ---------- */
  (function () {
    var form = $("[data-form]");
    if (!form) return;
    var note = $("[data-form-note]", form);
    var submit = $("[data-submit]", form);

    function setNote(kind, msg) {
      note.hidden = !msg;
      note.className = "form-note form-note--" + kind;
      note.textContent = msg || "";
    }
    function fieldErr(el, msg) {
      var box = el.closest(".field") || el.parentNode;
      var p = box.querySelector(".err");
      if (!p) { p = document.createElement("p"); p.className = "err"; box.appendChild(p); }
      p.textContent = msg || "";
      p.hidden = !msg;
      el.setAttribute("aria-invalid", msg ? "true" : "false");
      return !msg;
    }

    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function validate() {
      var ok = true;
      var v = function (n) { return (form.elements[n].value || "").trim(); };
      ok = fieldErr(form.elements.fullName, v("fullName") ? "" : "Please enter your name.") && ok;
      ok = fieldErr(form.elements.email,
            !v("email") ? "Please enter your email address."
            : EMAIL.test(v("email")) ? "" : "That email address does not look right.") && ok;
      if (form.elements.subject) {
        ok = fieldErr(form.elements.subject, v("subject") ? "" : "Please choose a subject.") && ok;
      }
      if (form.elements.position) {
        ok = fieldErr(form.elements.position, v("position") ? "" : "Please choose a position.") && ok;
      }
      ok = fieldErr(form.elements.message,
            v("message").length >= 10 ? "" : "Please tell us a little more (10 characters or more).") && ok;
      ok = fieldErr(form.elements.consent,
            form.elements.consent.checked ? "" : "Please confirm we may reply to you.") && ok;
      return ok;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      setNote("", "");
      if (!validate()) {
        setNote("err", "Please check the highlighted fields.");
        var bad = form.querySelector("[aria-invalid=true]");
        if (bad) bad.focus();
        return;
      }
      // the contact form and the careers application share this handler; the
      // fields that only exist on one of them are appended when present
      var topic = form.elements.subject || form.elements.position;
      var data = new FormData();
      data.append("access_key", form.dataset.key);
      data.append("from_name", form.dataset.fromName);
      data.append("subject", form.dataset.subjectPrefix + " " + topic.value);
      data.append("name", form.elements.fullName.value);
      data.append("email", form.elements.email.value);
      data.append("phone", form.elements.phone.value || "Not provided");
      if (form.elements.restaurant) {
        data.append("restaurant", form.elements.restaurant.selectedOptions[0].text);
      }
      if (form.elements.position) data.append("position", form.elements.position.value);
      data.append("message", form.elements.message.value);
      data.append("botcheck", form.elements.botcheck.value);
      var file = form.elements.attachment;
      if (file && file.files && file.files.length) data.append("attachment", file.files[0]);

      submit.disabled = true;
      var label = submit.textContent;
      submit.textContent = "Sending…";

      fetch(form.action, { method: "POST", body: data })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok || !res.j.success) throw new Error(res.j.message || "Unable to send your message.");
          form.reset();
          setNote("ok", "Thank you. Your message has been sent — we will be in touch shortly.");
        })
        .catch(function (err) {
          setNote("err", err.message + " Please email " + form.dataset.email + " directly.");
        })
        .then(function () { submit.disabled = false; submit.textContent = label; });
    });

    // prefill from the link that brought them here: ?subject= from a Reserve
    // button, ?position= from an "Apply for this position" button
    var q = new URLSearchParams(location.search);
    function prefill(field, want) {
      if (!field || !want) return;
      var opt = Array.prototype.find.call(field.options, function (o) {
        return o.value.toLowerCase().indexOf(want.toLowerCase()) === 0;
      });
      if (opt) field.value = opt.value;
    }
    prefill(form.elements.subject, q.get("subject"));
    prefill(form.elements.position, q.get("position"));
  })();

  /* ---------- year ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
