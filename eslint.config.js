import eslintConfigPrettier from "eslint-config-prettier";
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.js"],
    ignores: ["**/*.min.js"],
    env: {
      browser: true,
      es6: true,
    },
  },
  eslintConfigPrettier,
];
