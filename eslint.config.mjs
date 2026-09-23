import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  {
    // ESLint 9 flat config: an object with only `ignores` acts as global ignores.
    // ESLint does NOT read .gitignore, so every non-source dir must be listed here
    // or `eslint .` walks into local tool state and generated output.
    ignores: [
      "**/node_modules/**",
      ".next/**",
      "out/**",
      "coverage/**",
      "reports/**",
      ".agents/**",
      ".claude/**",
      ".codex/**",
      ".cursor/**",
      ".omc/**",
      ".openclaude/**",
      ".slim/**",
      ".workflow/**",
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react/display-name": "warn",
    },
  },
];

export default eslintConfig;
