# Accesibilizar el formulario de platos (#11)

- **Tipo**: bugfix
- **Issue**: #11

## Objetivo

Corregir la falta de accesibilidad del formulario de creación/edición de platos de `web-admin` según WCAG 2.2 nivel AA, para que pueda completarse y enviarse solo con teclado, con orden de tabulación lógico y foco visible. Comportamiento actual: tenía etiquetas `for/id`, `aria-label` en botones de icono y un foco global (`:focus-visible`), pero faltaban errores de validación asociados a cada campo, avisos a lectores de pantalla, objetivos táctiles de tamaño suficiente y contraste adecuado. Comportamiento esperado: todo lo anterior resuelto, validado con tests unitarios (Vitest), con tests e2e + auditoría axe (Playwright) y con un vídeo que demuestra el flujo solo con teclado.

## Alcance

**Incluye**
- Validación con mensajes de error por campo (nombre y precio), enlazados con `aria-describedby` y `aria-invalid`, y foco al primer campo inválido al enviar.
- Gestión del foco y avisos (`aria-live`) al añadir/quitar ingredientes y al guardar/cargar.
- Sección de ingredientes: jerarquía de encabezados correcta y mensaje cuando la acción de añadir no se puede realizar.
- Objetivos táctiles ≥ 24×24 px (WCAG 2.5.8) en el botón de quitar ingrediente.
- Contraste de texto/placeholder ≥ 4.5:1 (WCAG 1.4.3) y de bordes de controles ≥ 3:1 (WCAG 1.4.11).
- **Tests unitarios con Vitest** (runner de Angular, `ng test`) del componente `DishFormComponent`, escritos con TDD por cada tarea.
- **Tests e2e con Playwright** y auditoría de accesibilidad con el plugin **axe** (`@axe-core/playwright`, WCAG 2.2 AA).
- **Vídeo grabado con Playwright** del flujo completo solo con teclado, guardado en `packages/web-admin/e2e-videos/`.

**No incluye**
- Otros formularios o páginas de `web-admin`, `web-empleados` o `web-clientes`.
- Cambios en la API ni en el modelo de datos.
- Rediseño visual del tema ni cambios globales de paleta fuera de lo necesario para el contraste (el contraste se corrige en `styles.css`, decisión del usuario, y afecta a todos los formularios de `web-admin`).
- Auditoría completa del listado de platos (`dish-list`) y del menú lateral (p. ej. `.btn-logout` sin nombre accesible).

## Archivos afectados

| Archivo | Acción | Motivo |
| --- | --- | --- |
| `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.component.html` | modificar | `aria-describedby`/`aria-invalid`, mensajes de error, `aria-live`, nombre accesible del formulario, jerarquía de encabezados, `aria-busy` |
| `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.component.ts` | modificar | Validación por campo, foco al primer error, foco tras quitar ingrediente, mensajes de estado |
| `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.component.css` | modificar | Tamaño mínimo del botón de quitar, estilos de error, texto solo para lectores de pantalla |
| `packages/web-admin/src/styles.css` | modificar | Token `--border-control` y color del placeholder para el contraste |
| `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.component.spec.ts` | crear | Tests unitarios Vitest del componente (uno por tarea, TDD) |
| `packages/web-admin/angular.json` | modificar | Añadir el target `test` con el builder `@angular/build:unit-test` y runner `vitest` |
| `packages/web-admin/package.json` | modificar | Dependencias `vitest` y `jsdom`, script `test`, y (ya hecho) `@playwright/test`, `@axe-core/playwright` y `test:e2e` |
| `packages/web-admin/e2e/dish-form.a11y.spec.ts` | modificar | Tests Playwright: teclado, errores, avisos, contraste y auditoría axe |
| `packages/web-admin/e2e/dish-form.video.spec.ts` | crear | Flujo solo con teclado grabado en vídeo |
| `packages/web-admin/e2e-videos/` | crear | Carpeta con el vídeo generado (`dish-form-teclado.webm`) |
| `packages/web-admin/playwright.config.ts` | modificar | Proyecto/ajustes de vídeo y ruta de salida |
| `.gitignore` | modificar (si procede) | Ignorar artefactos de Playwright salvo `e2e-videos/` |

