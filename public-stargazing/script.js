/**
 * Stargazing Application Logic
 * Dependencies: astronomy-engine
 */

let NAKSHATRA_DATA = [];
let VEDIC_TRANSLATIONS = {};
let currentLang = localStorage.getItem('vedic-lang') || 'en';

// --- INITIALIZATION ---

async function init() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        NAKSHATRA_DATA = data.NAKSHATRA_DATA;
        VEDIC_TRANSLATIONS = data.VEDIC_TRANSLATIONS;

        setupEventListeners();
        updateClock();
        setInterval(updateClock, 1000);
        fetchIPLocation();
    } catch (e) {
        console.error("Failed to load astronomical data", e);
        showError("Failed to load application data. Please refresh.");
    }
}

function setupEventListeners() {
    const locateBtn = document.getElementById('locate-btn');
    const langSelect = document.getElementById('vedic-lang-select');

    if (langSelect) {
        langSelect.value = currentLang;
        langSelect.addEventListener('change', (e) => {
            currentLang = e.target.value;
            localStorage.setItem('vedic-lang', currentLang);
            if (window.lastLat && window.lastLng) {
                updateAllData(new Date(), window.lastLat, window.lastLng);
            }
        });
    }

    if (locateBtn) {
        locateBtn.addEventListener('click', () => {
            if (!navigator.geolocation) {
                showError("Geolocation is not supported by your browser.");
                return;
            }
            document.getElementById('initial-state').classList.add('hidden');
            document.getElementById('loading-state').classList.remove('hidden');
            document.getElementById('data-state').classList.add('hidden');
            getLoc(true);
        });
    }
}

// --- CLOCK & TIME ---

function updateClock() {
    const now = new Date();
    const utcEl = document.getElementById('utc-time');
    const localEl = document.getElementById('local-time');

    if (utcEl) utcEl.innerText = formatFullDate(now, true) + ' UTC';
    if (localEl) {
        let tzName = '';
        try {
            const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(now);
            const tzPart = parts.find(p => p.type === 'timeZoneName');
            if (tzPart) tzName = tzPart.value;
        } catch (e) {
            tzName = 'Local';
        }
        localEl.innerText = formatFullDate(now, false) + ' ' + tzName;
    }
}

function formatFullDate(date, isUTC) {
    const pad = (n) => n.toString().padStart(2, '0');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dayName = isUTC ? days[date.getUTCDay()] : days[date.getDay()];
    const monthName = isUTC ? months[date.getUTCMonth()] : months[date.getMonth()];
    const year = isUTC ? date.getUTCFullYear().toString().slice(-2) : date.getFullYear().toString().slice(-2);
    const day = pad(isUTC ? date.getUTCDate() : date.getDate());
    const hours = pad(isUTC ? date.getUTCHours() : date.getHours());
    const minutes = pad(isUTC ? date.getUTCMinutes() : date.getMinutes());
    const seconds = pad(isUTC ? date.getUTCSeconds() : date.getSeconds());

    return `${dayName}, ${day} ${monthName} ${year} ${hours}:${minutes}:${seconds}`;
}

// --- LOCATION ---

async function fetchIPLocation() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.latitude && data.longitude) {
            success({
                coords: { latitude: data.latitude, longitude: data.longitude }
            }, false);
        }
    } catch (e) {
        console.warn("IP Location failed:", e);
    }
}

function getLoc(highAccuracy) {
    navigator.geolocation.getCurrentPosition(
        (pos) => success(pos, true),
        (err) => {
            if (highAccuracy) {
                getLoc(false);
            } else {
                handleLocationError(err);
            }
        },
        { enableHighAccuracy: highAccuracy, timeout: 10000, maximumAge: 0 }
    );
}

function success(position, isPrecise) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    window.lastLat = lat;
    window.lastLng = lng;

    const coordsEl = document.getElementById('location-coords');
    if (coordsEl) {
        coordsEl.innerText = `${lat.toFixed(4)}, ${lng.toFixed(4)}` + (isPrecise ? " (GPS)" : " (IP)");
    }

    fetchLocationName(lat, lng);
    updateAllData(new Date(), lat, lng);
}

