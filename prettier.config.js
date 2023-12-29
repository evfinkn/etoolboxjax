export default {
  plugins: ["@ianvs/prettier-plugin-sort-imports"],
  importOrder: [
    "<TYPES>",
    "<TYPES^[.]",
    "",
    "<THIRD_PARTY_MODULES>",
    "",
    "^[.]",
  ],
  importOrderTypeScriptVersion: "5.3.3",
};
