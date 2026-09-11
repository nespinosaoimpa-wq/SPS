import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "prefer-const": "warn",
      "react/no-unescaped-entities": "off",
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    ".open-next/**",
    "node_modules/**",
    "out/**",
    "build/**",
    "public/**",
    "next-env.d.ts",
    "scratch/**",
    "scripts/**",
    "*.js",
  ]),
]);

export default eslintConfig;
