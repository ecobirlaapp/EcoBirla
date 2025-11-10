// app.js

// Import the shared Supabase client
import { supabase } from './supabase-client.js';

// --- Global App State ---
let appState = {
    currentUser: null,
    leaderboard: [],
    history: [],
    dailyChallenges: [],
    events: [],
    eventRsvps: [],
    stores: [],
    products: [],
    userRewards: [],
    levels: [],
};

// --- Cloudinary Config ---
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dnia8lb2q/image/upload';
const CLOUDINARY_PRESET = 'EcoBirla_avatars';

const CHECK_IN_REWARD = 10;

// --- DOM Elements ---
const mainContent = document.querySelector('.main-content');
const appLoading = document.getElementById('app-loading');
const pages = document.querySelectorAll('.page');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const sidebarNavItems = document.querySelectorAll('.sidebar-nav-item');
const navItems = document.querySelectorAll('.nav-item'); 
const logoutButton = document.getElementById('logout-button');

const userPointsHeader = document.getElementById('user-points-header');
const userNameGreeting = document.getElementById('user-name-greeting');

const userAvatarSidebar = document.getElementById('user-avatar-sidebar');
const userNameSidebar = document.getElementById('user-name-sidebar');
const userPointsSidebar = document.getElementById('user-points-sidebar');
const userLevelSidebar = document.getElementById('user-level-sidebar');

const checkInCard = document.getElementById('daily-check-in-card');

const dashboardEventCard = document.getElementById('dashboard-event-card');
const impactCo2 = document.getElementById('impact-co2');
const impactRecycled = document.getElementById('impact-recycled');
const impactEvents = document.getElementById('impact-events');

const eventList = document.getElementById('event-list');
const storeListPreview = document.getElementById('store-list-preview'); 
const storeDetailPage = document.getElementById('store-detail-page'); 
const productDetailPage = document.getElementById('product-detail-page'); 
const historyList = document.getElementById('history-list');
const leaderboardDashboardList = document.getElementById('leaderboard-dashboard-list');
const leaderboardPageList = document.getElementById('leaderboard-page-list');

const challengesPageList = document.getElementById('challenges-page-list');
const challengesDashboardList = document.getElementById('challenges-dashboard-list');

const profileAvatar = document.getElementById('profile-avatar');
const profileName = document.getElementById('profile-name');
const profileEmail = document.getElementById('profile-email');
const profileJoined = document.getElementById('profile-joined');
const profileLevelTitle = document.getElementById('profile-level-title');
const profileLevelNumber = document.getElementById('profile-level-number');
const profileLevelProgress = document.getElementById('profile-level-progress');
const profileLevelNext = document.getElementById('profile-level-next');
const profileStudentId = document.getElementById('profile-student-id');
const profileCourse = document.getElementById('profile-course');
const profileMobile = document.getElementById('profile-mobile');
const profileEmailPersonal = document.getElementById('profile-email-personal');
const profileMembership = document.getElementById('profile-membership');
const profilePicUpload = document.getElementById('profile-pic-upload');
const profilePicLoader = document.getElementById('profile-pic-loader');
const profilePicError = document.getElementById('profile-pic-error');

const ecopointsBalance = document.getElementById('ecopoints-balance'); 
const ecopointsLevelTitle = document.getElementById('ecopoints-level-title'); 
const ecopointsLevelNumber = document.getElementById('ecopoints-level-number'); 
const ecopointsLevelProgress = document.getElementById('ecopoints-level-progress'); 
const ecopointsLevelNext = document.getElementById('ecopoints-level-next'); 
const ecopointsRecentActivity = document.getElementById('ecopoints-recent-activity'); 
const levelLineProgress = document.getElementById('level-line-progress'); 

const purchaseModalOverlay = document.getElementById('purchase-modal-overlay');
const purchaseModal = document.getElementById('purchase-modal');
const qrModalOverlay = document.getElementById('qr-modal-overlay');
const qrModal = document.getElementById('qr-modal');

const allRewardsList = document.getElementById('all-rewards-list');

const changePasswordForm = document.getElementById('change-password-form');
const changePasswordButton = document.getElementById('change-password-button');
const passwordMessage = document.getElementById('password-message');

// Theme Toggle Elements
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIcon = document.getElementById('theme-icon');
const themeText = document.getElementById('theme-text');

// --- Helper Functions ---

