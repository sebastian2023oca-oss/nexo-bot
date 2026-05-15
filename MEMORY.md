---
schemaVersion: 1
scope: workspace
updatedAt: "2026-05-15T01:25:01.468Z"
workspaceName: "BOT"
---

# Project Memory

## Project Overview
- Workspace para ayudar al usuario a diagnosticar y resolver problemas de comandos de su bot.
- Caso actual: las mejoras de objetos de tienda deben guardarse en MySQL y reflejarse en los comandos correspondientes, no solo en `pico_reforzado` con `.minar`.
- El bot funciona en una VPS Linux con Node.js, PM2 y MySQL. La base de datos real está en la VPS; XAMPP solo se usa como referencia local ocasional.
- Flujo principal: desarrollo local en VS Code + Git, despliegue a VPS con `git pull`, migraciones/validación en VPS, reinicio con PM2.

## Current State
- No hay fuente visual, `DESIGN.md` ni configuración de diseño; la sesión es soporte técnico/código, no diseño visual.
- Existe `AGENTS.md` y fue ampliado con el flujo de trabajo preferido del usuario.
- Se revisó el workspace real y existen archivos del bot, incluyendo `src/minar.js`, `src/mejorar.js`, `src/db.js`, `src/equipar.js`, `src/inventario.js`, `src/tienda.js`, `src/comprar.js`, `src/pescar.js`, `src/cazar.js`, `src/recolectar.js`, `src/expedicion.js`, `src/aventura.js` y `src/usar.js`.
- Se generalizó el sistema de mejoras para que aplique a todos los objetos de tienda relevantes, no solo a `pico_reforzado`.
- Se creó `src/mejorasItems.js` como utilidad central para calcular/aplicar mejoras.
- Se actualizaron comandos que usan objetos o recompensas: minería, pesca, caza, recolección, expedición, aventura, uso de consumibles e inventario.
- Se creó/actualizó `sql/agregar_nivel_mejora_inventario_usuario.sql`.
- Verificación final del workspace: `done` reportó OK, sin problemas sintácticos o runtime detectados.
- Se explicó al usuario cómo ejecutar/leer el archivo `.sql`: copiar su contenido en MySQL o usar `SOURCE`/redirección desde Linux.
- Pendiente: aplicar la migración SQL en VPS si aún no se hizo, subir cambios con Git, hacer `git pull`, reiniciar PM2 y probar en WhatsApp.

## Artifacts
- `src/mejorasItems.js`: utilidad central para manejar niveles de mejora de objetos y evitar lógica duplicada.
- `src/mejorar.js`: comando `.mejorar` actualizado; acepta mejorar objetos existentes de tienda/inventario, valida `gema_mejora`, consume gema y aumenta `nivel_mejora` si tiene éxito.
- `src/minar.js`: actualizado para usar lógica central de mejoras; mantiene compatibilidad con `pico_reforzado` y `amuleto_suerte`.
- `src/pescar.js`, `src/cazar.js`, `src/recolectar.js`: actualizados para considerar mejoras de objetos relevantes.
- `src/expedicion.js`, `src/aventura.js`: integran mejoras en recompensas/lógica relacionada.
- `src/usar.js`: permite que consumibles usados con `.usar` se beneficien de mejoras cuando corresponda.
- `src/inventario.js`: muestra nivel de mejora de objetos mejorados.
- `sql/agregar_nivel_mejora_inventario_usuario.sql`: migración segura para agregar `nivel_mejora` a `inventario_usuario` si todavía no existe.
- `src/db.js`: pool MySQL con base configurada como `nexobot` en el archivo revisado.
- `AGENTS.md`: guía permanente del flujo VS Code local, Git + VPS, PM2, MySQL, archivos completos, comandos completos y pruebas obligatorias.

## Design Direction
- No aplica; no hay trabajo visual o sistema de diseño definido.
- Enfoque: soporte técnico práctico en español, con soluciones completas listas para producción.
- Las respuestas deben pensar primero en desarrollo local con VS Code y Git, no en edición directa dentro de la VPS, salvo MySQL, `git pull`, PM2, logs o validación.

## User Feedback
- El usuario aclaró que las mejoras deben funcionar con todos los objetos de tienda, no solo con `pico_reforzado`.
- Quiere respuestas en español como programador principal/senior del bot.
- Prefiere soluciones completas, listas para copiar, pegar y ejecutar.
- No quiere respuestas parciales ni instrucciones incompletas.
- Cuando se corrija un archivo, quiere el archivo completo corregido, no fragmentos.
- Quiere comandos exactos de Git, SSH, MySQL, PM2 y Linux cuando hagan falta.
- Todo debe pensarse para producción en VPS.
- Si hay cambios SQL, quiere comandos completos para entrar a MySQL, seleccionar base de datos y ejecutar el cambio.
- Siempre quiere saber cómo probar los cambios.
- Necesita explicaciones cortas y claras sobre cómo ejecutar archivos SQL.

