# vali-flow-docs

Sitio de documentación oficial del ecosistema **Vali-Tempo** — una colección de librerías TypeScript para manejo de fechas, tiempos, calendarios y zonas horarias.

## Stack
- **Framework**: Docusaurus 3.9.2
- **Lenguaje**: TypeScript ~5.6
- **Runtime**: Node.js ≥20 / Bun
- **React**: 19
- **Deploy**: Netlify (ver `netlify.toml`)
- **Animaciones**: GSAP 3.14

## Estructura de directorios
- `docs/` — contenido de la documentación (MDX/Markdown)
  - `docs/core/` — paquetes core de vali-tempo
  - `docs/adapters/` — adaptadores
  - `docs/guides/` — guías de uso
  - `docs/examples/` — ejemplos prácticos
  - `docs/architecture/` — documentación de arquitectura
  - `docs/internal/` — documentación interna del ecosistema
- `src/` — componentes y páginas custom de Docusaurus
  - `src/pages/` — landing page y páginas especiales
  - `src/css/` — estilos globales
  - `src/theme/` — overrides de tema Docusaurus
- `static/` — archivos estáticos (imágenes, diagramas, robots.txt, redirects)
- `sidebars.ts` — configuración de sidebar de navegación
- `docusaurus.config.ts` — configuración principal del sitio

## Convenciones del proyecto
- Archivos de docs: kebab-case (e.g., `quick-start.md`, `vali-date.md`)
- Componentes React: PascalCase en `src/`
- Lenguaje del contenido: inglés (docs) / español puede aparecer en notas internas
- Plugin drawio habilitado para diagramas (`.drawio` en `static/diagrams/`)

## Comandos útiles
```bash
# Desarrollo
bun start            # o: npm run start

# Build
bun run build

# Typecheck
bun run typecheck

# Limpiar caché Docusaurus
bun run clear
```

## Lo que NO hacer en este proyecto
- No modificar archivos en `.docusaurus/` ni `build/` — son generados
- No editar `bun.lock` manualmente
- No agregar dependencias pesadas sin justificación (es un sitio de docs)
