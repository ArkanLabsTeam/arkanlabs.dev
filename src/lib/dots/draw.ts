// import { DOT_GRID_CONFIG, setupCoreLoop, type PublicCoreState, type RequestFrameFunction } from "./dots_core/dots_core";
// import { clamp, smoothStep, type position } from "../utils/general";

// type GridPoint = { row: number, column: number };
// type LitDot = { point: GridPoint, dimmed: boolean };
// type Line = { from: GridPoint, to: GridPoint, dimmed: boolean };

// type DrawState = {
//     accentColor: string
//     backgroundColor: string
//     requestFrame: RequestFrameFunction
//     litDots: Map<string, LitDot> // keyed by "row,column", kept until reload unless right clicked off
//     lines: Line[] // kept until reload unless right clicked off
//     baseDotFades: Map<number, GridPoint[]> // overlay alpha -> base dots covered with that alpha
//     dragStart: GridPoint | null
//     dragEnd: GridPoint | null
// }

// const DRAW_CONFIG = {
//     baseFadeAlphaStep: 0.02, // fades are rounded to this so dots can be filled in batches
//     widthOutputId: "drawing-width",
//     panelId: "draw-panel",
//     panelToggleId: "draw-panel-toggle",
//     panelBodyId: "draw-panel-body",
//     panelResetId: "draw-panel-reset",
//     settingsStorageKey: "draw-settings",
//     ignoreSelector: "a, button, nav, input, label, #draw-panel",
// } as const;

// // everything here can be changed live from the settings panel
// const DEFAULT_SETTINGS = {
//     litAlpha: 1, // brightness of bright dots and lines
//     dimmedAlpha: 0.3, // brightness of dimmed dots and lines
//     previewAlpha: 0.3, // brightness of the drag preview
//     litScale: 2,
//     dimmedScale: 1.8,
//     lineScale: 0.9, // line thickness relative to a base dot
//     litDotTolerance: 2, // px of gap between the dragged path and a dot that still lights the dot up
//     hitRadius: 6, // px around a dot or line that still counts as clicking it
//     baseDotBrightness: 1, // brightness of every base dot, before the fade
//     baseFadeMaxAlpha: 0.85, // how much the base dots closest to the drawing blend into the background
//     baseFadeRadius: 3, // grid cells from the drawing where base dots are back to normal
//     baseFadeOverlayScale: 1.15, // slightly bigger than a base dot so its anti aliased edge gets covered too
// };

// type Settings = typeof DEFAULT_SETTINGS;
// type SettingKey = keyof Settings;
// type SliderDefinition = { key: SettingKey, label: string, min: number, max: number, step: number };

// const SLIDER_GROUPS: { group: string, sliders: SliderDefinition[] }[] = [
//     {
//         group: "Lines",
//         sliders: [
//             { key: "lineScale", label: "Thickness (× dot)", min: 0.1, max: 4, step: 0.05 },
//         ],
//     },
//     {
//         group: "Brightness",
//         sliders: [
//             { key: "litAlpha", label: "Bright", min: 0, max: 1, step: 0.01 },
//             { key: "dimmedAlpha", label: "Dimmed", min: 0, max: 1, step: 0.01 },
//             { key: "previewAlpha", label: "Drag preview", min: 0, max: 1, step: 0.01 },
//             { key: "baseDotBrightness", label: "Base dots", min: 0, max: 1, step: 0.01 },
//         ],
//     },
//     {
//         group: "Dot size",
//         sliders: [
//             { key: "litScale", label: "Bright (× dot)", min: 0.5, max: 5, step: 0.05 },
//             { key: "dimmedScale", label: "Dimmed (× dot)", min: 0.5, max: 5, step: 0.05 },
//         ],
//     },
//     {
//         group: "Base dot fade",
//         sliders: [
//             { key: "baseFadeMaxAlpha", label: "Strength", min: 0, max: 1, step: 0.01 },
//             { key: "baseFadeRadius", label: "Reach (cells)", min: 0.5, max: 12, step: 0.25 },
//             { key: "baseFadeOverlayScale", label: "Cover size (× dot)", min: 1, max: 2, step: 0.01 },
//         ],
//     },
//     {
//         group: "Input",
//         sliders: [
//             { key: "litDotTolerance", label: "Path tolerance (px)", min: 0, max: 10, step: 0.25 },
//             { key: "hitRadius", label: "Click margin (px)", min: 0, max: 20, step: 0.5 },
//         ],
//     },
// ];

