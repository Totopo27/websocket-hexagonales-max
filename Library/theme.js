// Library/theme.js - Sistema de tema oscuro/claro

document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;

    // Function to update button text
    const updateButtonText = () => {
        if (body.classList.contains('light-mode')) {
            themeToggleBtn.textContent = 'Modo: Claro';
        } else {
            themeToggleBtn.textContent = 'Modo: Oscuro';
        }
    };

    // Check for saved user preference, if any, on load of the website
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        body.classList.add('light-mode');
    }

    // Initialize text
    if (themeToggleBtn) {
        updateButtonText();

        themeToggleBtn.addEventListener('click', () => {
            body.classList.toggle('light-mode');
            updateButtonText();

            // Save the current preference to localStorage
            if (body.classList.contains('light-mode')) {
                localStorage.setItem('theme', 'light');
            } else {
                localStorage.setItem('theme', 'dark');
            }
        });
    }
});