// --- ADD THIS NEW FUNCTION ---
const getTodayDateString = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // getMonth() is 0-indexed
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`; // Returns local date, e.g., "2025-11-10"
};

/**
 * Activity Logging Function
 * Logs user interactions to the 'activity_log' table without waiting.
 */
async function logActivity(activity_type, details = {}) {
    try {
        if (!appState.currentUser) return; // Don't log if user isn't loaded

        // We don't await this, so it runs in the background
        // and doesn't slow down the UI.
        supabase
            .from('activity_log')
            .insert({
                student_id: appState.currentUser.student_id,
                activity_type,
                details
            })
            .then(({ error }) => {
                if (error) {
                    console.warn("Error logging activity:", error.message);
                }
            });
        
    } catch (err) {
        console.warn("Failed to log activity:", err);
    }
}

const getRewardDetails = (userReward) => {
     if (!userReward) return null;
    const product = appState.products.find(p => p.id === userReward.product_id);
    if (!product) return null;
    const store = appState.stores.find(s => s.id === product.store_id);
    if (!store) return null;
    
    return {
        ...product, 
        storeName: store.name,
        storeLogo: store.logo_url,
        userRewardId: userReward.id,
        purchaseDate: userReward.purchase_date,
        status: userReward.status,
        usedDate: userReward.used_date
    };
};

const getProduct = (storeId, productId) => {
    const store = appState.stores.find(s => s.id === storeId);
    if (!store) return { store: null, product: null };
    const product = appState.products.find(p => p.id === productId && p.store_id === storeId);
    return { store, product };
}

const getUserLevel = (points) => {
    if (!appState.levels || appState.levels.length === 0) {
        return { level: 1, title: 'Loading...', progress: 0, progressText: '...', color: 'text-gray-600 dark:text-gray-400', progressBg: 'bg-gray-500' };
    }
    
    let currentLevel = appState.levels[0];
    for (let i = appState.levels.length - 1; i >= 0; i--) {
        if (points >= appState.levels[i].min_points) {
            currentLevel = appState.levels[i];
            break;
        }
    }
    
    const nextLevel = appState.levels.find(l => l.level_number === currentLevel.level_number + 1);

    const levelInfo = {
        color: 'text-green-600 dark:text-green-400',
        progressBg: 'bg-green-500'
    };

    if (nextLevel) {
        const pointsInLevel = points - currentLevel.min_points;
        const pointsForLevel = nextLevel.min_points - currentLevel.min_points;
        const progress = Math.max(0, Math.min(100, (pointsInLevel / pointsForLevel) * 100));
        return {
            ...levelInfo,
            level: currentLevel.level_number,
            title: currentLevel.title,
            progress: progress,
            progressText: `${points} / ${nextLevel.min_points} Pts`
        };
    } else {
        return {
            ...levelInfo,
            level: currentLevel.level_number,
            title: currentLevel.title,
            progress: 100,
            progressText: `${points} Pts (Max Level)`
        };
    }
};

// --- Data Fetching Functions ---

async function fetchUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('auth_id', user.id)
        .single();
    if (error) console.error("Error fetching student profile:", error.message);
    else appState.currentUser = data;
}

async function fetchLeaderboard() {
    
    // MODIFIED: We now call the 'get_leaderboard' RPC function
    const { data, error } = await supabase
        .rpc('get_leaderboard'); 
        
    if (error) console.error("Error fetching leaderboard:", error.message);
    else appState.leaderboard = data;
}

async function fetchHistory() {
    if (!appState.currentUser) return;
    const { data, error } = await supabase
        .from('points_history')
        .select('*')
        .eq('student_id', appState.currentUser.student_id) // Fetch only current user's history
        .order('created_at', { ascending: false });
    if (error) console.error("Error fetching history:", error.message);
    else appState.history = data;
}

async function fetchChallenges() {
    if (!appState.currentUser) return;
    const { data: challenges, error: chalError } = await supabase.from('challenges').select('*');
    if (chalError) {
        console.error("Error fetching challenges:", chalError.message);
        return;
    }
    const today = getTodayDateString();
    const { data: completions, error: compError } = await supabase
        .from('challenge_completions')
        .select('challenge_id')
        .eq('student_id', appState.currentUser.student_id)
        .eq('completed_at', today);
    if (compError) console.error("Error fetching completions:", compError.message);
    const completedIds = completions ? completions.map(c => c.challenge_id) : [];
    appState.dailyChallenges = challenges.map(challenge => ({
        ...challenge,
        status: completedIds.includes(challenge.id) ? 'completed' : 'active'
    }));
}

async function fetchEventsAndRSVPs() {
    if (!appState.currentUser) return;
    // MODIFICATION: Fetch only upcoming events
    const today = new Date().toISOString();
    
    const [eventsResult, rsvpsResult] = await Promise.all([
        supabase.from('events').select('*')
            .gte('event_date', today) // Only get events from today onwards
            .order('event_date', { ascending: true }),
        supabase.from('event_rsvps').select('*').eq('student_id', appState.currentUser.student_id)
    ]);
    if (eventsResult.error) console.error("Error fetching events:", eventsResult.error.message);
    else appState.events = eventsResult.data;
    if (rsvpsResult.error) console.error("Error fetching RSVPs:", rsvpsResult.error.message);
    else appState.eventRsvps = rsvpsResult.data;
}

async function fetchStoresAndProducts() {
    const [storesResult, productsResult] = await Promise.all([
        supabase.from('stores').select('*'),
        supabase.from('products').select('*')
    ]);
    if (storesResult.error) console.error("Error fetching stores:", storesResult.error.message);
    else appState.stores = storesResult.data;
    if (productsResult.error) console.error("Error fetching products:", productsResult.error.message);
    else appState.products = productsResult.data;
}

async function fetchUserRewards() {
    if (!appState.currentUser) return;
    const { data, error } = await supabase
        .from('user_rewards')
        .select('*')
        .eq('student_id', appState.currentUser.student_id) // Fetch only current user's rewards
        .order('purchase_date', { ascending: false });
    if (error) console.error("Error fetching user rewards:", error.message);
    else appState.userRewards = data;
}

async function fetchLevels() {
    const { data, error } = await supabase
        .from('levels')
        .select('*')
        .order('level_number', { ascending: true });
    if (error) console.error("Error fetching levels:", error.message);
    else appState.levels = data;
}

// --- Render Functions (Read from `appState`) ---

const renderHeader = () => {
    const user = appState.currentUser;
    if (!user) return;
    const levelInfo = getUserLevel(user.lifetime_points); 
    userPointsHeader.textContent = user.current_points;
    userNameGreeting.textContent = user.name;
    userAvatarSidebar.src = user.avatar_url || 'https://placehold.co/80x80/gray/white?text=User';
    userNameSidebar.textContent = user.name;
    userPointsSidebar.textContent = user.current_points;
    userLevelSidebar.textContent = `Lv. ${levelInfo.level}: ${levelInfo.title}`;
    userLevelSidebar.className = `text-sm font-medium ${levelInfo.color || 'text-gray-600 dark:text-gray-400'} mb-1`;
};

const renderCheckInCard = () => {
    const user = appState.currentUser;
    if (!user) return;
    const today = getTodayDateString();
    
    if (user.last_check_in_date === today) {
        checkInCard.className = "bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800 p-5 rounded-xl mb-6 flex items-center justify-between";
        checkInCard.innerHTML = `
            <div>
                <h3 class="text-lg font-bold text-green-800 dark:text-green-200">Daily Check-in</h3>
                <p class="text-sm text-green-700 dark:text-green-300">You've already checked in today!</p>
            </div>
            <div class="bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 font-bold py-2 px-4 rounded-lg flex items-center space-x-2 whitespace-nowrap">
                <i data-lucide="check" class="w-5 h-5"></i>
                <span>Checked-in</span>
            </div>
        `;
    } else {
        checkInCard.className = "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 rounded-xl mb-6 flex items-center justify-between shadow-sm";
        checkInCard.innerHTML = `
            <div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">Daily Check-in</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">Earn +${CHECK_IN_REWARD} points for checking in!</p>
            </div>
            <button onclick="performCheckIn()" class="bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 whitespace-nowrap hover:bg-green-700 transition-colors">
                <i data-lucide="log-in" class="w-5 h-5"></i>
                <span>Check-in</span>
            </button>
        `;
    }
    lucide.createIcons();
};

// --- MODIFIED: renderDashboard (calculates stats, shows event) ---
const renderDashboard = () => {
    const user = appState.currentUser;
    if (!user) return;

    // 1. Render Greeting
    userNameGreeting.textContent = user.name;

    // 2. Render Dynamic Event Card
    const now = new Date();
    // MODIFICATION: Logic is already correct, finds first event in the future
    const upcomingEvent = appState.events.find(e => new Date(e.event_date) > now);
    
    dashboardEventCard.innerHTML = '';
    if (upcomingEvent) {
        dashboardEventCard.innerHTML = `
            <div class="bg-gradient-to-r from-green-500 to-teal-500 text-white p-5 rounded-xl mb-6 shadow-lg">
                <div class="flex items-center mb-2">
                    <i data-lucide="calendar-check" class="w-5 h-5 mr-2"></i>
                    <h3 class="font-bold">Upcoming Event</h3>
                </div>
                <p class="text-lg font-semibold mb-1">${upcomingEvent.title}</p>
                <p class="text-sm opacity-90 mb-3">${upcomingEvent.description}</p>
                <button onclick="showPage('events')" class="bg-white text-green-600 font-bold py-2 px-4 rounded-full text-sm hover:bg-green-50 transition-all">View Details</button>
            </div>
        `;
    } else {
        dashboardEventCard.innerHTML = `
            <div class="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-5 rounded-xl mb-6 shadow-sm">
                <div class="flex items-center mb-2">
                    <i data-lucide="calendar-off" class="w-5 h-5 mr-2"></i>
                    <h3 class="font-bold">No Upcoming Events</h3>
                </div>
                <p class="text-sm opacity-90">Check back later for more events!</p>
            </div>
        `;
    }
    
    // 3. Render Impact Stats
    // MODIFICATION: Remove decimal from CO2
    const co2Saved = Math.round(user.lifetime_points * 0.6);
    // MODIFICATION: Count "Submitted"
    const recycledCount = appState.history.filter(item => item.description.toLowerCase().includes('submitted')).length;
    // MODIFICATION: Count "Attended"
    const eventsCount = appState.history.filter(item => item.description.toLowerCase().includes('attended')).length;
    
    impactCo2.textContent = `${co2Saved} kg`;
    impactRecycled.textContent = recycledCount;
    impactEvents.textContent = eventsCount;
    
    // 4. Render other dashboard components
    renderCheckInCard();
    renderLeaderboardDashboard();
    renderChallengesDashboard();
    
    lucide.createIcons();
};


const renderLeaderboardDashboard = () => {
    leaderboardDashboardList.innerHTML = '';
    const sortedLeaderboard = appState.leaderboard;
    
    if (!sortedLeaderboard || sortedLeaderboard.length === 0) {
        leaderboardDashboardList.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 text-sm p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">Leaderboard is empty.</p>`;
        return;
    }
    
    sortedLeaderboard.slice(0, 3).forEach((user, index) => {
        const rank = index + 1;
        let rankBadge = '';
        if (rank === 1) rankBadge = `<i data-lucide="award" class="w-6 h-6 text-yellow-500"></i>`;
        else if (rank === 2) rankBadge = `<i data-lucide="award" class="w-6 h-6 text-gray-400"></i>`;
        else if (rank === 3) rankBadge = `<i data-lucide="award" class="w-6 h-6 text-yellow-700"></i>`;
        
        const isCurrentUser = user.student_id === appState.currentUser.student_id;
        const isCurrentUserClass = isCurrentUser ? 'bg-green-100 dark:bg-green-900/50 border-l-4 border-green-500' : 'bg-white dark:bg-gray-800';
        
        // MODIFICATION: Add (You) after name
        const displayName = isCurrentUser ? `${user.name} (You)` : user.name;
        
        leaderboardDashboardList.innerHTML += `
            <div class="flex items-center ${isCurrentUserClass} p-4 rounded-xl shadow-sm">
                <div class="w-8 flex justify-center items-center mr-3">${rankBadge}</div>
                <img src="${user.avatar_url || 'https://placehold.co/40x40/gray/white?text=User'}" class="w-10 h-10 rounded-full mr-3" alt="${user.name}">
                <p class="font-semibold text-gray-700 dark:text-gray-200">${displayName}</p>
                <p class="ml-auto font-bold text-gray-600 dark:text-gray-300">${user.lifetime_points} Pts</p>
            </div>
        `;
    });
    lucide.createIcons();
};

