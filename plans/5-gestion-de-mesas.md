# Gestión de mesas (#5)

- **Tipo**: feature
- **Issue**: #5

## Objetivo

Introducir la entidad **Mesa** en Resttek para que: el administrador gestione (CRUD) las mesas de cada restaurante; el cliente, al elegir restaurante, indique el número de personas, elija una mesa libre con capacidad suficiente, la ocupe y continúe a la carta para enviar su pedido (asociado a esa mesa) a cocina y barra; y los empleados vean y cambien el estado de las mesas y consulten el estado de los pedidos de las mesas ocupadas.

## Alcance

**Incluye**
- API (estilo **por capas**): tabla `restaurant_tables`, modelo `RestaurantTable` con `normalizeTableStatus()` (`libre`, `ocupada`, `reservada`), repositorio SQLite + mock, servicio, controller y rutas en `/api/v1/restaurants/:restaurantId/tables`:
  - `GET /` (admin, manager, camarero, cocinero) · `GET /:id` · `POST /` · `PUT /:id` · `DELETE /:id` (admin).
  - `PATCH /:id/status` (admin, manager, camarero, cocinero): cambia el estado.
  - `GET /available?people=N` (cliente): mesas `libre` con `capacity >= N`, ordenadas por capacidad ascendente.
  - `POST /:id/occupy` (cliente): ocupa la mesa de forma atómica (`UPDATE … WHERE status = 'libre'`); si ya no está libre → `409`.
- Validaciones: número y capacidad enteros > 0, número único por restaurante, estado válido; errores de dominio nuevos (`TableNotFoundError` → 404, `TableNotAvailableError` y `DuplicatedTableNumberError` → 409, `InvalidTableStatusError`, `InvalidTableNumberError`, `InvalidCapacityError` → 400).
- Seed con mesas de prueba para `rest-1` y `rest-2`; los pedidos de ejemplo pasan a usar el `id` de una mesa en `table_id`.
- `web-admin`: feature `tables` (models, services, store, páginas listado y formulario), rutas y enlaces en menú lateral y dashboard del restaurante.
- `web-clientes`: página de selección de mesa (`/restaurants/:id/tables`) con número de personas → mesas disponibles → «Continuar» (ocupa y navega a la carta); el `tableId` se guarda en `CartStore` y se envía al crear el pedido.
- `web-empleados`: feature `tables` con página «Mesas» (estado de cada mesa, cambio de estado y pedidos activos de las mesas ocupadas, agrupando los de `GET /orders/active` por `tableId`) y enlace en el menú.
- Tests de la API (vitest) y tests unitarios del store de `web-admin` (vitest, ya configurado).
- Documentación: `docs/dominio/modelo-datos.md` y `docs/dominio/glosario.md`.

**No incluye**
- Liberar la mesa automáticamente al entregar/pagar el pedido (la libera un empleado cambiando el estado).
- Flujo de reservas por parte del cliente (el estado `reservada` solo lo fijan admin/empleados).
- Configurar tests unitarios en `web-empleados` y `web-clientes` (no tienen runner de tests).
- Unir mesas, planos del salón o actualizaciones en tiempo real (se reutiliza el *polling* existente de 30 s).

## Archivos afectados

