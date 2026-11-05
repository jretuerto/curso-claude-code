---
name: plan-feature
description: Planifica una nueva funcionalidad o el arreglo de un error usando una plantilla común (objetivo, alcance, archivos afectados, tareas de 5-10 min, criterios de aceptación y dudas/decisiones) y guarda el plan en plans/<num_issue>-<breve-descripcion>.md. Úsalo cuando pidan planificar, diseñar o preparar una feature o un bugfix antes de implementarlo.
argument-hint: <num_issue> <descripción de la funcionalidad o del error>
---

# Planificar una funcionalidad o un bugfix

Genera un plan de implementación siguiendo siempre la plantilla [plantilla.md](plantilla.md), para que todos los planes tengan el mismo formato. Este skill **solo planifica**: no modifiques código de la aplicación.

## Entrada

Argumentos recibidos: $ARGUMENTS

Necesitas dos datos:
1. **`num_issue`**: número de la issue asociada.
2. **Descripción** de la funcionalidad o del error.

Si falta el número de issue, pregúntalo al usuario antes de continuar. Si la descripción es demasiado vaga para planificar, pide lo mínimo imprescindible; el resto de dudas van al plan (ver paso 5).

## Pasos

1. **Entiende el pedido**: identifica si es una funcionalidad nueva (`feature`) o el arreglo de un error (`bugfix`).
2. **Explora el código** antes de planificar: lee `CLAUDE.md` y los ficheros relevantes de `src/`. Respeta la arquitectura por capas (`routes` → `controllers` → `services` → `repositories` → `db`), el nombrado `<recurso>.<capa>.js` y las convenciones del proyecto (funciones en snake_case, tests con vitest, prettier/eslint). Si se trata de paginación en endpoints GET, lee antes `docs/api/api-pagination.md`.
3. **Lee la plantilla** [plantilla.md](plantilla.md) y rellena todas sus secciones, sin quitar ni reordenar ninguna:
   - **Objetivo**: qué se consigue y por qué (en un bugfix: comportamiento actual vs. esperado).
   - **Alcance**: qué incluye y qué queda fuera.
   - **Archivos afectados**: rutas reales verificadas en el repositorio (o nuevas, indicando "crear"), con la acción y el motivo.
   - **Tareas**: lista ordenada de pasos concretos, **cada uno de 5-10 minutos**. Si una tarea parece más larga, divídela; si es más corta, agrúpala con otra. Incluye las tareas de tests y de lint/formato.
   - **Criterios de aceptación**: condiciones observables y verificables (respuestas HTTP, códigos de estado, tests que pasan…) que determinan que el trabajo está hecho.
   - **Dudas y decisiones tomadas**: al final del plan. Anota cada duda abierta y cada decisión que hayas asumido por tu cuenta, con su justificación. Si no hay ninguna, escribe "Ninguna".
4. **Calidad**: no inventes archivos ni funciones existentes; verifica que lo que citas está en el repositorio. No añadas secciones extra ni alcance no pedido.
5. **Guarda el plan** en `plans/<num_issue>-<breve-descripcion>.md`:
   - `<breve-descripcion>` en minúsculas, en español, con palabras separadas por guiones, sin tildes ni caracteres especiales y de 2-5 palabras (p. ej. `plans/42-paginar-vendehumos.md`).
   - Crea la carpeta `plans/` si no existe.
   - Si el fichero ya existe, no lo sobrescribas sin preguntar al usuario.
6. **Resume** al usuario en pocas líneas: ruta del fichero creado, número de tareas y las dudas/decisiones que requieren su confirmación.

## Restricciones

- No implementes el plan ni toques código fuente: solo se crea el fichero en `plans/`.
- No hagas commits ni `push`.
