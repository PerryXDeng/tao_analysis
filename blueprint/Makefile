.PHONY: all check pdf web clean

# The project venv (see ../.venv); override with `make web PLASTEX=...`.
PLASTEX ?= $(abspath ../.venv/bin/plastex)

all: check pdf web

check:
	python3 check.py

# Two passes so \ref and the table of contents resolve.
pdf: check
	mkdir -p build
	cd src && pdflatex -interaction=nonstopmode -halt-on-error -output-directory=../build print.tex >/dev/null
	cd src && pdflatex -interaction=nonstopmode -halt-on-error -output-directory=../build print.tex >/dev/null
	@echo "wrote build/print.pdf"

web: check
	cd src && $(PLASTEX) -c plastex.cfg web.tex
	@echo "wrote web/index.html"

clean:
	rm -rf build web