const renderLeaderboardPage = () => {
    leaderboardPageList.innerHTML = '';
    const sortedLeaderboard = appState.leaderboard;
    
    if (!sortedLeaderboard || sortedLeaderboard.length === 0) {
        leaderboardPageList.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 text-sm p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">Leaderboard is empty.</p>`;
        return;
    }
    
    sortedLeaderboard.forEach((user, index) => {
        const rank = index + 1;
        let rankBadge = `<span class="font-bold text-gray-500 dark:text-gray-400 w-6 text-center">${rank}.</span>`;
        if (rank === 1) rankBadge = `<i data-lucide="award" class="w-6 h-6 text-yellow-500"></i>`;
        else if (rank === 2) rankBadge = `<i data-lucide="award" class="w-6 h-6 text-gray-400"></i>`;
        else if (rank === 3) rankBadge = `<i data-lucide="award" class="w-6 h-6 text-yellow-700"></i>`;
        
        const isCurrentUser = user.student_id === appState.currentUser.student_id;
        const isCurrentUserClass = isCurrentUser ? 'bg-green-100 dark:bg-green-900/50 border-2 border-green-500' : 'bg-white dark:bg-gray-800';
        
        // MODIFICATION: Add (You) after name
        const displayName = isCurrentUser ? `${user.name} (You)` : user.name;

        leaderboardPageList.innerHTML += `
            <div class="flex items-center ${isCurrentUserClass} p-4 rounded-xl shadow-sm">
                <div class="w-8 flex justify-center items-center mr-3">${rankBadge}</div>
                <img src="${user.avatar_url || 'https://placehold.co/40x40/gray/white?text=User'}" class="w-10 h-10 rounded-full mr-3" alt="${user.name}">
                <p class="font-semibold text-gray-700 dark:text-gray-200">${displayName}</p>
                <p class="ml-auto font-bold text-gray-600 dark:text-gray-300">${user.lifetime_points} Pts</p>
            </div>
        `;
    });
    lucide.createIcons();
};

const renderChallengeCard = (challenge) => {
    let buttonHTML = '';
    if (challenge.status === 'active') {
        buttonHTML = `<button onclick="completeChallenge('${challenge.id}')" class="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-green-700 transition-colors">Complete</button>`;
    } else {
        buttonHTML = `<button class="w-full bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 font-bold py-2 px-4 rounded-lg text-sm cursor-not-allowed flex items-center justify-center space-x-2" disabled>
                        <i data-lucide="check" class="w-5 h-5"></i>
                        <span>Completed</span>
                    </button>`;
    }

    return `
        <div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
            <div class="flex items-start">
                <div class="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg mr-4">
                    <i data-lucide="${challenge.icon || 'award'}" class="w-6 h-6 text-yellow-600 dark:text-yellow-400"></i>
                </div>
                <div class="flex-grow">
                    <h3 class="font-bold text-gray-800 dark:text-gray-100 text-lg">${challenge.title}</h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">${challenge.description}</p>
                    <p class="text-sm font-bold text-green-600 dark:text-green-400 mb-3">+${challenge.points_reward} EcoPoints</p>
                    ${buttonHTML}
                </div>
            </div>
        </div>
    `;
};

const renderChallengesPage = () => {
    challengesPageList.innerHTML = '';
    const challenges = appState.dailyChallenges;
    
    if(!challenges || challenges.length === 0) {
        challengesPageList.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400">No challenges available today. Check back tomorrow!</p>`;
        return;
    }

    challenges.forEach(challenge => {
        challengesPageList.innerHTML += renderChallengeCard(challenge);
    });
    lucide.createIcons();
};

const renderChallengesDashboard = () => {
    challengesDashboardList.innerHTML = '';
    const activeChallenges = appState.dailyChallenges.filter(c => c.status === 'active').slice(0, 2);

    if (activeChallenges.length === 0) {
        challengesDashboardList.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 text-sm p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">You've completed all daily challenges!</p>`;
        return;
    }

    activeChallenges.forEach(challenge => {
        challengesDashboardList.innerHTML += renderChallengeCard(challenge);
    });
    lucide.createIcons();
};

