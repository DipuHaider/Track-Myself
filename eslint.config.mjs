import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  /* Every provider call has to go through the gateway, which is what applies
     entitlement, rate limits, the budget reservation and metering. Types cannot
     enforce that here: next.config.ts sets typescript.ignoreBuildErrors, so a
     type-level guard would not fail a build. Lint does, and npm run verify runs
     it, so these two rules are the actual enforcement. */
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: [
      "src/lib/ai/gateway.ts",
      "src/lib/cv/ai/provider.ts",
      /* Validates a key the user just supplied, by calling the provider with
         that key and nothing else. No operator credential and no operator money
         are involved, so there is no budget for it to bypass. */
      "src/lib/ai/userKey.ts",
    ],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{
          name: "@/lib/cv/ai/provider",
          importNames: ["callProvider", "resolveCredentials", "aiConfigured"],
          message: "Provider calls go through runAiTask() in @/lib/ai/gateway. Types are re-exported and remain importable.",
        }],
      }],

      /* The shared keys are read in exactly one place. A route that hand-rolls
         its own fetch to a provider then has no key to put in the header, which
         is the only guard that stops intent rather than accident. */
      "no-restricted-syntax": ["error", {
        selector: "MemberExpression[object.object.name='process'][object.property.name='env'][property.name=/^(ANTHROPIC|OPENAI|GEMINI)_API_KEY$/]",
        message: "Shared provider keys are read only in the AI gateway.",
      }],
    },
  },
]);

export default eslintConfig;
