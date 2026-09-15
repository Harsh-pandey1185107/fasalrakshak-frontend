// FasalRakshak AI
// Monika Role 3 — Multilingual System

const FR_I18N = {
    defaultLanguage: "en",

    supportedLanguages: {
        en: "English",
        hi: "हिन्दी",
        mr: "मराठी",
        kn: "ಕನ್ನಡ"
    },

    getLanguage() {
        const savedLanguage = localStorage.getItem("fr_language");

        if (
            savedLanguage &&
            this.supportedLanguages[savedLanguage]
        ) {
            return savedLanguage;
        }

        return this.defaultLanguage;
    },

    setLanguage(languageCode) {
        if (!this.supportedLanguages[languageCode]) {
            console.warn("Unsupported language:", languageCode);
            return;
        }

        localStorage.setItem("fr_language", languageCode);

        document.documentElement.lang = languageCode;

        this.applyTranslations();

        window.dispatchEvent(
            new CustomEvent("fr-language-changed", {
                detail: {
                    language: languageCode
                }
            })
        );
    },

    translate(key) {
        const language = this.getLanguage();

        const translations =
            window.FR_TRANSLATIONS || {};

        // Selected language
        if (
            translations[language] &&
            translations[language][key]
        ) {
            return translations[language][key];
        }

        // English fallback
        if (
            translations.en &&
            translations.en[key]
        ) {
            return translations.en[key];
        }

        // If translation key is missing
        return key;
    },

    applyTranslations() {
        const language = this.getLanguage();

        document.documentElement.lang = language;

        // Translate normal text
        document
            .querySelectorAll("[data-i18n]")
            .forEach((element) => {
                const key = element.getAttribute("data-i18n");

                element.textContent = this.translate(key);
            });

        // Translate placeholders
        document
            .querySelectorAll("[data-i18n-placeholder]")
            .forEach((element) => {
                const key =
                    element.getAttribute(
                        "data-i18n-placeholder"
                    );

                element.placeholder =
                    this.translate(key);
            });

        // Update language selector if present
        const languageSelector =
            document.getElementById("languageSelect");

        if (languageSelector) {
            languageSelector.value = language;
        }
    },

    init() {
        const language = this.getLanguage();

        document.documentElement.lang = language;

        this.applyTranslations();

        console.log(
            `FasalRakshak language initialized: ${language}`
        );
    }
};