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
    
    const studentId = studentIdInput.value.trim();
    const password = passwordInput.value;

    try {
        // --- This is the key logic ---
        // Step 1: Look up the student's email using their Student ID.
        // This query works because RLS is NOT enabled for 'SELECT' on public tables,
        // or you have a public read policy.
        
        // ** IMPORTANT **: If you restricted read access on `students`,
        // you must create an RPC function for this.
        const { data: student, error: idError } = await supabase
            .from('students')
            .select('email')
            .eq('student_id', studentId)
            .single();

        if (idError || !student) {
            throw new Error("Invalid Student ID.");
        }

        // Step 2: Use the found email to log the user in with Supabase Auth.
        const { error: loginError } = await supabase.auth.signInWithPassword({
            email: student.email,
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
