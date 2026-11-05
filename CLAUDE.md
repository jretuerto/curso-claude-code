# CLAUDE.md

Este archivo ofrece orientación a Claude Code (claude.ai/code) cuando trabaja con el código de este repositorio.

## Proyecto

Resttek: plataforma de gestión de restaurantes. Monorepo con **npm workspaces** (`packages/*`) y 5 paquetes:

- `api` (`@resttek/api`): Node.js 22+, Express 5, TypeScript, SQLite. Puerto 3000.
- `web-admin` (4200), `web-empleados` (4201), `web-clientes` (4202): apps Angular 21.
- `web-shared` (`@resttek/web-shared`): librería compartida (auth, interceptors, componentes). Es la única dependencia entre frontends.

## Documentación

Lee estos archivos antes de tocar código del área correspondiente:

- `docs/arquitectura/arquitectura-general.md`: visión macro, proxy, autenticación, relaciones entre paquetes.
- `docs/arquitectura/arquitectura-api.md`: los dos estilos arquitectónicos de la API (imprescindible antes de tocar la API).
- `docs/arquitectura/arquitectura-frontend.md`: estructura de los frontends y patrón Store.
- `docs/dominio/glosario.md`: entidades, roles, estados y términos.
- `docs/dominio/modelo-datos.md`: esquema de la base de datos.
- `README.md`: setup, puertos y credenciales de prueba.

## Comandos (desde la raíz)

- `npm install`: instala todos los paquetes.
- `npm run seed`: puebla la BBDD con datos de prueba (idempotente, usa `INSERT OR IGNORE`).
- `npm run dev:api` / `dev:admin` / `dev:empleados` / `dev:clientes`: arrancan cada servicio (cada uno en su terminal).
- `npm test`: tests de la API (vitest). En modo watch: `cd packages/api && npm run test:watch`.
- Los frontends hacen proxy de `/api` a `http://localhost:3000`; accede por el puerto del frontend, no directamente a la API.

## Arquitectura de la API

Conviven **dos estilos**; comprueba cuál aplica antes de añadir código:

- **Hexagonal + DDD**: solo el contexto `employee` (`src/contexts/employee/`: `domain` → `application` → `infrastructure`). Casos de uso con un único método `execute()`, inyección por constructor, entidad con constructor privado + `Employee.create()`, prefijo `I` en interfaces (`IEmployeeRepository`).
- **Por capas**: `restaurant`, `dish`, `ingredient`, `order`. Carpetas transversales `models/`, `repositories/`, `services/`, `controllers/`, `routes/`, un fichero por dominio (`dish.service.ts`). Son `interface` planas, sin comportamiento; la validación vive en servicios y en funciones `normalizeX()` de `models/`. Las interfaces de repositorio no llevan prefijo `I`.
- Nuevos dominios fuera de `employee` siguen el estilo por capas, salvo que se indique lo contrario.
- Las tablas se crean al arrancar (migraciones en código). Con `NODE_ENV=test` la BBDD es `:memory:`; en otro caso es `packages/api/resttek.db`.
- Auth: JWT (8 h) con `id`, `role` y `restaurantId`. El middleware `authenticate` verifica el token y `authorize()` comprueba roles. La autorización real está en la API, no en los frontends.

## Arquitectura del frontend

- Angular 21: componentes standalone, signals, **zoneless** (sin `zone.js`), guards e interceptors funcionales, lazy loading.
- `web-admin` y `web-empleados`: feature-based con `models/`, `pages/`, `services/`, `store/`. El estado vive en stores (`providedIn: 'root'`) con signals privadas expuestas con `asReadonly()`; RxJS solo para HTTP, envuelto en `firstValueFrom`.
- `web-clientes`: modelos y servicios centralizados en `core/`; los componentes consumen los `Observable` con `.subscribe()`. El componente raíz se llama `App`.
- Lo compartido va en `@resttek/web-shared`, no en carpetas `shared/` propias.
- `AuthGuard` solo comprueba sesión, no roles. Si cambias `web-shared`, reinicia el servidor de desarrollo del frontend (no recarga solo).

## Reglas de dominio a tener en cuenta

- **Los clientes son `Employee`**: no hay tabla de clientes; son filas de `employees` con `role = 'cliente'` y `restaurant_id = null`.
- **Cada unidad pedida es un `OrderItem`** con `quantity: 1`: un pedido de 3 unidades genera 3 filas.
- Roles: `admin`, `manager` (en la UI "gerente"), `cocinero`, `camarero`, `cliente`.
- Estados de pedido: `pendiente` → `preparando` → `listo` (cocinero) → `entregado` (camarero).
- Categorías de plato: `entrante`, `principal`, `postre`, `bebida`. Unidades de ingrediente: `kg`, `g`, `l`, `ml`, `unidad`.
- Los enumerados se validan en `normalizeX()` (`trim()` + `toLowerCase()`); no los dupliques en otros sitios.

## Notas

- Las credenciales de prueba tienen la contraseña igual al email (solo para desarrollo; nunca en producción).
- `scripts/seed-issues.sh` crea issues en GitHub desde `scripts/issues.json` (requiere `gh` y `jq`).
- No toques `.angular/cache/` ni los ficheros `.db`: son artefactos generados.
