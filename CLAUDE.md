# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Aplicación de test para oposiciones (Constitución Española y temario de la Comunidad de Madrid).
React 19 + Vite + Tailwind, con Firebase Auth/Firestore para sincronizar progreso entre dispositivos.

## Entorno de desarrollo

El proyecto vive en WSL (`/home/user/opo-quiz`) pero Claude Code suele ejecutarse desde Windows
con rutas UNC (`\\wsl.localhost\ubuntu\...`). **Los comandos de npm hay que lanzarlos desde una
terminal de WSL**: `node_modules` contiene binarios nativos de Linux (rolldown/vite) que fallan
con el Node de Windows, y `cmd.exe` no acepta rutas UNC como directorio de trabajo.
El Node de WSL viene de nvm, que solo se carga en shells interactivas: desde Windows hay que
lanzar `wsl.exe -e bash -c 'source ~/.nvm/nvm.sh && cd /home/user/opo-quiz && npm run build'`
(con `bash -lc` a secas se cuela el `npm` de Windows vía `/mnt/c`).

```bash
npm run dev      # servidor de desarrollo (Vite)
npm run build    # build de producción a dist/
npm run lint     # ESLint sobre todo el repo
```

No hay framework de tests ni suite automatizada: la verificación es manual en el navegador.
ESLint da dos avisos preexistentes de `react-hooks/exhaustive-deps` en `App.jsx` y falsos
positivos de `no-unused-vars` sobre `Icon` (el patrón `{ icon: Icon }` usado en JSX); no son
regresiones.

En disco los archivos usan **CRLF**, pero el repositorio guarda **LF**: `.gitattributes`
(`* text=auto`) normaliza al commitear, así que el repo se ve limpio tanto desde Windows como desde
WSL. No hace falta preservar CRLF al parchear con scripts.

## Arquitectura

**Todo el estado vive en `App.jsx`.** No hay router, ni Redux, ni Context: `App.jsx` mantiene la
vista actual (`menu` / `quiz` / `results`), la pestaña activa, las preguntas de la sesión en curso
y todo el progreso del usuario, y lo pasa por props. Los componentes de `src/components/` son
presentacionales y reciben callbacks.

**`startQuiz(mode, filterValue, n, options)` es el corazón de la app.** Cada modo de práctica
(`all`, `simulacro`, `least_seen`, `mistakes`, `hard`, `most_failed_pct`, `skipped_qs`,
`multi_topic`, y las variantes `topic_*`) es una rama que filtra y ordena `allQuestions` para
construir el pool de la sesión. Añadir un modo significa añadir una rama aquí y una tarjeta en
`MODE_CARDS` (o equivalente) en `Menu.jsx`.

En `multi_topic`, `options.distribution` decide el reparto entre temas: `random` (baraja el pool
combinado, así que los temas grandes dominan), `equal` o `manual` (cuotas por tema calculadas con
`allocateByWeights()` en `utils.js`, que usa restos mayores y redistribuye en rondas lo que un tema
no puede absorber). El tamaño de los temas es muy desigual — de 3 a 655 preguntas — así que este
reparto importa.

**Persistencia en dos capas, pensada para funcionar offline:**

- `store.js` — localStorage, siempre disponible. Cuatro claves (`opo_history`, `opo_results`,
  `opo_mistakes`, `opo_skipped`). Es la fuente de verdad en el momento de responder.
- `lib/sync.js` — Firestore. Al hacer login se hace un **merge por máximos** (`mergeResults`):
  se toma el mayor `correctCount`/`failCount` de cada pregunta entre local y remoto, de modo que
  el progreso nunca retrocede aunque se practique en varios dispositivos. Los fallos de escritura
  caen en una cola offline (`opo_pending_sync`) que se vacía en el siguiente login.

Las preguntas se identifican con `getQuestionId()` (`utils.js`): usa `q.id` si existe y si no
deriva una clave del texto. Es la clave de los documentos en Firestore, así que **cambiar el texto
de una pregunta sin `id` rompe el historial de esa pregunta**.

**Firebase es opcional.** `lib/firebase.js` exporta `isFirebaseReady`; si no hay configuración, la
app funciona entera contra localStorage y no muestra la pantalla de login. La API key pública va
partida en trozos a propósito, para que el escáner de secretos de GitHub no la marque.

## Datos de preguntas

`src/data/preguntas.json` — array plano de ~1.900 objetos
`{ id, tema, pregunta, opciones[], correcta, fuente }`. `correcta` es el **texto** de la opción, no
un índice: `Quiz.jsx` baraja las opciones en cada sesión y compara por contenido.

Las preguntas proceden de PDFs y de scraping, mediante dos scripts de un solo uso (rutas absolutas
a `/home/user/opo-quiz` hardcodeadas, con rangos de nº de pregunta por tema):

- `extract_questions.py` — extrae de los PDFs con pdfminer.
- `scrape_oposito.py` — scrapea oposito.es.

Los lotes nuevos se han ido añadiendo con `fuente` propia (`Test App 2`, `COEPA`, `Daypo`,
`Test App 5`...). Los PDFs de origen están en la raíz del repo, sin trackear.

El orden de los temas en el menú lo calcula `temasDisponibles` en `App.jsx`: Título Preliminar
primero, luego Títulos en romanos, luego `Tema N` en numérico.

## Reportes de usuarios

Los usuarios reportan errores en una pregunta desde `ReportModal.jsx`, que escribe en la colección
`reports` de Firestore. `Admin.jsx` los lista y permite marcarlos como resueltos, pero solo para el
email admin: las reglas de `firestore.rules` fijan `chemapm30@gmail.com` como único lector.

Resolver un reporte es un flujo manual recurrente: se lee el reporte, se corrige (o se elimina) la
pregunta en `preguntas.json`, se commitea el cambio y se marca el reporte como resuelto en la
pestaña Admin. Claude no puede leer `reports` (no hay credenciales admin en el entorno), así que el
admin usa el botón **Copiar** de Admin, que vuelca los reportes del filtro activo en texto plano con
el `questionId` de cada uno, y lo pega en la sesión. Varios reportes pueden apuntar a la misma
pregunta, a veces con peticiones contradictorias: hay que preguntar antes de elegir.

## Despliegue

Cloudflare Pages, en `quiz-constitucion.pages.dev`, conectado al repo de GitHub
(`chemapm30-create/quiz-constitucion`). No hay `wrangler.toml` ni workflow en el repo: el build lo
dispara Cloudflare al recibir un push. Firestore Rules se despliegan aparte con `firebase deploy
--only firestore:rules`.

## Convenciones

- **Todo en español**: interfaz, comentarios del código y mensajes de commit.
- Commits con prefijo convencional (`feat:`, `fix:`) y cuerpo explicando el porqué.
- Se trabaja **directamente sobre `main`**, sin ramas ni PRs, y se hace push a `origin`.
- Estilo de UI: tema oscuro (`bg-[#080808]`, grises de Tailwind), acento `indigo`, esquinas muy
  redondeadas (`rounded-2xl`), iconos de `lucide-react`. Diseño mobile-first: `Navbar` es una barra
  inferior en móvil y lateral en escritorio.

## Mantenimiento de este archivo

Cuando en una sesión aparezca algo que cueste redescubrir leyendo el código —una decisión de diseño
y su porqué, un flujo manual, una trampa del entorno, un cambio estructural— actualiza este archivo
en el mismo commit. No lo conviertas en un registro de cambios ni dupliques lo que el código ya
dice con claridad.