const renderProfile = () => {
    const user = appState.currentUser;
    if (!user) return;
    
    const levelInfo = getUserLevel(user.lifetime_points);

    profileAvatar.src = user.avatar_url || 'https://placehold.co/80x80/gray/white?text=User';
    profileName.textContent = user.name;
    profileEmail.textContent = user.email;
    profileJoined.textContent = `Joined ${new Date(user.joined_at).toLocaleDateString('en-GB')}`;
    
    profileLevelTitle.textContent = levelInfo.title;
    profileLevelTitle.className = `text-sm font-semibold ${levelInfo.color || 'text-gray-600 dark:text-gray-400'}`;
    profileLevelNumber.textContent = levelInfo.level;
    profileLevelProgress.style.width = `${levelInfo.progress}%`;
    profileLevelProgress.className = `h-2.5 rounded-full ${levelInfo.progressBg || 'bg-gray-500'}`; 
    profileLevelNext.textContent = levelInfo.progressText;
    
    profileStudentId.textContent = user.student_id;
    profileCourse.textContent = user.course;
    profileMobile.textContent = user.mobile;
    profileEmailPersonal.textContent = user.email;

    if (user.is_green_club_member) {
        profileMembership.innerHTML = `
            <div class="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg mr-4">
                <i data-lucide="leaf" class="w-6 h-6 text-green-600 dark:text-green-400"></i>
            </div>
            <div>
                <p class="font-semibold text-gray-900 dark:text-gray-100">Green Club</p>
                <p class="text-sm text-green-600 dark:text-green-400">Active Member</p>
            </div>
        `;
    } else {
        profileMembership.innerHTML = `
            <div class="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg mr-4">
                <i data-lucide="x-circle" class="w-6 h-6 text-gray-500 dark:text-gray-400"></i>
            </div>
            <div>
                <p class="font-semibold text-gray-900 dark:text-gray-100">No Memberships</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">Join a club to see it here.</p>
            </div>
        `;
    }
    
    lucide.createIcons();
};

const renderEcoPointsPage = () => {
    const user = appState.currentUser;
    if (!user) return;

    const levelInfo = getUserLevel(user.lifetime_points);

    ecopointsBalance.textContent = user.current_points;
    ecopointsLevelTitle.textContent = levelInfo.title;
    ecopointsLevelTitle.className = `text-sm font-semibold ${levelInfo.color || 'text-gray-600 dark:text-gray-400'}`;
    ecopointsLevelNumber.textContent = levelInfo.level;
    ecopointsLevelProgress.style.width = `${levelInfo.progress}%`;
    ecopointsLevelProgress.className = `h-2.5 rounded-full ${levelInfo.progressBg || 'bg-gray-500'}`; 
    ecopointsLevelNext.textContent = levelInfo.progressText;

    // This updates the static text on the level chart
    const levelSteps = [
        { id: 'level-step-1', points: '0 - 1000 Pts' },
        { id: 'level-step-2', points: '1001 - 2000 Pts' },
        { id: 'level-step-3', points: '2001 - 4000 Pts' },
        { id: 'level-step-4', points: '4000+ Pts' }
    ];

    levelSteps.forEach(step => {
        const stepEl = document.getElementById(step.id);
        if (stepEl) {
            stepEl.querySelector('.text-sm.font-semibold').textContent = step.points;
        }
    });

    appState.levels.forEach((level) => {
        const stepEl = document.getElementById(`level-step-${level.level_number}`);
        if (!stepEl) return;
        
        const textContent = stepEl.querySelector('.level-text-content');
        const numberSpan = stepEl.querySelector('.level-number-container span');
        const titleH5 = textContent.querySelector('h5'); 
        
        textContent.classList.remove('opacity-60');
        numberSpan.classList.remove('text-green-600', 'dark:text-green-400', 'text-gray-400', 'dark:text-gray-600', 'scale-110');
        titleH5.classList.remove('text-green-700', 'dark:text-green-300', 'font-extrabold');

        if (level.level_number < levelInfo.level) {
            numberSpan.classList.add('text-green-600', 'dark:text-green-400');
        } else if (level.level_number === levelInfo.level) {
            numberSpan.classList.add('text-green-600', 'dark:text-green-400', 'scale-110'); 
            titleH5.classList.add('text-green-700', 'dark:text-green-300', 'font-extrabold'); 
        } else {
            numberSpan.classList.add('text-gray-400', 'dark:text-gray-600');
            textContent.classList.add('opacity-60'); 
        }
    });
    
    if (appState.levels.length > 0) {
        const totalProgressPercent = ((levelInfo.level - 1) + (levelInfo.progress / 100)) / (appState.levels.length - 1) * 100;
        levelLineProgress.style.height = `${totalProgressPercent}%`;
    }

    ecopointsRecentActivity.innerHTML = '';
    const historySummary = appState.history.slice(0, 3);
    if (historySummary.length === 0) {
         ecopointsRecentActivity.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 text-sm">No transactions yet.</p>`;
    } else {
        historySummary.forEach(item => {
            const pointClass = item.points_change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
            const sign = item.points_change >= 0 ? '+' : '';
            const icon = item.type === 'reward-purchase' ? 'shopping-cart' : 
                         item.type === 'check-in' ? 'log-in' : 
                         item.type === 'event' ? 'calendar-check' : 'award';
            ecopointsRecentActivity.innerHTML += `
                <div class="flex items-center">
                    <div class="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mr-3">
                        <i data-lucide="${icon}" class="w-5 h-5 text-gray-600 dark:text-gray-300"></i>
                    </div>
                    <div class="flex-grow">
                        <p class="font-semibold text-gray-800 dark:text-gray-100 text-sm">${item.description}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">${new Date(item.created_at).toLocaleDateString('en-GB')}</p>
                    </div>
                    <p class="font-bold text-sm ${pointClass}">${sign}${item.points_change}</p>
                </div>
            `;
        });
    }
    lucide.createIcons();
};

const renderHistory = () => {
    historyList.innerHTML = '';
    const sortedHistory = appState.history;
    
    if (sortedHistory.length === 0) {
        historyList.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400">No activity yet.</p>`;
        return;
    }
    sortedHistory.forEach(item => {
        const pointClass = item.points_change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
        const sign = item.points_change >= 0 ? '+' : '';
        const icon = item.type === 'reward-purchase' ? 'shopping-cart' : 
                     item.type === 'check-in' ? 'log-in' : 
                     item.type === 'event' ? 'calendar-check' : 'award';
        
        historyList.innerHTML += `
            <div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm flex items-center">
                <div class="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg mr-4">
                    <i data-lucide="${icon}" class="w-6 h-6 text-gray-600 dark:text-gray-300"></i>
                </div>
                <div class="flex-grow">
                    <p class="font-semibold text-gray-800 dark:text-gray-100">${item.description}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">${new Date(item.created_at).toLocaleDateString('en-GB')}</p>
                </div>
                <div class="text-right">
                    <p class="font-bold ${pointClass}">${sign}${item.points_change}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">EcoPoints</p>
                </div>
            </div>
        `;
    });
    lucide.createIcons();
};

const renderEvents = () => {
    eventList.innerHTML = '';
    const events = appState.events;
    if (!events || events.length === 0) {
        eventList.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400">No upcoming events scheduled.</p>`;
        return;
    }

    events.forEach(e => {
        const hasRSVPd = appState.eventRsvps.some(rsvp => rsvp.event_id === e.id);
        
        const rsvpButton = hasRSVPd
            ? `<button class="bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 font-bold py-2 px-4 rounded-lg text-sm w-full cursor-not-allowed" disabled>Attending</button>`
            : `<button onclick="updateEventRSVP(${e.id})" class="bg-green-500 text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-green-600 w-full">RSVP Now</button>`;
        
        // MODIFICATION: Removed points text
        eventList.innerHTML += `
            <div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                <div class="flex items-start">
                    <div class="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-lg mr-4">
                        <i data-lucide="calendar" class="w-6 h-6 text-purple-600 dark:text-purple-400"></i>
                    </div>
                    <div class="flex-grow">
                        <p class="text-xs font-semibold text-purple-600 dark:text-purple-400">${new Date(e.event_date).toLocaleString('en-GB')}</p>
                        <h3 class="font-bold text-gray-800 dark:text-gray-100 text-lg">${e.title}</h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">${e.description}</p>
                        ${rsvpButton}
                    </div>
                </div>
            </div>
        `;
    });
    lucide.createIcons();
};

