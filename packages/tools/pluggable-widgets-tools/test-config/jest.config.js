const { existsSync } = require("fs");

const projectDir = process.cwd();
const testTsconfigPath = `${projectDir}/tsconfig.spec.json`;

module.exports = {
    clearMocks: true,
    rootDir: projectDir,
    globals: {
        "ts-jest": {
            tsconfig: existsSync(testTsconfigPath) ? testTsconfigPath : { module: "commonjs" }
        }
    },
    setupFilesAfterEnv: [__dirname + "/test-index.js"],
    snapshotSerializers: ["enzyme-to-json/serializer"],
    testMatch: ["<rootDir>/src/**/*.spec.{js,jsx,ts,tsx}"],
    transform: {
        "\\.tsx?$": "ts-jest",
        "\\.jsx?$": __dirname + "/transform.js"
    },
    moduleNameMapper: {
        "\\.(css|less|scss|sass)$": "identity-obj-proxy",
        "mendix/components/web/Icon": __dirname + "/__mocks__/WebIcon"
    },
    collectCoverage: true,
    coverageDirectory: "<rootDir>/dist/coverage"
};