// const settings: Settings = loadSettings();

// const CHUNK_SIZE = chunksToPx(1);

// function getLineWidth() {
//     return DOT_GRID_CONFIG.dotRadius * 2 * settings.lineScale;
// }

// function chunksToPx(chunks: number) {
//     return (DOT_GRID_CONFIG.spacing + DOT_GRID_CONFIG.dotRadius * 2) * chunks;
// }

// function setupDrawLoop(): void {
//     let abortController: AbortController;
//     let drawState: DrawState;

//     const setup = (requestFrame: RequestFrameFunction, _coreState: PublicCoreState) => {
//         drawState = {
//             accentColor: getCssColor("--color-accent"),
//             backgroundColor: getCssColor("--color-bg"),
//             requestFrame,
//             litDots: new Map(),
//             lines: [],
//             baseDotFades: new Map(),
//             dragStart: null,
//             dragEnd: null,
//         }
//         abortController = setupListeners(drawState);
//         setupPanel(drawState, abortController.signal);
//         updateWidthOutput(drawState);
//     }

//     const cleanup = () => {
//         abortController.abort();
//     }

//     const update = (_coreState: PublicCoreState, _stepScale: number): boolean => {
//         return false;
//     }

//     const draw = (coreState: PublicCoreState) => {
//         const ctx = coreState.context;

//         drawBaseDotBrightness(ctx, drawState, coreState);
//         drawBaseDotFades(ctx, drawState);

//         ctx.strokeStyle = drawState.accentColor;
//         ctx.lineWidth = getLineWidth();
//         ctx.lineCap = "round";
//         drawLines(ctx, drawState.lines.filter((line) => !line.dimmed), settings.litAlpha);
//         drawLines(ctx, drawState.lines.filter((line) => line.dimmed), settings.dimmedAlpha);

//         ctx.fillStyle = drawState.accentColor;
//         const litDots = [...drawState.litDots.values()];
//         drawDots(ctx, litDots.filter((dot) => !dot.dimmed).map((dot) => dot.point), settings.litAlpha, settings.litScale);
//         drawDots(ctx, litDots.filter((dot) => dot.dimmed).map((dot) => dot.point), settings.dimmedAlpha, settings.dimmedScale);

//         // preview of the line and dots the current drag would make
//         if (drawState.dragStart && drawState.dragEnd) {
//             drawLines(ctx, [{ from: drawState.dragStart, to: drawState.dragEnd, dimmed: false }], settings.previewAlpha);
//             const preview = getDotsAlongPath(drawState.dragStart, drawState.dragEnd)
//                 .filter((point) => !drawState.litDots.has(gridPointKey(point)));
//             drawDots(ctx, preview, settings.previewAlpha, settings.litScale);
//         }
//     }

//     setupCoreLoop({
//         setup,
//         cleanup,
//         update,
//         draw,
//     });
// }

// setupDrawLoop();


// // grid math
// // positions are computed from grid indices (same formula as the core),
// // so the drawing stays put even when the dots array is rebuilt on resize
// function gridPointToPosition(point: GridPoint): position {
//     return {
//         x: point.column * CHUNK_SIZE + CHUNK_SIZE / 2,
//         y: point.row * CHUNK_SIZE + CHUNK_SIZE / 2,
//     }
// }

// function getClosestGridPoint(x: number, y: number): GridPoint {
//     return {
//         row: Math.max(0, Math.floor(y / CHUNK_SIZE)),
//         column: Math.max(0, Math.floor(x / CHUNK_SIZE)),
//     }
// }

// function gridPointKey(point: GridPoint) {
//     return `${point.row},${point.column}`;
// }

// function isSameGridPoint(a: GridPoint, b: GridPoint) {
//     return a.row == b.row && a.column == b.column;
// }

// function isSameLine(a: Line, b: Line) {
//     return (isSameGridPoint(a.from, b.from) && isSameGridPoint(a.to, b.to))
//         || (isSameGridPoint(a.from, b.to) && isSameGridPoint(a.to, b.from));
// }

