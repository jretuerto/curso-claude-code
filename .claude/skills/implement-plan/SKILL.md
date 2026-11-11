---
name: implement-plan
description: Implementa un plan de plans/<num_issue>-<breve-descripcion>.md creando una rama a partir de development (que se crea desde main si no existe) y aplicando TDD estricto tarea a tarea, marcando cada tarea como hecha en el plan y haciendo un commit con /commit. Úsalo cuando pidan implementar, ejecutar o desarrollar un plan ya redactado.
argument-hint: <ruta o nombre del plan, p. ej. plans/1-login-registro-usuarios.md>
---

# Implementar un plan

Implementa, tarea a tarea y con TDD estricto, el plan que pase el usuario. Los planes los genera el skill `plan-feature` en `plans/<num_issue>-<breve-descripcion>.md`.

## Entrada

Argumento: la ruta del plan (o su nombre sin extensión). Si no se indica, o no existe el fichero, lista `plans/` y pregunta al usuario cuál implementar. No continúes sin un plan válido.

## Pasos

### 1. Lee y valida el plan

- Lee el plan completo y `CLAUDE.md` (arquitectura por capas, convenciones, herramientas).
- Si en "Dudas abiertas" hay preguntas pendientes que afecten a la implementación, pregúntalas al usuario antes de empezar.
- Identifica las tareas (`- [ ] N. ...`). Las ya marcadas `- [x]` se saltan (permite reanudar).

### 2. Prepara la rama

El nombre de la rama es el **nombre del fichero del plan sin `.md`** (p. ej. `plans/1-login-registro-usuarios.md` → `1-login-registro-usuarios`).

1. Comprueba que el repositorio es git y que el árbol de trabajo está limpio (`git status --porcelain`). Si hay cambios sin commitear, avisa al usuario y pregunta antes de seguir. Si no es un repositorio git, avisa y pregunta si hacer `git init`.
2. Comprueba si existe `development` (`git rev-parse --verify development`).
   - Si **no existe**: créala a partir de `main` (`git switch main && git switch -c development`). Si tampoco existe `main`, avisa al usuario y detente.
3. Crea la rama del plan a partir de `development` y cámbiate a ella: `git switch development && git switch -c <nombre-del-plan>`.
   - Si la rama ya existe, no la recrees ni la sobrescribas: pregunta al usuario si continuar en ella (reanudar).
4. Si el plan estaba sin commitear, es normal que se haya llevado en el árbol; asegúrate de que queda incluido en el primer commit.

No hagas `push` ni borres ramas.

### 3. Implementa cada tarea, en orden

Para **cada** tarea del plan, sigue este ciclo sin saltarte ningún paso:

1. **Rojo**: escribe primero el test (vitest) que describe el comportamiento de la tarea. Ejecútalo (`npx vitest run <fichero>`) y **comprueba que falla por la razón esperada** (no por un error de sintaxis o de import). Si el test pasa sin código nuevo, el test no sirve: reescríbelo.
2. **Verde**: escribe el código mínimo, respetando la arquitectura por capas y las convenciones (`<recurso>.<capa>.js`, funciones en snake_case), para que el test pase. Ejecuta el test y confirma que pasa.
3. **Refactor**: limpia el código sin cambiar el comportamiento y vuelve a ejecutar todos los tests (`npm test`) para confirmar que nada se ha roto. Aplica prettier y eslint a los ficheros tocados.
4. **Marca la tarea como hecha** en el plan: cambia `- [ ] N.` por `- [x] N.` en el fichero del plan, **solo después** de que el test y el código estén en verde.
5. **Commit**: invoca el slash command `/commit` (skill `commit`) para crear el commit de esa tarea. Incluye en el commit el código, los tests y el plan actualizado. Un commit por tarea.

Reglas del TDD estricto:
- Nunca escribas código de producción sin un test rojo que lo justifique.
- Nunca marques una tarea ni hagas commit con tests en rojo.
- Tareas sin comportamiento testeable (instalar dependencias, configurar eslint, documentar): no inventes un test artificial; verifica con un comando observable (p. ej. `npx eslint src`, `npm ls <paquete>`) y dilo explícitamente. Si la configuración de vitest aún no existe, es lo primero que hay que dejar funcionando para poder aplicar el ciclo.
- Si una tarea resulta inviable o el plan es incorrecto, detente, explica el problema y pregunta; no te desvíes del plan ni amplíes el alcance.

### 4. Cierre

- Al terminar todas las tareas, ejecuta `npm test`, eslint y prettier completos.
- Revisa los **criterios de aceptación** del plan: marca `- [x]` los que se hayan verificado y, si alguno no se cumple, indícalo. Si cambias el plan en este paso, hazlo en un último commit con `/commit`.
- Resume al usuario: rama creada, tareas completadas, commits realizados, criterios no cumplidos y dudas pendientes.

### 5. Avisa por Slack

Como último paso, envía un mensaje al canal `curso-claude-ed3` (id `C0CGZ01R9M2`) indicando que ya se ha implementado el plan (nombre del plan, rama, número de tareas completadas y criterios pendientes si los hay), p. ej. "✅ Implementado el plan `1-login-registro-usuarios` en la rama `1-login-registro-usuarios` (8/8 tareas)".

- Carga la herramienta de Slack si hace falta (`mcp__slack__slack_post_message`) y publica directamente con `slack_post_message` usando `channel_id` = `C0CGZ01R9M2`; no hace falta buscar el canal.
- Si el plan no se ha completado (tareas pendientes o criterios sin cumplir), indícalo en el mensaje en lugar de decir que está terminado.
- Si el envío falla, no reintentes en bucle: avisa al usuario.
- No incluyas en el mensaje datos personales ni contenido sensible.

## Restricciones

- No implementes nada fuera de las tareas del plan.
- No hagas `push`, `merge`, `rebase` ni `reset --hard`.
- No sobrescribas ramas existentes ni cambios sin commitear del usuario.
