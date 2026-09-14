/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "1b42cb7bb31073f303c9231bcb499e04"
  }, {
    "url": "pwa-512x512.png",
    "revision": "23420d96e70ab52f03ddb9b0712ff324"
  }, {
    "url": "pwa-192x192.png",
    "revision": "4997e34f39f52ec327c25c306f1013ca"
  }, {
    "url": "index.html",
    "revision": "dd74b42753db00944e1dc0cb304419cc"
  }, {
    "url": "icon.svg",
    "revision": "8de66d22ab66f70ce971dbee4ca5349b"
  }, {
    "url": "icon-maskable.svg",
    "revision": "467daea6dce7fe455d7b0006ebe0658f"
  }, {
    "url": "favicon.ico",
    "revision": "f771610b34108bc967c23765da942122"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "4f9d94e2b32e9a1e8bbd62f69f66028e"
  }, {
    "url": "assets/web-DZ-fwhHL.js",
    "revision": null
  }, {
    "url": "assets/web-D2iQgrso.js",
    "revision": null
  }, {
    "url": "assets/web-BEX6ueti.js",
    "revision": null
  }, {
    "url": "assets/native-UJOl8oxN.js",
    "revision": null
  }, {
    "url": "assets/index-F1ISMG6k.css",
    "revision": null
  }, {
    "url": "assets/index-Dn1q5DNU.js",
    "revision": null
  }, {
    "url": "assets/base-k4cuCttl.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "4f9d94e2b32e9a1e8bbd62f69f66028e"
  }, {
    "url": "favicon.ico",
    "revision": "f771610b34108bc967c23765da942122"
  }, {
    "url": "icon.svg",
    "revision": "8de66d22ab66f70ce971dbee4ca5349b"
  }, {
    "url": "pwa-192x192.png",
    "revision": "4997e34f39f52ec327c25c306f1013ca"
  }, {
    "url": "pwa-512x512.png",
    "revision": "23420d96e70ab52f03ddb9b0712ff324"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "1b42cb7bb31073f303c9231bcb499e04"
  }, {
    "url": "manifest.webmanifest",
    "revision": "f7282e1698ebbf7253ebdc420672951f"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
