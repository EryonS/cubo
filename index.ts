import { registerRootComponent } from 'expo';
import { bootLang } from './src/i18n/lang';

// The language must be set before any core module loads: their tables call tr() at load.
bootLang();
// eslint-disable-next-line @typescript-eslint/no-require-imports
const App = require('./App').default;

registerRootComponent(App);