// function distanceToSegment(point: position, start: position, end: position) {
//     const dx = end.x - start.x;
//     const dy = end.y - start.y;
//     const lengthSquared = dx * dx + dy * dy;
//     // project the point onto the segment, clamped so we don't go past the ends
//     const t = lengthSquared == 0 ? 0 : clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
//     const closestX = start.x + t * dx;
//     const closestY = start.y + t * dy;
//     return Math.hypot(point.x - closestX, point.y - closestY);
// }

// function getDotsAlongPath(from: GridPoint, to: GridPoint): GridPoint[] {
//     // a dot is on the path when the straight line between the two dots
//     // passes through it or comes within the tolerance of its edge
//     const maxDistance = DOT_GRID_CONFIG.dotRadius + settings.litDotTolerance;
//     const start = gridPointToPosition(from);
//     const end = gridPointToPosition(to);
//     const dots: GridPoint[] = [];
//     // only dots inside the path's bounding box can be close enough
//     for (let row = Math.min(from.row, to.row); row <= Math.max(from.row, to.row); row++) {
//         for (let column = Math.min(from.column, to.column); column <= Math.max(from.column, to.column); column++) {
//             const point = { row, column };
//             if (distanceToSegment(gridPointToPosition(point), start, end) <= maxDistance) {
//                 dots.push(point);
//             }
//         }
//     }
//     return dots;
// }


// // hit testing
// function getLitDotAt(state: DrawState, point: position): LitDot | null {
//     const litDot = state.litDots.get(gridPointKey(getClosestGridPoint(point.x, point.y)));
//     if (!litDot) return null;
//     const center = gridPointToPosition(litDot.point);
//     const distance = Math.hypot(point.x - center.x, point.y - center.y);
//     return distance <= getLitDotRadius(litDot) + settings.hitRadius ? litDot : null;
// }

// function getLineIndexAt(lines: Line[], point: position): number | null {
//     const hitRadius = Math.max(settings.hitRadius, getLineWidth() / 2);
//     let closestIndex: number | null = null;
//     let closestDistance = hitRadius;
//     for (let i = 0; i < lines.length; i++) {
//         const start = gridPointToPosition(lines[i].from);
//         const end = gridPointToPosition(lines[i].to);
//         const distance = distanceToSegment(point, start, end);
//         if (distance <= closestDistance) {
//             // <= so on a tie the most recently drawn (topmost) line wins
//             closestDistance = distance;
//             closestIndex = i;
//         }
//     }
//     return closestIndex;
// }


// // drawing
// function drawDots(ctx: CanvasRenderingContext2D, points: GridPoint[], alpha: number, scale: number) {
//     if (points.length == 0) return;
//     ctx.globalAlpha = alpha;
//     ctx.beginPath();
//     for (const point of points) {
//         drawDot(ctx, gridPointToPosition(point), scale);
//     }
//     ctx.fill();
//     ctx.globalAlpha = 1;
// }

// function drawLines(ctx: CanvasRenderingContext2D, lines: Line[], alpha: number) {
//     if (lines.length == 0) return;
//     ctx.globalAlpha = alpha;
//     ctx.beginPath();
//     for (const line of lines) {
//         const start = gridPointToPosition(line.from);
//         const end = gridPointToPosition(line.to);
//         ctx.moveTo(start.x, start.y);
//         ctx.lineTo(end.x, end.y);
//     }
//     ctx.stroke();
//     ctx.globalAlpha = 1;
// }

// function drawBaseDotBrightness(ctx: CanvasRenderingContext2D, state: DrawState, coreState: PublicCoreState) {
//     // sits under the fade overlays, so a faded base dot ends up at brightness * (1 - fade)
//     if (settings.baseDotBrightness >= 1) return;
//     ctx.fillStyle = state.backgroundColor;
//     ctx.globalAlpha = 1 - settings.baseDotBrightness;
//     ctx.beginPath();
//     for (const row of coreState.dots) {
//         for (const dot of row) {
//             drawDot(ctx, dot, settings.baseFadeOverlayScale);
//         }
//     }
//     ctx.fill();
//     ctx.globalAlpha = 1;
// }

