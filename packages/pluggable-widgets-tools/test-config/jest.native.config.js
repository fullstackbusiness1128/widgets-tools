const { join } = require("path");

const projectDir = process.cwd();

module.exports = {
    preset: "react-native",
    clearMocks: true,
    rootDir: join(projectDir, "src"),
    globals: {
        "ts-jest": {
            tsconfig: { module: "commonjs" }
        }
    },
    setupFilesAfterEnv: [
        join(__dirname, "test-index-native.js"),
        ...(hasDependency("react-native-gesture-handler") ? ["react-native-gesture-handler/jestSetup.js"] : [])
    ],
    snapshotSerializers: ["enzyme-to-json/serializer"],
    testMatch: ["<rootDir>/**/*.spec.{js,jsx,ts,tsx}"],
    transformIgnorePatterns: ["node_modules/(?!.*react-native)(?!victory-)"],
    transform: {
        "\\.tsx?$": "ts-jest",
        "\\.jsx?$": join(__dirname, "transform-native.js")
    },
    moduleNameMapper: {
        "mendix/components/native/Icon": join(__dirname, "__mocks__/NativeIcon"),
        "mendix/components/native/Image": join(__dirname, "__mocks__/NativeImage"),
        "mendix/filters/builders": join(__dirname, "__mocks__/FilterBuilders")
    },
    collectCoverage: !process.env.CI,
    coverageDirectory: "<rootDir>/../dist/coverage",
    testEnvironment: "jsdom"
};

function hasDependency(name) {
    try {
        require.resolve(name);
        return true;
    } catch (e) {
        return false;
    }
}
