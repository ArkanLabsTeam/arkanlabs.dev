import { setupCanvas, setupCanvasResolution } from "../../utils/canvas";
import { clamp, debounce, type Position } from "../../utils/general";

type CoreState = {
    canvas: HTMLCanvasElement
    context: CanvasRenderingContext2D
    grid: Grid
    currentEffect: Effect
    pendingFrame: number | null
    abortController: AbortController | null
    baseColor: string
    previousLoopRun: number | null
    requestFrame: RequestFrameFunction,
    prefersReducedMotion: boolean
    resizeObserver: ResizeObserver | null
}

type Grid = {
    columns: number
    rows: number
    scale: number
    cellSize: number
    dots: Dot[][]
    baseDotRadius: number
}

type GridSize = {
    columns: number,
    rows: number
}

type CanvasResizeCallback = (state: CoreState) => void;

export type PublicCoreState = {
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    grid: Grid
    prefersReducedMotion: boolean
}

export type Dot = Position;

export type Effect = {
    setup: EffectSetupFunction,
    cleanup: () => void,
    update: (coreState: PublicCoreState, timeScale: number) => boolean,
    draw: (coreState: PublicCoreState) => void,
    onResize?: (coreState: PublicCoreState) => void,
}

/**
 * @param {RequestFrameFunction} requestFrame - Function used to request a frame
 * @param {DrawDotFunction} draw - Dot drawing function that takes global coordinates not grid coordinates
 * @param {DrawLineFunction} drawLine - Line Drawing function that takes global coordinates not grid coordinates
 * @param {PublicCoreState} coreState - State object provided by the core drawing engine
 */
export type EffectSetupFunction = (
    requestFrame: RequestFrameFunction,
    draw: DrawDotFunction,
    drawLine: DrawLineFunction,
    coreState: PublicCoreState,
) => void;


export type RequestFrameFunction = () => void;
export type DrawDotFunction = (dot: Dot, scale?: number) => void;
export type DrawLineFunction = (...dots: Dot[]) => void;

const DOT_GRID_CONFIG = {
    spacing: 16, // this basically means 8 per side, since the size is spacing + diameter
    dotRadius: 1.5, // this means each chunk in the grid is 16 + 3 wide,
    canvasId: "dot-canvas",
    defaultVerticalResolution: 1080,
    defaultHorizontalResolution: 1920,
    scaleSteps: [1, 0.85, 0.75, 0.65] // has to stay descending
} as const;


export function setupCoreLoop(effect: Effect) {
    let coreState: CoreState;
    const canvasSetup = setupCanvas(DOT_GRID_CONFIG.canvasId);
    if (canvasSetup == null) return;
    const { canvas, ctx } = canvasSetup;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const grid = gridAndDotSetup(canvas)
    const requestFrame = () => {
        if (coreState.pendingFrame != null) return;
        coreState.pendingFrame = requestAnimationFrame((now) => coreLoop(coreState, now));
    };

    const simplifiedDrawDotFunction: DrawDotFunction = (dot: Dot, scale: number = 1) => {
        drawDot(ctx, dot, scale * coreState.grid.scale)
    };


    const simplifiedDrawLineFunction: DrawLineFunction = (...dots) => {
        drawLine(ctx, ...dots);
    }

    coreState = {
        canvas,
        context: ctx,
        grid: grid,
        currentEffect: effect,
        pendingFrame: null,
        abortController: null,
        baseColor: getBaseColor(),
        previousLoopRun: null,
        requestFrame: requestFrame,
        prefersReducedMotion: prefersReducedMotion,
        resizeObserver: null
    }
    coreState.resizeObserver = setupResizeObserver(coreState);
    coreState.resizeObserver.observe(canvas); // use .disconnect() to disable

    setupCanvasResolution(canvas, ctx);
    coreState.abortController = createListeners(coreState);

    effect.setup(
        coreState.requestFrame,
        simplifiedDrawDotFunction,
        simplifiedDrawLineFunction,
        coreState
    );

    coreState.requestFrame();
}

function coreLoop(coreState: CoreState, now: number) {
    //update
    coreState.pendingFrame = null;
    const { canvas, context: ctx } = coreState;
    const timeSinceLastLoop = now - (coreState.previousLoopRun ?? now);
    coreState.previousLoopRun = now;
    const stepScale = getStepScale(timeSinceLastLoop);
    const needsUpdate = coreState.currentEffect.update(coreState, stepScale);

    //draw
    ctx.clearRect(0, 0, canvas.width, canvas.height); //resetting canvas
    drawBaseDots(coreState);
    coreState.currentEffect.draw(coreState);
    if (needsUpdate) {
        coreState.requestFrame();
    }
}

function getStepScale(elapsedTime: number): number {
    const msPerFrameAt60Fps = 16.7; // ms
    return clamp(elapsedTime / msPerFrameAt60Fps, 0, 4); // basically how much we should move, so on slower or faster screens it doesn't change speed
}



