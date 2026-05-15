---
schemaVersion: 1
scope: workspace
updatedAt: "2026-05-15T01:57:07.479Z"
workspaceName: "BOT"
---

# Project Memory

## Project Overview
- Workspace para diagnosticar, corregir y mantener comandos de un bot de WhatsApp.
- El bot corre en VPS Linux con Node.js, PM2 y MySQL. XAMPP solo es referencia local ocasional.
- Flujo preferido: desarrollo local en VS Code + Git, despliegue a VPS con `git pull`, migraciones/validación en VPS y reinicio con PM2.
- Casos trabajados: mejoras de objetos de tienda, recompensas automáticas del Top 3 global, manejo seguro de errores de comandos y ejecución de migraciones SQL.

## Current State
- No hay trabajo visual, `DESIGN.md` ni configuración de diseño; la sesión es soporte técnico/código.
- `AGENTS.md` existe y contiene el flujo de trabajo preferido del usuario.
- Sistema de mejoras generalizado para objetos de tienda relevantes mediante `src/mejorasItems.js`.
- `.top` registra historial diario del Top 3, exige 3 días consecutivos en la misma posición, corta racha al cambiar/salir del Top 3 y evita pago duplicado diario.
- Errores de comandos: ya no muestran detalles técnicos ni mencionan PM2 a usuarios; se reportan al grupo de owners.
- Problema activo: confirmar el nombre real de la base MySQL en producción. `USE nexobot;` falla con `ERROR 1049 Unknown database`.
- Último incidente: el usuario intentó `SHOW DATABASES;` en MySQL y quedó en prompt `->`, señal de comando incompleto; se indicó cancelar con `\c` o usar `mysql -u root -p -e "SHOW DATABASES;"`.

## Artifacts
- `handler.js`: ejecuta comandos y captura errores reportándolos a owners; al usuario le muestra mensaje seguro.
- `src/errorReporter.js`: envía al grupo de owners reporte con comando, usuario, grupo y stack/error recortado.
- `src/config.js`: define `OWNERS_JID` desde entorno o fallback `120363425755647814@g.us`.
- `src/addbot.js`: usa `OWNERS_JID` centralizado.
- `AGENTS.md`: guía permanente del flujo VS Code local, Git + VPS, PM2, MySQL, archivos completos, pruebas y regla de no exponer PM2/logs a usuarios.
- `src/top.js`: comando `.top` corregido para historial diario, rachas de 3 días y pagos por posición.
- `sql/crear_top_recompensas_diarias.sql`: migración de `top_historial` y `top_recompensas`, limpieza de duplicados y consistencia diaria.
- `src/mejorasItems.js`: utilidad central para niveles de mejora.
- `src/mejorar.js`: mejora objetos existentes de tienda/inventario con `gema_mejora`.
- `src/minar.js`, `src/pescar.js`, `src/cazar.js`, `src/recolectar.js`, `src/expedicion.js`, `src/aventura.js`, `src/usar.js`, `src/inventario.js`: integran o muestran mejoras.
- `sql/agregar_nivel_mejora_inventario_usuario.sql`: migración segura para agregar `nivel_mejora`.
- `src/db.js`: en revisión previa tenía base configurada como `nexobot`, pero la VPS indica que esa base no existe o no es el nombre real.

## Design Direction
- No aplica diseño visual.
- Enfoque: soporte técnico práctico en español, con soluciones completas listas para producción.
- Pensar primero en VS Code local + Git; en VPS solo `git pull`, MySQL, PM2, logs y validación.
- Los usuarios finales del bot no deben ver PM2, logs, rutas del servidor ni stack traces.

