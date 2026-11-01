import { nextJsConfig } from "@repo/eslint-config/next-js";

export default [
  ...nextJsConfig,
  // Plain CommonJS loaded by Next's server outside the app bundle. The
  // shared config applies the react-hooks rules to every file but registers
  // the plugin only for the app's source extensions, so ESLint crashes on a
  // .cjs file instead of linting it.
  { ignores: ["cache-handler.cjs", "upstash-rest.cjs"] },
];
