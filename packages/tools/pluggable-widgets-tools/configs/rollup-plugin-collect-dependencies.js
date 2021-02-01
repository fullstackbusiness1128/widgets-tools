import { readJson, writeJson } from "fs-extra";
import { promises } from "fs";
import { dirname, join } from "path";
import copy from "recursive-copy";
import { rm } from "shelljs";

export function collectDependencies({
    externals,
    isJSAction = false,
    outputDir,
    shouldCopyNodeModules,
    shouldRemoveNodeModules = true,
    widgetName
}) {
    const nativeDependencies = [];
    const jsActionsDependencies = [];
    const nodeModulesPath = join(outputDir, "node_modules");
    return {
        name: "collect-native-deps",
        async buildStart() {
            if (!shouldCopyNodeModules) {
                return;
            }
            if (shouldRemoveNodeModules) {
                rm("-rf", nodeModulesPath);
            }
            nativeDependencies.length = 0;
        },
        async resolveId(source) {
            if (source.startsWith(".")) {
                return null;
            }
            return checkLibraries(
                externals,
                source,
                shouldCopyNodeModules,
                nativeDependencies,
                isJSAction,
                jsActionsDependencies
            );
        },
        async writeBundle() {
            if (!shouldCopyNodeModules) {
                return;
            }
            await Promise.all(
                [...nativeDependencies, ...jsActionsDependencies].map(async dependency => {
                    await copyJsModule(dependency.dir, join(nodeModulesPath, dependency.name));
                    for (const transitiveDependency of await getTransitiveDependencies(dependency.name, externals)) {
                        await copyJsModule(
                            dirname(require.resolve(`${transitiveDependency}/package.json`)),
                            join(nodeModulesPath, dependency.name, "node_modules", transitiveDependency)
                        );
                    }
                })
            );
            await writeNativeDependenciesJson(nativeDependencies, outputDir, widgetName);
        }
    };
}

async function checkLibraries(
    externals,
    source,
    shouldCopyNodeModules,
    nativeDependencies,
    isJSAction,
    jsActionsDependencies
) {
    try {
        const packageFilePath = require.resolve(`${source}/package.json`);
        const packageDir = dirname(packageFilePath);

        if (await hasNativeCode(packageDir)) {
            if (shouldCopyNodeModules && !nativeDependencies.some(x => x.name === source)) {
                nativeDependencies.push({ name: source, dir: packageDir });

                for (const transitiveDependency of await getTransitiveDependencies(source, externals)) {
                    await checkLibraries(externals, transitiveDependency, shouldCopyNodeModules, nativeDependencies);
                }
            }
            return { id: source, external: true };
        } else if (isJSAction && !jsActionsDependencies.some(x => x.name === source)) {
            jsActionsDependencies.push({ name: source, dir: packageDir });
            for (const transitiveDependency of await getTransitiveDependencies(source, externals)) {
                await checkLibraries(externals, transitiveDependency, shouldCopyNodeModules, jsActionsDependencies);
            }
            return { id: source, external: true };
        }
        return null;
    } catch (e) {
        return null;
    }
}

async function writeNativeDependenciesJson(nativeDependencies, outputDir, widgetName) {
    if (nativeDependencies.length === 0) {
        return;
    }
    const dependencies = {};
    for (const dependency of nativeDependencies) {
        dependencies[dependency.name] = (await readJson(join(dependency.dir, "package.json"))).version;
    }
    await writeJson(join(outputDir, `${widgetName}.json`), { nativeDependencies: dependencies }, { spaces: 2 });
}

async function hasNativeCode(dir) {
    const packageContent = await promises.readdir(dir, { withFileTypes: true });

    if (packageContent.some(file => /^(ios|android|.*\.podspec)$/i.test(file.name))) {
        return true;
    }

    for (const file of packageContent) {
        if (file.isDirectory() && (await hasNativeCode(join(dir, file.name)))) {
            return true;
        }
    }
    return false;
}

async function getTransitiveDependencies(packageName, externals) {
    const queue = [packageName];
    const result = new Set();
    while (queue.length) {
        const next = queue.shift();
        if (result.has(next)) {
            continue;
        }
        const isExternal = externals.some(external =>
            external instanceof RegExp ? external.test(next) : external === next
        );
        if (isExternal) {
            continue;
        }

        if (next !== packageName) {
            result.add(next);
        }
        const packageJson = await readJson(require.resolve(`${next}/package.json`));
        queue.push(...Object.keys(packageJson.dependencies || {}));
        queue.push(...Object.keys(packageJson.peerDependencies || {}));
    }
    return Array.from(result);
}

async function copyJsModule(from, to) {
    return new Promise((resolve, reject) =>
        copy(
            from,
            to,
            {
                overwrite: true,
                filter: [
                    "**/*.{js,jsx,ts,tsx,json}",
                    "license",
                    "LICENSE",
                    "!**/{jest,github,gradle,__*__,docs,jest,example*}/**/*",
                    "!*.{config,setup}.*"
                ]
            },
            err => {
                if (err) {
                    reject(err);
                } else {
                    resolve(true);
                }
            }
        )
    );
}
