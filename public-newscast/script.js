// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const firebaseConfig = {
    apiKey: "AIzaSyARwa2-gSUmn-3pZDs72omTrPrmUQyie3k",
    authDomain: "newscast.web.app",
    projectId: "swiss-knife-c662b",
    storageBucket: "swiss-knife-c662b.firebasestorage.app",
    messagingSenderId: "458006837722",
    appId: "1:458006837722:web:699e57ef5fcf84964328e3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const API_URL = 'https://us-central1-swiss-knife-c662b.cloudfunctions.net/generate_podcast_adhoc';

let currentUser = null;
let userRssUrl = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('Newscast Script v3 Loaded (RSS Feed)');

    const signedOutDiv = document.getElementById('signed-out');
    const signedInDiv = document.getElementById('signed-in');
    const signInBtn = document.getElementById('sign-in-btn');
    const signOutBtn = document.getElementById('sign-out-btn');
    const userPhoto = document.getElementById('user-photo');
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');
    const generatorSection = document.getElementById('generator-section');
    const generateBtn = document.getElementById('generate-btn');
    const generateText = document.getElementById('generate-text');
    const generateLoading = document.getElementById('generate-loading');
    const errorMessage = document.getElementById('error-message');
    const durationSelect = document.getElementById('duration');

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    setPersistence(auth, browserLocalPersistence)
        .then(() => console.log('Persistence set to local'))
        .catch((error) => showError(`Auth Error: ${error.message}`));

    // Add dynamic location-based topics
    const topicsGrid = document.querySelector('.topics-grid');
    const addTopic = (label, value, checked = false) => {
        if (!topicsGrid) return;
        const labelEl = document.createElement('label');
        labelEl.className = 'topic-checkbox';
        labelEl.innerHTML = `
            <input type="checkbox" value="${value}" ${checked ? 'checked' : ''}>
            <span>${label}</span>
        `;
        topicsGrid.appendChild(labelEl);
    };

    (async () => {
        try {
            const res = await fetch('https://ipapi.co/json/');
            if (res.ok) {
                const data = await res.json();
                if (data.country_name) addTopic(`🇨🇴 ${data.country_name} news`, `${data.country_name} news`, true);
                if (data.city) addTopic(`🏙️ ${data.city} news`, `${data.city} news`, true);
            }
        } catch (e) {
            console.log('Location topics fetch failed', e);
        }
    })();

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            signedOutDiv.style.display = 'none';
            signedInDiv.style.display = 'block';
            generatorSection.style.display = 'block';
            document.getElementById('podcasts-section').style.display = 'block';

            userPhoto.src = user.photoURL || 'https://via.placeholder.com/50';
            userName.textContent = user.displayName || 'User';
            userEmail.textContent = user.email;

            showRssFeedInfo(user.uid);
        } else {
            currentUser = null;
            userRssUrl = null;
            signedOutDiv.style.display = 'block';
            signedInDiv.style.display = 'none';
            generatorSection.style.display = 'none';
            document.getElementById('podcasts-section').style.display = 'none';
        }
    });

    signInBtn.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            showError('Failed to sign in. Please try again.');
        }
    });

    signOutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Sign out error:', error);
        }
    });

    generateBtn.addEventListener('click', async () => {
        if (!currentUser) {
            showError('Please sign in first');
            return;
        }

        const topicCheckboxes = document.querySelectorAll('.topic-checkbox input:checked');
        const topics = Array.from(topicCheckboxes).map(cb => cb.value);

        if (topics.length === 0) {
            showError('Please select at least one topic');
            return;
        }

        const duration = parseInt(durationSelect.value);

        generateBtn.disabled = true;
        generateText.style.display = 'none';
        generateLoading.style.display = 'inline-flex';
        errorMessage.style.display = 'none';

        try {
            const idToken = await currentUser.getIdToken();

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    duration_mins: duration,
                    topics: topics,
                    voice_provider: 'gemini'
                })
            });

            const data = await response.json();

            if (response.ok) {
                if (data.rss_url) {
                    userRssUrl = data.rss_url;
                    showRssFeedInfo(currentUser.uid);
                }

                showError(data.message || 'Podcast generation started! Check your RSS feed.');
                errorMessage.style.color = '#4CAF50';
                errorMessage.style.display = 'block';

                document.querySelectorAll('.topic-checkbox input:checked').forEach(cb => cb.checked = false);
            } else {
                showError(data.error || 'Failed to start generation.');
            }
        } catch (error) {
            console.error('Generation error:', error);
            showError('An error occurred. Please try again.');
        } finally {
            generateBtn.disabled = false;
            generateText.style.display = 'inline';
            generateLoading.style.display = 'none';
        }
    });

    async function showRssFeedInfo(uid) {
        const podcastsList = document.getElementById('podcasts-list');
        const bucketName = 'swiss-knife-c662b.firebasestorage.app';
        // Use Firebase Storage API URL (CORS-respecting) with cache-buster
        const ts = Date.now();
        const encodedPath = encodeURIComponent(`users/${uid}/rss.xml`);
        // Use JSON API download endpoint which returns proper CORS headers
        const defaultRssUrl = `https://storage.googleapis.com/download/storage/v1/b/${bucketName}/o/${encodedPath}?alt=media&ts=${ts}`;
        const rssUrl = userRssUrl ? `${userRssUrl}?ts=${ts}` : defaultRssUrl;

        // Try to fetch RSS feed to get statistics
        let episodeCount = 0;
        let feedTitle = "Your Personal Podcast Feed";
        let latestEpisode = null;

        let episodes = [];
        try {
            const response = await fetch(rssUrl, { cache: 'no-store' });
            if (response.ok) {
                const xmlText = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, "text/xml");

                const channel = xmlDoc.querySelector('channel');
                if (channel) {
                    const titleEl = channel.querySelector('title');
                    if (titleEl) feedTitle = titleEl.textContent;

                    const items = Array.from(xmlDoc.querySelectorAll('item'));
                    episodes = items.map((item, idx) => {
                        const enclosure = item.querySelector('enclosure');
                        const audioUrl = enclosure ? enclosure.getAttribute('url') : null;
                        const rawTitle = item.querySelector('title')?.textContent || `Episode ${idx + 1}`;
                        const pubDate = item.querySelector('pubDate')?.textContent || '';
                        const description = item.querySelector('description')?.textContent || '';
                        const titleText = rawTitle || description || `Episode ${idx + 1}`;
                        const displayDate = pubDate ? new Date(pubDate).toLocaleString() : '';
                        return { title: titleText, audioUrl, pubDate, displayDate };
                    }).filter(ep => !!ep.audioUrl);

                    episodeCount = episodes.length;
                    if (episodes.length > 0) {
                        latestEpisode = episodes[0].displayDate;
                    }
                }
            }
        } catch (error) {
            console.log('RSS feed not yet available or error fetching:', error);
        }

        podcastsList.innerHTML = `
            <div class="rss-info" style="text-align: center; padding: 20px;">
                <h3 style="margin-bottom: 15px;">📻 ${feedTitle}</h3>
                ${episodeCount > 0 ? `
                    <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="margin: 5px 0; font-size: 18px; font-weight: bold; color: #2e7d32;">
                            ${episodeCount} Episode${episodeCount !== 1 ? 's' : ''} Available
                        </p>
                        ${latestEpisode ? `<p style="margin: 5px 0; color: #666; font-size: 14px;">Latest: ${latestEpisode}</p>` : ''}
                    </div>
                ` : `
                    <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="margin: 5px 0; color: #e65100;">No episodes yet. Generate your first podcast above!</p>
                    </div>
                `}
                <p style="margin-bottom: 20px;">Subscribe to your RSS feed in any podcast app:</p>
                <div class="rss-actions">
                    <div class="rss-actions-row">
                        <button id="listen-now-btn" class="btn btn-primary" ${episodeCount === 0 ? 'disabled' : ''}>▶ Listen now</button>
                        <button onclick="copyRssUrl()" class="btn btn-secondary">Copy RSS URL</button>
                    </div>
                    <div class="rss-url-box" style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 10px 0;">
                        <input type="text" readonly value="${rssUrl}" id="rss-url-input" 
                               style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 14px;" />
                    </div>
                </div>

                <div id="player-inline" style="margin-top: 10px; display: ${episodeCount > 0 ? 'block' : 'none'};"></div>
                <div id="pagination-controls" style="margin-top: 12px; display: ${episodeCount > 5 ? 'flex' : 'none'}; gap: 10px; justify-content: center; align-items: center;"></div>

            </div>
        `;

        // Inline player rendering
        const playerInline = document.getElementById('player-inline');
        const pagination = document.getElementById('pagination-controls');
        const listenBtn = document.getElementById('listen-now-btn');

        let page = 0;
        const pageSize = 5;
        const totalPages = Math.max(1, Math.ceil(episodes.length / pageSize));

        const renderPagination = () => {
            if (!pagination) return;
            const prevDisabled = page === 0;
            const nextDisabled = page >= totalPages - 1;
            pagination.innerHTML = `
                <button class="btn btn-secondary" id="ep-prev" ${prevDisabled ? 'disabled' : ''}>◀ Prev</button>
                <span style="font-size: 0.95rem; color: #555;">Page ${page + 1} of ${totalPages}</span>
                <button class="btn btn-secondary" id="ep-next" ${nextDisabled ? 'disabled' : ''}>Next ▶</button>
            `;
            const prev = document.getElementById('ep-prev');
            const next = document.getElementById('ep-next');
            if (prev) prev.onclick = () => { if (page > 0) { page -= 1; renderPlayer(page * pageSize); renderPagination(); } };
            if (next) next.onclick = () => { if (page < totalPages - 1) { page += 1; renderPlayer(page * pageSize); renderPagination(); } };
        };

        const renderPlayer = (idx = 0) => {
            if (!playerInline || !episodes.length) return;
            if (!episodes[idx]) idx = page * pageSize;
            if (!episodes[idx]) idx = 0;
            const sliceStart = page * pageSize;
            const visible = episodes.slice(sliceStart, sliceStart + pageSize);
            const ep = episodes[idx];
            playerInline.innerHTML = `
                <div class="inline-player">
                    <div class="inline-player-title">Now playing: ${ep.title}</div>
                    <div style="font-size: 0.9rem; color: #666; margin-bottom: 8px;">${ep.displayDate || ''}</div>
                    <audio controls style="width: 100%;">
                        <source src="${ep.audioUrl}" type="audio/wav">
                        Your browser does not support the audio element.
                    </audio>
                    <div class="episode-chips" style="margin-top: 12px;">
                        ${visible.map((e, i) => {
                            const globalIndex = sliceStart + i;
                            return `
                            <button class="chip ${globalIndex === idx ? 'chip-active' : ''}" data-ep="${globalIndex}" style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-width: 160px;">
                                <span style="font-weight: 600;">${e.title}</span>
                                <span style="font-size: 0.85rem; color: #666;">${e.displayDate || ''}</span>
                            </button>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
            playerInline.querySelectorAll('button[data-ep]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const nextIdx = parseInt(btn.getAttribute('data-ep'));
                    renderPlayer(nextIdx);
                });
            });
            playerInline.style.display = 'block';
        };

        if (listenBtn) {
            listenBtn.addEventListener('click', () => {
                if (episodes.length) {
                    page = 0;
                    renderPlayer(0);
                    renderPagination();
                } else {
                    alert('No episodes yet. Generate one to start listening.');
                }
            });
        }

        renderPagination();
        if (episodes.length) {
            renderPlayer(page * pageSize);
        }
    }

    window.copyRssUrl = function () {
        const input = document.getElementById('rss-url-input');
        input.select();
        document.execCommand('copy');
        alert('✅ RSS URL copied to clipboard!');
    };
});
