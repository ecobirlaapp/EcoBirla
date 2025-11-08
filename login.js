// login.js

// Import the shared Supabase client
import { supabase } from './supabase-client.js';

// --- DOM Elements ---
const loginForm = document.getElementById('login-form');
const loginButton = document.getElementById('login-button');
const errorMessage = document.getElementById('error-message');
const studentIdInput = document.getElementById('student-id');
const passwordInput = document.getElementById('password');

// --- 1. Check if user is already logged in ---
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        // User is already logged in, redirect to the app
        window.location.href = 'index.html';
    }
}
// Run the check on page load
checkAuth();


// --- 2. Handle Login Form Submission ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent the form from submitting normally
    
    setLoading(true);
    hideError(); // Hide old errors
    
    const studentId = studentIdInput.value.trim();
    const password = passwordInput.value;

    try {
        // --- THIS IS THE UPDATED LOGIC ---
        
        // Step 1: Securely call the RPC function to get the email.
        const { data: userEmail, error: rpcError } = await supabase
            .rpc('get_email_for_student_id', {
                p_student_id: studentId
            });

        if (rpcError) {
            // A database-level error occurred
            throw new Error(rpcError.message);
        }

        if (!userEmail) {
            // The function ran but returned null (no student found)
            throw new Error("Invalid Student ID.");
        }
        
        // --- END OF UPDATED LOGIC ---

        // Step 2: Use the found email to log the user in with Supabase Auth.
        const { error: loginError } = await supabase.auth.signInWithPassword({
            email: userEmail,
            password: password,
        });

        if (loginError) {
            // Check for specific auth error
            if (loginError.message === "Invalid login credentials") {
                throw new Error("Invalid Student ID or Password.");
            }
            throw loginError;
        }

        // Step 3: Login successful, redirect to the main app
        window.location.href = 'index.html';

    } catch (error) {
        showError(error.message);
        setLoading(false);
    }
});

function setLoading(isLoading) {
    if (isLoading) {
        loginButton.disabled = true;
        loginButton.textContent = 'Logging in...';
    } else {
        loginButton.disabled = false;
        loginButton.textContent = 'Login';
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
    errorMessage.textContent = '';
}
