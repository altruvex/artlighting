import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { config as baseConfig } from "./base.js";

/**
 * ESLint configuration for the Next.js apps (apps/web, apps/admin), built on
 * eslint-config-next's own flat config.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const nextJsConfig = [
  ...baseConfig,
  ...nextVitals,
  ...nextTypescript,
  {
    // Explicit version: eslint-plugin-react's "detect" calls
    // context.getFilename(), which ESLint 10 removed.
    settings: { react: { version: "19.3" } },
    rules: {
      // Correctness: real bugs, keep as errors.
      "react-hooks/rules-of-hooks": "error",
      "react/jsx-key": "error",

      // Tech debt in existing code: surfaced, not blocking.
      "react-hooks/exhaustive-deps": "warn",
      // React Compiler advisories (eslint-plugin-react-hooks v7). The apps
      // don't run the compiler; these flag patterns worth refactoring.
      "react-hooks/error-boundaries": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/incompatible-library": "warn",
      "@next/next/no-img-element": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],

      // Project conventions.
      "react/no-unescaped-entities": "off",
      "@next/next/no-page-custom-font": "off",
    },
  },
];