const renderProductCard = (product, storeId, type = 'grid') => {
    const cardWidth = type === 'preview' ? 'w-36' : 'w-full';
    
    return `
        <div class="${cardWidth} flex-shrink-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex flex-col shadow-md cursor-pointer transition-shadow hover:shadow-lg" 
             onclick="showProductDetailPage('${storeId}', '${product.id}')">
            
            <img src="${product.images ? product.images[0] : 'https://placehold.co/300x400/gray/white?text=No+Img'}" alt="${product.name}" class="w-full h-48 object-cover">
            <div class="p-3 flex flex-col flex-grow">
                <p class="font-bold text-gray-800 dark:text-gray-100 text-sm truncate">${product.name}</p>
                
                <div class="mt-auto pt-2">
                    <p class="text-xs text-gray-400 dark:text-gray-500 line-through">₹${product.original_price_inr || '0'}</p>
                    <div class="flex items-center font-bold text-gray-800 dark:text-gray-100 my-1">
                        <span class="text-md text-green-700 dark:text-green-400">₹${product.discounted_price_inr || '0'}</span>
                        <span class="mx-1 text-gray-400 dark:text-gray-500 text-xs">+</span>
                        <i data-lucide="leaf" class="w-3 h-3 text-green-500 mr-1"></i>
                        <span class="text-sm text-green-700 dark:text-green-400">${product.cost_in_points}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
};

const renderRewards = () => {
    storeListPreview.innerHTML = ''; 
    
    appState.stores.forEach(store => {
        let productsHTML = '';
        const storeProducts = appState.products.filter(p => p.store_id === store.id);
        
        storeProducts.slice(0, 3).forEach(product => {
            productsHTML += renderProductCard(product, store.id, 'preview');
        });

        storeListPreview.innerHTML += `
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                <div class="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <div class="flex items-center cursor-pointer" onclick="showStoreDetailPage('${store.id}')">
                        <img src="${store.logo_url || 'https://placehold.co/40x40/gray/white?text=Store'}" class="w-10 h-10 rounded-full mr-3 border dark:border-gray-700">
                        <h3 class="text-lg font-bold text-gray-800 dark:text-gray-100">${store.name}</h3>
                    </div>
                    <button onclick="showStoreDetailPage('${store.id}')" class="text-sm font-semibold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300">
                        View All
                    </button>
                </div>
                <div class="p-4">
                    <div class="flex gap-3 overflow-x-auto horizontal-scroll">
                        ${productsHTML}
                    </div>
                </div>
            </div>
        `;
    });
    lucide.createIcons();
};

const renderMyRewardsPage = () => {
    allRewardsList.innerHTML = '';
    const allRewards = appState.userRewards; 

    if (!allRewards || allRewards.length === 0) {
        allRewardsList.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 p-4">You have no rewards. Visit the Eco-Store to get some!</p>`;
    } else {
        allRewards.forEach(userReward => {
            const rewardDetails = getRewardDetails(userReward);
            if (!rewardDetails) return;

            if (rewardDetails.status === 'active') {
                allRewardsList.innerHTML += `
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden flex">
                        <img src="${rewardDetails.images ? rewardDetails.images[0] : 'https://placehold.co/300x400/gray/white?text=No+Img'}" alt="${rewardDetails.name}" class="w-28 h-auto object-cover">
                        <div class="p-4 flex-grow flex flex-col">
                            <h3 class="font-bold text-gray-800 dark:text-gray-100">${rewardDetails.name}</h3>
                            <p class="text-sm text-gray-500 dark:text-gray-400">${rewardDetails.storeName}</p>
                            <p class="text-xs text-gray-400 dark:text-gray-500 mb-2 mt-1">Purchased: ${new Date(rewardDetails.purchaseDate).toLocaleDateString('en-GB')}</p>
                            <button onclick="openRewardQrModal('${userReward.id}')" class="mt-auto w-full bg-green-500 text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-green-600">
                                Use Now
                            </button>
                        </div>
                    </div>
                `;
            } else {
                allRewardsList.innerHTML += `
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden flex opacity-60">
                        <img src="${rewardDetails.images ? rewardDetails.images[0] : 'https://placehold.co/300x400/gray/white?text=No+Img'}" alt="${rewardDetails.name}" class="w-28 h-auto object-cover">
                        <div class="p-4 flex-grow">
                            <h3 class="font-bold text-gray-800 dark:text-gray-100">${rewardDetails.name}</h3>
                            <p class="text-sm text-gray-500 dark:text-gray-400">${rewardDetails.storeName}</p>
                            <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Purchased: ${new Date(rewardDetails.purchaseDate).toLocaleDateString('en-GB')}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400 font-semibold">Used: ${new Date(rewardDetails.usedDate).toLocaleDateString('en-GB')}</p>
                            <div class="mt-2 w-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-bold py-2 px-4 rounded-lg text-sm text-center">
                                Redeemed
                            </div>
                        </div>
                    </div>
                `;
            }
        });
    }
    lucide.createIcons();
};


// --- App Logic (Actions that write to Supabase) ---

window.performCheckIn = async () => {
    logActivity('button_click', { action: 'perform_check_in_attempt' });
    const today = getTodayDateString();
    if (appState.currentUser.last_check_in_date === today) {
        return; 
    }
    
    // Disable button to prevent double-click
    const checkInButton = checkInCard.querySelector('button');
    if(checkInButton) checkInButton.disabled = true;

    const { error: updateError } = await supabase
        .from('students')
        .update({ last_check_in_date: today })
        .eq('student_id', appState.currentUser.student_id);

    if (updateError) {
        console.error("Error updating check-in:", updateError.message);
        if(checkInButton) checkInButton.disabled = false;
        return;
    }

    const { error: pointsError } = await supabase
        .from('points_history')
        .insert({
            student_id: appState.currentUser.student_id,
            points_change: CHECK_IN_REWARD,
            description: 'Daily Check-in Bonus',
            type: 'check-in'
        });
    
    if (pointsError) {
        console.error("Error logging check-in points:", pointsError.message);
         if(checkInButton) checkInButton.disabled = false;
        // Note: May need to revert student check-in date if this fails
        return;
    }

    logActivity('check_in_success', { points: CHECK_IN_REWARD });
    appState.currentUser.last_check_in_date = today;
    appState.currentUser.current_points += CHECK_IN_REWARD;
    appState.currentUser.lifetime_points += CHECK_IN_REWARD;
    
    // Refresh history from scratch to get the new item
    await fetchHistory(); 

    renderCheckInCard();
    renderHeader(); 
    renderDashboard(); // Re-render dashboard for stats
};

