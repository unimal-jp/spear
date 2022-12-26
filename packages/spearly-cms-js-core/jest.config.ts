module.exports = {
    roots: [
      '<rootDir>/src',
    ],
    testMatch: [
      '<rootDir>/src/**/*.spec.ts',
    ],
    transform: {
      '^.+\\.(ts|tsx)$': 'ts-jest',
    },
    moduleNameMapper: {
        '(.+)\\.js': '$1'
    },
    extensionsToTreatAsEsm: ['.ts']
  }
  