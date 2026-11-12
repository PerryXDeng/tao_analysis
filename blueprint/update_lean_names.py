#!/usr/bin/env python3
"""Refresh lean_names.txt: every declaration name in Tao's Lean companion docs.

check.py uses it to reject \\lean{...} names that don't exist. Standard library only.
"""
import html
import re
import urllib.request
from pathlib import Path

DOCS = "https://teorth.github.io/analysis/docs/"


def main():
    nav = urllib.request.urlopen(DOCS + "navbar.html").read().decode()
    modules = sorted(set(re.findall(r"Analysis/((?:Section|Appendix)_\w+)\.html", nav)))
    names = set()
    for m in modules:
        page = urllib.request.urlopen(f"{DOCS}Analysis/{m}.html").read().decode()
        names.update(html.unescape(n) for n in re.findall(r'<div class="decl[^"]*" id="([^"]+)"', page))
    out = Path(__file__).parent / "lean_names.txt"
    out.write_text("\n".join(sorted(names)) + "\n")
    print(f"{len(names)} declarations from {len(modules)} modules -> {out.name}")


if __name__ == "__main__":
    main()
