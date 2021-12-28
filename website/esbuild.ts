import { writeFileSync, emptyDirSync } from 'fs-extra';
import { build, BuildOptions } from 'esbuild';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .options({
    devMode: { type: 'boolean', default: false }
  })
  .parseSync();

const outDir = 'dist';

async function buildAll(devMode = false) {
  console.log(`DEV mode: ${devMode}`);

  emptyDirSync(outDir);

  const buildConf: BuildOptions = {
    logLevel: 'info',
    entryPoints: ['src/index.tsx'],
    entryNames: devMode ? '[name]' : '[name]-[hash]',
    bundle: true,
    outdir: outDir,
    metafile: !devMode,
    watch: devMode
  };

  if (devMode) {
    build(buildConf);
  } else {
    const result = await build(buildConf);
    writeFileSync('dist/meta.json', JSON.stringify(result.metafile));
  }
}

buildAll(argv.devMode);
