/** @type {import('jest').Config} */
export default {
  displayName: 'main',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/unit/main'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.json'
    }]
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^@main/(.*)$': '<rootDir>/src/main/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1'
  },
  collectCoverageFrom: [
    'src/main/**/*.ts',
    '!src/main/index.ts'
  ],
  coverageDirectory: 'coverage/main',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true
}
