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

function showMessage(text, type = 'success') {
  elements.message.className = `message ${type}`;
  elements.message.textContent = text;
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

function renderMatches(matches) {
  if (!matches.length) {
    elements.matchesList.innerHTML = '<p class="empty-state">Aún no hay partidos disponibles.</p>';
    return;
  }
  elements.matchesList.innerHTML = matches.map((match) => {
    const date = new Date(match.startsAt).toLocaleString('es-PE', {
      dateStyle: 'medium', timeStyle: 'short',
    });
    return `
      <article class="match-card">
        <span class="team">${match.homeTeam}</span>
        <span class="match-center">VS<span class="match-date">${date}</span></span>
        <span class="team">${match.awayTeam}</span>
        ${match.status === 'scheduled' ? `
          <form class="prediction-form" data-match-id="${match.id}">
            <input name="homeScore" type="number" min="0" placeholder="0" required aria-label="Goles de ${match.homeTeam}">
            <strong>-</strong>
            <input name="awayScore" type="number" min="0" placeholder="0" required aria-label="Goles de ${match.awayTeam}">
            <button class="button button-primary" type="submit">Predecir</button>
          </form>
        ` : '<span class="match-center">Finalizado</span>'}
      </article>`;
  }).join('');
  document.querySelectorAll('.prediction-form').forEach((form) => {
    form.addEventListener('submit', submitPrediction);
  });
}

function renderRanking(ranking) {
  elements.rankingList.innerHTML = ranking.length ? ranking.map((player, index) => `
    <div class="ranking-row">
      <span class="position">#${index + 1}</span>
      <span class="rank-name">${player.name}</span>
      <span class="rank-points">${player.points} pts</span>
    </div>
  `).join('') : '<p class="empty-state">Todavía no hay participantes.</p>';
}

const PITCH_POSITION_ORDER = ['Arquero', 'Defensa', 'Mediocampista', 'Delantero'];

function groupByPosition(players) {
  return PITCH_POSITION_ORDER
    .map((position) => players.filter((player) => player.position === position))
    .filter((row) => row.length);
}

function renderPitchPlayer(player, team) {
  return `
    <span class="pitch-player" title="${player.name} · ${player.position} · #${player.number}">
      <span class="jersey" style="background:${team.colors[0]};border-color:${team.colors[1]}">${player.number}</span>
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

function renderCalendar({ matches }) {
  elements.calendarList.innerHTML = matches.map((match) => `
    <article class="calendar-card">
      <div class="calendar-meta"><span>DÍA ${match.day}</span><span>${match.date}</span><span>${match.venue}</span></div>
      <div class="calendar-score">
        <div class="calendar-team"><span class="team-flag">${match.homeTeam.flag}</span><strong>${match.homeTeam.name}</strong><small>${match.homeTeam.code} · ${match.homeTeam.formation}</small></div>
      <div class="score upcoming">VS<span> · Por jugar</span></div>
        <div class="calendar-team away"><span class="team-flag">${match.awayTeam.flag}</span><strong>${match.awayTeam.name}</strong><small>${match.awayTeam.code} · ${match.awayTeam.formation}</small></div>
      </div>
      <details class="lineup-details">
        <summary>Ver formaciones y alineaciones</summary>
        <div class="lineup-meta">
          <span>${match.awayTeam.flag} ${match.awayTeam.name} · DT ${match.awayTeam.coach} · ${match.awayTeam.formation}</span>
          <span>${match.homeTeam.flag} ${match.homeTeam.name} · DT ${match.homeTeam.coach} · ${match.homeTeam.formation}</span>
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
  elements.roomsList.innerHTML = rooms.map((room) => `
    <article class="room-card" data-room-id="${room.id}">
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
    container.innerHTML = ranking.length
      ? ranking.map((player, index) => `
        <div class="ranking-row">
          <span class="position">#${index + 1}</span>
          <span class="rank-name">${player.name}</span>
          <span class="rank-points">${player.points} pts</span>
        </div>`).join('')
      : '<p class="empty-state">Todavía no hay puntos en esta sala.</p>';
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
  const [matches, ranking] = await Promise.all([
    request('/matches'),
    request('/ranking'),
  ]);
  renderMatches(matches);
  renderRanking(ranking);
  await loadRooms();
}

async function loadCalendar() {
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
        ...formData(event.currentTarget),
        homeScore: Number(event.currentTarget.homeScore.value),
        awayScore: Number(event.currentTarget.awayScore.value),
      }),
    });
    showMessage('Predicción registrada correctamente.');
    event.currentTarget.reset();
  } catch (error) {
    showMessage(error.message, 'error');
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

setSession(state.token ? { name: 'participante' } : null);
loadCalendar();
if (state.token) loadDashboard().catch(() => {
  state.token = null;
  localStorage.removeItem('apuestas_token');
  setSession(null);
  showMessage('Tu sesión expiró. Inicia sesión nuevamente.', 'error');
});
