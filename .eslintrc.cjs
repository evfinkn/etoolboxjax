module.exports = {
  ignorePatterns: ["**/*", "!ts/**/*"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "prettier",
  ],
  plugins: ["@typescript-eslint"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  env: {
    browser: true,
    es6: true,
  },
  root: true,
};
