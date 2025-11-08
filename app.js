// app.js

// Import the shared Supabase client
import { supabase } from './supabase-client.js';

// --- Global App State ---
// This object will be filled with data from Supabase
let appState = {
    currentUser: null,      // Will hold data from 'students' table
    leaderboard: [],
    history: [],
    dailyChallenges: [],
    events: [],
    stores: [],
    userRewards: [],
    levels: [],
};

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

// --- Helper Functions ---

const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
};

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
        return { level: 1, title: 'Loading...', progress: 0, progressText: '...' };
    }
    
    let currentLevel = appState.levels[0];
    for (let i = appState.levels.length - 1; i >= 0; i--) {
        if (points >= appState.levels[i].min_points) {
            currentLevel = appState.levels[i];
            break;
        }
    }
    
    const nextLevel = appState.levels.find(l => l.level_number === currentLevel.level_number + 1);

    if (nextLevel) {
        const pointsInLevel = points - currentLevel.min_points;
        const pointsForLevel = nextLevel.min_points - currentLevel.min_points;
        const progress = Math.max(0, Math.min(100, (pointsInLevel / pointsForLevel) * 100));
        return {
            level: currentLevel.level_number,
            title: currentLevel.title,
            progress: progress,
            progressText: `${points} / ${nextLevel.min_points} Pts`
        };
    } else {
        // Max level
        return {
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
        // This should not happen if checkAuth() is working, but as a fallback:
        window.location.href = 'login.html';
        return;
    }

    const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('auth_id', user.id)
        .single();
    
    if (error) {
        console.error("Error fetching student profile:", error.message);
    } else {
        appState.currentUser = data;
    }
}

async function fetchLeaderboard() {
    const { data, error } = await supabase
        .from('students')
        .select('student_id, name, avatar_url, lifetime_points') // Use lifetime_points for rank
        .order('lifetime_points', { ascending: false })
        .limit(10);
        
    if (error) console.error("Error fetching leaderboard:", error.message);
    else appState.leaderboard = data;
}

