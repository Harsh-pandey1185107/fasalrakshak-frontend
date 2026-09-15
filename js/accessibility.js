/* ==========================================================================
   FASALRAKSHAK AI
   MONIKA ROLE 3 — ACCESSIBILITY + FARMER UX

   FEATURES
   --------------------------------------------------------------------------
   ✓ Large touch targets
   ✓ Strong keyboard focus
   ✓ Screen-reader labels
   ✓ Live announcements
   ✓ Audio instructions
   ✓ Language-aware speech
   ✓ Reduced-motion support
   ✓ Better form accessibility
   ✓ Farmer-friendly minimal interaction
   ========================================================================== */


const FRAccessibility = {

    speech: null,

    liveRegion: null,


    /* =========================================================================
       LANGUAGE
       ========================================================================= */

    getLanguage() {

        if (
            typeof FR_I18N !== "undefined" &&
            typeof FR_I18N.getLanguage === "function"
        ) {

            return FR_I18N.getLanguage();

        }


        return (
            localStorage.getItem("fr_language") ||
            "en"
        );

    },


    getSpeechLanguage() {

        const languages = {

            en: "en-IN",

            hi: "hi-IN",

            mr: "mr-IN",

            kn: "kn-IN"

        };


        return (
            languages[this.getLanguage()] ||
            "en-IN"
        );

    },


    /* =========================================================================
       ACCESSIBILITY TEXT
       ========================================================================= */

    getText() {

        const language =
            this.getLanguage();


        const translations = {

            en: {

                listen:
                    "Listen to instructions",

                stop:
                    "Stop audio",

                leaf:
                    "Take a clear close-up photograph of the affected leaf. Keep the leaf in focus and make sure the damaged area is clearly visible.",

                plant:
                    "Take a photograph of the complete affected plant. Make sure the full plant can be seen.",

                field:
                    "Take a wider photograph showing the damaged area of the field.",

                second:
                    "Move to another affected area and take a second location photograph.",

                gps:
                    "Use current location to attach GPS coordinates to this evidence.",

                voice:
                    "You can describe the crop damage using your voice instead of typing.",

                ready:
                    "Accessibility assistance is ready.",

                photoCaptured:
                    "Photo captured successfully.",

                gpsCaptured:
                    "GPS location captured successfully.",

                offline:
                    "You are offline. Your evidence can still be saved safely on this device.",

                online:
                    "Internet connection available."

            },


            hi: {

                listen:
                    "निर्देश सुनें",

                stop:
                    "आवाज़ बंद करें",

                leaf:
                    "प्रभावित पत्ती की साफ और पास से फोटो लें। पत्ती को फोकस में रखें और नुकसान वाला हिस्सा साफ दिखाई देना चाहिए।",

                plant:
                    "पूरे प्रभावित पौधे की फोटो लें। पूरा पौधा फोटो में दिखाई देना चाहिए।",

                field:
                    "खेत के प्रभावित हिस्से की थोड़ी दूर से फोटो लें।",

                second:
                    "दूसरे प्रभावित स्थान पर जाएँ और वहाँ की एक और फोटो लें।",

                gps:
                    "इस प्रमाण के साथ जीपीएस स्थान जोड़ने के लिए वर्तमान स्थान का उपयोग करें।",

                voice:
                    "टाइप करने के बजाय आप अपनी आवाज़ से फसल के नुकसान का विवरण दे सकते हैं।",

                ready:
                    "सहायता सुविधा तैयार है।",

                photoCaptured:
                    "फोटो सफलतापूर्वक दर्ज हो गई।",

                gpsCaptured:
                    "जीपीएस स्थान सफलतापूर्वक दर्ज हो गया।",

                offline:
                    "आप ऑफलाइन हैं। आपका प्रमाण इस डिवाइस पर सुरक्षित रूप से सहेजा जा सकता है।",

                online:
                    "इंटरनेट कनेक्शन उपलब्ध है।"

            },


            mr: {

                listen:
                    "सूचना ऐका",

                stop:
                    "आवाज थांबवा",

                leaf:
                    "प्रभावित पानाचा स्पष्ट जवळून फोटो घ्या. पान फोकसमध्ये ठेवा आणि नुकसान झालेला भाग स्पष्ट दिसला पाहिजे.",

                plant:
                    "संपूर्ण प्रभावित रोपाचा फोटो घ्या. पूर्ण रोप फोटोमध्ये दिसले पाहिजे.",

                field:
                    "शेतातील नुकसान झालेल्या भागाचा थोडा लांबून फोटो घ्या.",

                second:
                    "दुसऱ्या प्रभावित ठिकाणी जा आणि तिथला आणखी एक फोटो घ्या.",

                gps:
                    "या पुराव्यासोबत जीपीएस स्थान जोडण्यासाठी वर्तमान स्थान वापरा.",

                voice:
                    "टाइप करण्याऐवजी आवाजाद्वारे पिकाच्या नुकसानीचे वर्णन करा.",

                ready:
                    "सुलभता सुविधा तयार आहे.",

                photoCaptured:
                    "फोटो यशस्वीपणे नोंदवला.",

                gpsCaptured:
                    "जीपीएस स्थान यशस्वीपणे नोंदवले.",

                offline:
                    "आपण ऑफलाइन आहात. पुरावे या डिव्हाइसवर सुरक्षितपणे जतन केले जाऊ शकतात.",

                online:
                    "इंटरनेट उपलब्ध आहे."

            },


            kn: {

                listen:
                    "ಸೂಚನೆಗಳನ್ನು ಕೇಳಿ",

                stop:
                    "ಧ್ವನಿ ನಿಲ್ಲಿಸಿ",

                leaf:
                    "ಹಾನಿಗೊಳಗಾದ ಎಲೆಯ ಸ್ಪಷ್ಟವಾದ ಹತ್ತಿರದ ಫೋಟೋ ತೆಗೆದುಕೊಳ್ಳಿ. ಹಾನಿಗೊಳಗಾದ ಭಾಗ ಸ್ಪಷ್ಟವಾಗಿ ಕಾಣುವಂತೆ ಮಾಡಿ.",

                plant:
                    "ಹಾನಿಗೊಳಗಾದ ಸಂಪೂರ್ಣ ಸಸ್ಯದ ಫೋಟೋ ತೆಗೆದುಕೊಳ್ಳಿ.",

                field:
                    "ಹಾನಿಗೊಳಗಾದ ಹೊಲದ ಪ್ರದೇಶವನ್ನು ತೋರಿಸುವ ವಿಶಾಲ ಫೋಟೋ ತೆಗೆದುಕೊಳ್ಳಿ.",

                second:
                    "ಇನ್ನೊಂದು ಹಾನಿಗೊಳಗಾದ ಸ್ಥಳಕ್ಕೆ ಹೋಗಿ ಮತ್ತೊಂದು ಫೋಟೋ ತೆಗೆದುಕೊಳ್ಳಿ.",

                gps:
                    "ಈ ಸಾಕ್ಷ್ಯಕ್ಕೆ ಜಿಪಿಎಸ್ ಸ್ಥಳವನ್ನು ಸೇರಿಸಲು ಪ್ರಸ್ತುತ ಸ್ಥಳವನ್ನು ಬಳಸಿ.",

                voice:
                    "ಟೈಪ್ ಮಾಡುವ ಬದಲು ಧ್ವನಿಯ ಮೂಲಕ ಬೆಳೆ ಹಾನಿಯನ್ನು ವಿವರಿಸಬಹುದು.",

                ready:
                    "ಪ್ರವೇಶಸೌಲಭ್ಯ ಸಹಾಯ ಸಿದ್ಧವಾಗಿದೆ.",

                photoCaptured:
                    "ಫೋಟೋ ಯಶಸ್ವಿಯಾಗಿ ಸೆರೆಹಿಡಿಯಲಾಗಿದೆ.",

                gpsCaptured:
                    "ಜಿಪಿಎಸ್ ಸ್ಥಳ ಯಶಸ್ವಿಯಾಗಿ ದಾಖಲಿಸಲಾಗಿದೆ.",

                offline:
                    "ನೀವು ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದ್ದೀರಿ. ನಿಮ್ಮ ಸಾಕ್ಷ್ಯವನ್ನು ಈ ಸಾಧನದಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿ ಉಳಿಸಬಹುದು.",

                online:
                    "ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕ ಲಭ್ಯವಿದೆ."

            }

        };


        return (
            translations[language] ||
            translations.en
        );

    },


    /* =========================================================================
       ACCESSIBILITY STYLES
       ========================================================================= */

    addStyles() {

        if (
            document.getElementById(
                "frAccessibilityStyles"
            )
        ) {

            return;

        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "frAccessibilityStyles";


        style.textContent = `

      /* =======================================================
         LARGE FARMER-FRIENDLY TOUCH TARGETS
         ======================================================= */

      button,
      .btn,
      select,
      input,
      textarea,
      .chip,
      .logout-link {

        min-height: 48px;

      }


      .camera-btn,
      #gpsBtn,
      #voiceBtn,
      #startVoiceRecordingBtn,
      #stopVoiceRecordingBtn,
      #submitEvidenceBtn {

        min-height: 56px;

      }


      /* =======================================================
         KEYBOARD FOCUS
         ======================================================= */

      button:focus-visible,
      a:focus-visible,
      input:focus-visible,
      textarea:focus-visible,
      select:focus-visible {

        outline: 4px solid #1f6f44;

        outline-offset: 3px;

      }


      /* =======================================================
         AUDIO INSTRUCTION BUTTON
         ======================================================= */

      .fr-audio-instruction {

        width: 100%;

        margin-top: 10px;

        min-height: 48px;

        display: flex;

        align-items: center;

        justify-content: center;

        gap: 8px;

        border: 1px dashed #8da99a;

        border-radius: 12px;

        background: #f6faf7;

        color: #285d3d;

        font-size: 14px;

        font-weight: 700;

        cursor: pointer;

      }


      .fr-audio-instruction:hover {

        background: #edf6ef;

      }


      /* =======================================================
         SKIP LINK
         ======================================================= */

      .fr-skip-link {

        position: fixed;

        left: 16px;

        top: -80px;

        z-index: 99999;

        padding: 12px 16px;

        border-radius: 8px;

        background: #173c29;

        color: white;

        text-decoration: none;

        font-weight: 700;

      }


      .fr-skip-link:focus {

        top: 16px;

      }


      /* =======================================================
         SCREEN READER ONLY
         ======================================================= */

      .fr-sr-only {

        position: absolute !important;

        width: 1px !important;

        height: 1px !important;

        padding: 0 !important;

        margin: -1px !important;

        overflow: hidden !important;

        clip: rect(0, 0, 0, 0) !important;

        white-space: nowrap !important;

        border: 0 !important;

      }


      /* =======================================================
         HIGH READABILITY
         ======================================================= */

      label {

        font-weight: 700;

      }


      .hint,
      .evidence-instruction {

        line-height: 1.6;

      }


      /* =======================================================
         REDUCED MOTION
         ======================================================= */

      @media (prefers-reduced-motion: reduce) {

        *,
        *::before,
        *::after {

          animation-duration: 0.01ms !important;

          animation-iteration-count: 1 !important;

          transition-duration: 0.01ms !important;

          scroll-behavior: auto !important;

        }

      }


      /* =======================================================
         MOBILE FARMER MODE
         ======================================================= */

      @media (max-width: 600px) {

        body {

          font-size: 16px;

        }


        button,
        .btn,
        select,
        input,
        textarea {

          font-size: 16px;

        }


        .chip {

          padding: 12px 15px;

        }


        .evidence-step {

          padding: 16px;

        }

      }

    `;


        document.head.appendChild(
            style
        );

    },


    /* =========================================================================
       LIVE REGION
       ========================================================================= */

    createLiveRegion() {

        if (
            document.getElementById(
                "frAccessibilityLiveRegion"
            )
        ) {

            this.liveRegion =
                document.getElementById(
                    "frAccessibilityLiveRegion"
                );


            return;

        }


        this.liveRegion =
            document.createElement(
                "div"
            );


        this.liveRegion.id =
            "frAccessibilityLiveRegion";


        this.liveRegion.className =
            "fr-sr-only";


        this.liveRegion.setAttribute(
            "aria-live",
            "polite"
        );


        this.liveRegion.setAttribute(
            "aria-atomic",
            "true"
        );


        document.body.appendChild(
            this.liveRegion
        );

    },


    announce(message) {

        if (
            !this.liveRegion
        ) {

            return;

        }


        this.liveRegion.textContent =
            "";


        setTimeout(
            () => {

                this.liveRegion.textContent =
                    message;

            },
            50
        );

    },


    /* =========================================================================
       SKIP LINK
       ========================================================================= */

    addSkipLink() {

        if (
            document.querySelector(
                ".fr-skip-link"
            )
        ) {

            return;

        }


        const main =
            document.querySelector(
                "main"
            );


        if (
            !main
        ) {

            return;

        }


        if (
            !main.id
        ) {

            main.id =
                "mainContent";

        }


        const skipLink =
            document.createElement(
                "a"
            );


        skipLink.href =
            `#${main.id}`;


        skipLink.className =
            "fr-skip-link";


        skipLink.textContent =
            "Skip to main content";


        document.body.insertBefore(
            skipLink,
            document.body.firstChild
        );

    },


    /* =========================================================================
       ARIA LABELS
       ========================================================================= */

    addAriaLabels() {

        const labels = {

            leafCaptureBtn:
                "Take affected leaf photograph",

            plantCaptureBtn:
                "Take whole plant photograph",

            fieldCaptureBtn:
                "Take wider field photograph",

            secondLocationCaptureBtn:
                "Take second location photograph",

            gpsBtn:
                "Capture current GPS location",

            voiceBtn:
                "Describe crop damage using speech to text",

            startVoiceRecordingBtn:
                "Start voice recording",

            stopVoiceRecordingBtn:
                "Stop voice recording",

            replaceVoiceRecordingBtn:
                "Record voice note again",

            deleteVoiceRecordingBtn:
                "Delete voice recording",

            submitEvidenceBtn:
                "Submit crop damage evidence",

            languageSelect:
                "Choose farmer language",

            cropSelect:
                "Choose crop type",

            descInput:
                "Describe crop damage"

        };


        Object.entries(
            labels
        ).forEach(
            ([id, label]) => {

                const element =
                    document.getElementById(
                        id
                    );


                if (
                    element
                ) {

                    element.setAttribute(
                        "aria-label",
                        label
                    );

                }

            }
        );


        document
            .querySelectorAll(
                ".retake-btn"
            )
            .forEach(
                (button) => {

                    button.setAttribute(
                        "aria-label",
                        "Retake this evidence photograph"
                    );

                }
            );

    },


    /* =========================================================================
       AUDIO SPEECH
       ========================================================================= */

    speak(text) {

        if (
            !("speechSynthesis" in window)
        ) {

            this.announce(
                "Audio instructions are not supported in this browser."
            );


            return;

        }


        window.speechSynthesis.cancel();


        const utterance =
            new SpeechSynthesisUtterance(
                text
            );


        utterance.lang =
            this.getSpeechLanguage();


        utterance.rate =
            0.9;


        utterance.pitch =
            1;


        this.speech =
            utterance;


        window.speechSynthesis.speak(
            utterance
        );

    },


    stopSpeaking() {

        if (
            "speechSynthesis" in window
        ) {

            window.speechSynthesis.cancel();

        }


        this.speech =
            null;

    },


    /* =========================================================================
       CREATE AUDIO INSTRUCTION BUTTON
       ========================================================================= */

    createAudioButton(
        target,
        instructionKey
    ) {

        if (
            !target ||
            target.querySelector(
                `.fr-audio-instruction[data-instruction="${instructionKey}"]`
            )
        ) {

            return;

        }


        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.className =
            "fr-audio-instruction";


        button.dataset.instruction =
            instructionKey;


        button.innerHTML =
            `🔊 <span>${this.getText().listen}</span>`;


        button.setAttribute(
            "aria-label",
            this.getText().listen
        );


        button.addEventListener(
            "click",
            () => {

                const instruction =
                    this.getText()[
                    instructionKey
                    ];


                this.speak(
                    instruction
                );


                this.announce(
                    instruction
                );

            }
        );


        target.appendChild(
            button
        );

    },


    /* =========================================================================
       ADD FARMER AUDIO INSTRUCTIONS
       ========================================================================= */

    addAudioInstructions() {

        this.createAudioButton(
            document.getElementById(
                "leafStep"
            ),
            "leaf"
        );


        this.createAudioButton(
            document.getElementById(
                "plantStep"
            ),
            "plant"
        );


        this.createAudioButton(
            document.getElementById(
                "fieldStep"
            ),
            "field"
        );


        this.createAudioButton(
            document.getElementById(
                "secondLocationStep"
            ),
            "second"
        );


        const locationField =
            document.getElementById(
                "locationField"
            );


        this.createAudioButton(
            locationField,
            "gps"
        );


        const voiceCard =
            document.querySelector(
                ".voice-card"
            );


        this.createAudioButton(
            voiceCard,
            "voice"
        );

    },


    /* =========================================================================
       UPDATE AUDIO BUTTON LANGUAGE
       ========================================================================= */

    refreshAudioButtons() {

        document
            .querySelectorAll(
                ".fr-audio-instruction"
            )
            .forEach(
                (button) => {

                    const span =
                        button.querySelector(
                            "span"
                        );


                    if (
                        span
                    ) {

                        span.textContent =
                            this.getText().listen;

                    }


                    button.setAttribute(
                        "aria-label",
                        this.getText().listen
                    );

                }
            );

    },


    /* =========================================================================
       OBSERVE NETWORK
       ========================================================================= */

    watchNetwork() {

        window.addEventListener(
            "offline",
            () => {

                this.announce(
                    this.getText().offline
                );

            }
        );


        window.addEventListener(
            "online",
            () => {

                this.announce(
                    this.getText().online
                );

            }
        );

    },


    /* =========================================================================
       OBSERVE FARMER ACTIONS
       ========================================================================= */

    watchFarmerActions() {

        const photoInputs = [

            "leafInput",

            "plantInput",

            "fieldInput",

            "secondLocationInput"

        ];


        photoInputs.forEach(
            (id) => {

                const input =
                    document.getElementById(
                        id
                    );


                if (
                    input
                ) {

                    input.addEventListener(
                        "change",
                        () => {

                            if (
                                input.files &&
                                input.files.length > 0
                            ) {

                                this.announce(
                                    this.getText()
                                        .photoCaptured
                                );

                            }

                        }
                    );

                }

            }
        );


        const gpsBtn =
            document.getElementById(
                "gpsBtn"
            );


        if (
            gpsBtn
        ) {

            gpsBtn.addEventListener(
                "click",
                () => {

                    setTimeout(
                        () => {

                            const gpsInfo =
                                document.getElementById(
                                    "gpsInfo"
                                );


                            if (
                                gpsInfo &&
                                gpsInfo.classList.contains(
                                    "visible"
                                )
                            ) {

                                this.announce(
                                    this.getText()
                                        .gpsCaptured
                                );

                            }

                        },
                        1500
                    );

                }
            );

        }

    },


    /* =========================================================================
       LANGUAGE CHANGE
       ========================================================================= */

    watchLanguageChange() {

        window.addEventListener(
            "fr-language-changed",
            () => {

                this.stopSpeaking();

                this.refreshAudioButtons();

            }
        );

    },


    /* =========================================================================
       INITIALIZE
       ========================================================================= */

    init() {

        this.addStyles();

        this.createLiveRegion();

        this.addSkipLink();

        this.addAriaLabels();

        this.addAudioInstructions();

        this.watchNetwork();

        this.watchFarmerActions();

        this.watchLanguageChange();


        this.announce(
            this.getText().ready
        );


        console.log(
            "Monika Role 3 accessibility system initialized."
        );

    }

};


/* ==========================================================================
   START AFTER PAGE IS READY
   ========================================================================== */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            FRAccessibility.init();

        }
    );

} else {

    FRAccessibility.init();

}