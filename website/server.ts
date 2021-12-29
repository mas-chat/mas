import path from 'path';
import { readFileSync } from 'fs-extra';
import Koa, { Context } from 'koa';
import Router from '@koa/router';
import send from 'koa-send';
import hbs from 'koa-hbs';

const DEFAULT_ENTRY_FILE_NAME = 'index.js';
const ONE_YEAR_IN_MS = 1000 * 60 * 60 * 24 * 365;

enum Mode {
  Dev = 'development',
  Prod = 'production'
}

function getMainEntryFileNameAndMode(): { mode: Mode; fileName: string } {
  try {
    const metaDataFile = readFileSync(path.join(process.cwd(), 'dist/meta.json'), 'utf8');
    const outputs = Object.keys(JSON.parse(metaDataFile).outputs) || [];
    const fileNameWithPath = outputs.find(file => file.match(/^dist\/index-/));

    if (!fileNameWithPath) {
      throw new Error('No entry file found');
    }

    const fileName = fileNameWithPath.split('/').pop();

    if (typeof fileName !== 'string') {
      throw new Error('No entry file found');
    }

    return { mode: Mode.Prod, fileName };
  } catch {
    return { mode: Mode.Dev, fileName: DEFAULT_ENTRY_FILE_NAME };
  }
}

async function sendFile(ctx: Context, prefix: string, filePath: string, options = {}) {
  const sendOptions = { ...options, root: path.join(process.cwd(), prefix) };

  await send(ctx, filePath === '' ? '/' : filePath, sendOptions);
}

function main() {
  const { mode, fileName: mainEntryFileName } = getMainEntryFileNameAndMode();
  const googleAuthEnabled = process.env['GOOGLE_AUTH'] === 'true';
  const serverPort = process.env['WEBSITE_PORT'] || 3100;

  console.log(`Running in ${mode} mode`);

  const router = new Router();

  // Web site assets
  router.get(/^\/website-assets\/(.+)/, async (ctx: Context) => {
    const maxage = mode === Mode.Dev ? 0 : ONE_YEAR_IN_MS;
    await sendFile(ctx, './dist/', ctx['params'][0], { maxage });
  });

  const app = new Koa();

  app.use(
    hbs.middleware({
      viewPath: `${__dirname}/html`
    })
  );

  app.use(router.routes());
  app.use(router.allowedMethods());

  app.use(async (ctx, next) => {
    await next();

    const sessionCookie = ctx.cookies.get('mas');

    if (sessionCookie) {
      ctx.redirect('/app');
    } else {
      ctx.set('Cache-control', 'private, max-age=0, no-cache');

      await ctx['render']('index', {
        config: JSON.stringify({ auth: { google: googleAuthEnabled } }),
        entryFile: `website-assets/${mainEntryFileName}`
      });
    }
  });

  app.listen(serverPort, () => console.log(`Website HTTP server listening : http://0.0.0.0:${serverPort}/`));
}

main();