window.completeChallenge = async (challengeId) => {
    logActivity('button_click', { action: 'complete_challenge_attempt', challengeId });
    const challenge = appState.dailyChallenges.find(c => c.id == challengeId);
    if (!challenge || challenge.status === 'completed') {
        return;
    }

    const { error: compError } = await supabase
        .from('challenge_completions')
        .insert({
            challenge_id: challenge.id,
            student_id: appState.currentUser.student_id,
            completed_at: getTodayDateString()
        });
    
    if (compError) {
        console.error("Error completing challenge:", compError.message);
        return;
    }

    const { error: pointsError } = await supabase
        .from('points_history')
        .insert({
            student_id: appState.currentUser.student_id,
            points_change: challenge.points_reward,
            description: `Completed: ${challenge.title}`,
            type: 'challenge'
        });

    if (pointsError) {
        console.error("Error logging challenge points:", pointsError.message);
        // Note: May need to revert completion if this fails
        return;
    }

    logActivity('challenge_complete_success', { challengeId, points: challenge.points_reward });
    challenge.status = 'completed';
    appState.currentUser.current_points += challenge.points_reward;
    appState.currentUser.lifetime_points += challenge.points_reward;
    
    await fetchHistory(); // Refresh history

    renderHeader();
    renderChallengesPage();
    renderChallengesDashboard(); 
};

window.showPage = (pageId) => {
    pages.forEach(p => p.classList.remove('active'));
    storeDetailPage.innerHTML = '';
    productDetailPage.innerHTML = '';
    
    const newPage = document.getElementById(pageId);
    if (newPage) {
        newPage.classList.add('active');
    }
    
    sidebarNavItems.forEach(item => {
        item.classList.toggle('active', item.getAttribute('onclick')?.includes(`'${pageId}'`));
    });
    
    navItems.forEach(item => {
        item.classList.toggle('active', item.getAttribute('onclick')?.includes(`'${pageId}'`));
    });
    
    mainContent.scrollTop = 0;
    
    logActivity('page_view', { page: pageId });
    
    if (pageId === 'my-rewards') renderMyRewardsPage();
    if (pageId === 'profile') renderProfile();
    if (pageId === 'ecopoints') renderEcoPointsPage();
    if (pageId === 'history') renderHistory();
    if (pageId === 'leaderboard') renderLeaderboardPage();
    if (pageId === 'rewards') renderRewards();
    if (pageId === 'challenges') renderChallengesPage();
    if (pageId === 'events') renderEvents();
    if (pageId === 'dashboard') renderDashboard();
    if (pageId === 'change-password') {
        passwordMessage.textContent = '';
        passwordMessage.className = 'text-sm text-center';
        changePasswordForm.reset();
    }

    toggleSidebar(true); 
};

window.showStoreDetailPage = (storeId) => {
    logActivity('page_view', { page: 'store_detail', storeId });
    const store = appState.stores.find(s => s.id === storeId);
    if (!store) return;
    
    let productsHTML = '';
    appState.products.filter(p => p.store_id === storeId)
        .sort((a,b) => a.cost_in_points - b.cost_in_points)
        .forEach(product => {
            productsHTML += renderProductCard(product, store.id, 'grid');
        });
    
    storeDetailPage.innerHTML = `
        <div class="p-4 bg-white dark:bg-gray-950 sticky top-0 z-10 border-b dark:border-gray-800 flex items-center">
            <button onclick="showPage('rewards')" class="p-2 text-gray-600 dark:text-gray-300 -ml-2 mr-2">
                <i data-lucide="arrow-left" class="w-6 h-6"></i>
            </button>
            <img src="${store.logo_url || 'https://placehold.co/40x40/gray/white?text=Store'}" class="w-10 h-10 rounded-full mr-3 border dark:border-gray-700">
            <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">${store.name}</h2>
        </div>
        <div class="p-6">
            <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">All Products</h3>
            <div class="grid grid-cols-2 gap-4">
                ${productsHTML}
            </div>
        </div>
    `;
    
    pages.forEach(p => p.classList.remove('active'));
    storeDetailPage.classList.add('active');
    mainContent.scrollTop = 0;
    lucide.createIcons();
};

window.showProductDetailPage = (storeId, productId) => {
    logActivity('page_view', { page: 'product_detail', productId });
    const { store, product } = getProduct(storeId, productId);
    if (!product) return;

    const canAfford = appState.currentUser.current_points >= product.cost_in_points;
    const buttonClass = canAfford 
        ? 'bg-green-600 hover:bg-green-700' 
        : 'bg-gray-400 cursor-not-allowed';

    let featuresHTML = '';
    if (product.features) {
        product.features.forEach(f => {
            featuresHTML += `<li class="flex items-center"><i data-lucide="check" class="w-4 h-4 text-green-500 mr-2"></i>${f}</li>`;
        });
    }
    
    let specsHTML = '';
    if (product.specifications) {
        for (const [key, value] of Object.entries(product.specifications)) {
            specsHTML += `
                <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-center">
                    <p class="text-xs text-gray-500 dark:text-gray-400">${key}</p>
                    <p class="font-semibold text-gray-800 dark:text-gray-100 text-sm">${value}</p>
                </div>
            `;
        }
    }

    let mainImage = (product.images && product.images.length > 0)
        ? product.images[0]
        : 'https://placehold.co/300x400/gray/white?text=No+Img';
    
    let thumbnailsHTML = '';
    if (product.images && product.images.length > 1) {
        product.images.forEach((img, index) => {
            thumbnailsHTML += `
                <button class="w-16 h-16 rounded-lg overflow-hidden border-2 ${index === 0 ? 'border-green-500' : 'border-transparent'}"
                        onclick="document.getElementById('product-main-image').src='${img}'; 
                                 this.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('border-green-500')); 
                                 this.classList.add('border-green-500');">
                    <img src="${img}" alt="thumbnail ${index + 1}" class="w-full h-full object-cover">
                </button>
            `;
        });
    }

    productDetailPage.innerHTML = `
        <div class="pb-24">
            <div class="relative">
                <img id="product-main-image" src="${mainImage}" alt="${product.name}" class="w-full h-[32rem] object-cover bg-gray-200 dark:bg-gray-700">
                <button onclick="showStoreDetailPage('${store.id}')" class="absolute top-4 left-4 p-2 bg-white/80 dark:bg-gray-800/80 rounded-full shadow-md text-gray-700 dark:text-gray-200">
                    <i data-lucide="arrow-left" class="w-6 h-6"></i>
                </button>
            </div>
            
            ${thumbnailsHTML ? `
            <div class="p-4 bg-white dark:bg-gray-950 border-b dark:border-gray-800">
                <div class="flex space-x-3 overflow-x-auto horizontal-scroll">
                    ${thumbnailsHTML}
                </div>
            </div>
            ` : ''}
            
            <div class="p-6 bg-white dark:bg-gray-900">
                <h2 class="text-3xl font-bold text-gray-800 dark:text-gray-100">${product.name}</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">${store.name}</p>
                
                <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Description</h3>
                <p class="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">${product.description || 'No description available.'}</p>

                <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Features</h3>
                <ul class="space-y-2 text-gray-600 dark:text-gray-300 mb-6">${featuresHTML}</ul>

                <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Specifications</h3>
                <div class="grid grid-cols-2 gap-3 mb-6">${specsHTML}</div>
            </div>
        </div>

        <div class="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white dark:bg-gray-950 border-t dark:border-gray-800 p-4 shadow-lg-top">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm text-gray-500 dark:text-gray-400 line-through">₹${product.original_price_inr || '0'}</p>
                    <div class="flex items-center font-bold text-gray-800 dark:text-gray-100">
                        <span class="text-2xl text-green-700 dark:text-green-400">₹${product.discounted_price_inr || '0'}</span>
                        <span class="mx-2 text-gray-400 dark:text-gray-500">+</span>
                        <i data-lucide="leaf" class="w-5 h-5 text-green-500 mr-1"></i>
                        <span class="text-2xl text-green-700 dark:text-green-400">${product.cost_in_points}</span>
                    </div>
                </div>
                <button onclick="openPurchaseModal('${store.id}', '${product.id}')" 
                        class="${buttonClass} text-white text-md font-bold py-3 px-6 rounded-lg transition-colors" 
                        ${!canAfford ? 'disabled' : ''}>
                    Redeem Offer
                </button>
            </div>
        </div>
    `;

    pages.forEach(p => p.classList.remove('active'));
    productDetailPage.classList.add('active');
    mainContent.scrollTop = 0;
    lucide.createIcons();
};

