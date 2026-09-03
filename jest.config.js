/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/gserver/test/**/*.spec.ts'],
  modulePathIgnorePatterns: ['<rootDir>/.vscode-test/'],
  coverageDirectory: '<rootDir>/coverage/jest',
  coverageReporters: ['text', 'html', 'lcov', 'json-summary', 'json'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      { tsconfig: { rootDir: '.', types: ['jest', 'node'] } },
    ],
  },
  collectCoverageFrom: [
    'gserver/src/**/*.ts',
    '!gserver/src/server.ts',
    '!gserver/src/types.ts',
    '!gserver/src/**/*.d.ts',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/gserver/test/',
    '/gserver/src/pages.handler.ts',
    '/gserver/src/server.ts',
    '/gserver/src/types.ts',
  ],
};
