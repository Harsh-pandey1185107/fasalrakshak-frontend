/* ==========================================================================
   FASALRAKSHAK AI
   MONIKA ROLE 3 — VOICE RECORDER

   Production-style browser voice recording helper.

   FEATURES
   --------------------------------------------------------------------------
   ✓ Uses MediaRecorder API
   ✓ Requests microphone permission
   ✓ Chooses a supported audio format
   ✓ Records actual audio Blob
   ✓ Creates playback URL
   ✓ Stops microphone cleanly
   ✓ Supports replacing/restoring a recording
   ✓ Supports IndexedDB Blob persistence
   ========================================================================== */


const FRVoiceRecorder = {

    mediaRecorder: null,

    mediaStream: null,

    audioChunks: [],

    audioBlob: null,

    audioUrl: null,

    startedAt: null,


    /* ========================================================================
       CHECK SUPPORT
       ======================================================================== */

    isSupported() {

        return Boolean(
            navigator.mediaDevices &&
            navigator.mediaDevices.getUserMedia &&
            window.MediaRecorder
        );

    },


    /* ========================================================================
       CHOOSE BEST MIME TYPE
       ======================================================================== */

    getSupportedMimeType() {

        if (
            typeof MediaRecorder ===
            "undefined"
        ) {
            return "";
        }


        const preferredTypes = [

            "audio/webm;codecs=opus",

            "audio/webm",

            "audio/ogg;codecs=opus",

            "audio/mp4"

        ];


        for (
            const type of preferredTypes
        ) {

            if (
                typeof MediaRecorder.isTypeSupported ===
                "function" &&
                MediaRecorder.isTypeSupported(type)
            ) {

                return type;

            }

        }


        return "";

    },


    /* ========================================================================
       START RECORDING
       ======================================================================== */

    async start() {

        if (
            !this.isSupported()
        ) {

            throw new Error(
                "Voice recording is not supported in this browser."
            );

        }


        /*
          Prevent two recordings from running
          at the same time.
        */

        if (
            this.mediaRecorder &&
            this.mediaRecorder.state ===
            "recording"
        ) {

            throw new Error(
                "A voice recording is already in progress."
            );

        }


        /*
          Clear previous temporary data.
          Existing recording will be replaced
          when the new recording finishes.
        */

        this.audioChunks = [];


        try {

            this.mediaStream =
                await navigator.mediaDevices
                    .getUserMedia({

                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true
                        }

                    });


            const mimeType =
                this.getSupportedMimeType();


            const recorderOptions =
                mimeType
                    ? {
                        mimeType
                    }
                    : undefined;


            this.mediaRecorder =
                recorderOptions
                    ? new MediaRecorder(
                        this.mediaStream,
                        recorderOptions
                    )
                    : new MediaRecorder(
                        this.mediaStream
                    );


            this.mediaRecorder.addEventListener(
                "dataavailable",
                (event) => {

                    if (
                        event.data &&
                        event.data.size > 0
                    ) {

                        this.audioChunks.push(
                            event.data
                        );

                    }

                }
            );


            this.startedAt =
                Date.now();


            this.mediaRecorder.start(
                250
            );


            console.log(
                "Monika Role 3 voice recording started."
            );


            return true;

        } catch (error) {

            this.stopMicrophone();


            console.error(
                "Microphone access failed:",
                error
            );


            throw error;

        }

    },


    /* ========================================================================
       STOP RECORDING
       ======================================================================== */

    stop() {

        return new Promise(
            (resolve, reject) => {

                if (
                    !this.mediaRecorder ||
                    this.mediaRecorder.state ===
                    "inactive"
                ) {

                    reject(
                        new Error(
                            "No voice recording is currently active."
                        )
                    );

                    return;

                }


                const recorder =
                    this.mediaRecorder;


                recorder.addEventListener(
                    "stop",
                    () => {

                        try {

                            const mimeType =
                                recorder.mimeType ||
                                this.getSupportedMimeType() ||
                                "audio/webm";


                            const blob =
                                new Blob(
                                    this.audioChunks,
                                    {
                                        type:
                                            mimeType
                                    }
                                );


                            this.replaceBlob(
                                blob
                            );


                            const durationMs =
                                this.startedAt
                                    ? Date.now() -
                                    this.startedAt
                                    : 0;


                            this.startedAt =
                                null;


                            this.audioChunks =
                                [];


                            this.stopMicrophone();


                            console.log(
                                "Monika Role 3 voice recording saved."
                            );


                            resolve({

                                blob:
                                    this.audioBlob,

                                url:
                                    this.audioUrl,

                                mimeType:
                                    this.audioBlob.type,

                                size:
                                    this.audioBlob.size,

                                durationMs

                            });

                        } catch (error) {

                            this.stopMicrophone();

                            reject(error);

                        }

                    },
                    {
                        once: true
                    }
                );


                recorder.addEventListener(
                    "error",
                    (event) => {

                        this.stopMicrophone();


                        reject(
                            event.error ||
                            new Error(
                                "Voice recording failed."
                            )
                        );

                    },
                    {
                        once: true
                    }
                );


                recorder.stop();

            }
        );

    },


    /* ========================================================================
       STOP MICROPHONE TRACKS
       ======================================================================== */

    stopMicrophone() {

        if (
            this.mediaStream
        ) {

            this.mediaStream
                .getTracks()
                .forEach(
                    (track) => {

                        try {

                            track.stop();

                        } catch (error) {

                            console.warn(
                                "Could not stop microphone track:",
                                error
                            );

                        }

                    }
                );

        }


        this.mediaStream =
            null;

    },


    /* ========================================================================
       REPLACE CURRENT RECORDING
       ======================================================================== */

    replaceBlob(blob) {

        this.revokeAudioUrl();


        this.audioBlob =
            blob || null;


        if (
            this.audioBlob
        ) {

            this.audioUrl =
                URL.createObjectURL(
                    this.audioBlob
                );

        } else {

            this.audioUrl =
                null;

        }

    },


    /* ========================================================================
       RESTORE RECORDING FROM INDEXEDDB
       ======================================================================== */

    setBlob(blob) {

        if (
            !blob
        ) {

            this.clear();

            return;

        }


        if (
            !(blob instanceof Blob)
        ) {

            throw new Error(
                "Voice recording must be a Blob."
            );

        }


        this.replaceBlob(
            blob
        );

    },


    /* ========================================================================
       GET RECORDING
       ======================================================================== */

    getBlob() {

        return this.audioBlob;

    },


    getUrl() {

        return this.audioUrl;

    },


    hasRecording() {

        return Boolean(
            this.audioBlob &&
            this.audioBlob.size > 0
        );

    },


    isRecording() {

        return Boolean(
            this.mediaRecorder &&
            this.mediaRecorder.state ===
            "recording"
        );

    },


    /* ========================================================================
       DELETE RECORDING
       ======================================================================== */

    clear() {

        if (
            this.mediaRecorder &&
            this.mediaRecorder.state ===
            "recording"
        ) {

            try {

                this.mediaRecorder.stop();

            } catch (error) {

                console.warn(
                    "Could not stop recording during cleanup:",
                    error
                );

            }

        }


        this.stopMicrophone();


        this.revokeAudioUrl();


        this.audioBlob =
            null;


        this.audioChunks =
            [];


        this.startedAt =
            null;


        this.mediaRecorder =
            null;


        console.log(
            "Monika Role 3 voice recording cleared."
        );

    },


    /* ========================================================================
       REVOKE PLAYBACK URL
       ======================================================================== */

    revokeAudioUrl() {

        if (
            this.audioUrl
        ) {

            URL.revokeObjectURL(
                this.audioUrl
            );

        }


        this.audioUrl =
            null;

    },


    /* ========================================================================
       FORMAT RECORDING DURATION
       ======================================================================== */

    formatDuration(
        milliseconds
    ) {

        const totalSeconds =
            Math.max(
                0,
                Math.floor(
                    milliseconds / 1000
                )
            );


        const minutes =
            Math.floor(
                totalSeconds / 60
            );


        const seconds =
            totalSeconds % 60;


        return (
            String(minutes)
                .padStart(2, "0") +
            ":" +
            String(seconds)
                .padStart(2, "0")
        );

    },


    /* ========================================================================
       CLEANUP
       ======================================================================== */

    destroy() {

        this.stopMicrophone();

        this.revokeAudioUrl();


        this.mediaRecorder =
            null;

        this.audioBlob =
            null;

        this.audioChunks =
            [];

        this.startedAt =
            null;

    }

};


/* ==========================================================================
   PAGE CLEANUP
   ========================================================================== */

window.addEventListener(
    "beforeunload",
    () => {

        /*
          We only release microphone hardware here.
    
          We do NOT deliberately delete the Blob from
          IndexedDB. The IndexedDB copy remains safe.
        */

        FRVoiceRecorder.stopMicrophone();

        FRVoiceRecorder.revokeAudioUrl();

    }
);