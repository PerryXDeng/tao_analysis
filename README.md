# Analysis notes

Axioms, definitions, lemmas, propositions and theorems from Terence Tao's *Analysis I* and *Analysis II*, written as a [plasTeX blueprint](https://github.com/PatrickMassot/leanblueprint). Each statement records what it depends on and, where one exists, its counterpart in [Tao's Lean companion](https://teorth.github.io/analysis/). The same source builds a PDF and a single-page HTML version with hover previews.

## Setup

You need TeX Live (`pdflatex`) for the PDF and, for the HTML, a Python virtual environment at the repo root with the blueprint packages. `plastexdepgraph` needs Graphviz headers to install.

```bash
sudo apt install python3-venv graphviz libgraphviz-dev make
python3 -m venv .venv
.venv/bin/pip install leanblueprint
```

## Building

Run from `blueprint/`:

| Command | Does | Output |
|---|---|---|
| `make check` | integrity check only | report in the terminal |
| `make pdf` | check, then PDF | `blueprint/build/print.pdf` |
| `make web` | check, then HTML | `blueprint/web/index.html` |
| `make all` | all three | both of the above |
| `make clean` | delete build output | |

A failed check stops the build. The Makefile finds plasTeX in `../.venv`, so you don't need to activate the venv; `make web PLASTEX=/path/to/plastex` overrides it.

Open `blueprint/web/index.html` straight from disk. You don't need a web server, because the whole document is one page. You do need an internet connection: the maths is rendered by MathJax from a CDN, and Lean links go to Tao's site.

## Layout

```
blueprint/
  Makefile                 build targets (see Building)
  check.py                 integrity check, runs before every build
  update_lean_names.py     refreshes lean_names.txt from the companion's docs
  lean_names.txt           every declaration name in the Lean companion
  src/
    content.tex            chapter order; one \input per chapter
    chapters/a1_chN.tex    Analysis I, chapter N
    chapters/a2_chN.tex    Analysis II, chapter N
    macros/common.tex      notation macros and the statement environments
    print.tex              PDF entry point (pdflatex)
    web.tex                HTML entry point (plasTeX)
    plastex.cfg            HTML build settings
    blueprint.sty          LaTeX stand-in for the blueprint package (PDF only)
    hover.js               hover previews, inline "uses" lines, direct Lean links
    extra_styles.css       styles for the above
```

## Writing a statement

```latex
\begin{definition}{8}
    \label{rat-cauchy-sequence}
    \uses{eventually-eps-steady}
    \lean{Chapter5.Sequence.IsCauchy}
    (Cauchy sequences) A sequence ...
\end{definition}
```

- **`{8}`** is the item number exactly as printed in the book. The `5.1` prefix comes from the enclosing chapter (`\section`) and section (`\subsection`), so the statement displays as "Definition 5.1.8". Never type the prefix.
- **`\label{key}`** is required, exactly once per statement. It is the statement's permanent identity: links, `\uses` and HTML anchors (`index.html#rat-cauchy-sequence`) all use the key, never the number.
- **`\uses{a,b}`** lists the statements this one's *statement* refers to. It shows as a "uses" line in both outputs. Only list earlier statements.
- **`\lean{Name}`** (optional) links to the Lean companion. Separate several names with commas. A single name becomes a direct link to its docs; several become a list to choose from.

Available environments: `definition`, `lemma`, `proposition`, `theorem`, `corollary`, `remark`, `examples`, `exercise` (all take the book number), and `axiom` and `assumption`. Axioms and assumptions take **no** number, because the book numbers them consecutively per chapter on one shared counter (Axiom 2.1 to 2.5, then Assumption 2.6).

### Keys

- Use lowercase kebab-case that names the content, e.g. `nat-add-comm` or `bolzano-weierstrass`.
- Start axioms with `ax-`, e.g. `ax-induction`.
- Keys must be unique across both books, so qualify ones that would clash: `rat-cauchy-sequence` (5.1.8) and `real-cauchy-sequence` (6.1.3).
- Don't rename a key once something links to it. The HTML anchor would change too.

### Referring to other statements in prose

Write `Lemma~\ref{reciprocal-cauchy}`, not "Lemma 5.3.15". The number is filled in, it stays correct if things move, and in the HTML it becomes a link with a hover preview.

### Adding a chapter

1. Create `src/chapters/a1_chN.tex` (or `a2_chN.tex`). Start it with exactly one `\section{Title}\label{a1-chN}`. Book sections are `\subsection`s.
2. Add `\input{chapters/a1_chN}` to `src/content.tex`, in book order. Analysis II chapters go after the `\part{Analysis II}` block.
3. Chapter numbers come from position in `content.tex`, which is why every chapter file, including the short Introduction, must be present and in order.

## The integrity check

`check.py` (standard library only) fails the build on:

- a statement without exactly one `\label`, or two statements with the same key
- a `\uses` or `\ref` pointing at a key that doesn't exist
- a cycle in the `\uses` graph
- item numbers that repeat or go backwards within a section
- a `\lean` name that isn't in `lean_names.txt`

It warns about `\uses` pointing at a *later* statement and about statements with no edges at all.

## Lean links

The Lean companion covers *Analysis I* only. To find a name, search the [companion docs](https://teorth.github.io/analysis/docs/). Each book section is a module, e.g. `Analysis.Section_5_1`.

- **Numbering differs by edition.** The companion's numbering doesn't always match the edition these notes follow (its Proposition 5.3.3 is our 5.3.2), so match by content, not by number. Leave `\lean` out when there is no clear counterpart.
- **Names are checked against a saved list.** `lean_names.txt` is a snapshot of the companion's declaration names. If the check reports a name you know exists, the companion has probably added it since. Refresh the list:

  ```bash
  cd blueprint && python3 update_lean_names.py
  ```

A Lean link only means a formal counterpart exists. Many of the companion's proofs are left as exercises (`sorry`), so a link doesn't mean the result is proved in Lean.