// function drawBaseDotFades(ctx: CanvasRenderingContext2D, state: DrawState) {
//     // covers base dots with a background colored dot so they blend into the background
//     ctx.fillStyle = state.backgroundColor;
//     for (const [alpha, points] of state.baseDotFades) {
//         drawDots(ctx, points, alpha, settings.baseFadeOverlayScale);
//     }
// }


// // base dot fade
// function updateBaseDotFades(state: DrawState) {
//     const radius = chunksToPx(settings.baseFadeRadius);
//     const radiusInChunks = Math.ceil(radius / CHUNK_SIZE);
//     const closestDistances = new Map<string, { point: GridPoint, distance: number }>();

//     const visitAround = (from: GridPoint, to: GridPoint) => {
//         const start = gridPointToPosition(from);
//         const end = gridPointToPosition(to);
//         // only dots within the fade radius of the bounding box can be affected
//         const minRow = Math.max(0, Math.min(from.row, to.row) - radiusInChunks);
//         const maxRow = Math.max(from.row, to.row) + radiusInChunks;
//         const minColumn = Math.max(0, Math.min(from.column, to.column) - radiusInChunks);
//         const maxColumn = Math.max(from.column, to.column) + radiusInChunks;
//         for (let row = minRow; row <= maxRow; row++) {
//             for (let column = minColumn; column <= maxColumn; column++) {
//                 const point = { row, column };
//                 const key = gridPointKey(point);
//                 if (state.litDots.has(key)) continue; // lit dots are drawn over anyway
//                 const distance = distanceToSegment(gridPointToPosition(point), start, end);
//                 if (distance >= radius) continue;
//                 const existing = closestDistances.get(key);
//                 if (!existing || distance < existing.distance) closestDistances.set(key, { point, distance });
//             }
//         }
//     }

//     for (const line of state.lines) visitAround(line.from, line.to);
//     for (const { point } of state.litDots.values()) visitAround(point, point);

//     const fades = new Map<number, GridPoint[]>();
//     const step = DRAW_CONFIG.baseFadeAlphaStep;
//     for (const { point, distance } of closestDistances.values()) {
//         const fade = settings.baseFadeMaxAlpha * (1 - smoothStep(distance, 0, radius));
//         const alpha = Math.round(fade / step) * step;
//         if (alpha <= 0) continue;
//         const bucket = fades.get(alpha);
//         if (bucket) bucket.push(point);
//         else fades.set(alpha, [point]);
//     }
//     state.baseDotFades = fades;
// }


// // width
// function getDrawingWidth(state: DrawState) {
//     // every part of the drawing as a column plus how far it reaches past that column's center
//     const parts: { column: number, radius: number }[] = [];
//     for (const litDot of state.litDots.values()) {
//         parts.push({ column: litDot.point.column, radius: getLitDotRadius(litDot) });
//     }
//     for (const line of state.lines) {
//         parts.push({ column: line.from.column, radius: getLineWidth() / 2 });
//         parts.push({ column: line.to.column, radius: getLineWidth() / 2 });
//     }
//     if (parts.length == 0) return null;

//     const minColumn = Math.min(...parts.map((part) => part.column));
//     const maxColumn = Math.max(...parts.map((part) => part.column));
//     // the outer edges use the widest part in each end column
//     let leftRadius = 0;
//     let rightRadius = 0;
//     for (const part of parts) {
//         if (part.column == minColumn) leftRadius = Math.max(leftRadius, part.radius);
//         if (part.column == maxColumn) rightRadius = Math.max(rightRadius, part.radius);
//     }
//     const centerToCenter = (maxColumn - minColumn) * CHUNK_SIZE;
//     return {
//         columns: maxColumn - minColumn + 1,
//         centerToCenter,
//         outer: centerToCenter + leftRadius + rightRadius,
//     }
// }

// function getLitDotRadius(litDot: LitDot) {
//     const scale = litDot.dimmed ? settings.dimmedScale : settings.litScale;
//     return DOT_GRID_CONFIG.dotRadius * scale;
// }

// function updateWidthOutput(state: DrawState) {
//     const output = document.getElementById(DRAW_CONFIG.widthOutputId);
//     if (!output) return;
//     const width = getDrawingWidth(state);
//     if (!width) {
//         output.textContent = "0px";
//         return;
//     }
//     output.textContent = `${width.outer}px · ${width.columns} dots (${width.centerToCenter}px center to center)`;
// }

