document.addEventListener('DOMContentLoaded', () => {
    // If already logged in, redirect
    if (localStorage.getItem('auth_token') === 'true') {
        window.location.href = 'index.html';
    }

    const loginForm = document.getElementById('loginForm');
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const user = document.getElementById('username').value.trim();
        const pass = document.getElementById('password').value.trim();
        const errorEl = document.getElementById('loginError');

        if (user === '' || pass === '') {
            errorEl.textContent = 'Please enter both username and password.';
            return;
        }

        // For demo purposes, we accept any non-empty credentials.
        // In a real application, this would verify against a backend.
        
        // Add a slight delay to simulate authentication process
        const btn = document.querySelector('.login-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
        btn.style.pointerEvents = 'none';

        setTimeout(() => {
            localStorage.setItem('auth_token', 'true');
            window.location.href = 'index.html';
        }, 800);
    });
});
