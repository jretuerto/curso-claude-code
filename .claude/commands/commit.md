---
description: Crea un commit siguiendo la especificación de Conventional Commits
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*)
argument-hint: [contexto opcional sobre el cambio]
---

# Commit con Conventional Commits

Crea un commit de los cambios actuales siguiendo la especificación [Conventional Commits 1.0.0](https://www.conventionalcommits.org/es/v1.0.0/).

## Contexto

- Estado del repositorio: !`git status --short`
- Cambios en staging: !`git diff --cached`
- Cambios sin añadir: !`git diff`
- Últimos commits (para seguir el estilo): !`git log --oneline -10`

## Contexto adicional del usuario

$ARGUMENTS

## Formato del mensaje

```
<tipo>[ámbito opcional][!]: <descripción>

[cuerpo opcional]

[pie(s) opcional(es)]
```

### Tipos permitidos

- `feat`: nueva funcionalidad (corresponde a MINOR en SemVer).
- `fix`: corrección de un error (corresponde a PATCH en SemVer).
- `docs`: cambios solo en documentación.
- `style`: formato que no afecta al código (espacios, comillas, punto y coma).
- `refactor`: cambio de código que ni corrige un error ni añade funcionalidad.
- `perf`: mejora de rendimiento.
- `test`: añadir o corregir tests.
- `build`: cambios en el sistema de build o dependencias (`package.json`, etc.).
- `ci`: cambios en la configuración de integración continua.
- `chore`: tareas de mantenimiento que no tocan `src` ni tests.
- `revert`: revierte un commit anterior.

### Reglas

1. El **ámbito** es opcional y va entre paréntesis; usa el recurso o la capa afectada (p. ej. `vendehumos`, `service`, `repository`, `db`).
2. La **descripción** va en español, en minúscula, en imperativo o infinitivo, sin punto final y con un máximo de ~72 caracteres.
3. El **cuerpo** (opcional) explica el *qué* y el *porqué*, no el *cómo*; sepáralo de la descripción con una línea en blanco.
4. Los **cambios incompatibles** (breaking changes) se marcan con `!` tras el tipo/ámbito y/o con un pie `BREAKING CHANGE: <explicación>`.
5. Los **pies** usan el formato `Clave: valor` (p. ej. `Refs: #123`).

## Pasos

1. Analiza los cambios (staging y sin añadir) y decide el tipo y el ámbito más adecuados.
2. Si los cambios mezclan propósitos distintos (p. ej. una funcionalidad y un refactor no relacionado), propón dividirlos en varios commits y pregunta al usuario antes de continuar.
3. Si no hay nada en staging, añade con `git add` solo los ficheros relevantes (nunca `git add -A` a ciegas; no añadas secretos, `.env` ni `data/*.db`).
4. Redacta el mensaje según el formato anterior y crea el commit con `git commit -m`.
5. Muestra el mensaje final del commit y el resultado de `git status`.

## Restricciones

- No hagas `git push`.
- No uses `--no-verify` ni `--amend` salvo que el usuario lo pida expresamente.
- Si no hay cambios que commitear, indícalo y no crees un commit vacío.
