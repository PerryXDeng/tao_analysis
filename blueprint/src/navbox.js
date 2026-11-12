// Floating "Chapters" box: jump to any chapter; the current one is highlighted
// and shows its sections.
(function () {
  "use strict";

  var BOOKS = { a1: "Analysis I", a2: "Analysis II" };

  // Chapter headings carry the \label from each chapter file (a1-ch5, a2-ch1, ...).
  function chapters() {
    return Array.prototype.filter.call(document.querySelectorAll("h1[id]"), function (h) {
      return /^a\d-ch\d+$/.test(h.id);
    }).map(function (h) {
      var sections = [];
      for (var el = h.nextElementSibling; el && !(el.tagName === "H1" && el.id); el = el.nextElementSibling) {
        if (el.tagName === "H2" && el.id) sections.push(el);
      }
      // plasTeX may nest a chapter's content in a <section>; look inside it too.
      var wrap = h.closest("section");
      if (!sections.length && wrap) {
        sections = Array.prototype.slice.call(wrap.querySelectorAll("h2[id]"));
      }
      return { head: h, book: h.id.slice(0, 2), sections: sections };
    });
  }

  function text(h) { return h.textContent.trim().replace(/\s+/g, " "); }

  function link(h, cls) {
    var a = document.createElement("a");
    a.href = "#" + h.id;
    a.className = cls;
    a.textContent = text(h);
    return a;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var chs = chapters();
    if (!chs.length) return;

    var btn = document.createElement("button");
    btn.className = "bp-nav-toggle";
    btn.type = "button";
    btn.textContent = "Chapters";
    btn.setAttribute("aria-expanded", "false");

    var panel = document.createElement("nav");
    panel.className = "bp-nav";
    panel.hidden = true;
    panel.setAttribute("aria-label", "Chapters");

    var items = chs.map(function (ch, i) {
      if (i === 0 || chs[i - 1].book !== ch.book) {
        var title = document.createElement("div");
        title.className = "bp-nav-book";
        title.textContent = BOOKS[ch.book] || ch.book;
        panel.appendChild(title);
      }
      var item = document.createElement("div");
      item.className = "bp-nav-chapter";
      item.appendChild(link(ch.head, "bp-nav-ch"));
      var subs = document.createElement("div");
      subs.className = "bp-nav-sections";
      ch.sections.forEach(function (s) { subs.appendChild(link(s, "bp-nav-sec")); });
      item.appendChild(subs);
      panel.appendChild(item);
      return item;
    });

    function setOpen(open) {
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      if (open) markCurrent();
    }

    // The chapter whose heading was last scrolled past is the current one.
    function markCurrent() {
      var cur = 0;
      chs.forEach(function (ch, i) {
        if (ch.head.getBoundingClientRect().top <= 80) cur = i;
      });
      items.forEach(function (it, i) { it.classList.toggle("current", i === cur); });
      if (!panel.hidden) items[cur].scrollIntoView({ block: "nearest" });
    }

    // The button is the only way to open or close the box.
    btn.addEventListener("click", function () { setOpen(panel.hidden); });
    document.addEventListener("scroll", function () { if (!panel.hidden) markCurrent(); }, true);

    document.body.appendChild(btn);
    document.body.appendChild(panel);
  });
})();
