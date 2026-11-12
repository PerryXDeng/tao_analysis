#!/usr/bin/env python3
"""Integrity check for the statement graph. Standard library only.

Errors (exit 1):
  - a statement without exactly one \\label
  - a label used by more than one statement
  - a \\uses or \\ref pointing at a label that doesn't exist
  - a cycle in the \\uses graph
  - book item numbers that repeat or go backwards within a section
  - a \\lean name missing from lean_names.txt (refresh: python3 update_lean_names.py)
Warnings:
  - \\uses pointing forward (to a statement later in the notes)
  - statements with no edges at all
"""
import re
import sys
from pathlib import Path

SRC = Path(__file__).parent / "src"
LEAN_NAMES = Path(__file__).parent / "lean_names.txt"
ENVS = "definition|lemma|proposition|theorem|corollary|assumption|remark|examples|exercise|axiom"
BEGIN = re.compile(r"\\begin\{(" + ENVS + r")\}(?:\{(\d+)\})?")
END = re.compile(r"\\end\{(" + ENVS + r")\}")


def strip_comment(line):
    return re.sub(r"(?<!\\)%.*", "", line)


def split_keys(arg):
    return [k.strip() for k in arg.split(",") if k.strip()]


def files_in_order(path, seen=None):
    """Follow \\input from content.tex so statement order matches the document."""
    seen = seen if seen is not None else []
    seen.append(path)
    for line in path.read_text().splitlines():
        for m in re.finditer(r"\\input\{([^}]+)\}", strip_comment(line)):
            child = SRC / (m.group(1) if m.group(1).endswith(".tex") else m.group(1) + ".tex")
            files_in_order(child, seen)
    return seen


def parse():
    stmts, refs = [], []  # refs: (key, where) for \ref outside \uses
    other_labels = set()  # e.g. section labels; valid \ref targets, not statements
    part = section = subsection = 0
    cur = None
    for path in files_in_order(SRC / "content.tex"):
        for ln, raw in enumerate(path.read_text().splitlines(), 1):
            line = strip_comment(raw)
            where = f"{path.relative_to(SRC.parent)}:{ln}"
            if m := re.search(r"\\setcounter\{section\}\{(\d+)\}", line):
                section = int(m.group(1))
            if re.search(r"\\part\b", line):
                part += 1
            if re.search(r"\\section\b", line):
                section, subsection = section + 1, 0
            if re.search(r"\\subsection\b", line):
                subsection += 1
            if m := BEGIN.search(line):
                cur = dict(env=m.group(1), num=m.group(2), where=where,
                           sec=(part, section, subsection), labels=[], uses=[], lean=[])
            if cur is not None:
                cur["labels"] += re.findall(r"\\label\{([^}]+)\}", line)
                for arg in re.findall(r"\\uses\{([^}]+)\}", line):
                    cur["uses"] += split_keys(arg)
                for arg in re.findall(r"\\lean\{([^}]+)\}", line):
                    cur["lean"] += split_keys(arg)
            for k in re.findall(r"\\(?:ref|cref|eqref)\{([^}]+)\}", line):
                refs.append((k, where))
            if cur is None:
                other_labels.update(re.findall(r"\\label\{([^}]+)\}", line))
            if cur is not None and END.search(line):
                stmts.append(cur)
                cur = None
    return stmts, refs, other_labels


def main():
    stmts, refs, other_labels = parse()
    errors, warnings = [], []

    by_key, order = {}, {}
    for i, s in enumerate(stmts):
        if len(s["labels"]) != 1:
            errors.append(f"{s['where']}: {s['env']} has {len(s['labels'])} labels, needs exactly 1")
            continue
        key = s["labels"][0]
        if key in by_key:
            errors.append(f"{s['where']}: label '{key}' already used at {by_key[key]['where']}")
            continue
        by_key[key], order[key] = s, i

    for s in stmts:
        for k in s["uses"]:
            if k not in by_key:
                errors.append(f"{s['where']}: \\uses{{{k}}} matches no statement")
            elif s["labels"] and k == s["labels"][0]:
                errors.append(f"{s['where']}: '{k}' uses itself")
            elif s["labels"] and order[k] > order.get(s["labels"][0], -1):
                warnings.append(f"{s['where']}: '{s['labels'][0]}' uses later statement '{k}'")
    for k, where in refs:
        if k not in by_key and k not in other_labels:
            errors.append(f"{where}: \\ref{{{k}}} matches no statement")

    last = {}
    for s in stmts:
        if s["num"] is None:
            continue
        n = int(s["num"])
        if s["sec"] in last and n <= last[s["sec"]]:
            errors.append(f"{s['where']}: item number {n} not after {last[s['sec']]} in the same section")
        last[s["sec"]] = n

    if LEAN_NAMES.exists():
        known = set(LEAN_NAMES.read_text().split())
        for s in stmts:
            for n in s["lean"]:
                if n not in known:
                    errors.append(f"{s['where']}: \\lean{{{n}}} is not a declaration in the companion")

    # Cycle detection (iterative DFS, white/grey/black).
    color = dict.fromkeys(by_key, 0)
    for root in by_key:
        if color[root]:
            continue
        stack = [(root, iter(by_key[root]["uses"]))]
        color[root] = 1
        while stack:
            node, it = stack[-1]
            nxt = next((k for k in it if k in by_key), None)
            if nxt is None:
                color[node] = 2
                stack.pop()
            elif color[nxt] == 1:
                path = [n for n, _ in stack]
                cycle = path[path.index(nxt):] + [nxt]
                errors.append("cycle: " + " -> ".join(cycle))
            elif color[nxt] == 0:
                color[nxt] = 1
                stack.append((nxt, iter(by_key[nxt]["uses"])))

    used = {k for s in stmts for k in s["uses"]}
    for k, s in by_key.items():
        if not s["uses"] and k not in used:
            warnings.append(f"{s['where']}: '{k}' has no edges")

    edges = sum(len(s["uses"]) for s in stmts)
    for w in warnings:
        print("warning:", w)
    for e in errors:
        print("error:", e)
    print(f"{len(by_key)} statements, {edges} edges, {len(errors)} errors, {len(warnings)} warnings")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
