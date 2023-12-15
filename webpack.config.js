// https://github.com/mathjax/MathJax-demos-web/blob/master/custom-tex-extension/webpack.config.js

import { URL } from "url";

import { PACKAGE } from "mathjax-full/components/webpack.common.cjs";

const distDirectory = new URL("./dist", import.meta.url).pathname;
const options = {
  name: "controlflow",
  js: distDirectory,
  libs: ["components/src/core/lib", "components/src/input/tex-base/lib"],
  dir: distDirectory,
};

export default PACKAGE(options);
