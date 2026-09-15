/* ==========================================================================
   FASALRAKSHAK AI
   MONIKA ROLE 3 — PWA MANAGER

   PURPOSE
   --------------------------------------------------------------------------
   ✓ Register FasalRakshak Service Worker
   ✓ Track Service Worker lifecycle
   ✓ Detect installability
   ✓ Support future "Install App" button
   ✓ Detect standalone PWA mode
   ✓ Notify UI when a new version is available
   ========================================================================== */


const FRPWA = {

    registration: null,

    deferredInstallPrompt: null,

    isInstalled: false,


    /* =========================================================================
       CHECK SERVICE WORKER SUPPORT
       ========================================================================= */

    isServiceWorkerSupported() {

        return (
            "serviceWorker" in navigator
        );

    },


    /* =========================================================================
       CHECK IF APP IS ALREADY INSTALLED
       ========================================================================= */

    detectInstalledMode() {

        const standaloneDisplay =
            window.matchMedia(
                "(display-mode: standalone)"
            ).matches;


        const iosStandalone =
            window.navigator.standalone ===
            true;


        this.isInstalled =
            Boolean(
                standaloneDisplay ||
                iosStandalone
            );


        return this.isInstalled;

    },


    /* =========================================================================
       REGISTER SERVICE WORKER
       ========================================================================= */

    async registerServiceWorker() {

        if (
            !this.isServiceWorkerSupported()
        ) {

            console.warn(
                "Service Worker is not supported in this browser."
            );


            return null;

        }


        try {

            this.registration =
                await navigator.serviceWorker.register(

                    new URL("../sw.js", window.location.href).href,

                    {
                        scope:
                            new URL("../", window.location.href).pathname
                    }

                );


            console.log(
                "FasalRakshak Service Worker registered.",
                this.registration.scope
            );


            this.watchRegistration(
                this.registration
            );


            return this.registration;

        } catch (
        error
        ) {

            console.error(
                "FasalRakshak Service Worker registration failed:",
                error
            );


            return null;

        }

    },


    /* =========================================================================
       WATCH SERVICE WORKER STATE
       ========================================================================= */

    watchRegistration(
        registration
    ) {

        if (
            !registration
        ) {
            return;
        }


        /*
          Existing waiting worker.
        */

        if (
            registration.waiting
        ) {

            this.notifyUpdateAvailable(
                registration.waiting
            );

        }


        /*
          Watch future worker updates.
        */

        registration.addEventListener(
            "updatefound",
            () => {

                const installingWorker =
                    registration.installing;


                if (
                    !installingWorker
                ) {
                    return;
                }


                console.log(
                    "New FasalRakshak Service Worker found."
                );


                installingWorker.addEventListener(
                    "statechange",
                    () => {

                        console.log(
                            "Service Worker state:",
                            installingWorker.state
                        );


                        if (
                            installingWorker.state ===
                            "installed"
                        ) {

                            /*
                              If a controller already exists,
                              this is an update.
              
                              Otherwise this is the first install.
                            */

                            if (
                                navigator.serviceWorker
                                    .controller
                            ) {

                                this.notifyUpdateAvailable(
                                    installingWorker
                                );

                            } else {

                                window.dispatchEvent(

                                    new CustomEvent(
                                        "fr-pwa-ready",
                                        {
                                            detail: {
                                                firstInstall:
                                                    true
                                            }
                                        }
                                    )

                                );


                                console.log(
                                    "FasalRakshak is now ready for offline use."
                                );

                            }

                        }

                    }
                );

            }
        );

    },


    /* =========================================================================
       UPDATE AVAILABLE
       ========================================================================= */

    notifyUpdateAvailable(
        worker
    ) {

        console.log(
            "A new FasalRakshak version is available."
        );


        window.dispatchEvent(

            new CustomEvent(
                "fr-pwa-update-available",
                {
                    detail: {
                        worker
                    }
                }
            )

        );

    },


    /* =========================================================================
       ACTIVATE WAITING VERSION
       ========================================================================= */

    activateUpdate() {

        if (
            !this.registration ||
            !this.registration.waiting
        ) {

            return false;

        }


        this.registration.waiting
            .postMessage({

                type:
                    "SKIP_WAITING"

            });


        return true;

    },


    /* =========================================================================
       INSTALL PROMPT
       ========================================================================= */

    setupInstallPrompt() {

        window.addEventListener(

            "beforeinstallprompt",

            (event) => {

                /*
                  Stop Chrome from immediately showing
                  its own install UI.
        
                  We keep the event so our own button
                  can trigger it later.
                */

                event.preventDefault();


                this.deferredInstallPrompt =
                    event;


                console.log(
                    "FasalRakshak can be installed as an app."
                );


                window.dispatchEvent(

                    new CustomEvent(
                        "fr-pwa-install-available"
                    )

                );

            }

        );


        window.addEventListener(

            "appinstalled",

            () => {

                this.isInstalled =
                    true;


                this.deferredInstallPrompt =
                    null;


                console.log(
                    "FasalRakshak installed successfully."
                );


                window.dispatchEvent(

                    new CustomEvent(
                        "fr-pwa-installed"
                    )

                );

            }

        );

    },


    /* =========================================================================
       CHECK IF INSTALL PROMPT IS AVAILABLE
       ========================================================================= */

    canInstall() {

        return Boolean(
            this.deferredInstallPrompt
        );

    },


    /* =========================================================================
       SHOW INSTALL PROMPT
       ========================================================================= */

    async promptInstall() {

        if (
            !this.deferredInstallPrompt
        ) {

            return {
                available:
                    false,

                accepted:
                    false
            };

        }


        const promptEvent =
            this.deferredInstallPrompt;


        try {

            await promptEvent.prompt();


            const choice =
                await promptEvent.userChoice;


            const accepted =
                choice.outcome ===
                "accepted";


            console.log(
                accepted
                    ? "Farmer accepted PWA installation."
                    : "Farmer dismissed PWA installation."
            );


            this.deferredInstallPrompt =
                null;


            return {

                available:
                    true,

                accepted

            };

        } catch (
        error
        ) {

            console.error(
                "PWA install prompt failed:",
                error
            );


            return {

                available:
                    true,

                accepted:
                    false,

                error:
                    error.message ||
                    "Installation failed."

            };

        }

    },


    /* =========================================================================
       SERVICE WORKER CONTROLLER CHANGE
       ========================================================================= */

    watchControllerChanges() {

        if (
            !this.isServiceWorkerSupported()
        ) {
            return;
        }


        navigator.serviceWorker
            .addEventListener(
                "controllerchange",
                () => {

                    console.log(
                        "FasalRakshak Service Worker controller changed."
                    );


                    window.dispatchEvent(

                        new CustomEvent(
                            "fr-pwa-controller-changed"
                        )

                    );

                }
            );

    },


    /* =========================================================================
       GET STATUS
       ========================================================================= */

    async getStatus() {

        let registration =
            this.registration;


        if (
            !registration &&
            this.isServiceWorkerSupported()
        ) {

            try {

                registration =
                    await navigator
                        .serviceWorker
                        .getRegistration(
                            new URL("../", window.location.href).href
                        );

            } catch (
            error
            ) {

                registration =
                    null;

            }

        }


        return {

            supported:
                this.isServiceWorkerSupported(),

            registered:
                Boolean(
                    registration
                ),

            controlled:
                Boolean(
                    navigator.serviceWorker &&
                    navigator.serviceWorker
                        .controller
                ),

            installed:
                this.detectInstalledMode(),

            installPromptAvailable:
                this.canInstall(),

            scope:
                registration
                    ? registration.scope
                    : null,

            active:
                Boolean(
                    registration &&
                    registration.active
                ),

            waiting:
                Boolean(
                    registration &&
                    registration.waiting
                ),

            installing:
                Boolean(
                    registration &&
                    registration.installing
                )

        };

    },


    /* =========================================================================
       INITIALIZE
       ========================================================================= */

    async init() {

        this.detectInstalledMode();


        this.setupInstallPrompt();


        this.watchControllerChanges();


        await this.registerServiceWorker();


        console.log(
            "Monika Role 3 PWA manager initialized."
        );

    }

};


/* ==========================================================================
   START
   ========================================================================== */

FRPWA.init();