function updateAllData(now, lat, lng) {
    document.getElementById('initial-state').classList.add('hidden');
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('data-state').classList.remove('hidden');

    if (typeof Astronomy !== 'undefined') {
        updateSolarLunarCycles(now, lat, lng);
        updateVedicDetails(now, lat, lng);
        updatePlanetaryPositions(now);
        fetchWeather(lat, lng);
        updateExternalLinks(lat, lng);
    } else {
        setTimeout(() => updateAllData(now, lat, lng), 500);
    }
}

async function fetchLocationName(lat, lng) {
    const nameEl = document.getElementById('location-name');
    if (!nameEl) return;
    nameEl.innerText = "Locating city...";
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`);
        const data = await response.json();
        if (data && data.address) {
            const city = data.address.city || data.address.town || data.address.village || data.address.hamlet || data.address.county;
            const country = data.address.country;
            nameEl.innerText = city ? `${city}, ${country}` : data.display_name.split(',')[0];
        } else {
            nameEl.innerText = "Unknown Location";
        }
    } catch (e) {
        console.error("Reverse geocoding failed", e);
        nameEl.innerText = "";
    }
}

// --- ASTRONOMY HELPERS ---

function getAyanamsa(t) {
    const year = t.date.getFullYear();
    return 24.1 + (year - 2000) * 0.014;
}

function getAngleDiff(a, b) {
    let d = a - b;
    while (d <= -180) d += 360;
    while (d > 180) d -= 360;
    return d;
}

function getCompassDir(az) {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(az / 22.5) % 16];
}

// --- WEATHER ---

async function fetchWeather(lat, lng) {
    const weatherSection = document.getElementById('weather-data');
    if (weatherSection) weatherSection.classList.remove('hidden');

    try {
        const [wRes, aRes] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=cloud_cover,visibility,relative_humidity_2m`),
            fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi`)
        ]);

        const wData = await wRes.json();
        const aData = await aRes.json();

        if (wData.current && aData.current) {
            const cloud = wData.current.cloud_cover;
            const visKm = wData.current.visibility / 1000;
            const humid = wData.current.relative_humidity_2m;
            const aqi = aData.current.us_aqi;

            document.getElementById('weather-cloud').innerText = `${cloud}%`;
            document.getElementById('weather-vis').innerText = `${visKm.toFixed(1)} km`;
            document.getElementById('weather-humidity').innerText = `${humid}%`;
            document.getElementById('weather-aqi').innerText = `${aqi}`;

            const badge = document.getElementById('weather-status-badge');
            if (cloud <= 20 && visKm > 8 && aqi < 100) {
                badge.innerText = "Excellent Observing";
                badge.style.background = "#15803d";
            } else if (cloud <= 50) {
                badge.innerText = "Fair Observing";
                badge.style.background = "#b45309";
            } else {
                badge.innerText = "Poor Conditions";
                badge.style.background = "#b91c1c";
            }
            badge.style.color = "#fff";
        }
    } catch (e) {
        console.warn("Weather fetch failed", e);
        const badge = document.getElementById('weather-status-badge');
        if (badge) badge.innerText = "Unavailable";
    }
}

// --- SOLAR & LUNAR CYCLES ---

function updateSolarLunarCycles(date, lat, lng) {
    const obs = new Astronomy.Observer(lat, lng, 0);

    const formatTimeShort = (d) => {
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const h = d.getHours().toString().padStart(2, '0');
        const m = d.getMinutes().toString().padStart(2, '0');
        return isToday ? `${h}:${m}` : `${d.getDate()}/${d.getMonth() + 1} ${h}:${m}`;
    };

    const processBody = (body, idPrefix) => {
        const nextRise = Astronomy.SearchRiseSet(body, obs, +1, date, 2);
        const nextSet = Astronomy.SearchRiseSet(body, obs, -1, date, 2);
        const prevRise = Astronomy.SearchRiseSet(body, obs, +1, date, -2);
        const prevSet = Astronomy.SearchRiseSet(body, obs, -1, date, -2);

        if (!nextRise || !nextSet || !prevRise || !prevSet) {
            document.getElementById(`${idPrefix}-cycle-range`).innerText = "No Event / Polar";
            return;
        }

        const isUp = nextSet.date < nextRise.date;
        let label, time, start, end, icon;

        if (isUp) {
            label = idPrefix === "sun" ? "Sunset" : "Moonset";
            time = nextSet.date;
            start = prevRise.date;
            end = nextSet.date;
            icon = idPrefix === "sun" ? "🌇" : "📉";
        } else {
            label = idPrefix === "sun" ? "Sunrise" : "Moonrise";
            time = nextRise.date;
            start = prevSet.date;
            end = nextRise.date;
            icon = idPrefix === "sun" ? "🌅" : "📈";
        }

        document.getElementById(`label-${idPrefix}-cycle`).innerText = `${icon} Next ${label}`;
        document.getElementById(`${idPrefix}-next-event-time`).innerText = formatTimeShort(time);
        document.getElementById(`${idPrefix}-cycle-range`).innerText = `${formatTimeShort(start)} - ${formatTimeShort(end)}`;

        const progress = ((date - start) / (end - start)) * 100;
        document.getElementById(`progress-${idPrefix}`).style.width = `${Math.min(100, Math.max(0, progress))}%`;
    };

    processBody(Astronomy.Body.Sun, "sun");
    processBody(Astronomy.Body.Moon, "moon");

    // Moon Phase
    const phase = Astronomy.MoonPhase(date);
    document.getElementById('moon-phase-name').innerText = getMoonPhaseName(phase);
    document.getElementById('progress-phase').style.width = `${(phase / 360) * 100}%`;

    const lastNew = Astronomy.SearchMoonPhase(0, date, -45);
    const nextNew = Astronomy.SearchMoonPhase(0, date, 45);
    if (lastNew && nextNew) {
        document.getElementById('moon-phase-range').innerText = `${formatTimeShort(lastNew.date)} - ${formatTimeShort(nextNew.date)}`;
    }
}

// --- PLANETARY POSITIONS ---

function updatePlanetaryPositions(date) {
    const planetarySection = document.getElementById('planetary-data');
    if (planetarySection) planetarySection.classList.remove('hidden');

    const data = VEDIC_TRANSLATIONS[currentLang] || VEDIC_TRANSLATIONS['en'];
    const container = document.getElementById('planet-list');
    if (!container) return;
    container.innerHTML = '';

    const time = Astronomy.MakeTime(date);
    const prevTime = time.AddDays(-1 / 24);
    const ayanamsa = getAyanamsa(time);
    const westernSigns = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

    const planetsInSign = Array.from({ length: 12 }, () => []);
    const bodies = [
        { name: 'Sun', key: Astronomy.Body.Sun, icon: '☀️' },
        { name: 'Moon', key: Astronomy.Body.Moon, icon: '🌙' },
        { name: 'Mercury', key: Astronomy.Body.Mercury, icon: '☿️' },
        { name: 'Venus', key: Astronomy.Body.Venus, icon: '♀️' },
        { name: 'Mars', key: Astronomy.Body.Mars, icon: '♂️' },
        { name: 'Jupiter', key: Astronomy.Body.Jupiter, icon: '♃' },
        { name: 'Saturn', key: Astronomy.Body.Saturn, icon: '♄' },
        { name: 'Uranus', key: Astronomy.Body.Uranus, icon: '♅' },
        { name: 'Neptune', key: Astronomy.Body.Neptune, icon: '♆' }
    ];

    bodies.forEach(body => {
        let lon, prevLon;
        try {
            const getL = (t) => (body.key === Astronomy.Body.Sun) ? Astronomy.SunPosition(t).elon : Astronomy.EclipticLongitude(body.key, t);
            lon = getL(time);
            prevLon = getL(prevTime);
        } catch (e) { return; }

        let diff = lon - prevLon;
        if (diff < -180) diff += 360;
        if (diff > 180) diff -= 360;

        let siderealLon = (lon - ayanamsa + 360) % 360;
        const rashiIndex = Math.floor(siderealLon / 30) % 12;
        const nakIndex = Math.floor(siderealLon / (360 / 27));

        planetsInSign[rashiIndex].push({
            ...body,
            degree: siderealLon % 30,
            nakshatra: data.nakshatra[nakIndex] || "",
            isRetrograde: diff < 0
        });
    });

    const gridDiv = document.createElement('div');
    gridDiv.className = 'chart-grid';
    gridDiv.innerHTML = '<div class="chart-center"><div>Rashi Chart</div></div>';

    for (let i = 0; i < 12; i++) {
        const cell = document.createElement('div');
        cell.className = `chart-cell sign-${i}`;
        const rashiStr = data.rashi[i];
        const [symbol, ...nameParts] = rashiStr.split(' ');
        const rashiName = nameParts.join(' ');

        cell.innerHTML = `
            <div class="chart-cell-label" style="flex-direction:column; align-items:center;">
                <span style="color:#fff; font-size:0.75rem;">${westernSigns[i]}</span>
                <span style="color:#94a3b8; font-size:0.7rem;">${rashiName} (${symbol})</span>
            </div>
            <div class="chart-planets"></div>
        `;

        const pContainer = cell.querySelector('.chart-planets');
        planetsInSign[i].forEach(p => {
            const span = document.createElement('span');
            span.className = 'planet-icon tooltip-container';
            const retro = p.isRetrograde ? '<span style="color:#f87171; font-size:0.7rem;">(R)</span>' : '';
            span.innerHTML = `<span style="color:#38bdf8;">${p.name}</span> <span>${p.icon}</span>${retro}`;
            span.setAttribute('data-tip', `Pos: ${p.degree.toFixed(2)}°\nNakshatra: ${p.nakshatra}\nMotion: ${p.isRetrograde ? 'Retro' : 'Direct'}`);
            pContainer.appendChild(span);
        });
        gridDiv.appendChild(cell);
    }
    container.appendChild(gridDiv);
}

// --- VEDIC DETAILS ---

function updateVedicDetails(date, lat, lng) {
    const vedicSection = document.getElementById('vedic-data');
    if (vedicSection) vedicSection.classList.remove('hidden');

    const data = VEDIC_TRANSLATIONS[currentLang] || VEDIC_TRANSLATIONS['en'];
    const time = Astronomy.MakeTime(date);

    // Update labels if needed
    Object.keys(data.labels || {}).forEach(key => {
        const el = document.getElementById(`label-${key}`);
        if (el) el.innerText = data.labels[key];
    });

    const formatT = (d) => `${d.getDate()}/${d.getMonth() + 1} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

    function findCrossing(startT, currentVal, targetVal, rate, callback) {
        const delta = getAngleDiff(currentVal, targetVal);
        const est = startT.AddDays(-delta / rate);
        const res = Astronomy.Search(callback, est.AddDays(-0.7), est.AddDays(0.7));
        return res ? res.date : est.date;
    }

    // Tithi
    let sunLon;
    try { sunLon = Astronomy.SunPosition(time).elon; } catch (e) { sunLon = 0; }
    const moonLon = Astronomy.EclipticLongitude(Astronomy.Body.Moon, time);
    let diff = (moonLon - sunLon + 360) % 360;

    const tithiNum = Math.floor(diff / 12) + 1;
    const isShukla = tithiNum <= 15;
    const tithiIndex = (tithiNum - 1) % 15;
    let tName = data.tithi[tithiIndex];
    let tIcon = isShukla ? "🌒" : "🌘";

    if (tithiNum === 15) { tName = data.tithi[14]; tIcon = "🌕"; }
    else if (tithiNum === 30) { tName = data.tithi[15]; tIcon = "🌑"; }

    document.getElementById('vedic-tithi').innerText = `${tIcon} ${tName}`;
    document.getElementById('progress-tithi').style.width = `${((diff % 12) / 12) * 100}%`;
    document.getElementById('vedic-paksha').innerText = isShukla ? data.paksha[0] : data.paksha[1];
    document.getElementById('progress-paksha').style.width = `${((tithiNum - 1 + (diff % 12) / 12) % 15) / 15 * 100}%`;

    const tithiCb = (target) => (t) => {
        const s = Astronomy.SunPosition(t).elon;
        const m = Astronomy.EclipticLongitude(Astronomy.Body.Moon, t);
        return getAngleDiff((m - s + 360) % 360, target);
    };
    const tStart = findCrossing(time, diff, (tithiNum - 1) * 12, 12.19, tithiCb((tithiNum - 1) * 12));
    const tEnd = findCrossing(time, diff, tithiNum * 12, 12.19, tithiCb(tithiNum * 12));
    document.getElementById('vedic-tithi-end').innerText = `${formatT(tStart)} - ${formatT(tEnd)}`;

    // Nakshatra
    const ayan = getAyanamsa(time);
    let siderealMoon = (moonLon - ayan + 360) % 360;
    const nakIndex = Math.floor(siderealMoon / (360 / 27));
    const nData = NAKSHATRA_DATA[nakIndex];
    document.getElementById('vedic-nakshatra').innerText = `✨ ${data.nakshatra[nakIndex]} ${nData ? '(' + nData.star + ')' : ''}`;
    document.getElementById('progress-nakshatra').style.width = `${(siderealMoon % (360 / 27)) / (360 / 27) * 100}%`;

    const nakCb = (target) => (t) => getAngleDiff((Astronomy.EclipticLongitude(Astronomy.Body.Moon, t) - getAyanamsa(t) + 360) % 360, target);
    const nEnd = findCrossing(time, siderealMoon, (nakIndex + 1) * (360 / 27), 13.17, nakCb((nakIndex + 1) * (360 / 27)));
    document.getElementById('vedic-nakshatra-end').innerText = `Ends: ${formatT(nEnd)}`;

    // Rashi
    const mRashiIdx = Math.floor(siderealMoon / 30);
    document.getElementById('vedic-moon-rashi').innerText = data.rashi[mRashiIdx];
    document.getElementById('progress-moon-rashi').style.width = `${(siderealMoon % 30) / 30 * 100}%`;

    let siderealSun = (sunLon - ayan + 360) % 360;
    const sRashiIdx = Math.floor(siderealSun / 30);
    document.getElementById('vedic-sun-rashi').innerText = data.rashi[sRashiIdx];
    document.getElementById('vedic-masa').innerText = data.masaName[sRashiIdx];
    document.getElementById('progress-sun-rashi').style.width = `${(siderealSun % 30) / 30 * 100}%`;
    document.getElementById('progress-masa').style.width = `${(siderealSun % 30) / 30 * 100}%`;

    // Prahara & Vaara
    const obs = new Astronomy.Observer(lat, lng, 0);
    const prevSunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, +1, date, -1);
    const nextSunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, +1, date, 1);
    if (prevSunrise && nextSunrise) {
        document.getElementById('vedic-vaara').innerText = data.vaara[prevSunrise.date.getDay()];
        document.getElementById('vedic-vaara-end').innerText = `${formatT(prevSunrise.date)} - ${formatT(nextSunrise.date)}`;
        document.getElementById('progress-vaara').style.width = `${(date - prevSunrise.date) / (nextSunrise.date - prevSunrise.date) * 100}%`;
    }

    const nextSet = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, -1, date, 1);
    const nextRise = nextSunrise;

    let praharaStr = "--";
    let praharaEnd = "";

    if (nextRise && nextSet) {
        if (nextSet.date < nextRise.date) {
            // Day Time
            const currentRise = prevSunrise || Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, +1, date, -1);
            if (currentRise) {
                const dayLen = nextSet.date - currentRise.date;
                const elapsed = date - currentRise.date;
                const p = Math.floor(elapsed / (dayLen / 4)) + 1;
                if (p <= 4) {
                    praharaStr = `${data.prahara[0]} ${p}/4`;
                    const pDur = dayLen / 4;
                    const pProg = ((elapsed % pDur) / pDur) * 100;
                    document.getElementById('progress-prahara').style.width = `${pProg}%`;
                    const startP = new Date(currentRise.date.getTime() + ((p - 1) * pDur));
                    const endP = new Date(currentRise.date.getTime() + (p * pDur));
                    praharaEnd = `${formatT(startP)} - ${formatT(endP)}`;
                }
            }
        } else {
            // Night Time
            const prevSet = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, -1, date, -1);
            if (prevSet) {
                const nightLen = nextRise.date - prevSet.date;
                const elapsed = date - prevSet.date;
                const p = Math.floor(elapsed / (nightLen / 4)) + 1;
                if (p <= 4) {
                    praharaStr = `${data.prahara[1]} ${p}/4`;
                    const pDur = nightLen / 4;
                    const pProg = ((elapsed % pDur) / pDur) * 100;
                    document.getElementById('progress-prahara').style.width = `${pProg}%`;
                    const startP = new Date(prevSet.date.getTime() + ((p - 1) * pDur));
                    const endP = new Date(prevSet.date.getTime() + (p * pDur));
                    praharaEnd = `${formatT(startP)} - ${formatT(endP)}`;
                }
            }
        }
    }
    document.getElementById('vedic-prahara').innerText = praharaStr;
    document.getElementById('vedic-prahara-end').innerText = praharaEnd;
}

