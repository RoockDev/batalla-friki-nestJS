# Cliente de prueba (profesor)

Cliente web minimo para probar el backend sin Postman/API.http.

## 1) Arrancar API Nest

```bash
yarn start:dev
```

## 2) Levantar este cliente estatico

Desde la raiz del proyecto:

```bash
python3 -m http.server 5500 -d clients
```

## 3) Abrir en navegador

`http://localhost:5500`

## Flujo recomendado de prueba

1. `Registrar` (si el usuario no existe)
2. `Login`
3. El cliente conecta WS automaticamente y carga personajes automaticamente
4. Para PVP:
   - Navegador A: `Crear PVP (esperar rival)` y comparte el ID de batalla
   - Navegador B: mete ese ID en `ID batalla para unirte` y pulsa `Unirme a PVP`
5. Para PVE: `Iniciar vs maquina`
5. `Siguiente turno`
6. `Refrescar batalla`
7. (Opcional profesor) `Vaciar base de datos` + `Lanzar seed (publico)` + `Ver usuarios y personajes`

En `Log` se ven respuestas REST y eventos WebSocket (`battle-updated`).

Notas:
- En PVP, cada jugador elige su propio personaje.
- En PVE, el personaje de la maquina se elige aleatoriamente entre los disponibles.
- El dano del ataque tiene variacion aleatoria por turno (BAJO/NORMAL/ALTO/CRITICO).