| Archivo | Acción | Motivo |
| --- | --- | --- |
| `packages/api/src/config/database.ts` | modificar | `CREATE TABLE IF NOT EXISTS restaurant_tables` con `UNIQUE(restaurant_id, number)` |
| `packages/api/src/models/table.model.ts` | crear | Interfaz `RestaurantTable`, tipo de estado y `normalizeTableStatus()` |
| `packages/api/src/errors/DomainErrors.ts` | modificar | Errores de dominio de mesas |
| `packages/api/src/contexts/shared/infrastructure/http/errorHandler.ts` | modificar | `TableNotFoundError` en 404 y nueva lista de errores 409 |
| `packages/api/src/repositories/table.repository.ts` | crear | `TableRepository` + `SqliteTableRepository` (CRUD, `findAvailable`, `occupyIfFree`, `updateStatus`) |
| `packages/api/src/repositories/table.repository.test.ts` | crear | Tests del repositorio contra SQLite `:memory:` |
| `packages/api/src/repositories/mocks/MockTableRepository.ts` | crear | Mock en memoria para tests del servicio |
| `packages/api/src/services/table.service.ts` | crear | Reglas de negocio y validaciones |
| `packages/api/src/services/table.service.test.ts` | crear | Tests de `normalizeTableStatus` y `TableService` |
| `packages/api/src/controllers/table.controller.ts` | crear | Controller HTTP + `toJSON` |
| `packages/api/src/routes/table.routes.ts` | crear | Rutas con `authenticate`/`authorize` |
| `packages/api/src/app.ts` | modificar | Montar `/api/v1/restaurants/:restaurantId/tables` |
| `packages/api/src/scripts/seed.ts` | modificar | Mesas de prueba y `table_id` de los pedidos de ejemplo |
| `packages/web-admin/src/app/features/tables/models/table.model.ts` | crear | Modelo y DTOs |
| `packages/web-admin/src/app/features/tables/services/table.service.ts` | crear | Llamadas HTTP |
| `packages/web-admin/src/app/features/tables/store/table.store.ts` | crear | Store con signals |
| `packages/web-admin/src/app/features/tables/store/table.store.spec.ts` | crear | Tests unitarios del store |
| `packages/web-admin/src/app/features/tables/pages/table-list/table-list.component.{ts,html,css}` | crear | Listado con editar/eliminar |
| `packages/web-admin/src/app/features/tables/pages/table-form/table-form.component.{ts,html,css}` | crear | Alta/edición |
| `packages/web-admin/src/app/features/tables/tables.routes.ts` | crear | `TABLE_ROUTES` |
| `packages/web-admin/src/app/app.routes.ts` | modificar | Ruta `restaurants/:restaurantId/tables` |
| `packages/web-admin/src/app/core/layout/shell.component.html` | modificar | Enlace «Mesas» en el submenú del restaurante |
| `packages/web-admin/src/app/features/restaurants/pages/restaurant-dashboard/restaurant-dashboard.component.html` | modificar | Tarjeta «Mesas» |
| `packages/web-clientes/src/app/core/models/table.model.ts` | crear | Modelo de mesa |
| `packages/web-clientes/src/app/core/services/table.service.ts` | crear | `getAvailable()` y `occupy()` |
| `packages/web-clientes/src/app/features/tables/table-selection.component.ts` | crear | Personas → mesas disponibles → Continuar |
| `packages/web-clientes/src/app/app.routes.ts` | modificar | Ruta `restaurants/:id/tables` |
| `packages/web-clientes/src/app/features/restaurants/restaurant-list.component.ts` | modificar | El enlace del restaurante va a la selección de mesa |
| `packages/web-clientes/src/app/core/store/cart.store.ts` | modificar | `tableId` en el estado (`setTable`, se limpia con `clear`) |
| `packages/web-clientes/src/app/core/services/order.service.ts` | modificar | `createOrder` envía `tableId` |
| `packages/web-clientes/src/app/features/cart/cart.component.ts` | modificar | Pasa el `tableId` del carrito al crear el pedido |
| `packages/web-empleados/src/app/features/tables/models/table.model.ts` | crear | Modelo de mesa |
| `packages/web-empleados/src/app/features/tables/services/table.service.ts` | crear | `getAll()` y `updateStatus()` |
| `packages/web-empleados/src/app/features/tables/store/table.store.ts` | crear | Store con signals y *polling* |
| `packages/web-empleados/src/app/features/tables/pages/mesas/mesas.component.{ts,html,css}` | crear | Estado de mesas, cambio de estado y pedidos de mesas ocupadas |
| `packages/web-empleados/src/app/app.routes.ts` | modificar | Ruta `mesas` |
| `packages/web-empleados/src/app/core/layout/shell.component.{ts,html}` | modificar | Enlace «Mesas» en el menú |
| `docs/dominio/modelo-datos.md` | modificar | Tabla `restaurant_tables` y significado de `orders.table_id` |
| `docs/dominio/glosario.md` | modificar | Término «Mesa» y sus estados |

