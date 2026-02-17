# Batalla Friki (NestJS + Prisma + PostgreSQL + WebSockets)

API de batallas PVE/PVP con autenticación JWT, roles y cliente web simple para corrección.

## Requisitos

- Node.js 20+
- Yarn
- Docker + Docker Compose

## Configuración de entorno

1. Copia el archivo de ejemplo:

```bash
cp .env.example .env
```

2. Revisa los valores (puedes dejar los de clase por defecto).

## Arranque rápido (para corregir)

1. Instalar dependencias:

```bash
yarn install
```

2. Levantar PostgreSQL:

```bash
docker compose up -d
```

3. Ejecutar migraciones:

```bash
npx prisma migrate deploy
```

Si estás en desarrollo local y quieres generar nuevas migraciones:

```bash
npx prisma migrate dev
```

4. Arrancar la API:

```bash
yarn start:dev
```

5. Levantar cliente web de corrección (otro terminal):

```bash
python3 -m http.server 5500 -d clients
```

6. Abrir cliente:

- [http://localhost:5500](http://localhost:5500)

## Recurso de corrección (profesor)

Se creó el módulo `profesor-correcion` para facilitar la revisión.

Rutas:

- `POST /demo/clear` → vacía la base de datos
- `POST /demo/seed` → lanza seed en orden:
  1. roles
  2. admin
  3. users
  4. characters
- `GET /demo/overview` → devuelve usuarios/roles/personajes para revisión rápida

En el cliente, el bloque **"Datos para correccion"** está al principio para usar este flujo.

## Seeds incluidos

- `prisma/seeds/roles.seed.cjs`
- `prisma/seeds/admin-user.seed.cjs`
- `prisma/seeds/users.seed.cjs`
- `prisma/seeds/characters.seed.cjs`
- Orquestador: `prisma/seeds/seed.cjs`

También puedes ejecutarlo manualmente:

```bash
yarn seed
```

## Usuarios seeded por defecto

- `admin@batalla.com` / `123456`
- `user1@batalla.com` / `123456`
- `user2@batalla.com` / `123456`
- `user3@batalla.com` / `123456`
- `user4@batalla.com` / `123456`
- `user5@batalla.com` / `123456`

## Scripts útiles

- `yarn start:dev` → API en desarrollo
- `yarn build` → compilar proyecto
- `yarn test` → tests unitarios
- `yarn seed` → ejecutar seeds

## Notas

- Al vaciar datos con `deleteMany`, los IDs autoincrementales no se reinician (comportamiento normal de PostgreSQL).
- El cliente de `clients/index.html` es de apoyo para evaluación funcional; no es frontend productivo.
