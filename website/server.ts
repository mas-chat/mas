import path from 'path';
import { readFileSync } from 'fs-extra';
import Koa, { Context } from 'koa';
import Router from '@koa/router';
import send from 'koa-send';
import hbs from 'koa-hbs';

function getMainEntryFileName(): string {
  try {
    const metaDataFile = readFileSync(path.join(process.cwd(), 'dist/meta.json'), 'utf8');
    const outputs = Object.keys(JSON.parse(metaDataFile).outputs) || [];
    const fileNameWithPath = outputs.find(file => file.match(/^dist\/index-/)) || 'dist/index.js';

    return fileNameWithPath.split('/').pop() || 'index.js';
  } catch {
    return 'index.js';
  }
}

const ONE_YEAR_IN_MS = 1000 * 60 * 60 * 24 * 365;
const devMode = false;
const mainEntryFileName = getMainEntryFileName();

async function sendFile(ctx: Context, prefix: string, filePath: string, options = {}) {
  const sendOptions = { ...options, root: path.join(process.cwd(), prefix) };

  await send(ctx, filePath === '' ? '/' : filePath, sendOptions);
}

const router = new Router();

// Web site assets
router.get(/^\/website-assets\/(.+)/, async (ctx: Context) => {
  const maxage = devMode ? 0 : ONE_YEAR_IN_MS;
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
      config: JSON.stringify({ auth: { google: true } }),
      entryFile: `website-assets/${mainEntryFileName}`
    });
  }
});

app.listen(3100, () => console.log('Website HTTP server listening : http://0.0.0.0:3100/'));
