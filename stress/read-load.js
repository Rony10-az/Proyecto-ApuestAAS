const fs = require('fs');
const path = require('path');
const autocannon = require('autocannon');

const target = process.env.TARGET || 'http://localhost:8080';
const connections = Number(process.env.CONNECTIONS || 50);
const duration = Number(process.env.DURATION || 20);

async function main() {
  const result = await autocannon({
    url: target,
    connections,
    duration,
    requests: [
      { method: 'GET', path: '/health' },
      { method: 'GET', path: '/calendar' },
      { method: 'GET', path: '/matches' },
      { method: 'GET', path: '/apuestas' },
    ],
  });

  const outDir = path.join(__dirname, 'results');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'read-load.json'),
    JSON.stringify(result, null, 2),
  );

  console.log(autocannon.printResult(result));
}

main().catch((error) => {
  console.error('Error ejecutando la prueba de carga de lectura:', error);
  process.exit(1);
});