## Decisions
- Tratar esta sesión como soporte técnico/código, no como diseño visual.
- El sistema de mejoras no debe estar atado únicamente a `pico_reforzado`.
- Solución estable: usar `nivel_mejora INT NOT NULL DEFAULT 0` en `inventario_usuario`.
- Centralizar la lógica de mejoras en `src/mejorasItems.js`.
- En `.mejorar`, cuando la mejora sea exitosa, incrementar `nivel_mejora`.
- En comandos que usan objetos/recompensas, consultar el nivel de mejora mediante la utilidad central.
- El bonus del `amuleto_suerte` se mantiene y debe convivir con la lógica de mejoras.
- Para ejecutar SQL en VPS, se puede copiar el contenido del archivo `.sql` dentro de MySQL o usar `SOURCE sql/agregar_nivel_mejora_inventario_usuario.sql;` si la ruta coincide.
- Alternativa desde Linux: `mysql -u root -p nexobot < sql/agregar_nivel_mejora_inventario_usuario.sql`.
- `AGENTS.md` es la guía del flujo de trabajo del proyecto y debe respetarse.

## Open Questions
- ¿Cuál es el nombre real del proceso en PM2 para reemplazar `NOMBRE_DEL_BOT`?
- ¿Cuál es la ruta exacta del proyecto en la VPS para ejecutar `git pull`?
- ¿La base de datos real en VPS también se llama `nexobot`, como aparece en `src/db.js`?
- ¿Se quiere límite máximo de mejora para objetos?
- ¿El bonus por nivel debe quedarse en +25% o ajustarse por tipo de objeto?
- ¿Todas las mejoras deben tener el mismo efecto o cada categoría de objeto debe tener efecto propio?
- ¿Existe actualmente algún sistema de niveles/stats de ítems en otra tabla?
- ¿El comando de equipar/tienda maneja correctamente `equipado = 1` para objetos equipables en producción?

## Next Steps
- Revisar en VS Code que los cambios estén guardados.
- Subir cambios con Git:
  - `git add .`
  - `git commit -m "generalizar mejoras de objetos de tienda"`
  - `git push`
- En VPS:
  - `cd /ruta/real/del/proyecto`
  - `git pull`
- Ejecutar migración SQL en VPS:
  - `mysql -u root -p nexobot < sql/agregar_nivel_mejora_inventario_usuario.sql`
- Verificar columna:
  - `mysql -u root -p`
  - `USE nexobot;`
  - `DESCRIBE inventario_usuario;`
  - Confirmar que existe `nivel_mejora`.
- Reiniciar con PM2:
  - `pm2 list`
  - `pm2 restart NOMBRE_DEL_BOT`
  - `pm2 logs NOMBRE_DEL_BOT`
- Probar en WhatsApp:
  - Comprar/obtener un objeto de tienda.
  - Tener `gema_mejora`.
  - Ejecutar `.mejorar nombre_del_objeto`.
  - Revisar `.inventario`.
  - Probar `.minar`, `.pescar`, `.cazar`, `.recolectar`, `.expedicion`, `.aventura` o `.usar`.

## Promotion Candidates For DESIGN.md
- Ninguno.

## Recent History
- 2026-05-15: El usuario definió reglas: archivos completos, comandos exactos y flujo VS Code + Git + VPS + PM2.
- 2026-05-15: Se creó y amplió `AGENTS.md` con el flujo de trabajo del proyecto.
- 2026-05-15: Se empezó desde cero revisando el workspace real.
- 2026-05-15: Se corrigieron inicialmente `src/minar.js` y `src/mejorar.js`, y se creó SQL para `nivel_mejora`.
- 2026-05-15: El usuario aclaró que las mejoras deben aplicar a todos los objetos de tienda, no solo a `pico_reforzado`.
- 2026-05-15: Se creó `src/mejorasItems.js` y se generalizó la lógica de mejoras a varios comandos.
- 2026-05-15: La verificación final reportó OK sin problemas detectados.
- 2026-05-15: El usuario preguntó si debe copiar el SQL tal cual; se explicó cómo ejecutarlo en VPS con MySQL, `SOURCE` o redirección, y cómo verificar con `DESCRIBE inventario_usuario`.