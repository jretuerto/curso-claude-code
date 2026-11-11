---
name: actualizar-docs-api
description: Mantiene actualizada la documentación de la API (docs/api/openapi.yml) cuando cambia algo de la API (rutas, controllers, validaciones de services, modelos/enumerados, errores o seguridad) y genera el HTML con redocly mediante scripts/generar-docs-api.sh. Úsalo después de añadir, modificar o eliminar endpoints, campos, códigos de estado o validaciones, o cuando pidan regenerar la documentación HTML.
argument-hint: [descripción del cambio en la API (opcional)]
---

# Actualizar la documentación de la API

Mantiene sincronizados el código de la API y `docs/api/openapi.yml`, y regenera la documentación HTML con redocly.

## Entrada

Argumentos recibidos: $ARGUMENTS

Si no se indica el cambio, deduce qué ha cambiado con `git diff` y `git status` sobre `src/`.

## Cuándo aplicarlo

Cada vez que cambie algo que afecte al contrato de la API:

- `src/app.js` y `src/routes/`: endpoints nuevos, modificados o eliminados (método, ruta).
- `src/controllers/`: códigos de estado y forma de la respuesta.
- `src/services/`: validaciones, campos obligatorios y mensajes de error.
- `src/models/`: enumerados (`CATEGORIAS`, `ROLES`).
- `src/middlewares/`: autenticación (`autenticar`) y traducción de errores a HTTP.

Si el cambio es solo interno (refactor sin efecto en el contrato), no hace falta tocar el YAML, pero sí se puede regenerar el HTML.

## Pasos

1. **Identifica el cambio** en la API (argumento o `git diff -- src`). Lee los ficheros afectados, y `docs/api/api-pagination.md` si hay paginación.
2. **Actualiza `docs/api/openapi.yml`** a mano, sin tocar lo que no haya cambiado:
   - `paths`: operación, parámetros, `requestBody`, respuestas y `security`.
   - `components/schemas`: campos, `required`, enumerados y ejemplos. Los nombres de campo en español y snake_case, igual que en la API.
   - Códigos de error coherentes con `src/middlewares/errores.middleware.js` (400 `{ errores }`, 401/404/409/500 `{ error }`).
   - Reutiliza `components` con `$ref` en lugar de duplicar.
3. **Valida y genera el HTML** ejecutando el script:

   ```bash
   scripts/generar-docs-api.sh
   ```

   Ejecuta `redocly lint` sobre el YAML y después `redocly build-docs`, que escribe `docs/api/index.html`. Si `lint` da errores, corrígelos en el YAML y vuelve a ejecutar. Puedes pasar otras rutas: `scripts/generar-docs-api.sh <openapi.yml> <salida.html>`.
4. **Contrasta** el resultado con el código: cada endpoint, campo, enumerado y código de estado del YAML debe existir en el código, y al revés.
5. **Resume** al usuario qué se ha cambiado en el YAML y confirma que el HTML se ha regenerado. No hagas commit salvo que lo pida (puede usar `/commit`).

## Restricciones

- No modifiques código de `src/` ni tests: solo `docs/api/openapi.yml` y el HTML generado.
- No edites `docs/api/index.html` a mano; se regenera siempre con el script.
- El script necesita Node.js (`npx`) y acceso a red la primera vez para descargar `@redocly/cli`.
