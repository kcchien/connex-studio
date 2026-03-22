import tseslint from '@electron-toolkit/eslint-config-ts'
import reactPlugin from 'eslint-plugin-react'

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'out/**',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
      'node_modules/**'
    ]
  },
  tseslint.configs.recommended,
  reactPlugin.configs.flat.recommended,
  {
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'prefer-const': 'off'
    }
  }
)
