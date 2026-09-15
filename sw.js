/* ==========================================================================
   FASALRAKSHAK AI
   MONIKA ROLE 3 — SERVICE WORKER V2

   FEATURES
   --------------------------------------------------------------------------
   ✓ Offline Farmer Dashboard
   ✓ Offline Report Damage page
   ✓ Cached CSS
   ✓ Cached JavaScript
   ✓ Cached multilingual files
   ✓ Cached PWA manager
   ✓ Cached 192x192 app icon
   ✓ Cached 512x512 app icon
   ✓ Network-first HTML
   ✓ Cache-first static assets
   ✓ Automatic old-cache cleanup
   ========================================================================== */


/* ==========================================================================
   CACHE VERSION

   IMPORTANT:
   Version changed from v1 → v2 so Chrome installs the updated cache.
   ========================================================================== */

const CACHE_VERSION =
    "fasalrakshak-role3-v2";


const STATIC_CACHE =
    `${CACHE_VERSION}-static`;


const RUNTIME_CACHE =
    `${CACHE_VERSION}-runtime`;


/* ==========================================================================
   CORE OFFLINE ASSETS
   ========================================================================== */

const APP_SCOPE_URL = new URL(self.registration.scope);

const scopedAsset = (relativePath) =>
    new URL(relativePath, APP_SCOPE_URL).href;

const CORE_ASSETS = [
    "./",
    "index.html",
    "manifest.webmanifest",
    "icons/icon-192.png",
    "icons/icon-512.png",
    "farmer/dashboard.html",
    "farmer/report-new.html",
    "farmer/assessment-result.html",
    "css/style.css",
    "js/mockData.js",
    "js/utils.js",
    "js/api.js",
    "js/i18n.js",
    "js/farmer.js",
    "js/farmer-role3.js",
    "js/offlineDB.js",
    "js/voiceRecorder.js",
    "js/syncManager.js",
    "js/pwa.js",
    "js/accessibility.js",
    "locales/en.js",
    "locales/hi.js",
    "locales/mr.js",
    "locales/kn.js"
].map(scopedAsset);


/* ==========================================================================
   INSTALL
   ========================================================================== */

self.addEventListener(
    "install",
    (event) => {

        console.log(
            "FasalRakshak Service Worker V2 installing..."
        );


        event.waitUntil(

            caches
                .open(STATIC_CACHE)

                .then(
                    async (cache) => {

                        /*
                          Cache each resource separately.
            
                          If one optional file fails,
                          the whole Service Worker will
                          still install.
                        */

                        for (const asset of CORE_ASSETS) {

                            try {

                                const request =
                                    new Request(
                                        asset,
                                        {
                                            cache: "reload"
                                        }
                                    );


                                await cache.add(
                                    request
                                );


                                console.log(
                                    "Cached:",
                                    asset
                                );

                            } catch (error) {

                                console.warn(
                                    "Could not cache:",
                                    asset,
                                    error
                                );

                            }

                        }

                    }
                )

                .then(
                    () => {

                        /*
                          Activate updated Service Worker
                          without waiting for every old tab.
                        */

                        return self.skipWaiting();

                    }
                )

        );

    }
);


/* ==========================================================================
   ACTIVATE
   ========================================================================== */

self.addEventListener(
    "activate",
    (event) => {

        console.log(
            "FasalRakshak Service Worker V2 activating..."
        );


        event.waitUntil(

            caches
                .keys()

                .then(
                    (cacheNames) => {

                        return Promise.all(

                            cacheNames.map(
                                (cacheName) => {

                                    const belongsToFasalRakshak =
                                        cacheName.startsWith(
                                            "fasalrakshak-role3-"
                                        );


                                    const currentCache =
                                        cacheName === STATIC_CACHE ||
                                        cacheName === RUNTIME_CACHE;


                                    /*
                                      Remove V1 and any older
                                      FasalRakshak caches.
                                    */

                                    if (
                                        belongsToFasalRakshak &&
                                        !currentCache
                                    ) {

                                        console.log(
                                            "Deleting old cache:",
                                            cacheName
                                        );


                                        return caches.delete(
                                            cacheName
                                        );

                                    }


                                    return Promise.resolve();

                                }
                            )

                        );

                    }
                )

                .then(
                    () => {

                        /*
                          Take control of current
                          FasalRakshak browser tabs.
                        */

                        return self.clients.claim();

                    }
                )

        );

    }
);


/* ==========================================================================
   FETCH
   ========================================================================== */

self.addEventListener(
    "fetch",
    (event) => {

        const request =
            event.request;


        /*
          Service Worker should only cache GET.
    
          POST submissions are handled by:
          IndexedDB + syncManager.js
        */

        if (
            request.method !== "GET"
        ) {

            return;

        }


        const requestUrl =
            new URL(
                request.url
            );


        /*
          Ignore external websites.
        */

        if (
            requestUrl.origin !==
            self.location.origin
        ) {

            return;

        }


        /*
          Only intercept FasalRakshak resources.
        */

        if (
            !requestUrl.pathname.startsWith(
                APP_SCOPE_URL.pathname
            )
        ) {

            return;

        }


        /* ======================================================================
           HTML NAVIGATION
           ====================================================================== */

        if (
            request.mode === "navigate"
        ) {

            event.respondWith(

                networkFirstPage(
                    request
                )

            );


            return;

        }


        /* ======================================================================
           STATIC ASSETS
           ====================================================================== */

        event.respondWith(

            cacheFirstAsset(
                request
            )

        );

    }
);


