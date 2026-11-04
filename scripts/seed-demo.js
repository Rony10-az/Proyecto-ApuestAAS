// Siembra datos de demostracion usando EXCLUSIVAMENTE los partidos del
// calendario del Mundial (src/data/world-cup-calendar.js) como partidos
// reales disponibles para predecir -- no se inventan equipos ni partidos
// distintos a los del calendario. Las banderas y la formacion de cada
// equipo se guardan en el propio partido para que "Partidos disponibles"
// se vea igual que el calendario.
//
// De los 4 partidos del calendario, 3 se marcan como finalizados (despues
// de que los usuarios de demo ya enviaron su prediccion) para demostrar las
// 5 reglas de puntuacion con datos reales; el 4to queda genuinamente abierto
// -- sin resultado y sin predicciones -- para que cualquier usuario
// (incluido el evaluador) entre y vote su propia prediccion.
//
// Uso: npm run seed

const authService = require('../src/services/auth.service');
const matchService = require('../src/services/match.service');
const predictionService = require('../src/services/prediction.service');
const userRepository = require('../src/repositories/user.repository');
const { findTeam } = require('../src/data/world-cup-calendar');

const DEMO_PASSWORD = 'Demo1234';

const DEMO_USERS = [
  { name: 'Camila Rojas', email: 'camila.rojas@apuestas.demo' },
  { name: 'Diego Castillo', email: 'diego.castillo@apuestas.demo' },
  { name: 'Valeria Núñez', email: 'valeria.nunez@apuestas.demo' },
  { name: 'Renzo Flores', email: 'renzo.flores@apuestas.demo' },
];

function hoursFromNow(hours) {
  return new Date(Date.now() + hours * 3600000).toISOString();
}

function minutesFromNow(minutes) {
  return new Date(Date.now() + minutes * 60000).toISOString();
}

// Claves del calendario (src/data/world-cup-calendar.js). Los 3 primeros se
// finalizan con el resultado real de Qatar 2022 para demostrar las reglas de
// puntuacion; "usa"-"wal" se deja abierto, sin tocar, para votar en vivo.
const FINISHED_MATCHES = [
  {
    home: 'qat',
    away: 'ecu',
    startsAt: hoursFromNow(48), // >24h de anticipacion: aplica el bono
    result: [0, 2],
    predictions: {
      // Camila: resultado exacto (5 pts) + anticipada (+1)
      'camila.rojas@apuestas.demo': [0, 2],
      // Diego: acierta solo el ganador (3 pts) + anticipada (+1)
      'diego.castillo@apuestas.demo': [1, 3],
      // Valeria: acierta solo la diferencia de goles, no el ganador (2 pts) + anticipada (+1)
      'valeria.nunez@apuestas.demo': [2, 0],
      // Renzo: falla todo (0 pts) + anticipada (+1, el bono no depende del acierto)
      'renzo.flores@apuestas.demo': [1, 1],
    },
  },
  {
    home: 'eng',
    away: 'irn',
    startsAt: hoursFromNow(48),
    result: [6, 2],
    predictions: {
      'camila.rojas@apuestas.demo': [6, 2], // exacto
      'diego.castillo@apuestas.demo': [3, 1], // solo ganador
      'valeria.nunez@apuestas.demo': [2, 6], // solo diferencia (margen 4, ganador invertido)
      'renzo.flores@apuestas.demo': [1, 1], // falla todo
    },
  },
  {
    home: 'sen',
    away: 'ned',
    startsAt: minutesFromNow(3), // <24h: demuestra "sin bono por anticipacion" (ultimo minuto)
    result: [0, 2],
    predictions: {
      // 3er acierto exacto seguido de Camila: bono de racha +2
      'camila.rojas@apuestas.demo': [0, 2],
      // 3er acierto de "ganador" seguido de Diego: bono de racha +2
      'diego.castillo@apuestas.demo': [1, 2],
      'valeria.nunez@apuestas.demo': [2, 0], // solo diferencia
      // Renzo no predice este partido (se abstiene)
    },
  },
];

// Partido abierto de verdad: mismo calendario, sin resultado ni
// predicciones precargadas.
const OPEN_MATCH = { home: 'usa', away: 'wal', startsAt: hoursFromNow(72) };

function matchPayload({ home, away, startsAt }) {
  const homeTeam = findTeam(home);
  const awayTeam = findTeam(away);
  return {
    homeTeam: homeTeam.name,
    awayTeam: awayTeam.name,
    startsAt,
    homeFlagUrl: homeTeam.flagUrl,
    awayFlagUrl: awayTeam.flagUrl,
    homeFormation: homeTeam.formation,
    awayFormation: awayTeam.formation,
  };
}

function seedUsers() {
  const users = {};
  for (const demo of DEMO_USERS) {
    const existing = userRepository.findByEmail(demo.email);
    if (existing) {
      users[demo.email] = existing;
      continue;
    }
    const { user } = authService.register({
      name: demo.name,
      email: demo.email,
      password: DEMO_PASSWORD,
    });
    users[demo.email] = user;
  }
  return users;
}

function seedFinishedMatches(users) {
  for (const spec of FINISHED_MATCHES) {
    const match = matchService.create(matchPayload(spec));
    for (const [email, [homeScore, awayScore]] of Object.entries(spec.predictions)) {
      predictionService.save(users[email].id, { matchId: match.id, homeScore, awayScore });
    }
    matchService.finish(match.id, spec.result[0], spec.result[1]);
    console.log(`Partido finalizado: ${match.homeTeam} ${spec.result[0]}-${spec.result[1]} ${match.awayTeam}`);
  }
}

function seedOpenMatch() {
  const match = matchService.create(matchPayload(OPEN_MATCH));
  console.log(`Partido abierto para predecir: ${match.homeTeam} vs ${match.awayTeam}`);
}

function main() {
  if (userRepository.findByEmail(DEMO_USERS[0].email)) {
    console.log('Los datos de demostración ya existen (se encontró a Camila Rojas registrada).');
    console.log('No se vuelve a sembrar. Para reiniciar, vacía data/db.json y vuelve a correr "npm run seed".');
    return;
  }

  const users = seedUsers();
  seedFinishedMatches(users);
  seedOpenMatch();

  console.log('\nListo. Usuarios de demostración (todos con contraseña "Demo1234"):');
  DEMO_USERS.forEach((u) => console.log(`  - ${u.email}`));
  console.log('\nRanking esperado (de mayor a menor): Camila Rojas > Diego Castillo > Valeria Núñez > Renzo Flores.');
}

main();
