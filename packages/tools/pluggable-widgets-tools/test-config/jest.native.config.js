const projectDir = process.cwd();

module.exports = {
    preset: "react-native",
    clearMocks: true,
    rootDir: projectDir,
    globals: {
        "ts-jest": {
            tsconfig: { module: "commonjs" }
        }
    },
    setupFilesAfterEnv: [
        __dirname + "/test-index-native.js",
        ...(hasDependency("react-native-gesture-handler") ? ["react-native-gesture-handler/jestSetup.js"] : [])
    ],
    snapshotSerializers: ["enzyme-to-json/serializer"],
    testMatch: ["<rootDir>/src/**/*.spec.{js,jsx,ts,tsx}"],
    transformIgnorePatterns: ["node_modules/(?!.*react-native)"],
    transform: {
        "node_modules.*\\.jsx?$": "react-native/jest/preprocessor.js",
        "\\.tsx?$": "ts-jest",
        "\\.jsx?$": __dirname + "/transform-native.js"
    },
    moduleNameMapper: {
        "mendix/components/native/Icon": __dirname + "/__mocks__/NativeIcon",
        "mendix/components/native/Image": __dirname + "/__mocks__/NativeImage"
    },
    collectCoverage: true,
    coverageDirectory: "<rootDir>/dist/coverage"
};

function hasDependency(name) {
    try {
        require.resolve(name);
        return true;
    } catch (e) {
        return false;
    }
}