async function fetchHistory() {
    const { data, error } = await supabase
        .from('points_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
        
    if (error) console.error("Error fetching history:", error.message);
    else appState.history = data;
}

async function fetchChallenges() {
    // 1. Fetch all challenges
    const { data: challenges, error: chalError } = await supabase
        .from('challenges')
        .select('*');
        
    if (chalError) {
        console.error("Error fetching challenges:", chalError.message);
        return;
    }

    // 2. Fetch today's completions for this user
    const today = getTodayDateString();
    const { data: completions, error: compError } = await supabase
        .from('challenge_completions')
        .select('challenge_id')
        .eq('student_id', appState.currentUser.student_id)
        .eq('completed_at', today);

    if (compError) {
        console.error("Error fetching completions:", compError.message);
    }

    // 3. Merge the data
    const completedIds = completions ? completions.map(c => c.challenge_id) : [];
    appState.dailyChallenges = challenges.map(challenge => ({
        ...challenge,
        status: completedIds.includes(challenge.id) ? 'completed' : 'active'
    }));
}

async function fetchEvents() {
    const { data, error } = await supabase.from('events').select('*');
    if (error) console.error("Error fetching events:", error.message);
    else appState.events = data;
}

async function fetchStoresAndProducts() {
    const { data: stores, error: storeError } = await supabase.from('stores').select('*');
    if (storeError) console.error("Error fetching stores:", storeError.message);
    else appState.stores = stores;
    
    const { data: products, error: prodError } = await supabase.from('products').select('*');
    if (prodError) console.error("Error fetching products:", prodError.message);
    else appState.products = products;
}

async function fetchUserRewards() {
    const { data, error } = await supabase
        .from('user_rewards')
        .select('*')
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
    if (!user) return; // Don't render if user isn't loaded
    
    const levelInfo = getUserLevel(user.lifetime_points); 
    userPointsHeader.textContent = user.current_points;
    userNameGreeting.textContent = user.name.split(' ')[0]; 
    userAvatarSidebar.src = user.avatar_url || 'https://placehold.co/80x80/gray/white?text=User';
    userNameSidebar.textContent = user.name;
    userPointsSidebar.textContent = user.current_points;
    userLevelSidebar.textContent = `Lv. ${levelInfo.level}: ${levelInfo.title}`;
    userLevelSidebar.className = `text-sm font-medium ${levelInfo.color || 'text-gray-600'} mb-1`;
};

const renderCheckInCard = () => {
    const user = appState.currentUser;
    if (!user) return;
    
    const today = getTodayDateString();
    
    if (user.last_check_in_date === today) {
        checkInCard.className = "bg-green-50 border border-green-200 p-5 rounded-xl mb-6 flex items-center justify-between";
        checkInCard.innerHTML = `
            <div>
                <h3 class="text-lg font-bold text-green-800">Daily Check-in</h3>
                <p class="text-sm text-green-700">You've already checked in today!</p>
            </div>
            <div class="bg-green-100 text-green-700 font-bold py-2 px-4 rounded-lg flex items-center space-x-2 whitespace-nowrap">
                <i data-lucide="check" class="w-5 h-5"></i>
                <span>Checked-in</span>
            </div>
        `;
    } else {
        checkInCard.className = "bg-white border border-gray-200 p-5 rounded-xl mb-6 flex items-center justify-between shadow-sm";
        checkInCard.innerHTML = `
            <div>
                <h3 class="text-lg font-bold text-gray-900">Daily Check-in</h3>
                <p class="text-sm text-gray-600">Earn +${CHECK_IN_REWARD} points for checking in!</p>
            </div>
            <button onclick="performCheckIn()" class="bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 whitespace-nowrap hover:bg-green-700 transition-colors">
                <i data-lucide="log-in" class="w-5 h-5"></i>
                <span>Check-in</span>
            </button>
        `;
    }
    lucide.createIcons();
};

const renderLeaderboardDashboard = () => {
    leaderboardDashboardList.innerHTML = '';
    const sortedLeaderboard = appState.leaderboard; // Already sorted by query
    
    sortedLeaderboard.slice(0, 3).forEach((user, index) => {
        const rank = index + 1;
        let rankBadge = '';
        if (rank === 1) rankBadge = `<i data-lucide="award" class="w-6 h-6 text-yellow-500"></i>`;
        else if (rank === 2) rankBadge = `<i data-lucide="award" class="w-6 h-6 text-gray-400"></i>`;
        else if (rank === 3) rankBadge = `<i data-lucide="award" class="w-6 h-6 text-yellow-700"></i>`;

        const isCurrentUserClass = user.student_id === appState.currentUser.student_id ? 'bg-green-100 border-l-4 border-green-500' : 'bg-white';
        
        leaderboardDashboardList.innerHTML += `
            <div class="flex items-center ${isCurrentUserClass} p-4 rounded-xl shadow-sm">
                <div class="w-8 flex justify-center items-center mr-3">${rankBadge}</div>
                <img src="${user.avatar_url || 'https://placehold.co/40x40/gray/white?text=User'}" class="w-10 h-10 rounded-full mr-3" alt="${user.name}">
                <p class="font-semibold text-gray-700">${isCurrentUserClass ? 'You' : user.name}</p>
                <p class="ml-auto font-bold text-gray-600">${user.lifetime_points} Pts</p>
            </div>
        `;
    });
    lucide.createIcons();
};

const renderLeaderboardPage = () => {
    leaderboardPageList.innerHTML = '';
    const sortedLeaderboard = appState.leaderboard;
    
    sortedLeaderboard.forEach((user, index) => {
        const rank = index + 1;
        let rankBadge = `<span class="font-bold text-gray-500 w-6 text-center">${rank}.</span>`;
        if (rank === 1) rankBadge = `<i data-lucide="award" class="w-6 h-6 text-yellow-500"></i>`;
        else if (rank === 2) rankBadge = `<i data-lucide="award" class="w-6 h-6 text-gray-400"></i>`;
        else if (rank === 3) rankBadge = `<i data-lucide="award" class="w-6 h-6 text-yellow-700"></i>`;

        const isCurrentUserClass = user.student_id === appState.currentUser.student_id ? 'bg-green-100 border-2 border-green-500' : 'bg-white';
        
        leaderboardPageList.innerHTML += `
            <div class="flex items-center ${isCurrentUserClass} p-4 rounded-xl shadow-sm">
                <div class="w-8 flex justify-center items-center mr-3">${rankBadge}</div>
                <img src="${user.avatar_url || 'https://placehold.co/40x40/gray/white?text=User'}" class="w-10 h-10 rounded-full mr-3" alt="${user.name}">
                <p class="font-semibold text-gray-700">${isCurrentUserClass ? 'You' : user.name}</p>
                <p class="ml-auto font-bold text-gray-600">${user.lifetime_points} Pts</p>
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
        buttonHTML = `<button class="w-full bg-gray-300 text-gray-500 font-bold py-2 px-4 rounded-lg text-sm cursor-not-allowed flex items-center justify-center space-x-2" disabled>
                        <i data-lucide="check" class="w-5 h-5"></i>
                        <span>Completed</span>
                    </button>`;
    }

    return `
        <div class="bg-white p-4 rounded-xl shadow-md">
            <div class="flex items-start">
                <div class="p-3 bg-yellow-100 rounded-lg mr-4">
                    <i data-lucide="${challenge.icon || 'award'}" class="w-6 h-6 text-yellow-600"></i>
                </div>
                <div class="flex-grow">
                    <h3 class="font-bold text-gray-800 text-lg">${challenge.title}</h3>
                    <p class="text-sm text-gray-500 mb-3">${challenge.description}</p>
                    <p class="text-sm font-bold text-green-600 mb-3">+${challenge.points_reward} EcoPoints</p>
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
        challengesPageList.innerHTML = `<p class="text-center text-gray-500">No challenges available today. Check back tomorrow!</p>`;
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
        challengesDashboardList.innerHTML = `<p class="text-center text-gray-500 text-sm p-4 bg-white rounded-xl shadow-sm">You've completed all daily challenges!</p>`;
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
    profileJoined.textContent = `Joined ${new Date(user.joined_at).toLocaleDateString()}`;
    
    profileLevelTitle.textContent = levelInfo.title;
    profileLevelTitle.className = `text-sm font-semibold ${levelInfo.color || 'text-gray-600'}`;
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
            <div class="p-3 bg-green-100 rounded-lg mr-4">
                <i data-lucide="leaf" class="w-6 h-6 text-green-600"></i>
            </div>
            <div>
                <p class="font-semibold text-gray-900">Green Club</p>
                <p class="text-sm text-green-600">Active Member</p>
            </div>
        `;
    } else {
        profileMembership.innerHTML = `
            <div class="p-3 bg-gray-100 rounded-lg mr-4">
                <i data-lucide="x-circle" class="w-6 h-6 text-gray-500"></i>
            </div>
            <div>
                <p class="font-semibold text-gray-900">No Memberships</p>
                <p class="text-sm text-gray-500">Join a club to see it here.</p>
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
    ecopointsLevelTitle.className = `text-sm font-semibold ${levelInfo.color || 'text-gray-600'}`;
    ecopointsLevelNumber.textContent = levelInfo.level;
    ecopointsLevelProgress.style.width = `${levelInfo.progress}%`;
    ecopointsLevelProgress.className = `h-2.5 rounded-full ${levelInfo.progressBg || 'bg-gray-500'}`; 
    ecopointsLevelNext.textContent = levelInfo.progressText;

    appState.levels.forEach((level) => {
        const stepEl = document.getElementById(`level-step-${level.level_number}`);
        if (!stepEl) return;
        
        const textContent = stepEl.querySelector('.level-text-content');
        const numberSpan = stepEl.querySelector('.level-number-container span');
        const titleH5 = textContent.querySelector('h5'); 
        
        textContent.classList.remove('opacity-60');
        numberSpan.classList.remove('text-green-600', 'text-gray-400', 'scale-110');
        titleH5.classList.remove('text-green-700', 'font-extrabold');

        if (level.level_number < levelInfo.level) {
            numberSpan.classList.add('text-green-600');
        } else if (level.level_number === levelInfo.level) {
            numberSpan.classList.add('text-green-600', 'scale-110'); 
            titleH5.classList.add('text-green-700', 'font-extrabold'); 
        } else {
            numberSpan.classList.add('text-gray-400');
            textContent.classList.add('opacity-60'); 
        }
    });
    
    const totalProgressPercent = ((levelInfo.level - 1) + (levelInfo.progress / 100)) / (appState.levels.length - 1) * 100;
    levelLineProgress.style.height = `${totalProgressPercent}%`;

    ecopointsRecentActivity.innerHTML = '';
    const historySummary = appState.history.slice(0, 3);
    if (historySummary.length === 0) {
         ecopointsRecentActivity.innerHTML = `<p class="text-center text-gray-500 text-sm">No transactions yet.</p>`;
    } else {
        historySummary.forEach(item => {
            const pointClass = item.points_change >= 0 ? 'text-green-600' : 'text-red-600';
            const sign = item.points_change >= 0 ? '+' : '';
            ecopointsRecentActivity.innerHTML += `
                <div class="flex items-center">
                    <div class="p-2 bg-gray-100 rounded-lg mr-3">
                        <i data-lucide="${item.type === 'reward-purchase' ? 'shopping-cart' : 'award'}" class="w-5 h-5 text-gray-600"></i>
                    </div>
                    <div class="flex-grow">
                        <p class="font-semibold text-gray-800 text-sm">${item.description}</p>
                        <p class="text-xs text-gray-500">${new Date(item.created_at).toLocaleDateString()}</p>
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
    const sortedHistory = appState.history; // Already sorted by query
    
    if (sortedHistory.length === 0) {
        historyList.innerHTML = `<p class="text-center text-gray-500">No activity yet.</p>`;
        return;
    }
    sortedHistory.forEach(item => {
        const pointClass = item.points_change >= 0 ? 'text-green-600' : 'text-red-600';
        const sign = item.points_change >= 0 ? '+' : '';
        const icon = item.type === 'reward-purchase' ? 'shopping-cart' : 
                     item.type === 'check-in' ? 'log-in' : 'award';
        
        historyList.innerHTML += `
            <div class="bg-white p-4 rounded-xl shadow-sm flex items-center">
                <div class="p-3 bg-gray-100 rounded-lg mr-4">
                    <i data-lucide="${icon}" class="w-6 h-6 text-gray-600"></i>
                </div>
                <div class="flex-grow">
                    <p class="font-semibold text-gray-800">${item.description}</p>
                    <p class="text-xs text-gray-500">${new Date(item.created_at).toLocaleDateString()}</p>
                </div>
                <div class="text-right">
                    <p class="font-bold ${pointClass}">${sign}${item.points_change}</p>
                    <p class="text-xs text-gray-500">EcoPoints</p>
                </div>
            </div>
        `;
    });
    lucide.createIcons();
};

const renderEvents = () => {
    eventList.innerHTML = '';
    // This is still static for now, as we don't have user's RSVPs
    const events = appState.events;
    if (!events || events.length === 0) return;

    events.forEach(e => {
        // TODO: Add logic to check appState.eventRsvps
        const rsvpButton = `<button onclick="updateEventRSVP('${e.id}')" class="bg-green-500 text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-green-600 w-full">RSVP Now</button>`;
        
        eventList.innerHTML += `
            <div class="bg-white p-4 rounded-xl shadow-md">
                <div class="flex items-start">
                    <div class="p-3 bg-purple-100 rounded-lg mr-4">
                        <i data-lucide="calendar" class="w-6 h-6 text-purple-600"></i>
                    </div>
                    <div class="flex-grow">
                        <p class="text-xs font-semibold text-purple-600">${new Date(e.event_date).toLocaleDateString()}</p>
                        <h3 class="font-bold text-gray-800 text-lg">${e.title}</h3>
                        <p class="text-sm text-gray-500 mb-3">${e.description}</p>
                        <p class="text-sm font-bold text-green-600 mb-3">+${e.points_reward} EcoPoints for attending</p>
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
        <div class="${cardWidth} flex-shrink-0 bg-white border rounded-xl overflow-hidden flex flex-col shadow-md cursor-pointer transition-shadow hover:shadow-lg" 
             onclick="showProductDetailPage('${storeId}', '${product.id}')">
            
            <img src="${product.images ? product.images[0] : 'https://placehold.co/300x400/gray/white?text=No+Img'}" alt="${product.name}" class="w-full h-48 object-cover">
            <div class="p-3 flex flex-col flex-grow">
                <p class="font-bold text-gray-800 text-sm truncate">${product.name}</p>
                
                <div class="mt-auto pt-2">
                    <p class="text-xs text-gray-400 line-through">₹${product.original_price_inr || '0'}</p>
                    <div class="flex items-center font-bold text-gray-800 my-1">
                        <span class="text-md text-green-700">₹${product.discounted_price_inr || '0'}</span>
                        <span class="mx-1 text-gray-400 text-xs">+</span>
                        <i data-lucide="leaf" class="w-3 h-3 text-green-500 mr-1"></i>
                        <span class="text-sm text-green-700">${product.cost_in_points}</span>
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
            <div class="bg-white rounded-xl shadow-md overflow-hidden">
                <div class="p-4 flex items-center justify-between border-b bg-gray-50">
                    <div class="flex items-center cursor-pointer" onclick="showStoreDetailPage('${store.id}')">
                        <img src="${store.logo_url || 'https://placehold.co/40x40/gray/white?text=Store'}" class="w-10 h-10 rounded-full mr-3 border">
                        <h3 class="text-lg font-bold text-gray-800">${store.name}</h3>
                    </div>
                    <button onclick="showStoreDetailPage('${store.id}')" class="text-sm font-semibold text-green-600 hover:text-green-700">
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
        allRewardsList.innerHTML = `<p class="text-center text-gray-500 p-4">You have no rewards. Visit the Eco-Store to get some!</p>`;
    } else {
        allRewards.forEach(userReward => {
            const rewardDetails = getRewardDetails(userReward);
            if (!rewardDetails) return;

            if (rewardDetails.status === 'active') {
                allRewardsList.innerHTML += `
                    <div class="bg-white rounded-xl shadow-md overflow-hidden flex">
                        <img src="${rewardDetails.images ? rewardDetails.images[0] : 'https://placehold.co/300x400/gray/white?text=No+Img'}" alt="${rewardDetails.name}" class="w-28 h-full object-cover">
                        <div class="p-4 flex-grow flex flex-col">
                            <h3 class="font-bold text-gray-800">${rewardDetails.name}</h3>
                            <p class="text-sm text-gray-500">${rewardDetails.storeName}</p>
                            <p class="text-xs text-gray-400 mb-2 mt-1">Purchased: ${new Date(rewardDetails.purchaseDate).toLocaleDateString()}</p>
                            <button onclick="openRewardQrModal('${userReward.id}')" class="mt-auto w-full bg-green-500 text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-green-600">
                                Use Now
                            </button>
                        </div>
                    </div>
                `;
            } else {
                allRewardsList.innerHTML += `
                    <div class="bg-white rounded-xl shadow-md overflow-hidden flex opacity-60">
                        <img src="${rewardDetails.images ? rewardDetails.images[0] : 'https://placehold.co/300x400/gray/white?text=No+Img'}" alt="${rewardDetails.name}" class="w-28 h-full object-cover">
                        <div class="p-4 flex-grow">
                            <h3 class="font-bold text-gray-800">${rewardDetails.name}</h3>
                            <p class="text-sm text-gray-500">${rewardDetails.storeName}</p>
                            <p class="text-xs text-gray-400 mt-1">Purchased: ${new Date(rewardDetails.purchaseDate).toLocaleDateString()}</p>
                            <p class="text-xs text-gray-500 font-semibold">Used: ${new Date(rewardDetails.usedDate).toLocaleDateString()}</p>
                            <div class="mt-2 w-full bg-gray-200 text-gray-500 font-bold py-2 px-4 rounded-lg text-sm text-center">
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

// Make functions global so inline HTML can call them
window.performCheckIn = async () => {
    const today = getTodayDateString();
    if (appState.currentUser.last_check_in_date === today) {
        return; 
    }

    // 1. Update the student's last_check_in_date
    const { error: updateError } = await supabase
        .from('students')
        .update({ last_check_in_date: today })
        .eq('student_id', appState.currentUser.student_id);

    if (updateError) {
        console.error("Error updating check-in:", updateError.message);
        return;
    }

    // 2. Insert into points_history (this triggers the points update)
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
        return;
    }

    // 3. Update local state for instant UI change
    appState.currentUser.last_check_in_date = today;
    appState.currentUser.current_points += CHECK_IN_REWARD;
    appState.currentUser.lifetime_points += CHECK_IN_REWARD;

    // 4. Re-render
    renderCheckInCard();
    renderHeader(); 
};

window.completeChallenge = async (challengeId) => {
    // Find the challenge from appState
    const challenge = appState.dailyChallenges.find(c => c.id == challengeId);
    if (!challenge || challenge.status === 'completed') {
        return;
    }

    // 1. Insert into challenge_completions
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

    // 2. Insert into points_history (this triggers the points update)
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
        // Note: You might want to "roll back" the completion here, but for now we'll continue
    }

    // 3. Update local state for instant UI change
    challenge.status = 'completed';
    appState.currentUser.current_points += challenge.points_reward;
    appState.currentUser.lifetime_points += challenge.points_reward;

    // 4. Re-render
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
        item.classList.toggle('active', item.getAttribute('onclick').includes(`'${pageId}'`));
    });
    
    navItems.forEach(item => {
        item.classList.toggle('active', item.getAttribute('onclick').includes(`'${pageId}'`));
    });
    
    mainContent.scrollTop = 0;
    
    // Re-fetch data or just re-render?
    // For now, just re-render. You can add data-fetching logic here if needed.
    if (pageId === 'my-rewards') renderMyRewardsPage();
    if (pageId === 'profile') renderProfile();
    if (pageId === 'ecopoints') renderEcoPointsPage();
    if (pageId === 'history') renderHistory();
    if (pageId === 'leaderboard') renderLeaderboardPage();
    if (pageId === 'rewards') renderRewards();
    if (pageId === 'challenges') renderChallengesPage();
    if (pageId === 'dashboard') {
        renderCheckInCard();
        renderLeaderboardDashboard();
        renderChallengesDashboard();
    }

    toggleSidebar(true); 
};

window.showStoreDetailPage = (storeId) => {
    const store = appState.stores.find(s => s.id === storeId);
    if (!store) return;
    
    let productsHTML = '';
    appState.products.filter(p => p.store_id === storeId)
        .sort((a,b) => a.cost_in_points - b.cost_in_points)
        .forEach(product => {
            productsHTML += renderProductCard(product, store.id, 'grid');
        });
    
    storeDetailPage.innerHTML = `
        <div class="p-4 bg-white sticky top-0 z-10 border-b flex items-center">
            <button onclick="showPage('rewards')" class="p-2 text-gray-600 -ml-2 mr-2">
                <i data-lucide="arrow-left" class="w-6 h-6"></i>
            </button>
            <img src="${store.logo_url || 'https://placehold.co/40x40/gray/white?text=Store'}" class="w-10 h-10 rounded-full mr-3 border">
            <h2 class="text-xl font-bold text-gray-800">${store.name}</h2>
        </div>
        <div class="p-6">
            <h3 class="text-xl font-semibold text-gray-700 mb-4">All Products</h3>
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
                <div class="bg-gray-100 p-3 rounded-lg text-center">
                    <p class="text-xs text-gray-500">${key}</p>
                    <p class="font-semibold text-gray-800 text-sm">${value}</p>
                </div>
            `;
        }
    }

    productDetailPage.innerHTML = `
        <div class="pb-24">
            <div class="relative">
                <img src="${product.images ? product.images[0] : 'https://placehold.co/300x400/gray/white?text=No+Img'}" alt="${product.name}" class="w-full h-80 object-cover">
                <button onclick="showStoreDetailPage('${store.id}')" class="absolute top-4 left-4 p-2 bg-white/80 rounded-full shadow-md text-gray-700">
                    <i data-lucide="arrow-left" class="w-6 h-6"></i>
                </button>
            </div>
            
            <div class="p-6 bg-white">
                <h2 class="text-3xl font-bold text-gray-800">${product.name}</h2>
                <p class="text-sm text-gray-500 mb-6">${store.name}</p>
                
                <h3 class="text-xl font-bold text-gray-900 mb-3">Description</h3>
                <p class="text-gray-600 mb-6 leading-relaxed">${product.description || 'No description available.'}</p>

                <h3 class="text-xl font-bold text-gray-900 mb-3">Features</h3>
                <ul class="space-y-2 text-gray-600 mb-6">${featuresHTML}</ul>

                <h3 class="text-xl font-bold text-gray-900 mb-3">Specifications</h3>
                <div class="grid grid-cols-2 gap-3 mb-6">${specsHTML}</div>
            </div>
        </div>

        <div class="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t p-4 shadow-lg-top">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm text-gray-500 line-through">₹${product.original_price_inr || '0'}</p>
                    <div class="flex items-center font-bold text-gray-800">
                        <span class="text-2xl text-green-700">₹${product.discounted_price_inr || '0'}</span>
                        <span class="mx-2 text-gray-400">+</span>
                        <i data-lucide="leaf" class="w-5 h-5 text-green-500 mr-1"></i>
                        <span class="text-2xl text-green-700">${product.cost_in_points}</span>
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

window.updateEventRSVP = async (id) => {
    // TODO: Implement this by inserting into `event_rsvps` table
    console.log("RSVP to event:", id);
    // 1. Insert into event_rsvps
    // 2. Re-render events page
};

window.openPurchaseModal = (storeId, productId) => {
    const { store, product } = getProduct(storeId, productId);
    if (!product) return;

    purchaseModal.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold text-gray-800">Purchase Reward</h3>
            <button onclick="closePurchaseModal()" class="text-gray-400 hover:text-gray-600">
                <i data-lucide="x" class="w-6 h-6"></i>
            </button>
        </div>
        
        <div class="flex items-center mb-4">
            <img src="${product.images ? product.images[0] : 'https://placehold.co/300x400/gray/white?text=No+Img'}" alt="${product.name}" class="w-24 h-32 object-cover rounded-lg mr-4">
            <div>
                <h4 class="text-lg font-bold text-gray-800">${product.name}</h4>
                <p class="text-sm text-gray-500 mb-2">From ${store.name}</p>
                <div class="flex items-center font-bold text-gray-800">
                    <span class="text-lg text-green-700">₹${product.discounted_price_inr || '0'}</span>
                    <span class="mx-1 text-gray-400">+</span>
                    <i data-lucide="leaf" class="w-4 h-4 text-green-500 mr-1"></i>
                    <span class="text-lg text-green-700">${product.cost_in_points}</span>
                </div>
            </div>
        </div>

        <div class="bg-gray-100 rounded-lg p-3 mb-4 mt-4">
            <div class="flex justify-between items-center mb-1">
                <span class="text-gray-600">Your Balance</span>
                <span class="font-semibold text-gray-800">${appState.currentUser.current_points} EcoPoints</span>
            </div>
            <div class="flex justify-between items-center text-red-600">
                <span class="font-semibold">Cost</span>
                <span class="font-bold text-lg">-${product.cost_in_points} EcoPoints</span>
            </div>
            <hr class="my-2 border-gray-300">
            <div class="flex justify-between items-center text-green-600">
                <span class="font-semibold">Remaining</span>
                <span class="font-bold text-lg">${appState.currentUser.current_points - product.cost_in_points} EcoPoints</span>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
            <button onclick="closePurchaseModal()" class="w-full bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-lg hover:bg-gray-300">
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
    const { product } = getProduct(storeId, productId);
    if (!product) return;
    
    if (appState.currentUser.current_points < product.cost_in_points) {
        // Not enough points
        purchaseModal.innerHTML = `
            <div class="text-center p-4">
                <i data-lucide="x-circle" class="w-16 h-16 text-red-500 mx-auto mb-4"></i>
                <h3 class="text-2xl font-bold text-gray-800 mb-2">Purchase Failed</h3>
                <p class="text-gray-600 mb-6">You do not have enough points for this reward.</p>
                <button onclick="closePurchaseModal()" class="w-full bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-lg hover:bg-gray-300">
                    Close
                </button>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    // 1. Insert into user_rewards
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
        console.error("Error purchasing reward:", rewardError.message);
        return;
    }

    // 2. Insert into points_history (triggers points update)
    const { error: pointsError } = await supabase
        .from('points_history')
        .insert({
            student_id: appState.currentUser.student_id,
            points_change: -product.cost_in_points, // Note the negative sign
            description: `Purchased: ${product.name}`,
            type: 'reward-purchase'
        });
    
    if (pointsError) {
        console.error("Error logging purchase points:", pointsError.message);
        // TODO: You might want to delete the user_reward here if this fails
        return;
    }

    // 3. Update local state
    appState.currentUser.current_points -= product.cost_in_points;
    appState.userRewards.unshift(newReward);

    // 4. Show success in modal
    purchaseModal.innerHTML = `
        <div class="text-center p-4">
            <i data-lucide="check-circle" class="w-16 h-16 text-green-500 mx-auto mb-4"></i>
            <h3 class="text-2xl font-bold text-gray-800 mb-2">Purchase Successful!</h3>
            <p class="text-gray-600 mb-6">You can find your new reward in "My Rewards".</p>
            <button onclick="closePurchaseModalAndShowMyRewards()" class="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 mb-2">
                Go to My Rewards
            </button>
            <button onclick="closePurchaseModal()" class="w-full bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-lg hover:bg-gray-300">
                Done
            </button>
        </div>
    `;
    lucide.createIcons();
    
    // 5. Re-render header
    renderHeader();
};

window.closePurchaseModalAndShowMyRewards = () => {
    closePurchaseModal();
    showPage('my-rewards');
};

window.openRewardQrModal = (userRewardId) => {
    const userReward = appState.userRewards.find(ur => ur.id == userRewardId);
    const rewardDetails = getRewardDetails(userReward); 
    if (!rewardDetails) return;

    const qrData = `USER_REWARD_ID::${userReward.id}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

    qrModal.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold text-gray-800">${rewardDetails.name}</h3>
            <button onclick="closeQrModal()" class="text-gray-400 hover:text-gray-600">
                <i data-lucide="x" class="w-6 h-6"></i>
            </button>
        </div>
        
        <div class="flex justify-center mb-4 p-4 bg-white rounded-lg border">
            <img src="${qrCodeUrl}" alt="QR Code" class="rounded-lg">
        </div>

        <div class="bg-gray-100 rounded-lg p-4 text-left mb-6">
            <h4 class="font-bold text-gray-800 mb-2">How to Redeem:</h4>
            <p class="text-sm text-gray-600">${rewardDetails.instructions}</p>
        </div>

        <div class="grid grid-cols-2 gap-3">
            <button onclick="closeQrModal()" class="w-full bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-lg hover:bg-gray-300">
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

    userReward.status = 'used';
    userReward.used_date = usedDate;
    
    renderMyRewardsPage();
    closeQrModal();
};

// --- App Initialization ---

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        // No user logged in, redirect to login page
        window.location.href = 'login.html';
        return false;
    }
    return true; // User is logged in
}

async function loadInitialData() {
    // Show loading spinner
    appLoading.style.display = 'flex';

    // Fetch user profile first, as other queries depend on it
    await fetchUserProfile();
    
    if (!appState.currentUser) {
        console.error("Could not load user profile. Logging out.");
        await supabase.auth.signOut();
        window.location.href = 'login.html';
        return;
    }

    // Fetch all other data in parallel for performance
    await Promise.all([
        fetchLeaderboard(),
        fetchHistory(),
        fetchChallenges(),
        fetchEvents(),
        fetchStoresAndProducts(),
        fetchUserRewards(),
        fetchLevels()
    ]);
    
    // Hide loading spinner
    appLoading.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', async () => {
    // Add event listeners that are always present
    document.getElementById('sidebar-toggle-btn').addEventListener('click', () => toggleSidebar(false));
    logoutButton.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'login.html';
    });

    // Check if user is logged in
    const isLoggedIn = await checkAuth();
    if (!isLoggedIn) {
        return; // Stop execution, user is being redirected
    }
    
    // User is logged in, load all app data
    await loadInitialData();

    // Initial Renders
    renderHeader();
    renderLeaderboardDashboard();
    renderChallengesDashboard();
    renderCheckInCard(); 
    
    // Show the dashboard as the default page
    showPage('dashboard');
    lucide.createIcons(); // Initialize icons one last time
});
