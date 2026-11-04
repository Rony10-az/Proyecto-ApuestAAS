const fs = require('fs');
const path = require('path');
const autocannon = require('autocannon');

const target = process.env.TARGET || 'http://localhost:8080';
const connections = Number(process.env.CONNECTIONS || 30);
const duration = Number(process.env.DURATION || 20);

function randomId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Cada "ciclo" por conexion encadena 3 escrituras reales contra el mismo
// data/db.json compartido por las 3 replicas: registrar usuario, crear
// partido y registrar una prediccion. Esto somete el lock de
// src/repositories/json.repository.js a contencion real entre procesos.
async function main() {
  const result = await autocannon({
    url: target,
    connections,
    duration,
    requests: [
      {
        method: 'POST',
        path: '/auth/register',
        setupRequest: (request, context) => {
          const id = randomId();
          context.email = `stress-${id}@test.com`;
          return {
            ...request,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              name: `Stress ${id}`,
              email: context.email,
              password: 'Test1234',
            }),
          };
        },
        onResponse: (status, body, context) => {
          if (status === 201) {
            context.token = JSON.parse(body).token;
          }
        },
      },
      {
        method: 'POST',
        path: '/matches',
        setupRequest: (request, context) => {
          const id = randomId();
          return {
            ...request,
            headers: {
              'content-type': 'application/json',
              authorization: `Bearer ${context.token}`,
            },
            body: JSON.stringify({
              homeTeam: `Local-${id}`,
              awayTeam: `Visita-${id}`,
              startsAt: '2030-01-01T00:00:00.000Z',
            }),
          };
        },
        onResponse: (status, body, context) => {
          if (status === 201) {
            context.matchId = JSON.parse(body).id;
          }
        },
      },
      {
        method: 'POST',
        path: '/predictions',
        setupRequest: (request, context) => ({
          ...request,
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${context.token}`,
          },
          body: JSON.stringify({
            matchId: context.matchId,
            homeScore: Math.floor(Math.random() * 5),
            awayScore: Math.floor(Math.random() * 5),
          }),
        }),
      },
    ],
  });

  const outDir = path.join(__dirname, 'results');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'write-load.json'),
    JSON.stringify(result, null, 2),
  );

  console.log(autocannon.printResult(result));
}

main().catch((error) => {
  console.error('Error ejecutando la prueba de carga de escritura:', error);
  process.exit(1);
});
