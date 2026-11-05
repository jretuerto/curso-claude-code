# Accesibilizar el formulario de platos (#11)

- **Tipo**: bugfix
- **Issue**: #11

## Objetivo

Corregir la falta de accesibilidad del formulario de creación/edición de platos de `web-admin` según WCAG 2.2 nivel AA, para que pueda completarse y enviarse solo con teclado, con orden de tabulación lógico y foco visible. Comportamiento actual: ya tiene etiquetas `for/id`, `aria-label` en botones de icono y un foco global (`:focus-visible`), pero faltan errores de validación asociados a cada campo, avisos a lectores de pantalla, objetivos táctiles de tamaño suficiente y contraste adecuado.

## Alcance

**Incluye**
- Validación con mensajes de error por campo (nombre y precio), enlazados con `aria-describedby` y `aria-invalid`, y foco al primer campo inválido al enviar.
- Gestión del foco y avisos (`aria-live`) al añadir/quitar ingredientes y al guardar/cargar.
- Sección de ingredientes: jerarquía de encabezados correcta y mensaje cuando la acción de añadir no se puede realizar.
- Objetivos táctiles ≥ 24×24 px (WCAG 2.5.8) en el botón de quitar ingrediente.
- Contraste de texto/placeholder ≥ 4.5:1 (WCAG 1.4.3) y de bordes de controles ≥ 3:1 (WCAG 1.4.11) dentro del formulario.
- Tests end-to-end con Playwright (incluido `@axe-core/playwright`) del formulario de platos.

**No incluye**
- Otros formularios o páginas de `web-admin`, `web-empleados` o `web-clientes`.
- Cambios en la API ni en el modelo de datos.
- Rediseño visual del tema ni cambios globales de paleta fuera de lo necesario para el contraste del formulario.
- Auditoría completa del listado de platos (`dish-list`).

## Archivos afectados

| Archivo | Acción | Motivo |
| --- | --- | --- |
| `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.component.html` | modificar | `aria-describedby`/`aria-invalid`, mensajes de error, `aria-live`, nombre accesible del formulario, jerarquía de encabezados, `aria-busy` |
| `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.component.ts` | modificar | Validación por campo, foco al primer error, foco tras quitar ingrediente, mensajes de estado |
| `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.component.css` | modificar | Tamaño mínimo del botón de quitar, estilos de error, contraste |
| `packages/web-admin/src/styles.css` | modificar (solo si hace falta) | Contraste de `--text-muted`/placeholder y borde de controles; revisar que `.form-control:focus` no quede sin indicador |
| `packages/web-admin/e2e/dish-form.a11y.spec.ts` | crear | Tests Playwright: teclado, errores, avisos y auditoría axe |
| `packages/web-admin/playwright.config.ts` | crear | Configuración de Playwright (baseURL `http://localhost:4200`, arranque de api y web-admin) |
| `packages/web-admin/package.json` | modificar | Añadir `@playwright/test`, `@axe-core/playwright` y script `test:e2e` |

## Tareas

Cada tarea debe poder completarse en 5-10 minutos.

