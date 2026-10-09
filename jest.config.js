// Jest 配置：使用 ts-jest 预设，支持 TypeScript 测试
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.ts'],
  collectCoverage: false,
};