## Tareas

Cada tarea debe poder completarse en 5-10 minutos. Las tareas con comportamiento siguen TDD con **tests unitarios Vitest**: *U-rojo* (test unitario que falla por la razón esperada), *código* (mínimo para ponerlo en verde) y *verde* (`ng test` en verde y `ng build`). Si el código de una tarea ya existe, el *U-rojo* se comprueba desactivando temporalmente ese código.

- [x] 1. Instalar Playwright y `@axe-core/playwright` en `web-admin`, crear `playwright.config.ts` (api en 3000 y web-admin en 4200 vía `webServer`) y el script `test:e2e`, con un test de humo e2e.
- [x] 2. Configurar Vitest unitario en Angular.
  - [x] 2.1 Añadir `vitest` y `jsdom` a `web-admin`, el target `test` (`@angular/build:unit-test`, runner `vitest`) en `angular.json` y el script `test`.
  - [x] 2.2 Test unitario de humo: `DishFormComponent` se crea con `TestBed` (providers falsos de `DishStore`, `DishService`, `IngredientStore`, `ActivatedRoute` y `Router`) y muestra el título «Nuevo plato».
- [x] 3. Nombre accesible del formulario y `aria-busy`.
  - [x] 3.1 U-rojo: el `<form>` tiene `aria-labelledby` apuntando al `h1`, y `aria-busy` es `"true"` mientras `loading()` es true.
  - [x] 3.2 Código (hecho en `6fc9e78`: `aria-labelledby` y `[attr.aria-busy]`) y e2e con axe de nombres accesibles.
  - [x] 3.3 Verde: `ng test` y `ng build`.
- [x] 4. Validación por campo de nombre y precio.
  - [x] 4.1 U-rojo: con nombre vacío o precio vacío/negativo, `onSubmit()` no llama al store, muestra el mensaje, marca `aria-invalid="true"` y enlaza `aria-describedby` al `id` del mensaje.
  - [x] 4.2 Código (hecho en `6d8c057`: `validate()`, señales `nameError`/`priceError`, `novalidate`) y e2e.
  - [x] 4.3 Verde: `ng test`.
- [x] 5. Foco al primer campo inválido.
  - [x] 5.1 U-rojo: tras un envío inválido, `document.activeElement` es `#dish-name`; si solo falla el precio, `#dish-price`.
  - [x] 5.2 Código (hecho en `869dd16`: `focusField()`) y e2e.
  - [x] 5.3 Verde: `ng test`.
- [x] 6. Región de estado «Cargando/Guardando».
  - [x] 6.1 U-rojo: existe un elemento `role="status"` con `aria-live="polite"` vacío al inicio, que contiene «Guardando el plato…» durante el guardado y «Cargando el plato…» al editar.
  - [x] 6.2 Código (hecho en `b0622f8`: región `.sr-only`) y e2e.
  - [x] 6.3 Verde: `ng test`.
- [x] 7. Aviso y foco al añadir/quitar ingredientes.
  - [x] 7.1 U-rojo: añadir un ingrediente deja «<nombre> añadido.» en la región de estado; quitarlo deja «<nombre> quitado.» y mueve el foco al chip que ocupa su lugar o, si no quedan chips, a `#new-ingredient`.
  - [x] 7.2 Código (hecho en `101126e`: `announcement`, `afterNextRender`, `id` en botones) y e2e.
  - [x] 7.3 Verde: `ng test`.