## Tareas

Cada tarea debe poder completarse en 5-10 minutos. En la API se sigue TDD (test en rojo → código → verde con `npm test`).

**API**
- [ ] 1. Crear `table.model.ts` con `RestaurantTable` y `normalizeTableStatus()`, más los errores de dominio nuevos; tests de `normalizeTableStatus` (válidos, mayúsculas/espacios, inválido, vacío).
- [ ] 2. Añadir la tabla `restaurant_tables` en `runInitialMigrations()` y registrar los errores en `errorHandler` (404 y nueva lista 409).
- [ ] 3. Repositorio: interfaz `TableRepository` y `SqliteTableRepository` con `findById`, `findByRestaurantId`, `findByNumber`, `save`, `delete`; tests contra `:memory:`.
- [ ] 4. Repositorio: `findAvailable(restaurantId, people)`, `updateStatus(id, status)` y `occupyIfFree(id)` (devuelve si se ocupó según `changes`); tests, incluido que una segunda ocupación devuelve `false`.
- [ ] 5. `MockTableRepository` y `TableService.create/update` con validaciones (número/capacidad enteros > 0, número único por restaurante, estado por defecto `libre`); tests.
- [ ] 6. `TableService.delete`, `findById`, `findByRestaurantId`, `updateStatus`, `findAvailable` (valida `people` entero > 0) y `occupy` (lanza `TableNotAvailableError` si no estaba libre, `TableNotFoundError` si no existe o es de otro restaurante); tests.
- [ ] 7. `TableController` y `table.routes.ts` con los roles del alcance (declarando `/available` antes de `/:id`); montar en `app.ts`.
- [ ] 8. Seed: 4-6 mesas por restaurante con capacidades variadas e `INSERT OR IGNORE` con ids fijos; el pedido de ejemplo usa el id de una mesa y esa mesa queda `ocupada`. Comprobar `npm run seed` y los endpoints con `curl`.

**web-admin**
- [ ] 9. Modelo, `TableService` y `TableStore` (`loadByRestaurant`, `create`, `update`, `delete`) siguiendo `IngredientStore`; `table.store.spec.ts` con el servicio falso.
- [ ] 10. `TableListComponent` (número, descripción, capacidad, estado, editar/eliminar) y `tables.routes.ts`.
- [ ] 11. `TableFormComponent` (alta/edición con número, descripción, capacidad y estado) con mensajes de error de la API.
- [ ] 12. Ruta en `app.routes.ts`, enlace en el menú lateral y tarjeta en el dashboard; `ng test` y `ng build`.

**web-clientes**
- [ ] 13. Modelo y `TableService` (`getAvailable(restaurantId, people)`, `occupy(restaurantId, tableId)`); `CartStore` con `tableId` (`setTable`, se resetea en `clear` y al cambiar de restaurante).
- [ ] 14. `TableSelectionComponent`: campo de personas, listado de mesas disponibles, selección y botón «Continuar» que ocupa la mesa, guarda el `tableId` y navega a `/restaurants/:id`; mensaje si no hay mesas o si la mesa se ocupó entretanto (409).
- [ ] 15. Ruta `restaurants/:id/tables`, enlace desde `restaurant-list` y envío del `tableId` en `OrderService.createOrder` / `CartComponent.confirmOrder`; `ng build`.

