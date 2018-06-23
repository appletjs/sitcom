import typescript from 'rollup-plugin-typescript';
import json from 'rollup-plugin-json';
import pkg from '../package.json';
import path from 'path';
import fs from 'fs';

const commitHash = (function() {
  try {
    return fs.readFileSync('.commithash', 'utf-8');
  } catch (err) {
    return 'unknown';
  }
})();

const banner = (name) => `/*!
 * ${name} v${pkg.version}
 * ${new Date().toUTCString()} - commit ${commitHash}
 * https://github.com/appletjs/sitcom
 * Released under the MIT License.
 */`;

const third = ['call2p', 'chalk', 'ini', 'yaml', 'marked', 'mkdirp', 'mustache'];
const nodes = ['fs', 'assert', 'path', 'util'];

const src = path.resolve('src');
const bin = path.resolve('bin');

function resolveTypescript() {
  return {
    name: 'resolve-typescript',
    resolveId(importee, importer) {
      // bit of a hack — TypeScript only really works if it can resolve imports,
      // but they misguidedly chose to reject imports with file extensions. This
      // means we need to resolve them here
      if (
        importer &&
        (importer.startsWith(src) || importer.startsWith(bin)) &&
        importee[0] === '.' &&
        path.extname(importee) === ''
      ) {
        return path.resolve(path.dirname(importer), `${importee}.ts`);
      }
    }
  };
}

export default [{
  input: 'src/index.ts',
  external: third.concat(nodes),
  plugins: [
    json(),
    typescript({
      typescript: require('typescript')
    })
  ],
  output: {
    file: 'index.js',
    format: 'cjs',
    sourcemap: false,
    banner: banner('Sitcom.js')
  }
}, {
  input: 'bin/src/index.ts',
  external: third.concat(nodes).concat('commander', 'sitcom'),
  plugins: [
    json(),
    resolveTypescript(),
    typescript({
      typescript: require('typescript')
    })
  ],
  output: {
    file: 'bin/sitcom',
    format: 'cjs',
    banner: '#!/usr/bin/env node\n\n' + banner('Sitcom CLI'),
    paths: {
      sitcom: '..'
    }
  }
}];
