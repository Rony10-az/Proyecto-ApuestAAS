# Documentación de pruebas — ApuestAs

## 1. Objetivo

Validar que la aplicación, desplegada como 3 réplicas (`app1`, `app2`, `app3`) detrás
de un balanceador de carga nginx (ver [README.md](../README.md)), se comporta
correctamente bajo carga concurrente: que el balanceo distribuye el tráfico, que el
sistema responde dentro de márgenes razonables, y — lo más crítico — que **no se
pierden ni corrompen datos** cuando varias réplicas escriben al mismo `data/db.json`
al mismo tiempo.

## 2. Entorno de prueba

- Stack: `docker compose up -d --build` (3 réplicas + nginx), sin tráfico externo.
- Balanceador: `http://localhost:8080` (nginx, round robin).
- Herramienta de carga: [autocannon](https://github.com/mcollina/autocannon) (devDependency).
- Scripts: [`stress/read-load.js`](../stress/read-load.js) y [`stress/write-load.js`](../stress/write-load.js).
- Hardware: equipo local del desarrollador (Docker Desktop, Windows).

## 3. Escenario 1 — Carga de lectura

Simula tráfico de usuarios navegando la app: `GET /health`, `GET /calendar`,
`GET /matches`, `GET /apuestas`, repartidos en round robin por conexión.

```bash
TARGET=http://localhost:8080 CONNECTIONS=50 DURATION=20 npm run stress:read
```

| Métrica | Valor |
|---|---|
| Conexiones concurrentes | 50 |
| Duración | 20 s |
| Peticiones totales | 16 566 |
| Throughput promedio | 828 req/s |
| Latencia p50 | 56 ms |
| Latencia p97.5 | 152 ms |
| Latencia p99 | 177 ms |
| Latencia máxima | 268 ms |
| Errores / timeouts / no-2xx | 0 / 0 / 0 |

**Resultado:** sin errores, latencia estable y baja. El balanceador distribuye las
16 566 peticiones entre las 3 réplicas sin degradación (se verificó por separado con
`X-Instance-Id` que las 3 réplicas reciben tráfico en round robin — ver README).

## 4. Escenario 2 — Carga de escritura (y el bug que expuso)

Simula el flujo real más exigente: cada conexión repite en bucle **registro de
usuario → creación de partido → registro de predicción**, es decir, 3 escrituras
reales al `data/db.json` compartido por proceso/iteración.

```bash
TARGET=http://localhost:8080 CONNECTIONS=30 DURATION=20 npm run stress:write
```

### 4.1 Primer intento: falla real detectada

La primera corrida (con el lock de escritura ya implementado para el escalamiento
horizontal) arrojó **47 errores 500** con mensajes como:

```
SyntaxError: Unterminated string in JSON at position 24576
SyntaxError: Unexpected non-whitespace character after JSON at position 20541
```

**Causa raíz:** el lock (`withLock` en
[`json.repository.js`](../src/repositories/json.repository.js)) serializa las
*escrituras* entre sí, pero las *lecturas* (`findByEmail`, `findById`, `list`, usadas
en cada request autenticado) nunca pasan por el lock. `fs.writeFileSync` no es
atómico: trunca el archivo y luego escribe el contenido nuevo. Una réplica podía
leer `db.json` justo en ese intervalo y recibir un archivo a medio escribir →
`JSON.parse` fallaba → 500.

Es un problema de **lectura-escritura concurrente**, no de escritura-escritura (ese
ya estaba cubierto por el lock).

### 4.2 Corrección aplicada

Se cambió `writeDatabase` para escribir a un archivo temporal y reemplazar con
`fs.renameSync` (atómico a nivel de sistema de archivos):

```js
const tmpPath = `${databasePath}.${process.pid}.${Date.now()}.tmp`;
fs.writeFileSync(tmpPath, JSON.stringify(database, null, 2));
fs.renameSync(tmpPath, databasePath);
```

Con `rename` dentro del mismo filesystem, cualquier lectura concurrente ve siempre
la versión anterior completa o la nueva completa — nunca un estado intermedio.

### 4.3 Resultado tras la corrección

| Métrica | Valor |
|---|---|
| Conexiones concurrentes | 30 |
| Duración | 20 s |
| Peticiones HTTP completadas | 250 (100% 2xx) |
| Throughput promedio | 12.5 req/s (ciclos de 3 escrituras encadenadas) |
| Latencia p50 | 2044 ms |
| Latencia p97.5 | 4263 ms |
| Latencia máxima | 4674 ms |
| Errores / timeouts / no-2xx | 0 / 0 / 0 |

**Verificación de integridad posterior** (sobre `data/db.json`):

| Chequeo | Resultado |
|---|---|
| Usuarios nuevos persistidos | 106 |
| Partidos nuevos persistidos | 91 |
| Predicciones nuevas persistidas | 83 |
| Emails duplicados | 0 |
| Predicciones con `userId` huérfano | 0 |
| Predicciones con `matchId` huérfano | 0 |

Cero corrupción, cero duplicados, cero referencias rotas. El total de registros
persistidos (280) es mayor que las 250 peticiones que autocannon alcanzó a contabilizar
como completadas, porque la herramienta corta las conexiones al llegar al límite de
tiempo aunque el servidor ya haya terminado de procesar y persistir esa escritura
(latencia alta + corte por duración, no pérdida de datos).

## 5. Hallazgos y conclusiones

1. **El balanceo de carga funciona correctamente** para tráfico de lectura: buen
   throughput, latencias bajas, 0 errores con 50 conexiones concurrentes.
2. **Se detectó y corrigió una condición de carrera real** (lectura durante
   escritura no atómica) que solo aparece bajo concurrencia multi-proceso — no se
   habría visto probando con una sola réplica.
3. **Limitación conocida:** el lock de escritura es global (un solo `db.json`
   compartido), así que el *throughput de escritura* no escala horizontalmente —
   las 3 réplicas compiten por el mismo lock. Para esta aplicación educativa es
   aceptable (la latencia bajo carga de escritura sube a ~2-4 s con 30 conexiones
   concurrentes, pero sin errores ni pérdida de datos). Si el volumen de escrituras
   concurrentes creciera en un entorno real, el siguiente paso sería migrar de
   `db.json` a una base de datos con soporte real de transacciones concurrentes
   (p. ej. PostgreSQL), que es justamente lo que este patrón de lock por archivo
   viene a suplir de forma mínima.
4. **Lectura y escritura escalan de forma distinta**: las lecturas sí se benefician
   de las 3 réplicas (no hay lock), las escrituras no. Esto es importante para
   dimensionar expectativas de capacidad.

## 6. Cómo reproducir

```bash
docker compose up -d --build
TARGET=http://localhost:8080 CONNECTIONS=50 DURATION=20 npm run stress:read
TARGET=http://localhost:8080 CONNECTIONS=30 DURATION=20 npm run stress:write
docker compose down
```

Los resultados crudos (JSON de autocannon) quedan en `stress/results/`.
