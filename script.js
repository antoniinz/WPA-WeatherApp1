const API_KEY = 'ca7674507391d00a3390f27434118246';
const API_BASE = 'https://api.openweathermap.org/data/2.5';
const STORAGE_KEY = 'weather_last_city';

let unit = 'C';
let currentTab = 'today';
let lastWeatherData = null;
let lastForecastData = null;

const $ = id => document.getElementById(id);
const show = id => { const e = $(id); e.classList.remove('hidden'); e.style.display = ''; };
const hide = id => $(id).classList.add('hidden');

const cToF = c => Math.round(c * 9 / 5 + 32);
const displayTemp = c => unit === 'C' ? Math.round(c) + '°C' : cToF(c) + '°F';

const switchUnit = u => {
    unit = u;
    $('unit-c').classList.toggle('active', u === 'C');
    $('unit-f').classList.toggle('active', u === 'F');
    if (lastWeatherData) renderWeather(lastWeatherData, lastForecastData);
};

const switchTab = tab => {
    currentTab = tab;
    $('tab-today').classList.toggle('active', tab === 'today');
    $('tab-week').classList.toggle('active', tab === 'week');
    if (lastForecastData) renderWeekGrid(lastForecastData, lastWeatherData);
};

const windDir = deg => {
    const d = ['S','SSV','SV','VSV','V','VJV','JV','JJV','J','JJZ','JZ','ZJZ','Z','ZSZ','SZ','SSZ'];
    return d[Math.round(deg / 22.5) % 16];
};

const fmtTime = (ts, tz) => {
    const d = new Date((ts + tz) * 1000);
    return d.toISOString().substr(11, 5);
};

const weatherEmoji = id => {
    if (id >= 200 && id < 300) return '⛈️';
    if (id >= 300 && id < 400) return '🌦';
    if (id >= 500 && id < 600) return '🌧';
    if (id >= 600 && id < 700) return '❄️';
    if (id >= 700 && id < 800) return '🌫️';
    if (id === 800) return '☀️';
    if (id === 801) return '🌤';
    if (id === 802) return '⛅';
    return '☁️';
};

const humDesc = h => h < 30 ? 'Nízká' : h < 60 ? 'Normální 👍' : h < 80 ? 'Vysoká' : 'Velmi vysoká';
const visDesc = v => v >= 9 ? 'Výborná 👍' : v >= 5 ? 'Průměrná 😐' : 'Slabá 👎';
const presDesc = p => p < 1000 ? 'Nízký' : p < 1013 ? 'Normální' : p < 1025 ? 'Mírně vysoký' : 'Vysoký';
const uvDesc = u => u < 3 ? 'Nízký' : u < 6 ? 'Střední' : u < 8 ? 'Vysoký' : 'Extrémní ☀️';

const renderWeather = (d, forecast) => {
    const temp = d.main.temp;
    $('temp-big').textContent = displayTemp(temp);

    const now = new Date();
    const days = ['Neděle','Pondělí','Úterý','Středa','Čtvrtek','Pátek','Sobota'];
    $('temp-day').textContent = days[now.getDay()] + ', ' + now.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

    $('cond-desc').textContent = d.weather[0].description.charAt(0).toUpperCase() + d.weather[0].description.slice(1);

    const rain = d.rain ? Math.round(d.rain['1h'] * 10) / 10 : 0;
    $('cond-rain').textContent = rain ? `Srážky – ${rain} mm/h` : 'Bez srážek';

    $('city-card-name').textContent = d.name + ', ' + d.sys.country;

    $('wind-val').innerHTML = Math.round(d.wind.speed * 3.6) + '<span class="hl-unit"> km/h</span>';
    $('wind-dir-text').textContent = windDir(d.wind.deg || 0);

    const tz = d.timezone;
    $('sunrise').textContent = fmtTime(d.sys.sunrise, tz);
    $('sunset').textContent = fmtTime(d.sys.sunset, tz);

    const hum = d.main.humidity;
    $('hum-val').innerHTML = hum + '<span class="hl-unit"> %</span>';
    $('hum-bar').style.width = hum + '%';
    $('hum-desc').textContent = humDesc(hum);

    const vis = d.visibility ? Math.round(d.visibility / 100) / 10 : 0;
    $('vis-val').innerHTML = vis + '<span class="hl-unit"> km</span>';
    $('vis-bar').style.width = Math.min(vis / 10 * 100, 100) + '%';
    $('vis-desc').textContent = visDesc(vis);

    const pres = d.main.pressure;
    $('pres-val').innerHTML = pres + '<span class="hl-unit"> hPa</span>';
    $('pres-bar').style.width = Math.min((pres - 950) / 150 * 100, 100) + '%';
    $('pres-desc').textContent = presDesc(pres);

    const uv = Math.max(1, Math.round((10 - d.clouds.all / 15) * (temp > 0 ? 1 : 0.4)));
    $('uv-val').textContent = uv;
    $('uv-desc').textContent = uvDesc(uv);
    const arc = 126 * Math.min(uv / 11, 1);
    $('uv-arc').setAttribute('stroke-dasharray', arc + ' 126');

    if (forecast) renderWeekGrid(forecast, d);
};

