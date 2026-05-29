module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '@urlshortener/shared': '<rootDir>/../shared/src',
  },
  setupFilesAfterSetup: ['<rootDir>/src/tests/helpers.ts'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/database/migrate.ts',
    '!src/database/seed.ts',
    '!src/server.ts',
  ],
};