- [x] 8. Feedback cuando no se puede añadir un ingrediente.
  - [x] 8.1 U-rojo: sin selección, cantidad ≤ 0 o ingrediente duplicado se muestra el mensaje, el control correspondiente queda con `aria-invalid="true"` y `aria-describedby`, y recibe el foco; no se añade nada.
  - [x] 8.2 Código (hecho en `3d3621a`: `ingredientError`, `rejectIngredient()`) y e2e.
  - [x] 8.3 Verde: `ng test`.
- [x] 9. Jerarquía de encabezados.
  - [x] 9.1 U-rojo: los encabezados del componente son `h1` y `h2` (sin `h3`) y la sección de ingredientes está etiquetada por el `h2`.
  - [x] 9.2 Código (hecho en `6f5c3b8`) y e2e.
  - [x] 9.3 Verde: `ng test`.
- [x] 10. Objetivos táctiles ≥ 24×24 px del botón de quitar (hecho en `31984db`). Sin test unitario: jsdom no calcula maquetación; se verifica con el e2e de Playwright (`boundingBox`).
- [x] 11. Contraste de placeholder y bordes (hecho en `6ef09e4`, global en `styles.css`). Sin test unitario: jsdom no resuelve estilos de hojas CSS externas; se verifica con el e2e de ratios y con axe `color-contrast`.
- [x] 12. Auditoría axe del formulario con el plugin `@axe-core/playwright`: ejecutar WCAG 2.2 AA (`wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`) sobre `app-dish-form` en estado inicial, con errores de validación visibles y con ingredientes añadidos; 0 violaciones.
- [x] 13. Vídeo del flujo solo con teclado.
  - [x] 13.1 Escribir `e2e/dish-form.video.spec.ts` con grabación de vídeo activada: login con teclado, ir al listado de platos y abrir «Nuevo plato» con Tab/Enter, rellenar nombre, precio, categoría y descripción, añadir y quitar algún ingrediente.
  - [x] 13.2 Ampliar el flujo: enviar el formulario incompleto para mostrar los errores, corregirlo, crear bien el plato y comprobar que aparece en el listado; borrar el plato creado al terminar (limpieza vía API).
  - [x] 13.3 Ajustar `playwright.config.ts`/`saveAs` para guardar el vídeo como `packages/web-admin/e2e-videos/dish-form-teclado.webm`, con pausas legibles (`pressSequentially` con retardo) y sin usar el ratón; ajustar `.gitignore`.
- [x] 14. Cierre: ejecutar `ng test` (Vitest), `npm run test:e2e`, `ng build` de `web-admin` y `npm test` de la API; comprobar que el vídeo existe y reproduce el flujo completo.

## Criterios de aceptación

- [x] Se puede crear y editar un plato completo (incluidos los ingredientes) usando solo el teclado, en un orden de tabulación lógico (nombre → precio → categoría → disponible → descripción → ingredientes → Cancelar → Guardar).
- [x] El foco es visible en todos los controles interactivos del formulario.
- [x] Al enviar con datos inválidos, aparecen mensajes de error junto a cada campo, enlazados con `aria-describedby`, con `aria-invalid="true"`, y el foco va al primer campo inválido.
- [x] Añadir, quitar o fallar al añadir un ingrediente se comunica a lectores de pantalla mediante una región `aria-live`.
- [x] Todos los controles tienen nombre accesible y la jerarquía de encabezados no salta niveles.
- [x] Los objetivos interactivos miden al menos 24×24 px y el contraste cumple 4.5:1 (texto) y 3:1 (bordes de controles).
- [x] Los tests unitarios de Vitest (`ng test`) cubren cada tarea con comportamiento y pasan.
- [x] Los tests e2e de Playwright pasan y `ng build` de `web-admin` compila sin errores.
- [x] La auditoría axe (`@axe-core/playwright`, WCAG 2.2 AA) no devuelve violaciones en el formulario, también con errores visibles y con ingredientes añadidos.
- [x] Existe `packages/web-admin/e2e-videos/dish-form-teclado.webm`, grabado con Playwright, que muestra solo con teclado cómo se navega el formulario, se modifican datos, se añaden y quitan ingredientes, se envía incompleto para mostrar los errores y finalmente se crea bien el plato y se ve en el listado.

