const fs = require('fs');
const path = require('path');

const dataDirectory = path.join(__dirname, '../../data');
const databasePath = path.join(dataDirectory, 'db.json');

function ensureDatabase() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }
  if (!fs.existsSync(databasePath)) {
    fs.writeFileSync(databasePath, JSON.stringify({
      users: [],
      matches: [],
      predictions: [],
      rooms: [],
    }, null, 2));
  }
}

function readDatabase() {
  ensureDatabase();
  return JSON.parse(fs.readFileSync(databasePath, 'utf8'));
}

function writeDatabase(database) {
  ensureDatabase();
  // Escritura atomica (write + rename): fs.writeFileSync sobre databasePath
  // directamente trunca el archivo antes de escribir el contenido nuevo, por
  // lo que una lectura concurrente de otra replica (findById/findByEmail no
  // pasan por el lock) puede ver el archivo a mitad de escritura y romper el
  // JSON.parse. rename() en el mismo filesystem es atomico, asi que cualquier
  // lectura ve siempre la version anterior completa o la nueva completa.
  const tmpPath = `${databasePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(database, null, 2));
  fs.renameSync(tmpPath, databasePath);
}

const lockPath = `${databasePath}.lock`;
const LOCK_TIMEOUT_MS = 5000;
const LOCK_STALE_MS = 10000;

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// db.json puede ser escrito por varias replicas (horizontal scaling) a la vez.
// Este lock de archivo (basado en creacion exclusiva, atomica a nivel de SO)
// serializa el ciclo leer-modificar-escribir entre procesos/contenedores para
// que dos escrituras concurrentes no se pisen entre si.
function withLock(mutator) {
  ensureDatabase();
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  let fd;
  for (;;) {
    try {
      fd = fs.openSync(lockPath, 'wx');
      break;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      try {
        const { mtimeMs } = fs.statSync(lockPath);
        if (Date.now() - mtimeMs > LOCK_STALE_MS) {
          fs.unlinkSync(lockPath);
          continue;
        }
      } catch (_statErr) {
        continue;
      }
      if (Date.now() > deadline) {
        const error = new Error('No se pudo adquirir el bloqueo de la base de datos, intente nuevamente');
        error.statusCode = 503;
        throw error;
      }
      sleep(25);
    }
  }
  try {
    const database = readDatabase();
    const result = mutator(database);
    writeDatabase(database);
    return result;
  } finally {
    fs.closeSync(fd);
    fs.unlinkSync(lockPath);
  }
}

module.exports = {
  readDatabase,
  writeDatabase,
  withLock,
};
