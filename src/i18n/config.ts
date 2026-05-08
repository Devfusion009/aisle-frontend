'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ptTranslation from './locales/pt.json';
import enTranslation from './locales/en.json';

const resources = {
    pt: {
        translation: ptTranslation,
    },
    en: {
        translation: enTranslation,
    },
};

if (!i18n.isInitialized) {
    i18n
        .use(initReactI18next)
        .init({
            resources,
            lng: 'pt', // Force pt for SSR to prevent hydration mismatch
            fallbackLng: 'pt',
            supportedLngs: ['pt', 'en'],

            interpolation: {
                escapeValue: false,
            },
        });
} else {
    // Module was re-evaluated (HMR in development).
    // Re-merge the resource bundles so newly added / edited translation keys
    // become visible without needing a full server restart.
    // (deep=true so nested objects merge; overwrite=true so edits replace stale values.)
    i18n.addResourceBundle('pt', 'translation', ptTranslation, true, true);
    i18n.addResourceBundle('en', 'translation', enTranslation, true, true);
    // Reset to 'pt' so the initial client render matches SSR, preventing
    // hydration mismatches. I18nProvider's useEffect will apply the user's
    // stored language preference after hydration.
    i18n.changeLanguage('pt');
}

export default i18n;
