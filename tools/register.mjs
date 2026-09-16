/** Install the TypeScript loader. Used as `node --import ./tools/register.mjs <file>.ts`. */
import { register } from 'node:module';

register('./ts-loader.mjs', import.meta.url);
