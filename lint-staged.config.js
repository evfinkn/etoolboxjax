export default {
  "**/*": [
    "prettier --write --ignore-unknown",
    "eslint --fix --no-warn-ignored",
  ],
};
