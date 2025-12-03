import { existsSync } from 'fs'
import { defineConfig, mergeConfig } from 'vitest/config'

import rootConfig from '../../vitest.config'

const setup = 'tests/__mocks__/global-setup.ts'
export default mergeConfig(
  rootConfig,
  defineConfig({
    test: {
      setupFiles: existsSync(setup) ? [setup] : [],
      include: ['tests/**/*.test.ts'],
      reporters: ['verbose'],
      outputFile: './test-results.json',
    },
  }),
)
