/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setupTests.ts'],
  moduleNameMapper: {
    '\\.module\\.css$': 'identity-obj-proxy',
    '\\.css$': '<rootDir>/src/tests/styleMock.ts',
  },
  transform: {
    '^.+\\.(t|j)sx?$': 'babel-jest',
  },
  testMatch: ['<rootDir>/src/**/*.test.tsx', '<rootDir>/src/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
};
