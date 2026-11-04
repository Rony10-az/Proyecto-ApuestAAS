const state = {
  token: localStorage.getItem('apuestas_token'),
};

const elements = {
  authSection: document.querySelector('#auth-section'),
  appSection: document.querySelector('#app-section'),
  sessionUser: document.querySelector('#session-user'),
  logoutButton: document.querySelector('#logout-button'),
  message: document.querySelector('#message'),
  matchesList: document.querySelector('#matches-list'),
  calendarList: document.querySelector('#calendar-list'),
  rankingList: document.querySelector('#ranking-list'),
  roomsSection: document.querySelector('#rooms-section'),
  roomsList: document.querySelector('#rooms-list'),
};

async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la solicitud');
  return data;
}

const TOAST_ICON = {
  success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
};

let toastTimer = null;

function showMessage(text, type = 'success') {
  clearTimeout(toastTimer);
  elements.message.innerHTML = `
    <span class="toast-icon">${TOAST_ICON[type] || TOAST_ICON.success}</span>
    <span class="toast-text">${text}</span>`;
  elements.message.className = `toast toast-${type} toast-visible`;
  toastTimer = setTimeout(() => elements.message.classList.remove('toast-visible'), 3400);
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setSession(user) {
  elements.authSection.classList.toggle('hidden', Boolean(state.token));
  elements.appSection.classList.toggle('hidden', !state.token);
  elements.roomsSection.classList.toggle('hidden', !state.token);
  elements.logoutButton.classList.toggle('hidden', !state.token);
  elements.sessionUser.textContent = user ? `Hola, ${user.name}` : '';
}

async function authenticate(event, endpoint) {
  event.preventDefault();
  try {
    const result = await request(`/auth/${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(formData(event.target)),
    });
    state.token = result.token;
    localStorage.setItem('apuestas_token', state.token);
    setSession(result.user);
    showMessage(endpoint === 'register' ? 'Cuenta creada correctamente.' : 'Sesión iniciada.');
    await loadDashboard();
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

function matchTeam(name, flagUrl, formation, variant) {
  return `
    <div class="calendar-team${variant === 'away' ? ' away' : ''}">
      ${flagUrl ? `<img class="team-flag-img" src="${flagUrl}" alt="Bandera de ${name}" loading="lazy">` : ''}
      <span><strong>${name}</strong>${formation ? `<small>${formation}</small>` : ''}</span>
    </div>`;
}

const SCORE_REASON_LABEL = {
  exact: 'Resultado exacto',
  winner: 'Ganador correcto',
  difference: 'Diferencia de goles',
  miss: 'Sin acierto',
};

function voteFlag(flagUrl, name) {
  return flagUrl ? `<img class="vote-flag" src="${flagUrl}" alt="Bandera de ${name}" loading="lazy">` : '';
}

function voteActiveState(mine, home, away) {
  if (!mine) return '';
  return Number(mine.homeScore) === home && Number(mine.awayScore) === away ? ' active' : '';
}

function renderPredictPanel(match, mine) {
  if (match.status === 'finished') {
    if (!mine) return '';
    const { homeScore, awayScore } = mine;
    const points = mine.score ? mine.score.totalPoints : 0;
    const reason = mine.score ? SCORE_REASON_LABEL[mine.score.reason] : SCORE_REASON_LABEL.miss;
    return `<p class="my-prediction">Tu predicción fue <strong>${homeScore} - ${awayScore}</strong> · ${reason}, <strong>+${points} pts</strong></p>`;
  }

  const homeValue = mine ? mine.homeScore : '';
  const awayValue = mine ? mine.awayScore : '';
  return `
    <div class="predict-panel">
      ${mine ? `<p class="my-prediction">Ya votaste <strong>${mine.homeScore} - ${mine.awayScore}</strong>. Puedes actualizarla:</p>` : ''}
      <div class="predict-header">
        <p class="vote-label">¿Quién gana?</p>
        <span class="points-hint">Ganador correcto <strong>+3 pts</strong></span>
      </div>
      <div class="vote-options" data-match-id="${match.id}">
        <button type="button" class="vote-btn${voteActiveState(mine, 1, 0)}" data-home="1" data-away="0">
          ${voteFlag(match.homeFlagUrl, match.homeTeam)}
          <span class="vote-team">${match.homeTeam}</span>
          ${match.homeFormation ? `<span class="vote-formation">${match.homeFormation}</span>` : ''}
        </button>
        <button type="button" class="vote-btn vote-draw${voteActiveState(mine, 1, 1)}" data-home="1" data-away="1">
          <span class="vote-icon-draw" aria-hidden="true">=</span>
          <span class="vote-team">Empate</span>
        </button>
        <button type="button" class="vote-btn${voteActiveState(mine, 0, 1)}" data-home="0" data-away="1">
          ${voteFlag(match.awayFlagUrl, match.awayTeam)}
          <span class="vote-team">${match.awayTeam}</span>
          ${match.awayFormation ? `<span class="vote-formation">${match.awayFormation}</span>` : ''}
        </button>
      </div>
      <form class="prediction-form" data-match-id="${match.id}">
        <label class="score-label">O arma el marcador exacto <span class="points-hint">+5 pts si aciertas</span></label>
        <div class="score-inputs">
          <input name="homeScore" type="number" min="0" placeholder="0" value="${homeValue}" required aria-label="Goles de ${match.homeTeam}">
          <strong>-</strong>
          <input name="awayScore" type="number" min="0" placeholder="0" value="${awayValue}" required aria-label="Goles de ${match.awayTeam}">
          <button class="button button-primary" type="submit">${mine ? 'Actualizar predicción' : 'Confirmar predicción'}</button>
        </div>
      </form>
    </div>`;
}

function renderMatches(matches, myPredictions = []) {
  if (!matches.length) {
    elements.matchesList.innerHTML = '<p class="empty-state">Aún no hay partidos disponibles.</p>';
    return;
  }
  const predictionsByMatch = Object.fromEntries(myPredictions.map((p) => [p.matchId, p]));
  elements.matchesList.innerHTML = matches.map((match, index) => {
    const date = new Date(match.startsAt).toLocaleString('es-PE', {
      dateStyle: 'medium', timeStyle: 'short',
    });
    const isFinished = match.status === 'finished';
    const mine = predictionsByMatch[match.id];
    return `
      <article class="match-card" style="--i:${index}">
        ${matchTeam(match.homeTeam, match.homeFlagUrl, match.homeFormation, 'home')}
        <span class="match-center">
          ${isFinished ? `<strong>${match.homeScore} - ${match.awayScore}</strong>` : '<span class="live-dot" aria-hidden="true"></span>VS'}
          <span class="match-date">${date}</span>
        </span>
        ${matchTeam(match.awayTeam, match.awayFlagUrl, match.awayFormation, 'away')}
        ${isFinished ? '<span class="match-center">Finalizado</span>' : ''}
        ${renderPredictPanel(match, mine)}
      </article>`;
  }).join('');
  document.querySelectorAll('.prediction-form').forEach((form) => {
    form.addEventListener('submit', submitPrediction);
  });
  document.querySelectorAll('.vote-options').forEach((group) => {
    group.querySelectorAll('.vote-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.vote-btn').forEach((other) => other.classList.remove('active'));
        btn.classList.add('active');
        const form = document.querySelector(`.prediction-form[data-match-id="${group.dataset.matchId}"]`);
        form.homeScore.value = btn.dataset.home;
        form.awayScore.value = btn.dataset.away;
      });
    });
  });
}

const AVATAR_PALETTE = ['#2e8b57', '#1d5b3a', '#0f6b4c', '#3c6e52', '#2f6690', '#6a4c93', '#a44a3f', '#c9852b'];

function hashString(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function avatarFor(name) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((word) => word[0].toUpperCase()).join('');
  return { initials, color: AVATAR_PALETTE[hashString(name) % AVATAR_PALETTE.length] };
}

function starIcon(filled) {
  return `<svg class="${filled ? 'star-filled' : 'star-empty'}" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9-6.3 3.9 1.7-7L2 9.2l7.1-.6z"/></svg>`;
}

function starRating(points, maxPoints) {
  const filled = maxPoints > 0 ? Math.max(0, Math.min(5, Math.round((points / maxPoints) * 5))) : 0;
  return Array.from({ length: 5 }, (_, i) => starIcon(i < filled)).join('');
}

function rankingRowHtml(player, index, maxPoints) {
  const { initials, color } = avatarFor(player.name);
  return `
    <div class="ranking-row" style="--i:${index}">
      <span class="position">#${index + 1}</span>
      <span class="rank-avatar" style="background:${color}">${initials}</span>
      <span class="rank-info">
        <span class="rank-name">${player.name}</span>
        <span class="rank-meta">
          <span class="rank-stars">${starRating(player.points, maxPoints)}</span>
          <span class="rank-points">${player.points} pts</span>
        </span>
      </span>
    </div>`;
}

function renderRankingInto(container, ranking) {
  if (!ranking.length) {
    container.innerHTML = '<p class="empty-state">Todavía no hay participantes.</p>';
    return;
  }
  const maxPoints = ranking[0].points;
  container.innerHTML = ranking.map((player, index) => rankingRowHtml(player, index, maxPoints)).join('');
}

function renderRanking(ranking) {
  renderRankingInto(elements.rankingList, ranking);
}

const PITCH_POSITION_ORDER = ['Arquero', 'Defensa', 'Mediocampista', 'Delantero'];

function groupByPosition(players) {
  return PITCH_POSITION_ORDER
    .map((position) => players.filter((player) => player.position === position))
    .filter((row) => row.length);
}

function contrastTextColor(hex) {
  const value = hex.replace('#', '');
  const r = parseInt(value.substring(0, 2), 16);
  const g = parseInt(value.substring(2, 4), 16);
  const b = parseInt(value.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#13201a' : '#ffffff';
}

function renderPitchPlayer(player, team) {
  const textColor = contrastTextColor(team.colors[0]);
  return `
    <span class="pitch-player" title="${player.name} · ${player.position} · #${player.number}">
      <span class="jersey" style="background:${team.colors[0]};border-color:${team.colors[1]};color:${textColor}">${player.number}</span>
      <span class="pitch-player-name">${player.name.split(' ').slice(-1)[0]}</span>
    </span>`;
}

function renderPitchTeam(team, rowOrder) {
  const rows = groupByPosition(team.players);
  const ordered = rowOrder === 'reverse' ? [...rows].reverse() : rows;
  return `
    <div class="pitch-team">
      ${ordered.map((row) => `
        <div class="pitch-row">${row.map((player) => renderPitchPlayer(player, team)).join('')}</div>
      `).join('')}
    </div>`;
}

function flagImg(team) {
  return `<img class="team-flag-img" src="${team.flagUrl}" alt="Bandera de ${team.name}" loading="lazy">`;
}

function renderCalendar({ matches }) {
  elements.calendarList.innerHTML = matches.map((match, index) => `
    <article class="calendar-card" style="--i:${index}">
      <div class="calendar-meta"><span>DÍA ${match.day}</span><span>${match.date}</span><span>${match.venue}</span></div>
      <div class="calendar-score">
        <div class="calendar-team">${flagImg(match.homeTeam)}<span><strong>${match.homeTeam.name}</strong><small>${match.homeTeam.code} · ${match.homeTeam.formation}</small></span></div>
        <div class="score upcoming"><span class="live-dot" aria-hidden="true"></span>VS<span>Por jugar</span></div>
        <div class="calendar-team away">${flagImg(match.awayTeam)}<span><strong>${match.awayTeam.name}</strong><small>${match.awayTeam.code} · ${match.awayTeam.formation}</small></span></div>
      </div>
      <details class="lineup-details">
        <summary>Ver formaciones y alineaciones</summary>
        <div class="lineup-meta">
          <span>${flagImg(match.awayTeam)} ${match.awayTeam.name} · DT ${match.awayTeam.coach} · ${match.awayTeam.formation}</span>
          <span>${flagImg(match.homeTeam)} ${match.homeTeam.name} · DT ${match.homeTeam.coach} · ${match.homeTeam.formation}</span>
        </div>
        <div class="pitch">
          <div class="pitch-stripes" aria-hidden="true"></div>
          <div class="pitch-circle" aria-hidden="true"></div>
          <div class="pitch-line" aria-hidden="true"></div>
          <div class="pitch-goal pitch-goal-top" aria-hidden="true"></div>
          <div class="pitch-goal pitch-goal-bottom" aria-hidden="true"></div>
          ${renderPitchTeam(match.awayTeam, 'normal')}
          ${renderPitchTeam(match.homeTeam, 'reverse')}
        </div>
      </details>
    </article>`).join('');
}

function renderRooms(rooms) {
  if (!rooms.length) {
    elements.roomsList.innerHTML = '<p class="empty-state">Aún no perteneces a ninguna sala.</p>';
    return;
  }
  elements.roomsList.innerHTML = rooms.map((room, index) => `
    <article class="room-card" data-room-id="${room.id}" style="--i:${index}">
      <h3>${room.name}</h3>
      <span class="room-code">${room.code}</span>
      <p class="room-members">${room.members.length} participante${room.members.length === 1 ? '' : 's'}</p>
      <button class="button button-ghost room-ranking-button" type="button" data-room-id="${room.id}">Ver ranking</button>
      <div class="room-ranking hidden"></div>
    </article>`).join('');
  document.querySelectorAll('.room-ranking-button').forEach((button) => {
    button.addEventListener('click', toggleRoomRanking);
  });
}

async function toggleRoomRanking(event) {
  const roomId = event.currentTarget.dataset.roomId;
  const container = document.querySelector(`.room-card[data-room-id="${roomId}"] .room-ranking`);
  if (!container.classList.contains('hidden')) {
    container.classList.add('hidden');
    return;
  }
  try {
    const ranking = await request(`/rooms/${roomId}/ranking`);
    if (!ranking.length) {
      container.innerHTML = '<p class="empty-state">Todavía no hay puntos en esta sala.</p>';
    } else {
      renderRankingInto(container, ranking);
    }
    container.classList.remove('hidden');
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function loadRooms() {
  renderRooms(await request('/rooms/mine'));
}

async function createRoom(event) {
  event.preventDefault();
  try {
    await request('/rooms', { method: 'POST', body: JSON.stringify(formData(event.target)) });
    showMessage('Sala creada correctamente.');
    event.target.reset();
    await loadRooms();
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function joinRoom(event) {
  event.preventDefault();
  try {
    await request('/rooms/join', { method: 'POST', body: JSON.stringify(formData(event.target)) });
    showMessage('Te uniste a la sala correctamente.');
    event.target.reset();
    await loadRooms();
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function loadDashboard() {
  const [matches, ranking, myPredictions] = await Promise.all([
    request('/matches'),
    request('/ranking'),
    request('/predictions/mine'),
  ]);
  renderMatches(matches, myPredictions);
  renderRanking(ranking);
  await loadRooms();
}

function renderSkeleton(container, count) {
  container.innerHTML = Array.from({ length: count }, () => '<div class="skeleton-row"></div>').join('');
}

async function loadCalendar() {
  renderSkeleton(elements.calendarList, 2);
  try {
    renderCalendar(await request('/calendar?days=2'));
  } catch (error) {
    elements.calendarList.innerHTML = `<p class="empty-state">${error.message}</p>`;
  }
}

async function submitPrediction(event) {
  event.preventDefault();
  try {
    await request('/predictions', {
      method: 'POST',
      body: JSON.stringify({
        matchId: event.currentTarget.dataset.matchId,
        homeScore: Number(event.currentTarget.homeScore.value),
        awayScore: Number(event.currentTarget.awayScore.value),
      }),
    });
    showMessage('Predicción registrada correctamente.');
    const [matches, myPredictions] = await Promise.all([
      request('/matches'),
      request('/predictions/mine'),
    ]);
    renderMatches(matches, myPredictions);
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

function initHero() {
  const hero = document.querySelector('#hero');
  const heroBg = document.querySelector('#hero-bg');
  const ballWrap = document.querySelector('#hero-ball-wrap');
  const ball = document.querySelector('#hero-ball');
  if (!hero || !heroBg) return;

  heroBg.style.backgroundImage = "url('/images/hero-stadium.jpg')";

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const rect = hero.getBoundingClientRect();
      if (rect.bottom > 0) {
        heroBg.style.transform = `translateY(${window.scrollY * 0.25}px)`;
      }
      ticking = false;
    });
  }, { passive: true });

  if (ballWrap) {
    hero.addEventListener('mousemove', (event) => {
      const rect = hero.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      ballWrap.style.transform = `translate(${x * 26}px, ${y * 26}px)`;
    });
    hero.addEventListener('mouseleave', () => {
      ballWrap.style.transform = '';
    });
  }

  if (ball) {
    ball.addEventListener('click', () => {
      ball.classList.remove('kicked');
      void ball.offsetWidth;
      ball.classList.add('kicked');
      setTimeout(() => ball.classList.remove('kicked'), 600);
    });
  }
}

document.querySelector('#login-form').addEventListener('submit', (event) => authenticate(event, 'login'));
document.querySelector('#register-form').addEventListener('submit', (event) => authenticate(event, 'register'));
document.querySelector('#refresh-button').addEventListener('click', loadDashboard);
document.querySelector('#create-room-form').addEventListener('submit', createRoom);
document.querySelector('#join-room-form').addEventListener('submit', joinRoom);
elements.logoutButton.addEventListener('click', () => {
  state.token = null;
  localStorage.removeItem('apuestas_token');
  setSession(null);
  showMessage('Sesión cerrada.');
});

initHero();
setSession(state.token ? { name: 'participante' } : null);
loadCalendar();
if (state.token) loadDashboard().catch(() => {
  state.token = null;
  localStorage.removeItem('apuestas_token');
  setSession(null);
  showMessage('Tu sesión expiró. Inicia sesión nuevamente.', 'error');
});
