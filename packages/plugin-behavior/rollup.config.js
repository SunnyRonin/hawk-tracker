import { createRollupConfig } from '@workspace/build-config/base';
import { readFileSync } from 'fs';
// import typescript from '@rollup/plugin-typescript';
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

export default createRollupConfig(pkg, {});