const renderWeekGrid = (forecast, current) => {
    const grid = $('week-grid');
    grid.innerHTML = '';
    const today = new Date().toDateString();

    if (currentTab === 'today') {
        forecast.list.slice(0, 7).forEach((slot, i) => {
            const dt = new Date(slot.dt * 1000);
            const hr = dt.getHours().toString().padStart(2, '0') + ':00';
            const card = document.createElement('div');
            card.className = 'day-card' + (i === 0 ? ' today' : '');
            card.innerHTML = `<div class="day-name">${i === 0 ? 'Teď' : hr}</div><div class="day-icon">${weatherEmoji(slot.weather[0].id)}</div><div class="day-temps">${displayTemp(slot.main.temp)}</div>`;
            grid.appendChild(card);
        });
    } else {
        const seen = new Set(), days = [];
        for (const slot of forecast.list) {
            const d = new Date(slot.dt * 1000), key = d.toDateString();
            if (!seen.has(key) && d.getHours() >= 11 && d.getHours() <= 14) {
                seen.add(key);
                days.push(slot);
                if (days.length >= 7) break;
            }
        }
        days.forEach(slot => {
            const dt = new Date(slot.dt * 1000);
            const isToday = dt.toDateString() === today;
            const dn = ['Ne','Po','Út','St','Čt','Pá','So'];
            const card = document.createElement('div');
            card.className = 'day-card' + (isToday ? ' today' : '');
            card.innerHTML = `<div class="day-name">${isToday ? 'Dnes' : dn[dt.getDay()]}</div><div class="day-icon">${weatherEmoji(slot.weather[0].id)}</div><div class="day-temps">${displayTemp(slot.main.temp_max)} <span>${displayTemp(slot.main.temp_min)}</span></div>`;
            grid.appendChild(card);
        });
    }
};

const fetchWeather = async city => {
    hideError();
    hide('empty-state');
    hide('content');
    show('loading-state');

    try {
        const [wd, fd] = await Promise.all([
            fetch(`${API_BASE}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=cz`).then(r => {
                if (!r.ok) throw new Error(
                    r.status === 404 ? `Město „${city}" nenalezeno.` :
                        r.status === 401 ? 'Neplatný API klíč.' :
                            `Chyba ${r.status}`
                );
                return r.json();
            }),
            fetch(`${API_BASE}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=cz`).then(r => r.ok ? r.json() : null)
        ]);

        lastWeatherData = wd;
        lastForecastData = fd;

        localStorage.setItem(STORAGE_KEY, city);

        renderWeather(wd, fd);
        hide('loading-state');
        const c = $('content');
        c.classList.remove('hidden');
        c.style.display = 'flex';
    } catch (e) {
        hide('loading-state');
        show('empty-state');
        showError(e.message);
    }
};

const handleSearch = async () => {
    const city = $('city-input').value.trim();
    if (!city || city.length < 2) {
        showError('Zadej platný název města.');
        return;
    }
    await fetchWeather(city);
};

const showError = msg => {
    const e = $('sidebar-error');
    e.textContent = msg;
    e.classList.remove('hidden');
};

const hideError = () => $('sidebar-error').classList.add('hidden');

$('city-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSearch();
});

const loadLastCity = () => {
    const lastCity = localStorage.getItem(STORAGE_KEY);
    if (lastCity) {
        $('city-input').value = lastCity;
        fetchWeather(lastCity);
    }
};

loadLastCity();
