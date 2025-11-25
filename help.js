// Help page JavaScript for language toggle functionality

document.addEventListener('DOMContentLoaded', () => {
    const langButtons = Array.from(document.querySelectorAll('.help-page__lang-btn'));
    const sections = Array.from(document.querySelectorAll('.help-page__section'));

    let currentLanguage = 'english';

    // Try to load saved language preference from storage
    if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('helpLanguage', (stored) => {
            if (chrome.runtime.lastError) {
                return;
            }
            const savedLang = stored && stored.helpLanguage;
            if (savedLang === 'persian' || savedLang === 'english') {
                setLanguage(savedLang);
            }
        });
    }

    // Set up language toggle buttons
    langButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const lang = button.dataset.lang;
            if (lang && lang !== currentLanguage) {
                setLanguage(lang);
                // Save preference
                if (chrome && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.set({ helpLanguage: lang });
                }
            }
        });
    });

    function setLanguage(language) {
        if (!['english', 'persian'].includes(language)) {
            language = 'english';
        }

        currentLanguage = language;

        // Update buttons
        langButtons.forEach((button) => {
            const isActive = button.dataset.lang === language;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-selected', String(isActive));
            if (isActive) {
                button.removeAttribute('tabindex');
            } else {
                button.setAttribute('tabindex', '-1');
            }
        });

        // Update sections
        sections.forEach((section) => {
            const isActive = section.dataset.lang === language;
            section.classList.toggle('is-active', isActive);
            if (isActive) {
                section.removeAttribute('hidden');
            } else {
                section.setAttribute('hidden', 'true');
            }
        });
    }
});
