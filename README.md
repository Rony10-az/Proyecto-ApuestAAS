# Proyecto-ApuestAS

## Ejecutar con Docker

```bash
docker compose up -d --build
```

La app queda disponible en `http://localhost:3000/apuestas` (puerto configurable con `PORT` en `.env`). Los datos se persisten en `./data/db.json` mediante un volumen, y el contenedor expone un healthcheck sobre `/health`.

Para detener:

```bash
docker compose down
```

## Ejecutar en local (sin Docker)

```bash
npm install
npm run dev
```