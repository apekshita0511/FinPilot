/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/tests/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/jest.setup.ts'],
  // Transaction/transfer/lock tests share one Postgres connection pool and
  // truncate shared tables between tests — running suites in parallel would
  // race each other's data, not the code under test.
  maxWorkers: 1,
};
