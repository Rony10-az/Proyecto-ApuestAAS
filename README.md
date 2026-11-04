# Proyecto-ApuestAS

## Ejecutar con Docker (escalamiento horizontal + balanceo de carga)

El `docker-compose.yml` levanta 3 réplicas de la app (`app1`, `app2`, `app3`) detrás de un balanceador **nginx** (round robin):

```bash
docker compose up -d --build
```

La app queda disponible en `http://localhost:8080/apuestas` (puerto configurable con `LB_PORT` en el entorno). Las réplicas no publican puerto propio: solo nginx es accesible desde el host. Los datos se persisten en `./data/db.json` mediante un volumen compartido por las 3 réplicas, con un lock de archivo (`src/repositories/json.repository.js`) que serializa las escrituras concurrentes entre procesos para que no se pierdan registros bajo carga.

Cada respuesta incluye el header `X-Instance-Id` (y `/health` el campo `instance`) para comprobar qué réplica atendió la petición:

```bash
for i in $(seq 1 6); do curl -s http://localhost:8080/health; echo; done
```

Para detener:

```bash
docker compose down
```

### Escalar a más réplicas

Para agregar una réplica más, duplicar un bloque `appN` en `docker-compose.yml` con su propio `INSTANCE_ID`, agregarlo al `upstream apuestas_backend` en `nginx/nginx.conf`, y reiniciar con `docker compose up -d --build`.

## Ejecutar en local (sin Docker)

```bash
npm install
npm run dev
```

## Pruebas de estrés

```bash
npm run stress:read   # GET /health, /calendar, /matches, /apuestas
npm run stress:write  # registro + partido + prediccion encadenados (ejercita el lock)
```

Requieren el stack levantado (`docker compose up -d --build`) y usan `http://localhost:8080` por defecto (configurable con `TARGET`, `CONNECTIONS`, `DURATION`). Metodología, resultados y un bug de concurrencia real que se encontró y corrigió durante estas pruebas: [docs/pruebas-estres.md](docs/pruebas-estres.md).