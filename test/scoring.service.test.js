const test = require('node:test');
const assert = require('node:assert/strict');
const { calculatePredictionPoints, calculateRanking } = require('../src/services/scoring.service');

function match(overrides) {
  return {
    id: 'm1',
    status: 'finished',
    startsAt: '2026-01-01T12:00:00.000Z',
    homeScore: 2,
    awayScore: 1,
    ...overrides,
  };
}

function prediction(overrides) {
  return {
    userId: 'u1',
    matchId: 'm1',
    createdAt: '2025-12-29T12:00:00.000Z', // 3 dias antes: dispara el bono de anticipacion
    homeScore: 2,
    awayScore: 1,
    ...overrides,
  };
}

test('resultado exacto otorga 5 puntos', () => {
  const score = calculatePredictionPoints(prediction({ homeScore: 2, awayScore: 1 }), match());
  assert.equal(score.basePoints, 5);
  assert.equal(score.reason, 'exact');
});

test('ganador correcto sin marcador exacto otorga 3 puntos', () => {
  // predice 3-1 (gana local), el partido termina 2-1 (tambien gana local)
  const score = calculatePredictionPoints(prediction({ homeScore: 3, awayScore: 1 }), match());
  assert.equal(score.basePoints, 3);
  assert.equal(score.reason, 'winner');
});

test('empate correcto cuenta como ganador correcto', () => {
  const score = calculatePredictionPoints(
    prediction({ homeScore: 0, awayScore: 0 }),
    match({ homeScore: 1, awayScore: 1 }),
  );
  assert.equal(score.basePoints, 3);
  assert.equal(score.reason, 'winner');
});

test('diferencia de goles correcta pero equipo ganador equivocado otorga 2 puntos', () => {
  // predice 0-2 (gana visita por 2), el partido termina 2-0 (gana local por 2): mismo margen, distinto ganador
  const score = calculatePredictionPoints(
    prediction({ homeScore: 0, awayScore: 2 }),
    match({ homeScore: 2, awayScore: 0 }),
  );
  assert.equal(score.basePoints, 2);
  assert.equal(score.reason, 'difference');
});

test('sin acierto no otorga puntos base', () => {
  const score = calculatePredictionPoints(prediction({ homeScore: 0, awayScore: 0 }), match());
  assert.equal(score.basePoints, 0);
  assert.equal(score.reason, 'miss');
});

test('prediccion con mas de 24h de anticipacion suma 1 punto extra', () => {
  const score = calculatePredictionPoints(
    prediction({ createdAt: '2025-12-30T00:00:00.000Z' }), // partido 2026-01-01T12:00, ~60h antes
    match(),
  );
  assert.equal(score.earlyBonus, 1);
  assert.equal(score.totalPoints, score.basePoints + 1);
});

test('prediccion de ultimo minuto (10 min antes) solo recibe puntos base', () => {
  const score = calculatePredictionPoints(
    prediction({ createdAt: '2026-01-01T11:50:00.000Z' }), // 10 min antes del partido
    match(),
  );
  assert.equal(score.earlyBonus, 0);
  assert.equal(score.totalPoints, score.basePoints);
});

test('partido no finalizado no otorga puntaje', () => {
  const score = calculatePredictionPoints(prediction(), match({ status: 'scheduled' }));
  assert.equal(score, null);
});

test('racha de 3 aciertos consecutivos (al menos ganador) suma 2 puntos bonus', () => {
  const users = [{ id: 'u1', name: 'Ana' }];
  const matches = [
    match({ id: 'm1', startsAt: '2026-01-01T00:00:00.000Z', homeScore: 1, awayScore: 0 }),
    match({ id: 'm2', startsAt: '2026-01-02T00:00:00.000Z', homeScore: 1, awayScore: 0 }),
    match({ id: 'm3', startsAt: '2026-01-03T00:00:00.000Z', homeScore: 1, awayScore: 0 }),
  ];
  // en los 3 partidos acierta solo el ganador (no el marcador exacto: predice 2-0,
  // el partido termina 1-0), y sin bono de anticipacion para aislar el calculo
  // (createdAt justo antes del partido)
  const predictions = matches.map((m) => prediction({
    matchId: m.id,
    createdAt: new Date(new Date(m.startsAt).getTime() - 60000).toISOString(),
    homeScore: 2,
    awayScore: 0,
  }));

  const ranking = calculateRanking(users, matches, predictions);
  // 3 aciertos de "ganador" (3 pts c/u) = 9, mas el bonus de racha en el 3er acierto (+2) = 11
  assert.equal(ranking[0].points, 11);
  assert.equal(ranking[0].streakBonus, 2);
});

test('un acierto de solo diferencia de goles (sin ganador) corta la racha', () => {
  // la racha exige "al menos el ganador": un acierto de nivel "diferencia" (2 pts)
  // no cuenta para mantenerla, aunque sume puntos.
  const users = [{ id: 'u1', name: 'Ana' }];
  const matches = [
    match({ id: 'm1', startsAt: '2026-01-01T00:00:00.000Z', homeScore: 1, awayScore: 0 }),
    match({ id: 'm2', startsAt: '2026-01-02T00:00:00.000Z', homeScore: 1, awayScore: 0 }),
    match({ id: 'm3', startsAt: '2026-01-03T00:00:00.000Z', homeScore: 1, awayScore: 0 }),
  ];
  const predictions = [
    prediction({
      matchId: 'm1',
      createdAt: '2025-12-31T23:00:00.000Z',
      homeScore: 2,
      awayScore: 0, // acierta el ganador (3 pts)
    }),
    prediction({
      matchId: 'm2',
      createdAt: '2026-01-01T23:00:00.000Z',
      homeScore: 0,
      awayScore: 1, // predice que gana la visita por 1, el partido lo gana el local por 1: solo diferencia (2 pts)
    }),
    prediction({
      matchId: 'm3',
      createdAt: '2026-01-02T23:00:00.000Z',
      homeScore: 2,
      awayScore: 0, // acierta el ganador (3 pts), pero la racha ya se cortó en m2
    }),
  ];

  const ranking = calculateRanking(users, matches, predictions);
  assert.equal(ranking[0].streakBonus, 0);
});

test('calculateRanking ordena por puntos descendente', () => {
  const users = [
    { id: 'u1', name: 'Ana' },
    { id: 'u2', name: 'Beto' },
  ];
  const matches = [match({ id: 'm1', startsAt: '2026-01-01T00:00:00.000Z' })];
  const predictions = [
    prediction({
      userId: 'u1', matchId: 'm1', createdAt: '2025-12-29T00:00:00.000Z', homeScore: 2, awayScore: 1,
    }),
    prediction({
      userId: 'u2', matchId: 'm1', createdAt: '2025-12-29T00:00:00.000Z', homeScore: 0, awayScore: 0,
    }),
  ];

  const ranking = calculateRanking(users, matches, predictions);
  assert.equal(ranking[0].userId, 'u1');
  assert.ok(ranking[0].points > ranking[1].points);
});
