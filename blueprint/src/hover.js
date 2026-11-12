// Hover previews for links to statements, and a visible "uses" line per statement.
(function () {
  "use strict";

  var THM = '[class*="_thmwrapper"]';

  // Show each statement's dependencies inline (the blueprint hides them in a popup).
  function inlineUses() {
    document.querySelectorAll(THM).forEach(function (thm) {
      var modal = Array.prototype.find.call(
        thm.querySelectorAll(".thm_header_hidden_extras .modal-content"),
        function (m) { var h = m.querySelector("h1"); return h && h.textContent.trim() === "Uses"; });
      var content = thm.querySelector('[class*="_thmcontent"]');
      if (!modal || !content) return;
      var line = document.createElement("div");
      line.className = "bp-uses";
      line.appendChild(document.createTextNode("uses "));
      modal.querySelectorAll("a").forEach(function (a, i) {
        if (i) line.appendChild(document.createTextNode(", "));
        line.appendChild(a.cloneNode(true));
      });
      content.insertBefore(line, content.firstChild);
      // The inline line replaces the popup, so drop its icon button and container.
      var box = modal.closest(".modal-container");
      if (box.previousElementSibling && box.previousElementSibling.matches("button.modal")) {
        box.previousElementSibling.remove();
      }
      box.remove();
    });
  }

  // A Lean button for a single declaration links straight to its docs instead of
  // opening a one-item list. Several declarations keep the list to pick from.
  function directLean() {
    document.querySelectorAll("button.modal.lean").forEach(function (btn) {
      var box = btn.nextElementSibling;
      var decls = box ? box.querySelectorAll("a.lean_decl") : [];
      if (decls.length !== 1) return;
      var a = document.createElement("a");
      a.className = "bp-lean-link";
      a.href = decls[0].href;
      a.target = "_blank";
      a.rel = "noopener";
      a.title = decls[0].textContent;
      a.textContent = btn.textContent;
      btn.replaceWith(a);
      box.remove();
    });
  }

  // The notes are one page, so every statement link points into this document.
  function findTarget(a) {
    var url = new URL(a.getAttribute("href"), location.href);
    if (url.pathname !== location.pathname || !url.hash) return null;
    var el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    return el && el.matches(THM) ? el : null;
  }

  var tip = document.createElement("div");
  tip.className = "bp-preview";
  tip.hidden = true;
  var showTimer = null, hideTimer = null;

  function show(a) {
    var target = findTarget(a);
    if (!target) return;
    var clone = target.cloneNode(true);
    clone.removeAttribute("id");
    clone.querySelectorAll(".thm_header_extras, .thm_header_hidden_extras").forEach(function (n) { n.remove(); });
    tip.replaceChildren(clone);
    tip.hidden = false;
    var r = a.getBoundingClientRect();
    var w = Math.min(560, document.documentElement.clientWidth - 32);
    tip.style.width = w + "px";
    tip.style.left = Math.max(16, Math.min(r.left + scrollX, scrollX + document.documentElement.clientWidth - w - 16)) + "px";
    tip.style.top = (r.bottom + scrollY + 6) + "px";
  }

  function hideSoon() {
    clearTimeout(showTimer);
    hideTimer = setTimeout(function () { tip.hidden = true; }, 200);
  }

  document.addEventListener("DOMContentLoaded", function () {
    inlineUses();
    directLean();
    document.body.appendChild(tip);
    tip.addEventListener("mouseenter", function () { clearTimeout(hideTimer); });
    tip.addEventListener("mouseleave", hideSoon);
    // The page scrolls inside a container, so a preview would drift; just close it.
    document.addEventListener("scroll", function (e) {
      if (!tip.contains(e.target)) tip.hidden = true;
    }, true);
    document.addEventListener("mouseover", function (e) {
      var a = e.target.closest && e.target.closest('a[href*="#"]');
      if (!a || tip.contains(a) || a.origin !== location.origin) return;
      clearTimeout(hideTimer);
      clearTimeout(showTimer);
      showTimer = setTimeout(function () { show(a); }, 250);
      a.addEventListener("mouseleave", hideSoon, { once: true });
    });
  });
})();
