# etoolboxjax

This [MathJax](https://www.mathjax.org/) extension ports LaTeX counters, the `\numexpr`
command, and commands from the LaTeX [etoolbox](https://ctan.org/pkg/etoolbox) package
to MathJax, including

- boolean flags (both `bool`s and `toggle`s);
- tests for
  - macros,
  - counters,
  - strings, and
  - arithmetic; and
- list processing.

## Installation

This extension only supports MathJax v4. To use this extension, clone this repository
and build the extension:

```bash
git clone https://github.com/evfinkn/etoolboxjax
cd etoolboxjax
# pnpm is used here, but npm can be used instead.
pnpm install
pnpm run build
```

This will create a `browser` folder containing the `counter` and `etoolbox` extensions.
(`counter` can be used independently of `etoolbox`, but `etoolbox` depends on
`counter`.) Then, include the extensions in your MathJax configuration:

```javascript
MathJax = {
  loader: {
    load: ["[browser]/counter.js", "[browser]/etoolbox.js"],
    paths: { browser: "./browser" },
  },
  tex: {
    packages: { "[+]": ["counter", "etoolbox"] },
  },
};
```

## Usage

A simple example of how to use counters for section numbering is shown below.

<!-- prettier-ignore -->
```html
<span style="display: hidden;">\[
  \newcounter{section} \newcounter{subsection}
  \counterwithin{subsection}{section} % Reset subsection counter at each section
  \newcommand{\section}{\stepcounter{section} \thesection}
  \newcommand{\subsection}{\stepcounter{subsection} \thesubsection}
\]</span>

<h1>Section \(\section\)</h1> <!-- Section 1 -->
<h2>Subsection \(\subsection\)</h2> <!-- Subsection 1.1 -->
<h2>Subsection \(\subsection\)</h2> <!-- Subsection 1.2 -->

<h1>Section \(\section\)</h1> <!-- Section 2 -->
<!-- ... -->
```

For a more in-depth example of counter usage, see [here](./demo.html).

An example of using the `etoolbox` package is shown below. (Note that this extension
is still in development and currently being refactored, so the example won't work yet.)

```latex
\newcounter{sum}
\newcommand{\do}[1]{\addtocounter{sum}{\numexpr{#1 * #1}}}
\docsvlist{1,2,3,4,5}
\thesum % 55
```