function updateExternalLinks(lat, lng) {
    const container = document.getElementById('skymap-container');
    if (!container) return;
    container.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    const params = new URLSearchParams({
        longitude: lng, latitude: lat, projection: 'stereo', constellations: 'true',
        constellationlabels: 'true', showstarlabels: 'true', showplanets: 'true',
        showplanetlabels: 'true', showdate: 'false', showposition: 'false', live: 'true',
        az: 180, color: 'white', mouse: 'true', keyboard: 'true'
    });
    iframe.src = `https://virtualsky.lco.global/embed/index.html?${params.toString()}`;
    container.appendChild(iframe);

    // Zoom Button Logic
    // Since cross-origin limits direct control of the iframe's internal state,
    // we focus the iframe so that keyboard shortcuts ([ and ]) work immediately.
    const zoomIn = document.getElementById('map-zoom-in');
    const zoomOut = document.getElementById('map-zoom-out');
    if (zoomIn) zoomIn.onclick = () => { iframe.focus(); };
    if (zoomOut) zoomOut.onclick = () => { iframe.focus(); };

    const haLink = document.getElementById('ha-link');
    if (haLink) {
        const offset = new Date().getTimezoneOffset();
        let tz = 'UCT' + (offset < 0 ? 'm' : '') + Math.floor(Math.abs(offset) / 60) + (offset % 60 ? 'colon' + (offset % 60) : '');
        haLink.href = `https://heavens-above.com/main.aspx?lat=${lat}&lng=${lng}&loc=Unnamed&alt=0&tz=${tz}`;
    }
}

function handleLocationError(err) {
    console.warn(`ERROR(${err.code}): ${err.message}. Falling back to default.`);
    success({ coords: { latitude: 28.6139, longitude: 77.2090 } }, false);
}

function showError(msg) {
    const errEl = document.getElementById('error-msg');
    if (errEl) {
        errEl.innerText = msg;
        errEl.classList.remove('hidden');
    }
}

function getMoonPhaseName(degrees) {
    if (degrees < 10 || degrees > 350) return "New Moon 🌑";
    if (degrees < 80) return "Waxing Crescent 🌒";
    if (degrees < 100) return "First Quarter 🌓";
    if (degrees < 170) return "Waxing Gibbous 🌔";
    if (degrees < 190) return "Full Moon 🌕";
    if (degrees < 260) return "Waning Gibbous 🌖";
    if (degrees < 280) return "Last Quarter 🌗";
    return "Waning Crescent 🌘";
}

// Start app
init();
