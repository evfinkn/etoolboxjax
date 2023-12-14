// https://github.com/mathjax/MathJax-demos-web/blob/master/custom-tex-extension/webpack.config.js

import { URL } from "url";

import PACKAGE from "./node_modules/mathjax-full/components/webpack.common.js";

const fileDirectory = new URL("./src", import.meta.url).pathname;
const distDirectory = "../dist";

export default PACKAGE(
  "controlflow", // the package to build
  "node_modules/mathjax-full/js", // location of the MathJax js library
  [
    // packages to link to
    "components/src/core/lib",
    "components/src/input/tex-base/lib",
  ],
  fileDirectory,
  distDirectory,
);