// function onDrawingChanged(state: DrawState) {
//     updateBaseDotFades(state);
//     updateWidthOutput(state);
//     state.requestFrame();
// }


// // settings panel
// function setupPanel(state: DrawState, signal: AbortSignal) {
//     const panel = document.getElementById(DRAW_CONFIG.panelId);
//     const toggle = document.getElementById(DRAW_CONFIG.panelToggleId);
//     const body = document.getElementById(DRAW_CONFIG.panelBodyId);
//     const reset = document.getElementById(DRAW_CONFIG.panelResetId);
//     if (!panel || !toggle || !body) return;

//     toggle.addEventListener("click", () => {
//         const opening = panel.hidden;
//         panel.hidden = !opening;
//         toggle.setAttribute("aria-expanded", String(opening));
//     }, { signal });

//     const inputs = new Map<SettingKey, { input: HTMLInputElement, output: HTMLOutputElement }>();
//     for (const { group, sliders } of SLIDER_GROUPS) {
//         const fieldset = document.createElement("fieldset");
//         fieldset.className = "flex min-w-0 flex-col gap-3";
//         const legend = document.createElement("legend");
//         legend.className = "mb-2 text-xs uppercase tracking-wider text-muted";
//         legend.textContent = group;
//         fieldset.append(legend);

//         for (const slider of sliders) {
//             const id = `draw-setting-${slider.key}`;
//             const row = document.createElement("div");
//             row.className = "grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-1";

//             const label = document.createElement("label");
//             label.htmlFor = id;
//             label.className = "min-w-0 truncate";
//             label.textContent = slider.label;

//             const output = document.createElement("output");
//             output.htmlFor.add(id);
//             output.className = "text-accent-bright tabular-nums";

//             const input = document.createElement("input");
//             input.type = "range";
//             input.id = id;
//             input.min = String(slider.min);
//             input.max = String(slider.max);
//             input.step = String(slider.step);
//             input.className = "col-span-2 w-full accent-accent";
//             input.addEventListener("input", () => {
//                 settings[slider.key] = Number(input.value);
//                 output.value = input.value;
//                 saveSettings();
//                 onDrawingChanged(state);
//             }, { signal });

//             row.append(label, output, input);
//             fieldset.append(row);
//             inputs.set(slider.key, { input, output });
//         }
//         body.append(fieldset);
//     }

//     const syncInputs = () => {
//         for (const [key, { input, output }] of inputs) {
//             input.value = String(settings[key]);
//             output.value = String(settings[key]);
//         }
//     }
//     syncInputs();

//     reset?.addEventListener("click", () => {
//         Object.assign(settings, DEFAULT_SETTINGS);
//         saveSettings();
//         syncInputs();
//         onDrawingChanged(state);
//     }, { signal });
// }

// // settings are kept in localStorage so they survive reloads,
// // storage can throw (private mode, blocked site data) so failing just falls back to defaults
// function loadSettings(): Settings {
//     const loaded: Settings = { ...DEFAULT_SETTINGS };
//     try {
//         const saved = JSON.parse(localStorage.getItem(DRAW_CONFIG.settingsStorageKey) ?? "{}");
//         for (const key of Object.keys(DEFAULT_SETTINGS) as SettingKey[]) {
//             // only take known keys with real numbers, so old or broken saves can't break drawing
//             if (typeof saved[key] == "number" && Number.isFinite(saved[key])) loaded[key] = saved[key];
//         }
//     } catch { }
//     return loaded;
// }

// function saveSettings() {
//     try {
//         localStorage.setItem(DRAW_CONFIG.settingsStorageKey, JSON.stringify(settings));
//     } catch { }
// }


// //colors
// function getCssColor(variable: string) {
//     const root = document.documentElement;
//     return window.getComputedStyle(root).getPropertyValue(variable).trim();
// }


// //listeners
// function setupListeners(state: DrawState): AbortController {
//     const controller = new AbortController();
//     const { signal } = controller;