**web-empleados**
- [ ] 16. Modelo, `TableService` (`getAll`, `updateStatus`) y `TableStore` con *polling* (como `OrderStore`).
- [ ] 17. `MesasComponent`: tarjetas por mesa con estado y selector para cambiarlo; en las ocupadas, sus pedidos activos (de `OrderStore`, agrupados por `tableId`) con el estado de cada ítem.
- [ ] 18. Ruta `mesas` y enlace «Mesas» en el menú para todos los roles de empleado; `ng build`.

**Cierre**
- [ ] 19. Actualizar `modelo-datos.md` y `glosario.md`.
- [ ] 20. Verificación final: `npm test`, `ng build` de los tres frontends y prueba manual del flujo completo (admin crea mesa → cliente la ocupa y pide → empleado la ve ocupada con su pedido y la libera).

## Criterios de aceptación

- [ ] `POST /api/v1/restaurants/:restaurantId/tables` con admin devuelve `201` con `id`, `number`, `description`, `capacity`, `status` (`libre` por defecto); con otro rol, `403`.
- [ ] Número o capacidad no enteros o ≤ 0, o estado inválido → `400`; número repetido en el mismo restaurante → `409`; mesa inexistente → `404`.
- [ ] `PUT` y `DELETE` funcionan solo para admin (`200` / `204`).
- [ ] `GET …/tables/available?people=4` con un cliente devuelve solo mesas `libre` con `capacity >= 4`.
- [ ] `POST …/tables/:id/occupy` deja la mesa `ocupada`; repetirlo devuelve `409`.
- [ ] `PATCH …/tables/:id/status` permite a manager, camarero y cocinero cambiar el estado; un cliente recibe `403`.
- [ ] En `web-admin` se pueden crear, listar, editar y eliminar mesas de un restaurante.
- [ ] En `web-clientes`, al entrar en un restaurante se pide el número de personas, se muestran las mesas disponibles, y tras «Continuar» la mesa queda ocupada y se llega a la carta; el pedido creado tiene `tableId` de esa mesa.
- [ ] En `web-empleados`, la página «Mesas» muestra el estado de cada mesa, permite cambiarlo y, para las ocupadas, lista sus pedidos activos con el estado de cada ítem.
- [ ] `npm test` en verde (tests nuevos incluidos) y `ng build` sin errores en los tres frontends; `ng test` de `web-admin` en verde.

## Dudas y decisiones tomadas

**Dudas abiertas**
- ¿Quién y cuándo libera la mesa? Se asume que un empleado la pone en `libre` manualmente; ¿debería liberarse sola al entregar todos los ítems?
- ¿Puede un cliente reservar mesa desde la app, o `reservada` es solo para gestión interna? Se asume lo segundo.
- ¿Debe impedirse eliminar una mesa `ocupada`? Se asume que no (el admin decide).
- ¿Los cocineros también deben poder cambiar el estado de las mesas? La issue dice «los empleados»; se incluyen todos los roles con restaurante.

**Decisiones asumidas**
- Estilo **por capas** (no hexagonal), como indica `CLAUDE.md` para dominios nuevos.
- Tabla `restaurant_tables` y modelo `RestaurantTable` para evitar ambigüedad con «tabla» de BBDD; en la UI se llama «Mesa».
- `orders.table_id` guarda el `id` de la mesa (sin FK, para no romper la BBDD existente); los empleados obtienen los pedidos de una mesa agrupando `GET /orders/active` por `tableId`, sin endpoint nuevo.
- Ocupación atómica en SQL para evitar que dos clientes ocupen la misma mesa; se añade el código `409` al `errorHandler`.
- Como `CREATE TABLE IF NOT EXISTS` no altera BBDD existentes, al ser una tabla nueva no hace falta borrar `resttek.db`; solo volver a ejecutar `npm run seed`.
- Sin linter configurado en el repo: la verificación de calidad es `npm test` + `ng build` (+ `ng test` en `web-admin`).
- No se configura runner de tests en `web-empleados` ni `web-clientes`; se verifican con build y prueba manual.
