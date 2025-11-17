// Import the Supabase client
import { supabase } from './supabase-client.js';

// --- DOM Elements ---
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginButton = document.getElementById('login-button');
const signupButton = document.getElementById('signup-button');
const authMessage = document.getElementById('auth-message');

// --- Helper Functions ---

/**
 * Shows an error message to the user.
 * @param {string} message The error message to display.
 */
function showMessage(message, isError = true) {
    authMessage.textContent = message;
    authMessage.className = isError ? 'text-red-500 text-sm text-center mb-4 h-5' : 'text-green-500 text-sm text-center mb-4 h-5';
}

/**
 * Toggles the loading state of a button.
 * @param {HTMLButtonElement} button The button element.
 * @param {boolean} isLoading Whether to show the loading state.
 */
function setLoading(button, isLoading) {
    const btnText = button.querySelector('.btn-text');
    const loader = button.querySelector('i');
    
    if (isLoading) {
        button.disabled = true;
        btnText.classList.add('hidden');
        loader.classList.remove('hidden');
    } else {
        button.disabled = false;
        btnText.classList.remove('hidden');
        loader.classList.add('hidden');
    }
}

// --- Auth Logic ---

/**
 * Handles the login form submission.
 */
async function handleLogin(event) {
    event.preventDefault();
    setLoading(loginButton, true);
    showMessage('', false); // Clear previous messages

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        showMessage(error.message);
    } else if (data.session) {
        // Login successful, redirect to the main app
        window.location.href = 'index.html';
    }
    setLoading(loginButton, false);
}

/**
 * Handles the sign-up form submission.
 */
async function handleSignUp(event) {
    event.preventDefault();
    setLoading(signupButton, true);
    showMessage('', false); // Clear previous messages

    // Get form data
    const fullName = document.getElementById('signup-name').value;
    const studentId = document.getElementById('signup-studentid').value;
    const course = document.getElementById('signup-course').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    // Based on your SQL schema, we pass user metadata
    // to populate the public.users table on signup.
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                full_name: fullName,
                student_id: studentId,
                course: course,
                email: email // Storing email in users table as well
            }
        }
    });

    if (error) {
        showMessage(error.message);
    } else if (data.user) {
        // Check if email confirmation is required
        if (data.user.identities && data.user.identities.length === 0) {
             showMessage("Signup failed. User might already exist.", true);
        } else {
             showMessage("Signup successful! Please check your email to confirm.", false);
             // Optionally, log them in directly if email confirmation is off
             // window.location.href = 'index.html'; 
        }
    }
    setLoading(signupButton, false);
}

/**
 * Checks if a user is already logged in.
 * If so, redirects them to the main app.
 */
async function checkUserSession() {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
        // User is already logged in, redirect to index.html
        window.location.href = 'index.html';
    }
    // If no session, do nothing, let them log in.
}

// --- Event Listeners ---
loginForm.addEventListener('submit', handleLogin);
signupForm.addEventListener('submit', handleSignUp);

// Check for existing session on page load
checkUserSession();
