import { setupCanvas, setupCanvasResolution } from "../utils/canvas";
import { clamp, debounce, type position } from "../utils/general";

type Dot = position;

type CoreState = {
    canvas: HTMLCanvasElement
    context: CanvasRenderingContext2D
    dots: Dot[][]
    gridSize: GridSize
    currentEffect: Effect | null
    pendingFrame: number | null
    abortController: AbortController | null
    baseColor: string
    previousLoopRun: number | null;
    requestFrame: RequestFrameFunction | null
}

type GridSize = {
    columns: number
    rows: number
}

type WindowResizeCallback = (state: CoreState) => void;

export type PublicCoreState = {
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    dots: Dot[][]
}

export type Effect = {
    setup: EffectSetupFunction,
    cleanup: () => void,
    update: (coreState: PublicCoreState, timeScale: number) => boolean,
    draw: (coreState: PublicCoreState) => void,
}

export type EffectSetupFunction = (requestFrame: RequestFrameFunction) => void;
export type RequestFrameFunction = () => void;


const DOT_GRID_CONFIG = {
    spacing: 16,
    dotRadius: 1.5, // this means each chunk in the grid is 16 + 3 wide,
    canvasId: "dot-canvas",
} as const;


export function setupCoreLoop(effect: Effect) {
    const canvasSetup = setupCanvas(DOT_GRID_CONFIG.canvasId);
    if (canvasSetup == null) return;
    const { canvas, ctx } = canvasSetup;
    const grid = setupGridSize(canvas);
    const dots = setupDots(grid);

    const coreState: CoreState = {
        canvas,
        context: ctx,
        dots,
        gridSize: grid,
        currentEffect: effect,
        pendingFrame: null,
        abortController: null,
        baseColor: getBaseColor(),
        previousLoopRun: null,
        requestFrame: null,
    }
    setupCanvasResolution(canvas, ctx);
    coreState.requestFrame = requestFrameWrapper(coreState);
    coreState.abortController = createListeners(coreState);
    effect.setup(coreState.requestFrame);

    coreState.requestFrame();
}

function requestFrameWrapper(coreState: CoreState) {
    return () => {
        if (coreState.pendingFrame != null) return;
        coreState.pendingFrame = requestAnimationFrame((now) => coreLoop(coreState, now));
    }
}

function coreLoop(coreState: CoreState, now: number) {
    //update
    coreState.pendingFrame = null;
    const { canvas, context: ctx } = coreState;
    const timeSinceLastLoop = now - (coreState.previousLoopRun ?? now);
    coreState.previousLoopRun = now;
    const stepScale = getStepScale(timeSinceLastLoop);
    const needsUpdate = coreState.currentEffect?.update(coreState, stepScale);

    //draw
    ctx.clearRect(0, 0, canvas.width, canvas.height); //resetting canvas
    drawBaseDots(coreState);
    coreState.currentEffect?.draw(coreState);
    if (needsUpdate) {
        coreState.requestFrame!();
    }
}

function getStepScale(elapsedTime: number): number {
    const ms_per_frame_at_60fps = 16.7; // ms
    return clamp(elapsedTime / ms_per_frame_at_60fps, 0, 4); // basically how much we should move, so on slower or faster screens it doesn't change speed
}



// dots and grid setup area
function setupDots(gridSize: GridSize): Dot[][] {
    const dots: Dot[][] = [];
    const chunkSize = getGridSize();
    for (let i = 0; i < gridSize.rows; i++) {
        dots.push([])
        for (let j = 0; j < gridSize.columns; j++) {
            const dot = getDotDrawPosition(i, j, chunkSize);
            dots[i].push(dot)
        }
    }
    return dots;
}

function getGridSize(): number {
    return DOT_GRID_CONFIG.spacing + DOT_GRID_CONFIG.dotRadius * 2;
}

function drawBaseDots(state: CoreState) {
    const context = state.context;
    context.fillStyle = state.baseColor;
    context.globalAlpha = 1;
    context.beginPath();
    for (const row of state.dots) {
        for (const dot of row) {
            drawDot(context, dot);
        }
    }
    context.fill();
}

export function drawDot(context: CanvasRenderingContext2D, dot: Dot, scale: number = 1) {
    const radius = DOT_GRID_CONFIG.dotRadius * scale;
    context.moveTo(dot.x + radius, dot.y);
    // it starts drawing from the starting radius, 
    // so we need to move by radius.
    context.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
}

function getDotDrawPosition(row: number, column: number, chunkSize: number): position {
    return {
        x: column * chunkSize + chunkSize / 2,
        y: row * chunkSize + chunkSize / 2
    }
    // this basically jumps to the start of the chunk 
    // then goes to the middle (where the dot should be)
}


function setupGridSize(canvas: HTMLCanvasElement): GridSize {
    const { width, height } = canvas.getBoundingClientRect();
    const chunkSize = getGridSize();
    const columns = Math.ceil(width / chunkSize);
    const rows = Math.ceil(height / chunkSize);
    // floor works but could cause some empty space at the bottom
    return { columns: columns, rows: rows };
}


// listeners setup area
function createListeners(state: CoreState): AbortController {
    const controller = new AbortController();
    const { signal } = controller;
    const debounceFunction = debounceDotRebuild(200);
    window.addEventListener("resize", () => debounceFunction(state), { signal });
    return controller;
}


function debounceDotRebuild(delay: number): WindowResizeCallback {
    const debounceWrapper = debounce(
        windowResizeCallback, delay
    );
    return debounceWrapper;
}

function windowResizeCallback(state: CoreState) {
    setupCanvasResolution(state.canvas, state.context);
    const gridSize = state.gridSize;
    const { rows, columns } = setupGridSize(state.canvas);
    gridSize.columns = columns;
    gridSize.rows = rows;
    state.dots = setupDots(gridSize);
    state.requestFrame!();
}

// colors
function getBaseColor() {
    const root = document.documentElement;
    return window.getComputedStyle(root).getPropertyValue("--color-border").trim();
}