- [x] 1. Instalar Playwright y `@axe-core/playwright` en `web-admin`, crear `playwright.config.ts` (api en 3000 y web-admin en 4200 vía `webServer`) y el script `test:e2e`, con un test de humo que haga login con las credenciales de prueba y abra el formulario.
- [ ] 2. Escribir test Playwright (rojo) de que cada control tiene nombre accesible (`getByRole` con nombre) y de que el `<form>` tiene nombre accesible; añadir una auditoría axe WCAG 2.2 AA del formulario.
- [ ] 3. Añadir nombre accesible al `<form>` (`aria-labelledby` al `h1`) y `aria-busy` mientras `loading()` es true; hacer pasar los tests.
- [ ] 4. Escribir test Playwright (rojo) de validación: enviar con nombre vacío o precio inválido muestra mensajes de error, marca `aria-invalid="true"` y enlaza `aria-describedby`.
- [ ] 5. Implementar la validación por campo en `dish-form.component.ts` (señal de errores) y los mensajes en el HTML con `id` únicos.
- [ ] 6. Escribir test Playwright (rojo) y implementar que, al fallar la validación, el foco pasa al primer campo inválido y no se envía el formulario.
- [ ] 7. Hacer que el `alert-error` general y los mensajes de estado se anuncien correctamente (`role="alert"` ya existe; añadir región `aria-live="polite"` para "Guardando…"/cargando).
- [ ] 8. Escribir test Playwright (rojo) e implementar: añadir/quitar ingrediente anuncia el cambio en una región `aria-live` y, al quitar, el foco se mueve a un elemento lógico (siguiente chip, o el selector de ingrediente si no quedan).
- [ ] 9. Dar feedback cuando "Añadir ingrediente" no puede ejecutarse (sin ingrediente, cantidad ≤ 0 o duplicado) con un mensaje asociado en lugar de salir en silencio.
- [ ] 10. Corregir la jerarquía de encabezados (`h1` → `h3` en la sección de ingredientes pasa a `h2`) y verificar el estilo en el CSS.
- [ ] 11. Aumentar el área del botón `.chip-remove` a ≥ 24×24 px y revisar el espaciado de los botones de la fila de añadir ingrediente.
- [ ] 12. Medir contraste de placeholder, `--text-muted`, `--text-secondary` y `--border-color` sobre `--bg-input`/`--bg-card`; ajustar tokens afectados para cumplir 4.5:1 (texto) y 3:1 (bordes) sin romper otras pantallas.
- [ ] 13. Verificación manual con teclado (Tab/Shift+Tab/Enter/Espacio) del flujo completo crear y editar, comprobando foco visible en todos los controles, y con un lector de pantalla o la pestaña Accessibility de DevTools.
- [ ] 14. Ejecutar `npm run test:e2e`, `ng build` de `web-admin` y el formateo/lint que use el proyecto; corregir lo que falle.

## Criterios de aceptación

- [ ] Se puede crear y editar un plato completo (incluidos los ingredientes) usando solo el teclado, en un orden de tabulación lógico (nombre → precio → categoría → disponible → descripción → ingredientes → Cancelar → Guardar).
- [ ] El foco es visible en todos los controles interactivos del formulario.
- [ ] Al enviar con datos inválidos, aparecen mensajes de error junto a cada campo, enlazados con `aria-describedby`, con `aria-invalid="true"`, y el foco va al primer campo inválido.
- [ ] Añadir, quitar o fallar al añadir un ingrediente se comunica a lectores de pantalla mediante una región `aria-live`.
- [ ] Todos los controles tienen nombre accesible y la jerarquía de encabezados no salta niveles.
- [ ] Los objetivos interactivos miden al menos 24×24 px y el contraste cumple 4.5:1 (texto) y 3:1 (bordes de controles).
- [ ] Los tests Playwright (incluida la auditoría axe sin violaciones AA) pasan y `ng build` de `web-admin` compila sin errores.

## Dudas y decisiones tomadas

**Dudas abiertas**
- ¿Se deben cambiar los tokens de color globales si el contraste falla, aunque afecte a otras pantallas, o limitarlo a estilos del formulario?

**Decisiones asumidas**
- Se sigue la estructura real del repositorio (Angular 21, TypeScript, `packages/web-admin/...`) en lugar de las rutas `src/<capa>/<recurso>.<capa>.js` de la plantilla, que corresponden a la API y no aplican a este plan.
- Se mantiene el estilo del frontend: componente con `FormsModule` y signals, sin migrar a formularios reactivos, para limitar el alcance.
- Se usa validación propia con mensajes visibles en vez de la validación nativa del navegador, porque esta no es consistente entre lectores de pantalla.
- Los estados (cargando/guardado) se anuncian con `aria-live="polite"` y los errores con `role="alert"` (ya existente).
- Confirmado por el usuario: el número de issue es #11, el tipo es `bugfix` y los tests se harán con Playwright (e2e), no con tests unitarios de componente.
- Los tests e2e necesitan la base de datos con datos de prueba (`npm run seed`) y las credenciales de prueba del README.