window.toggleSidebar = (forceClose = false) => {
    if (forceClose) {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('opacity-0');
        sidebarOverlay.classList.add('hidden');
    } else {
        sidebar.classList.toggle('-translate-x-full');
        sidebarOverlay.classList.toggle('hidden');
        sidebarOverlay.classList.toggle('opacity-0');
    }
};

window.updateEventRSVP = async (eventId) => {
    logActivity('button_click', { action: 'rsvp_event_attempt', eventId });
    const hasRSVPd = appState.eventRsvps.some(rsvp => rsvp.event_id == eventId);
    if (hasRSVPd) return;

    const { data, error } = await supabase
        .from('event_rsvps')
        .insert({
            event_id: eventId,
            student_id: appState.currentUser.student_id
        })
        .select()
        .single();
    
    if (error) {
        console.error("Error creating RSVP:", error.message);
        return;
    }

    logActivity('rsvp_event_success', { eventId });
    appState.eventRsvps.push(data);
    renderEvents();
    renderDashboard();
};

window.openPurchaseModal = (storeId, productId) => {
    logActivity('button_click', { action: 'open_purchase_modal', productId });
    const { store, product } = getProduct(storeId, productId);
    if (!product) return;

    purchaseModal.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100">Purchase Reward</h3>
            <button onclick="closePurchaseModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <i data-lucide="x" class="w-6 h-6"></i>
            </button>
        </div>
        
        <div class="flex items-center mb-4">
            <img src="${product.images ? product.images[0] : 'https://placehold.co/300x400/gray/white?text=No+Img'}" alt="${product.name}" class="w-24 h-32 object-cover rounded-lg mr-4">
            <div>
                <h4 class="text-lg font-bold text-gray-800 dark:text-gray-100">${product.name}</h4>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">From ${store.name}</p>
                <div class="flex items-center font-bold text-gray-800 dark:text-gray-100">
                    <span class="text-lg text-green-700 dark:text-green-400">₹${product.discounted_price_inr || '0'}</span>
                    <span class="mx-1 text-gray-400 dark:text-gray-500">+</span>
                    <i data-lucide="leaf" class="w-4 h-4 text-green-500 mr-1"></i>
                    <span class="text-lg text-green-700 dark:text-green-400">${product.cost_in_points}</span>
                </div>
            </div>
        </div>

        <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-4 mt-4">
            <div class="flex justify-between items-center mb-1">
                <span class="text-gray-600 dark:text-gray-300">Your Balance</span>
                <span class="font-semibold text-gray-800 dark:text-gray-100">${appState.currentUser.current_points} EcoPoints</span>
            </div>
            <div class="flex justify-between items-center text-red-600 dark:text-red-400">
                <span class="font-semibold">Cost</span>
                <span class="font-bold text-lg">-${product.cost_in_points} EcoPoints</span>
            </div>
            <hr class="my-2 border-gray-300 dark:border-gray-600">
            <div class="flex justify-between items-center text-green-600 dark:text-green-400">
                <span class="font-semibold">Remaining</span>
                <span class="font-bold text-lg">${appState.currentUser.current_points - product.cost_in_points} EcoPoints</span>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
            <button onclick="closePurchaseModal()" class="w-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
                Cancel
            </button>
            <button onclick="confirmPurchase('${store.id}', '${product.id}')" class="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700">
                Confirm & Purchase
            </button>
        </div>
    `;
    
    purchaseModalOverlay.classList.remove('hidden');
    purchaseModal.classList.remove('translate-y-full');
    lucide.createIcons();
};

window.closePurchaseModal = () => {
    purchaseModalOverlay.classList.add('hidden');
    purchaseModal.classList.add('translate-y-full');
    setTimeout(() => {
        purchaseModal.innerHTML = '';
    }, 300);
};

window.confirmPurchase = async (storeId, productId) => {
    logActivity('button_click', { action: 'confirm_purchase_attempt', productId });
    const { product } = getProduct(storeId, productId);
    if (!product) return;
    
    if (appState.currentUser.current_points < product.cost_in_points) {
        logActivity('purchase_attempt_failed', { productId, reason: 'insufficient_points' });
        purchaseModal.innerHTML = `
            <div class="text-center p-4">
                <i data-lucide="x-circle" class="w-16 h-16 text-red-500 mx-auto mb-4"></i>
                <h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Purchase Failed</h3>
                <p class="text-gray-600 dark:text-gray-300 mb-6">You do not have enough points for this reward.</p>
                <button onclick="closePurchaseModal()" class="w-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
                    Close
                </button>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    const { data: newReward, error: rewardError } = await supabase
        .from('user_rewards')
        .insert({
            student_id: appState.currentUser.student_id,
            product_id: product.id,
            status: 'active'
        })
        .select()
        .single();
    
    if (rewardError) {
        logActivity('purchase_attempt_failed', { productId, reason: rewardError.message });
        console.error("Error purchasing reward:", rewardError.message);
        return;
    }

    const { error: pointsError } = await supabase
        .from('points_history')
        .insert({
            student_id: appState.currentUser.student_id,
            points_change: -product.cost_in_points,
            description: `Purchased: ${product.name}`,
            type: 'reward-purchase'
        });
    
    if (pointsError) {
        console.error("Error logging purchase points:", pointsError.message);
        return;
    }

    logActivity('purchase_attempt_success', { productId, points: -product.cost_in_points });
    appState.currentUser.current_points -= product.cost_in_points;
    appState.userRewards.unshift(newReward);
    await fetchHistory(); // Refresh history

    purchaseModal.innerHTML = `
        <div class="text-center p-4">
            <i data-lucide="check-circle" class="w-16 h-16 text-green-500 mx-auto mb-4"></i>
            <h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Purchase Successful!</h3>
            <p class="text-gray-600 dark:text-gray-300 mb-6">You can find your new reward in "My Rewards".</p>
            <button onclick="closePurchaseModalAndShowMyRewards()" class="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 mb-2">
                Go to My Rewards
            </button>
            <button onclick="closePurchaseModal()" class="w-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
                Done
            </button>
        </div>
    `;
    lucide.createIcons();
    
    renderHeader();
};

