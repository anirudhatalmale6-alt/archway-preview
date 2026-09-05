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

    brandTabs.forEach(function (b) {
      b.addEventListener("click", function () {
        var brand = b.dataset.brandTab;
        show(brand, firstMenuOf(brand));
        history.replaceState(null, "", "?restaurant=" + brand);
      });
    });
    $$("[data-menu-tab]", menuTabRow).forEach(function (t) {
      t.addEventListener("click", function () {
        show(t.dataset.brand, t.dataset.menuTab);
      });
    });

    // deep link: /menu/?restaurant=robata, as the previous site linked it
    var want = new URLSearchParams(location.search).get("restaurant") || "";
    want = want.replace("jc-hwangs", "jc");
    var brand = $("[data-brand-tab='" + want + "']", root) ? want : brandTabs[0].dataset.brandTab;
    show(brand, firstMenuOf(brand));
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
      ok = fieldErr(form.elements.subject, v("subject") ? "" : "Please choose a subject.") && ok;
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
      var data = new FormData();
      data.append("access_key", form.dataset.key);
      data.append("from_name", form.dataset.fromName);
      data.append("subject", form.dataset.subjectPrefix + " " + form.elements.subject.value);
      data.append("name", form.elements.fullName.value);
      data.append("email", form.elements.email.value);
      data.append("phone", form.elements.phone.value || "Not provided");
      data.append("restaurant", form.elements.restaurant.selectedOptions[0].text);
      data.append("message", form.elements.message.value);
      data.append("botcheck", form.elements.botcheck.value);

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

    // prefill the subject when arriving from a "reservation" link
    var s = new URLSearchParams(location.search).get("subject");
    if (s && form.elements.subject) {
      var opt = Array.prototype.find.call(form.elements.subject.options, function (o) {
        return o.value.toLowerCase().indexOf(s.toLowerCase()) === 0;
      });
      if (opt) form.elements.subject.value = opt.value;
    }
  })();

  /* ---------- year ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