// dots and grid setup area
function gridAndDotSetup(canvas: HTMLCanvasElement): Grid {
    const gridScale = getGridScale(canvas);
    const cellSize = getCellSize(gridScale);
    const gridSize = setupGridSize(canvas, cellSize);
    const dots = setupDots(gridSize, cellSize);
    return {
        scale: gridScale,
        cellSize,
        dots,
        baseDotRadius: DOT_GRID_CONFIG.dotRadius,
        ...gridSize
    }
}

function setupDots(gridSize: GridSize, cellSize: number): Dot[][] {
    const dots: Dot[][] = [];
    for (let i = 0; i < gridSize.rows; i++) {
        dots.push([])
        for (let j = 0; j < gridSize.columns; j++) {
            const dot = getDotDrawPosition(i, j, cellSize);
            dots[i].push(dot)
        }
    }
    return dots;
}

function getGridScale(canvas: HTMLCanvasElement): number {
    const scaleSteps = DOT_GRID_CONFIG.scaleSteps;
    const boundingRect = canvas.getBoundingClientRect();
    const canvasHeight = boundingRect.height;
    const verticalScale = canvasHeight / DOT_GRID_CONFIG.defaultVerticalResolution;

    const canvasWidth = boundingRect.width;
    const horizontalScale = canvasWidth / DOT_GRID_CONFIG.defaultHorizontalResolution;

    // phones are much taller than wide so we need the smaller scale 
    // (which mean biggest difference from base)
    const smallerScale = Math.min(horizontalScale, verticalScale);
    const steppedScale = scaleSteps.find((n) => n <= smallerScale);
    return steppedScale ?? scaleSteps[scaleSteps.length - 1]; // has to be between 0.65 and 1.
}

function getCellSize(gridScale: number): number {
    const baseSize = DOT_GRID_CONFIG.spacing + DOT_GRID_CONFIG.dotRadius * 2;
    return baseSize * gridScale;
}

function drawBaseDots(state: CoreState) {
    const context = state.context;
    const gridScale = state.grid.scale;
    context.fillStyle = state.baseColor;
    context.globalAlpha = 1;
    context.beginPath();
    for (const row of state.grid.dots) {
        for (const dot of row) {
            drawDot(context, dot, gridScale);
        }
    }
    context.fill();
}

function drawDot(context: CanvasRenderingContext2D, dot: Dot, scale: number = 1) {
    const radius = DOT_GRID_CONFIG.dotRadius * scale;
    // it starts drawing from the starting radius, 
    // so we need to move by radius.
    context.moveTo(dot.x + radius, dot.y);
    context.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
}

export function dotDistance(dot1: Dot, dot2: Dot) {
    const xDifference = (dot1.x - dot2.x);
    const yDifference = (dot1.y - dot2.y);
    return Math.hypot(xDifference, yDifference);
}


function drawLine(context: CanvasRenderingContext2D, ...dots: Dot[]) {
    // thickness is control from context which can be done from the effect
    for (let i = 1; i < dots.length; i++) {
        const dot = dots[i];
        const previousDot = dots[i - 1];
        context.moveTo(previousDot.x, previousDot.y)
        context.lineTo(dot.x, dot.y);
    }
}


function getDotDrawPosition(row: number, column: number, cellSize: number): Position {
    // this basically jumps to the start of the chunk 
    // then goes to the middle (where the dot should be)
    return {
        x: column * cellSize + cellSize / 2,
        y: row * cellSize + cellSize / 2
    }
}


function setupGridSize(canvas: HTMLCanvasElement, cellSize: number): GridSize {
    const { width, height } = canvas.getBoundingClientRect();
    // floor works but could cause some empty space at the bottom
    const columns = Math.ceil(width / cellSize);
    const rows = Math.ceil(height / cellSize);
    return { columns, rows };
}


// listeners setup area
function createListeners(state: CoreState): AbortController {
    const controller = new AbortController();
    const { signal } = controller;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    motionQuery.addEventListener('change', (e) => updatePreferReducedMotion(e, state), { signal });
    return controller;
}

function updatePreferReducedMotion(e: MediaQueryListEvent, state: CoreState) {
    state.prefersReducedMotion = e.matches
    state.requestFrame();
}

function setupResizeObserver(state: CoreState): ResizeObserver {
    const debounceFunction = debounceDotRebuild(200);
    return new ResizeObserver(() => debounceFunction(state));
}


function debounceDotRebuild(delay: number): CanvasResizeCallback {
    const debounceWrapper = debounce(
        canvasResizeCallback, delay
    );
    return debounceWrapper;
}

const canvasResizeCallback: CanvasResizeCallback = (state) => {
    if (state.resizeObserver == null) return; // skipping the first run
    setupCanvasResolution(state.canvas, state.context);
    const grid = gridAndDotSetup(state.canvas);
    Object.assign(state.grid, grid);
    state.currentEffect.onResize?.(state);
    state.requestFrame();
}

// colors
export function getBaseColor() {
    const root = document.documentElement;
    return window.getComputedStyle(root).getPropertyValue("--color-border").trim();
}

export function getAccentColor() {
    const root = document.documentElement;
    return window.getComputedStyle(root).getPropertyValue("--color-accent").trim();
}
