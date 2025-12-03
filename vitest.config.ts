import { existsSync } from "fs";
import { defineConfig } from "vitest/config";

const setup = 'tests/__mocks__/global-setup.ts'
export default defineConfig({
  test: {
    environment: "node",
    passWithNoTests: true,
    clearMocks: true,
    setupFiles: existsSync(setup) ? [setup] : [],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      exclude: ["build", "node_modules", "__tests__", "tests"],
    },
    include: ["**/?(*.)+(spec|test).[tj]s?(x)"],
    root: "./",
  },
});