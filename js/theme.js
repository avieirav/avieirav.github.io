(function() {
    const THEME_KEY = 'theme-preference';
    const TRANSITION_DURATION = 600;
    
    function getPreferredTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved) return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
        updateIcons(theme);
    }
    
    function updateIcons(theme) {
        document.querySelectorAll('.theme-toggle .sun-icon').forEach(function(icon) {
            icon.style.display = theme === 'dark' ? 'block' : 'none';
        });
        document.querySelectorAll('.theme-toggle .moon-icon').forEach(function(icon) {
            icon.style.display = theme === 'light' ? 'block' : 'none';
        });
    }
    
    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const newTheme = current === 'dark' ? 'light' : 'dark';
        
        document.body.classList.add('theme-changing');
        setTheme(newTheme);
        
        setTimeout(function() {
            document.body.classList.remove('theme-changing');
        }, TRANSITION_DURATION);
    }
    
    // Ejecutar inmediatamente - aplicar tema
    setTheme(getPreferredTheme());
    
    // Esperar a que el DOM esté listo para los event listeners
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('.theme-toggle').forEach(function(button) {
                button.addEventListener('click', toggleTheme);
            });
        });
    } else {
        document.querySelectorAll('.theme-toggle').forEach(function(button) {
            button.addEventListener('click', toggleTheme);
        });
    }
    
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
        if (!localStorage.getItem(THEME_KEY)) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.body.classList.add('theme-changing');
            setTheme(newTheme);
            setTimeout(function() {
                document.body.classList.remove('theme-changing');
            }, TRANSITION_DURATION);
        }
    });
})();
