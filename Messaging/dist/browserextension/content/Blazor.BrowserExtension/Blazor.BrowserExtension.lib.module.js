import { initializeInternal } from './CoreInternal.js';

let debugMode = false;
const hasExtensionsApi = (namespace) => typeof globalThis[namespace] == "object" && globalThis[namespace]?.runtime?.id;
if (!hasExtensionsApi("browser") && !hasExtensionsApi("chrome")) {
  debugMode = true;
}

let url;
let browserExtensionMode;
if (!debugMode) {
  url = (globalThis.browser || globalThis.chrome).runtime.getURL("");
  browserExtensionMode = "Standard";
} else {
  url = globalThis.location.origin + "/";
  browserExtensionMode = "Debug";
}

let config;
let appJs;

async function beforeStart(options, extensions) {
  const configUrl = `${url}content/browserextension.config.json`;
  const configRequest = await fetch(configUrl);

  config = await configRequest.json();

  const blazorBrowserExtension = options.BlazorBrowserExtension ?? initializeInternal(config, url, browserExtensionMode);

  if (debugMode) {
    blazorBrowserExtension.ImportBrowserPolyfill = false;
  }

  if (config.HasAppJs) {
    appJs = await (globalThis.importProxy ?? (m => import(m)))(`${url}app.js`);
  }

  if (blazorBrowserExtension.ImportBrowserPolyfill) {
    // import browser extension API polyfill
    // @ts-ignore JS is not a module
    await (globalThis.importProxy ?? (m => import(m)))('./lib/browser-polyfill.min.js');
  }

  await blazorBrowserExtension.BrowserExtension.InitializeCoreAsync(options);

  if (appJs?.beforeStart) {
    const beforeStartReturn = appJs.beforeStart(options, extensions, blazorBrowserExtension);
    if (beforeStartReturn instanceof Promise) {
      await beforeStartReturn;
    }
  }
}

function afterStarted(blazor) {
  if (appJs?.afterStarted) {
    return appJs.afterStarted(blazor);
  }
}

export { afterStarted, beforeStart };