## Dudas y decisiones tomadas

**Dudas abiertas**
- Las tareas 3-9 ya tienen el código implementado (cubierto con e2e). ¿Se añaden los tests unitarios a posteriori, comprobando el rojo desactivando temporalmente el código (recomendado), o se revierte ese código y se rehace con TDD estricto desde cero?
- ¿El vídeo `e2e-videos/dish-form-teclado.webm` se versiona en git (es un entregable) o se ignora y solo se genera en local?

**Decisiones asumidas**
- Se sigue la estructura real del repositorio (Angular 21, TypeScript, `packages/web-admin/...`) en lugar de las rutas `src/<capa>/<recurso>.<capa>.js` de la plantilla, que corresponden a la API y no aplican a este plan.
- Se mantiene el estilo del frontend: componente con `FormsModule` y signals, sin migrar a formularios reactivos, para limitar el alcance.
- Se usa validación propia con mensajes visibles en vez de la validación nativa del navegador, porque esta no es consistente entre lectores de pantalla.
- Los estados (cargando/guardado) se anuncian con `aria-live="polite"` y los errores con `role="alert"` (ya existente).
- Confirmado por el usuario: el número de issue es #11, el tipo es `bugfix`, los tests unitarios usan Vitest (runner de Angular) y los e2e Playwright; la accesibilidad se valida con axe.
- Los tests e2e necesitan la base de datos con datos de prueba: ejecutar `npm run seed` **una sola vez** antes (Playwright no lo lanza, porque el seed duplica los platos en cada ejecución al usar `randomUUID()` con `INSERT OR IGNORE`) y las credenciales de prueba del README. Los tests que envían el formulario simulan el POST para no escribir en la BBDD de desarrollo; solo el vídeo crea un plato real, que se borra al terminar.
- Contraste, decidido por el usuario: corrección global en `packages/web-admin/src/styles.css` (token `--border-control` y placeholder con `--text-secondary`), lo que afecta a todos los formularios de `web-admin`. Los textos ya cumplían 4,5:1 una vez terminada la animación `fade-in`; los fallos reales eran el placeholder (2,64:1) y el borde de los controles (1,19:1).
- Las tareas 10 y 11 (CSS puro) no llevan test unitario porque jsdom no calcula maquetación ni resuelve el contraste; se cubren con e2e y axe.
- Lint y formato: el proyecto no tiene eslint ni configuración de prettier, así que no se aplican; la verificación se limita a tests y `ng build`.
- El test e2e de teclado elige la opción del selector con `selectOption`, porque en macOS `ArrowDown` abre el desplegable nativo.
- Tests unitarios añadidos a posteriori (opción elegida): el rojo de cada tarea se comprobó restaurando temporalmente el componente a la versión anterior al commit de esa tarea. Un test de `novalidate` se descartó porque `FormsModule` ya lo añade y no discriminaba.
- El builder de Angular ejecuta Vitest 3.2.4 (el de la raíz, usado por la API) aunque `web-admin` declara `vitest@4.1.12`; los tests funcionan igual. Conviene unificar versiones en otra tarea.
- El vídeo se versiona en git (asunción mientras no se indique lo contrario) y la ejecución completa de `npm run test:e2e` lo regenera.
- Incidencia detectada: `npm run seed` duplica los platos en cada ejecución. Una versión previa de `playwright.config.ts` lo lanzaba en cada arranque, por lo que `resttek.db` local tiene cada plato del seed repetido 33 veces; la configuración ya está corregida. Para limpiarlo, borrar `packages/api/resttek.db` y ejecutar `npm run seed` una vez (no se ha tocado el fichero `.db`).