//     window.addEventListener("pointerdown", (e) => onPointerDown(e, state), { signal });
//     window.addEventListener("pointermove", (e) => onPointerMove(e, state), { signal });
//     window.addEventListener("pointerup", (e) => onPointerUp(e, state), { signal });
//     window.addEventListener("pointercancel", () => cancelDrag(state), { signal });
//     window.addEventListener("contextmenu", (e) => onContextMenu(e, state), { signal });
//     return controller;
// }

// function isIgnoredTarget(e: Event) {
//     return e.target instanceof Element && e.target.closest(DRAW_CONFIG.ignoreSelector) != null;
// }

// function onPointerDown(e: PointerEvent, state: DrawState) {
//     if (e.button != 0) return;
//     if (isIgnoredTarget(e)) return;
//     e.preventDefault();
//     const point = getClosestGridPoint(e.clientX, e.clientY);
//     state.dragStart = point;
//     state.dragEnd = point;
//     state.requestFrame();
// }

// function onPointerMove(e: PointerEvent, state: DrawState) {
//     if (!state.dragStart) return;
//     const point = getClosestGridPoint(e.clientX, e.clientY);
//     if (state.dragEnd && isSameGridPoint(point, state.dragEnd)) return;
//     state.dragEnd = point;
//     state.requestFrame();
// }

// function onPointerUp(e: PointerEvent, state: DrawState) {
//     const { dragStart, dragEnd } = state;
//     if (!dragStart || !dragEnd) return;
//     cancelDrag(state);

//     if (isSameGridPoint(dragStart, dragEnd)) {
//         onClick({ x: e.clientX, y: e.clientY }, state);
//         return;
//     }

//     const line = { from: dragStart, to: dragEnd, dimmed: false };
//     if (!state.lines.some((existing) => isSameLine(existing, line))) state.lines.push(line);
//     for (const point of getDotsAlongPath(dragStart, dragEnd)) {
//         const key = gridPointKey(point);
//         // already lit dots keep their dimmed state
//         if (!state.litDots.has(key)) state.litDots.set(key, { point, dimmed: false });
//     }
//     onDrawingChanged(state);
// }

// function onClick(point: position, state: DrawState) {
//     // dots take priority over lines, since lines always run through dots
//     const litDot = getLitDotAt(state, point);
//     if (litDot) {
//         litDot.dimmed = !litDot.dimmed;
//         onDrawingChanged(state);
//         return;
//     }
//     const lineIndex = getLineIndexAt(state.lines, point);
//     if (lineIndex != null) {
//         const line = state.lines[lineIndex];
//         line.dimmed = !line.dimmed;
//         // the line's dots follow it
//         for (const dotPoint of getDotsAlongPath(line.from, line.to)) {
//             const lineDot = state.litDots.get(gridPointKey(dotPoint));
//             if (lineDot) lineDot.dimmed = line.dimmed;
//         }
//         onDrawingChanged(state);
//         return;
//     }
//     // empty space: light up the closest dot
//     const gridPoint = getClosestGridPoint(point.x, point.y);
//     const key = gridPointKey(gridPoint);
//     if (!state.litDots.has(key)) state.litDots.set(key, { point: gridPoint, dimmed: false });
//     onDrawingChanged(state);
// }

// function onContextMenu(e: MouseEvent, state: DrawState) {
//     if (isIgnoredTarget(e)) return;
//     e.preventDefault();
//     const point = { x: e.clientX, y: e.clientY };
//     const litDot = getLitDotAt(state, point);
//     if (litDot) {
//         state.litDots.delete(gridPointKey(litDot.point));
//         onDrawingChanged(state);
//         return;
//     }
//     const lineIndex = getLineIndexAt(state.lines, point);
//     if (lineIndex != null) {
//         const [line] = state.lines.splice(lineIndex, 1);
//         // remove the line's dots too, except ones another line still runs through
//         const keptKeys = new Set(state.lines.flatMap((other) => getDotsAlongPath(other.from, other.to).map(gridPointKey)));
//         for (const dotPoint of getDotsAlongPath(line.from, line.to)) {
//             const key = gridPointKey(dotPoint);
//             if (!keptKeys.has(key)) state.litDots.delete(key);
//         }
//         onDrawingChanged(state);
//     }
// }

// function cancelDrag(state: DrawState) {
//     state.dragStart = null;
//     state.dragEnd = null;
//     state.requestFrame();
// }