window.closePurchaseModalAndShowMyRewards = () => {
    closePurchaseModal();
    showPage('my-rewards');
};

window.openRewardQrModal = (userRewardId) => {
    logActivity('button_click', { action: 'open_qr_modal', userRewardId });
    const userReward = appState.userRewards.find(ur => ur.id == userRewardId);
    const rewardDetails = getRewardDetails(userReward); 
    if (!rewardDetails) return;

    const qrData = `USER_REWARD_ID::${userReward.id}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

    qrModal.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100">${rewardDetails.name}</h3>
            <button onclick="closeQrModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <i data-lucide="x" class="w-6 h-6"></i>
            </button>
        </div>
        
        <div class="flex justify-center mb-4 p-4 bg-white rounded-lg border dark:border-gray-700">
            <img src="${qrCodeUrl}" alt="QR Code" class="rounded-lg">
        </div>

        <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-left mb-6">
            <h4 class="font-bold text-gray-800 dark:text-gray-100 mb-2">How to Redeem:</h4>
            <p class="text-sm text-gray-600 dark:text-gray-300">${rewardDetails.instructions || 'Show this QR code to the store vendor.'}</p>
        </div>

        <div class="grid grid-cols-2 gap-3">
            <button onclick="closeQrModal()" class="w-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
                Done
            </button>
            <button onclick="markRewardAsUsed('${userReward.id}')" class="w-full bg-red-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-600">
                Mark as Used
            </button>
        </div>
    `;

    qrModalOverlay.classList.remove('hidden');
    qrModal.classList.remove('translate-y-full');
    lucide.createIcons();
};

window.closeQrModal = () => {
    qrModalOverlay.classList.add('hidden');
    qrModal.classList.add('translate-y-full');
    setTimeout(() => {
        qrModal.innerHTML = '';
    }, 300);
};

window.markRewardAsUsed = async (userRewardId) => {
    logActivity('button_click', { action: 'mark_reward_used_attempt', userRewardId });
    const userReward = appState.userRewards.find(ur => ur.id == userRewardId);
    if (!userReward || userReward.status === 'used') return;

    const usedDate = new Date().toISOString();
    
    const { error } = await supabase
        .from('user_rewards')
        .update({ status: 'used', used_date: usedDate })
        .eq('id', userRewardId);
    
    if (error) {
        console.error("Error marking reward as used:", error.message);
        return;
    }

    logActivity('mark_reward_used_success', { userRewardId });
    userReward.status = 'used';
    userReward.used_date = usedDate;
    
    renderMyRewardsPage();
    closeQrModal();
};

// --- Handle Change Password ---
async function handleChangePassword(event) {
    event.preventDefault();
    logActivity('button_click', { action: 'change_password_attempt' });
    
    changePasswordButton.disabled = true;
    changePasswordButton.textContent = 'Updating...';
    passwordMessage.textContent = '';
    passwordMessage.className = 'text-sm text-center';

    const newPassword = document.getElementById('new-password').value;
    
    if (newPassword.length < 6) {
        passwordMessage.textContent = 'Password must be at least 6 characters.';
        passwordMessage.classList.add('text-red-600');
        changePasswordButton.disabled = false;
        changePasswordButton.textContent = 'Update Password';
        return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
        logActivity('change_password_failed', { error: error.message });
        passwordMessage.textContent = `Error: ${error.message}`;
        passwordMessage.classList.add('text-red-600');
    } else {
        logActivity('change_password_success');
        passwordMessage.textContent = 'Password updated successfully!';
        passwordMessage.classList.add('text-green-600');
        changePasswordForm.reset();
    }
    
    changePasswordButton.disabled = false;
    changePasswordButton.textContent = 'Update Password';
}

// --- NEW: Handle Profile Pic Upload ---
async function handleProfilePicUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    logActivity('button_click', { action: 'upload_profile_pic_attempt' });
    profilePicLoader.classList.remove('hidden');
    profilePicError.textContent = '';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);

    try {
        const response = await fetch(CLOUDINARY_URL, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const data = await response.json();
        const newAvatarUrl = data.secure_url;

        // Update Supabase
        const { error: updateError } = await supabase
            .from('students')
            .update({ avatar_url: newAvatarUrl })
            .eq('student_id', appState.currentUser.student_id);

        if (updateError) {
            throw new Error(updateError.message);
        }
        
        // Update local state and UI
        appState.currentUser.avatar_url = newAvatarUrl;
        profileAvatar.src = newAvatarUrl;
        userAvatarSidebar.src = newAvatarUrl;
        
        logActivity('upload_profile_pic_success');
        
    } catch (error) {
        console.error("Error uploading profile picture:", error.message);
        profilePicError.textContent = 'Upload failed. Please try again.';
        logActivity('upload_profile_pic_failed', { error: error.message });
    } finally {
        profilePicLoader.classList.add('hidden');
        // Clear the file input value so the 'change' event fires again if the same file is selected
        event.target.value = null;
    }
}

// --- NEW: Theme Toggle Logic ---
function setAppTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        themeToggleBtn.querySelector('span').classList.add('dark:translate-x-6');
        themeIcon.setAttribute('data-lucide', 'moon');
        themeText.textContent = 'Dark Mode';
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        themeToggleBtn.querySelector('span').classList.remove('dark:translate-x-6');
        themeIcon.setAttribute('data-lucide', 'sun');
        themeText.textContent = 'Light Mode';
        localStorage.setItem('theme', 'light');
    }
    lucide.createIcons(); // Re-render icons
}

function toggleTheme() {
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setAppTheme(newTheme);
    logActivity('button_click', { action: 'toggle_theme', theme: newTheme });
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
        setAppTheme(savedTheme);
    } else if (systemPrefersDark) {
        setAppTheme('dark');
    } else {
        setAppTheme('light');
    }
}


// --- App Initialization ---

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

async function loadInitialData() {
    // Show loader immediately
    appLoading.classList.remove('loaded');

    await fetchUserProfile();
    
    if (!appState.currentUser) {
        console.error("Could not load user profile. Logging out.");
        await supabase.auth.signOut();
        window.location.href = 'login.html';
        return;
    }

    logActivity('app_load_success');

    // Fetch all other data in parallel
    await Promise.all([
        fetchLeaderboard(),
        fetchHistory(),
        fetchChallenges(),
        fetchEventsAndRSVPs(),
        fetchStoresAndProducts(),
        fetchUserRewards(),
        fetchLevels()
    ]);
    
    // Hide loader
    appLoading.classList.add('loaded');
}

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize theme first
    initializeTheme();
    
    // Add event listeners that are always present
    document.getElementById('sidebar-toggle-btn').addEventListener('click', () => toggleSidebar(false));
    logoutButton.addEventListener('click', async () => {
        logActivity('logout');
        await supabase.auth.signOut();
        window.location.href = 'login.html';
    });
    changePasswordForm.addEventListener('submit', handleChangePassword);
    
    // NEW Listeners
    themeToggleBtn.addEventListener('click', toggleTheme);
    profilePicUpload.addEventListener('change', handleProfilePicUpload);


    const isLoggedIn = await checkAuth();
    if (!isLoggedIn) {
        return;
    }
    
    await loadInitialData();

    // Initial Renders
    renderHeader();
    renderDashboard();
    
    showPage('dashboard');
    lucide.createIcons(); 
});