/* ==========================================================================
   NETWORK FIRST — HTML
   ========================================================================== */

async function networkFirstPage(
    request
) {

    try {

        /*
          Online → latest page first.
        */

        const networkResponse =
            await fetch(
                request
            );


        if (
            networkResponse &&
            networkResponse.ok
        ) {

            const runtimeCache =
                await caches.open(
                    RUNTIME_CACHE
                );


            await runtimeCache.put(
                request,
                networkResponse.clone()
            );

        }


        return networkResponse;

    } catch (error) {

        console.log(
            "Offline navigation:",
            request.url
        );


        /* ----------------------------------------------------------------------
           EXACT CACHED URL
           ---------------------------------------------------------------------- */

        const exactResponse =
            await caches.match(
                request
            );


        if (
            exactResponse
        ) {

            return exactResponse;

        }


        /* ----------------------------------------------------------------------
           URL WITHOUT QUERY PARAMETER
    
           Example:
    
           assessment-result.html?id=FR-1009
    
           becomes:
    
           assessment-result.html
           ---------------------------------------------------------------------- */

        const cleanUrl =
            new URL(
                request.url
            );


        cleanUrl.search = "";


        const cleanResponse =
            await caches.match(
                cleanUrl.pathname
            );


        if (
            cleanResponse
        ) {

            return cleanResponse;

        }


        /* ----------------------------------------------------------------------
           DASHBOARD FALLBACK
           ---------------------------------------------------------------------- */

        const dashboardResponse =
            await caches.match(
                scopedAsset("farmer/dashboard.html")
            );


        if (
            dashboardResponse
        ) {

            return dashboardResponse;

        }


        /* ----------------------------------------------------------------------
           EMERGENCY FALLBACK
           ---------------------------------------------------------------------- */

        return new Response(

            `
      <!DOCTYPE html>

      <html lang="en">

      <head>

        <meta charset="UTF-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        >

        <meta
          name="theme-color"
          content="#2f7650"
        >

        <title>
          FasalRakshak AI — Offline
        </title>

        <style>

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: #f7f8f4;
            color: #27332b;

            font-family:
              system-ui,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
          }

          .offline-card {
            width: 100%;
            max-width: 440px;
            padding: 30px;
            border-radius: 20px;
            background: #ffffff;
            text-align: center;

            box-shadow:
              0 10px 35px
              rgba(0, 0, 0, 0.08);
          }

          .logo {
            width: 72px;
            height: 72px;
            margin: 0 auto 18px;
            border-radius: 16px;
            background: #2f7650;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 26px;
            font-weight: 800;
          }

          h1 {
            margin: 0 0 12px;
            font-size: 24px;
          }

          p {
            margin: 8px 0;
            line-height: 1.6;
            color: #59665d;
          }

        </style>

      </head>

      <body>

        <div class="offline-card">

          <div class="logo">
            FR
          </div>

          <h1>
            FasalRakshak AI
          </h1>

          <p>
            📵 You are currently offline.
          </p>

          <p>
            Your previously saved crop evidence remains safely stored on this device.
          </p>

          <p>
            Reconnect whenever network becomes available.
          </p>

        </div>

      </body>

      </html>
      `,

            {

                status: 200,

                headers: {

                    "Content-Type":
                        "text/html; charset=UTF-8"

                }

            }

        );

    }

}


/* ==========================================================================
   CACHE FIRST — STATIC FILES
   ========================================================================== */

async function cacheFirstAsset(
    request
) {

    /*
      Use local cached copy first.
    */

    const cachedResponse =
        await caches.match(
            request
        );


    if (
        cachedResponse
    ) {

        /*
          Quietly try downloading a newer
          version while online.
        */

        updateRuntimeCache(
            request
        );


        return cachedResponse;

    }


    /*
      Resource was not cached yet.
      Try network.
    */

    try {

        const networkResponse =
            await fetch(
                request
            );


        if (
            networkResponse &&
            networkResponse.ok
        ) {

            const runtimeCache =
                await caches.open(
                    RUNTIME_CACHE
                );


            await runtimeCache.put(
                request,
                networkResponse.clone()
            );

        }


        return networkResponse;

    } catch (error) {

        console.warn(
            "Static resource unavailable offline:",
            request.url
        );


        return new Response(
            "",
            {

                status: 503,

                statusText:
                    "Offline"

            }
        );

    }

}


/* ==========================================================================
   BACKGROUND CACHE UPDATE
   ========================================================================== */

async function updateRuntimeCache(
    request
) {

    try {

        const response =
            await fetch(
                request
            );


        if (
            !response ||
            !response.ok
        ) {

            return;

        }


        const runtimeCache =
            await caches.open(
                RUNTIME_CACHE
            );


        await runtimeCache.put(
            request,
            response.clone()
        );

    } catch (error) {

        /*
          Expected when offline.
    
          Keep using existing cached copy.
        */

    }

}


/* ==========================================================================
   SERVICE WORKER MESSAGE
   ========================================================================== */

self.addEventListener(
    "message",
    (event) => {

        if (
            event.data &&
            event.data.type ===
            "SKIP_WAITING"
        ) {

            self.skipWaiting();

        }

    }
);