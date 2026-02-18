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

he creado el módulo `profesor-correcion` para ayudar a la correción y que se pueda cacharrear en el que lanza el seed directamente y tambien se puede vaciar la bbdd etc

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

- En PVP, cada jugador elige su propio personaje pero no puede ser el mismo los dos
- En PVE, el personaje de la maquina se elige aleatoriamente entre los disponibles
- El dano del ataque tiene variacion aleatoria por turno (BAJO/NORMAL/ALTO/CRITICO) el algoritmo está en el service lo que no se puede es fallar ataque

## Otras cosas
- Fernando como te comenté te he ido poniendo comentarios en algunos archivos en los que haya podido hacer alguna cosa distinta o añadido alguna cosa por si te choca o lo que sea ya que cosas como alguna cosa de prisma o por ejemplo la capa de seguridad de la autenticación en websockets eso he consultado la ia pero tambien he buscado otras fuentes como videos de youtube y documentación en el caso de prisma que es lo que más problemas quizás que me haya dado a la hora de manejar todos los datos que he manejado de las batalla, como las transacciones y más cosas pues la verdad que la documentación me ha ayudado bastante aunque seguramente tendré algunas cosas mal o mejorables.
