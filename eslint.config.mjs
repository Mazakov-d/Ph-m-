// Shared ESLint configuration for the whole monorepo (flat config).
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.expo/**",
      "**/web-build/**",
      "**/generated/**",
      "**/expo-env.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // CLAUDE.md §7: forbidden escape hatches.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": true,
          "ts-nocheck": true,
          "ts-expect-error": "allow-with-description",
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // NestJS modules are empty classes carrying a @Module() decorator.
      "@typescript-eslint/no-extraneous-class": ["error", { allowWithDecorator: true }],
    },
  },
  {
    files: ["**/*.js", "**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // CLAUDE.md §6.2: React rules for the app (hooks order, effect dependencies).
    files: ["apps/mobile/**/*.{ts,tsx}"],
    ...reactHooks.configs.flat["recommended-latest"],
  },
  // Must stay last: disables stylistic rules that conflict with Prettier.
  prettier,
);
