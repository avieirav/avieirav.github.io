(function() {
    const THEME_KEY = 'theme-preference';
    const TRANSITION_DURATION = 300;

    // Available themes organized by type
    const THEMES = {
        light: [
            { id: 'light', label: 'Light' },
            { id: 'solarized-light', label: 'Solarized' }
        ],
        dark: [
            { id: 'dark', label: 'Dark' },
            { id: 'solarized-dark', label: 'Solarized' }
        ]
    };

    function getPreferredTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved) return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function setTheme(themeId, closeDropdown = true) {
        document.documentElement.setAttribute('data-theme', themeId);
        localStorage.setItem(THEME_KEY, themeId);
        updateIcons(themeId);
        updateActiveState(themeId);
        if (closeDropdown) {
            closeDropdownMenu();
        }
    }

    function updateIcons(themeId) {
        const isDark = themeId === 'dark' || themeId === 'solarized-dark';
        document.querySelectorAll('.theme-toggle .theme-icon').forEach(function(icon) {
            if (isDark) {
                icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
            } else {
                icon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
            }
        });
    }

    function updateActiveState(themeId) {
        document.querySelectorAll('.theme-option').forEach(function(opt) {
            opt.classList.remove('active');
            if (opt.dataset.theme === themeId) {
                opt.classList.add('active');
            }
        });
    }

    function toggleDropdown(e) {
        e.stopPropagation();
        const dropdown = document.querySelector('.theme-dropdown');
        const isOpen = dropdown.classList.contains('open');
        if (isOpen) {
            closeDropdownMenu();
        } else {
            dropdown.classList.add('open');
        }
    }

    function closeDropdownMenu() {
        document.querySelectorAll('.theme-dropdown').forEach(function(d) {
            d.classList.remove('open');
        });
    }

    // Execute immediately - apply theme
    const initialTheme = getPreferredTheme();
    document.documentElement.setAttribute('data-theme', initialTheme);

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        updateIcons(initialTheme);
        updateActiveState(initialTheme);

        // Theme toggle button click
        document.querySelectorAll('.theme-toggle').forEach(function(button) {
            button.addEventListener('click', toggleDropdown);
        });

        // Theme option clicks
        document.querySelectorAll('.theme-option').forEach(function(option) {
            option.addEventListener('click', function(e) {
                e.stopPropagation();
                const themeId = this.dataset.theme;
                setTheme(themeId, true);
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.theme-toggle')) {
                closeDropdownMenu();
            }
        });

        // Close on escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeDropdownMenu();
            }
        });
    }

    // Expose for manual theme selection if needed
    window.setTheme = setTheme;
    window.THEMES = THEMES;
})();