## User Feedback
- Quiere respuestas en español como programador principal/senior del bot.
- Prefiere soluciones completas, listas para copiar, pegar y ejecutar.
- No quiere instrucciones parciales.
- Cuando se corrija un archivo, quiere archivo completo, no fragmentos.
- Quiere comandos exactos de Git, SSH, MySQL, PM2 y Linux.
- Todo debe pensarse para producción en VPS.
- Si hay SQL, quiere comandos completos para entrar a MySQL, seleccionar base y ejecutar.
- Siempre quiere saber cómo probar.
- Las mejoras deben funcionar con todos los objetos de tienda.
- `.top` debe recompensar automáticamente a usuarios que permanezcan 3 días consecutivos en Top 1, Top 2 o Top 3 global.
- Si el usuario cambia de top o sale del Top 3, pierde la racha.
- Los errores de comandos deben enviarse al grupo de owners, no decir al usuario “mira el PM2”.
- Está confundido/molesto por el uso de `nexobot` porque en su MySQL esa base no existe.

## Decisions
- Tratar esta sesión como soporte técnico/código, no como diseño visual.
- Mejoras usan `nivel_mejora INT NOT NULL DEFAULT 0` en `inventario_usuario`.
- Centralizar lógica de mejoras en `src/mejorasItems.js`.
- El bonus de `amuleto_suerte` convive con mejoras.
- Recompensas `.top`: Top 1 = 1500, Top 2 = 1000, Top 3 = 500.
- `.top` registra historial diario y recompensa solo por 3 días consecutivos en la misma posición.
- Si cambia de posición o sale del Top 3, se reinicia la racha.
- La recompensa puede entregarse diariamente tras cumplir racha, sin duplicar pago el mismo día.
- Se usan `top_historial` y `top_recompensas`.
- Los errores internos se reportan a owners; el mensaje público es genérico y seguro.
- `OWNERS_JID` queda centralizado en `src/config.js`.
- Antes de migraciones SQL hay que confirmar base real con `SHOW DATABASES;`, `src/db.js` o `.env`; no asumir `nexobot`.
- Si MySQL muestra `->`, cancelar con `\c` o usar `mysql -u root -p -e "SHOW DATABASES;"`.

## Open Questions
- ¿Cuál es el nombre real de la base de datos en la VPS?
- ¿El bot usa `.env` para `DB_NAME`, `MYSQL_DATABASE` o `DATABASE`?
- ¿Cuál es la ruta exacta del proyecto en la VPS?
- ¿Cuál es el nombre real del proceso en PM2?
- ¿La columna de dinero principal en producción es siempre `monedas`?
- ¿`.top` debe ejecutarse manualmente o también con job automático diario?
- ¿El top global se calcula por XP, monedas+banco u otra métrica exacta?
- ¿Se quiere límite máximo de mejora para objetos?
- ¿El grupo de owners definitivo es `120363425755647814@g.us` o se usará variable `OWNERS_JID`?

## Next Steps
- En VPS, si MySQL está en `->`, ejecutar `\c`.
- Obtener bases con: `mysql -u root -p -e "SHOW DATABASES;"`.
- Enviar la lista de bases para elegir la base real del bot.
- Revisar en VPS: `cat src/db.js` y, si existe, `cat .env`.
- Ejecutar migraciones usando el nombre real, por ejemplo: `mysql -u root -p nombre_real < sql/crear_top_recompensas_diarias.sql`.
- Subir cambios pendientes con Git y hacer `git pull` en VPS.
- Reiniciar con `pm2 restart NOMBRE_DEL_BOT`.
- Probar un error controlado y confirmar reporte al grupo owners.
- Probar `.top` para pagos y corte de rachas.

## Promotion Candidates For DESIGN.md
- Ninguno.

## Recent History
- 2026-05-15: Se creó/amplió `AGENTS.md` con reglas de flujo y entrega.
- 2026-05-15: Se generalizó sistema de mejoras mediante `src/mejorasItems.js`.
- 2026-05-15: Se corrigió `.top` para historial diario, rachas de 3 días, pagos diarios y corte al cambiar/salir del Top 3.
- 2026-05-15: Se creó manejo seguro de errores con reporte a owners (`handler.js`, `src/errorReporter.js`, `src/config.js`, `src/addbot.js`).
- 2026-05-15: El usuario reportó `ERROR 1049 Unknown database 'nexobot'`; se indicó confirmar base real.
- 2026-05-15: El usuario quedó atrapado en prompt MySQL `->` al intentar `SHOW DATABASES;`; se indicó `\c` y alternativa `mysql -u root -p -e "SHOW DATABASES;"`.