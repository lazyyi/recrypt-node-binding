#!/usr/bin/env node

/**
 * recrypt-node-binding NPM publish script
 * ==================================
 *
 * This script is responsible for compiling and building the NPM release bundle for this repo. The following steps are taken:
 *
 * + Clean up any existing Rust builds by running `cargo clean`.
 * + Run `cargo update` to make sure all dependencies are available.
 * + Compile rust code into index.node file.
 * + Run unit tests to ensure the library is in good shape for publishing.
 * + Move all expected content into a `dist` directory.
 * + Generate a binary distrubtion in `bin-package`.
 * + Do a dry run of npm publishing via irish-pub or perform an actual publish step if `--publish` option is provided.
 */

const fs = require("fs");
const path = require("path");
const shell = require("shelljs");

//Fail this script if any of these commands fail
shell.set("-e");
//Ensure that our directory is set to the root of the repo
const rootDirectory = path.dirname(process.argv[1]);
shell.cd(rootDirectory);
const shouldPublish = process.argv.slice(2).indexOf("--publish") !== -1;

//Cleanup the previous build, if it exists
shell.rm("-rf", "./dist");
shell.rm("-rf", "./bin-package");
shell.rm("-rf", "./build");

// Cleanup any previous Rust builds, update deps, and compile
shell.exec("yarn install --ignore-scripts");
shell.exec("yarn run clean");
shell.pushd("./native");
shell.exec("cargo update");
shell.popd();
shell.exec("yarn run compile");

shell.exec("yarn test");
shell.mkdir("./dist");

shell.cp(["README.md", "package.json", "index.d.ts", "LICENSE"], "./dist");

//Add a NPM install script to the package.json that we push to NPM so that when consumers pull it down it
//runs the expected node-pre-gyp step.
const npmPackageJson = require("./dist/package.json");
npmPackageJson.scripts.install = "node-pre-gyp install";
fs.writeFileSync("./dist/package.json", JSON.stringify(npmPackageJson, null, 2));

shell.mkdir("./bin-package");
shell.cp("./native/index.node", "./bin-package");
//Use a fully qualified path to pre-gyp binary for Windows support
const cwd = shell.pwd().toString();
shell.exec(`${cwd}/node_modules/node-pre-gyp/bin/node-pre-gyp package`);
var tgz = shell.exec("find ./build -name *.tar.gz");
shell.cp(tgz, "./bin-package/");
shell.pushd("./dist");

shell.exec(shouldPublish ? "npm publish --access public" : "echo 'Skipping publishing to npm...'");
shell.popd();

shell.echo("publish.js COMPLETE");
