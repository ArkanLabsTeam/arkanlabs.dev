import { setupCanvas, setupCanvasResolution } from "../../utils/canvas";
import { clamp, debounce, type position } from "../../utils/general";

type Dot = position;

type CoreState = {
    canvas: HTMLCanvasElement
    context: CanvasRenderingContext2D
    grid: Grid
    currentEffect: Effect | null
    pendingFrame: number | null
    abortController: AbortController | null
    baseColor: string
    previousLoopRun: number | null
    requestFrame: RequestFrameFunction | null,
}

type Grid = {
    columns: number
    rows: number
    scale: number
    cellSize: number
    dots: Dot[][]
}

type GridSize = {
    columns: number,
    rows: number
}

type WindowResizeCallback = (state: CoreState) => void;

export type PublicCoreState = {
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    grid: Grid
}

export type Effect = {
    setup: EffectSetupFunction,
    cleanup: () => void,
    update: (coreState: PublicCoreState, timeScale: number) => boolean,
    draw: (coreState: PublicCoreState) => void,
    onResize?: (coreState: PublicCoreState) => void,
}

export type EffectSetupFunction = (
    requestFrame: RequestFrameFunction,
    draw: DrawDotFunction,
    coreState: PublicCoreState
) => void;
export type RequestFrameFunction = () => void;
export type DrawDotFunction = (dot: Dot, scale: number) => void;

const DOT_GRID_CONFIG = {
    spacing: 16,
    dotRadius: 1.5, // this means each chunk in the grid is 16 + 3 wide,
    canvasId: "dot-canvas",
    defaultVerticalResolution: 1080,
    defaultHorizontalResolution: 1920,
    scaleSteps: [1, 0.85, 0.75, 0.65] // has to stay descending
} as const;


export function setupCoreLoop(effect: Effect) {
    const canvasSetup = setupCanvas(DOT_GRID_CONFIG.canvasId);
    if (canvasSetup == null) return;
    const { canvas, ctx } = canvasSetup;
    const grid = gridAndDotSetup(canvas)
    const coreState: CoreState = {
        canvas,
        context: ctx,
        grid: grid,
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


    const simplifiedDrawDotFunction = (dot: Dot, scale: number = 1) => {
        drawDot(ctx, dot, scale * coreState.grid.scale)
    }

    effect.setup(coreState.requestFrame, simplifiedDrawDotFunction, coreState);
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
function gridAndDotSetup(canvas: HTMLCanvasElement): Grid {
    const gridScale = getGridScale();
    const cellSize = getCellSize(gridScale);
    const gridSize = setupGridSize(canvas, cellSize);
    const dots = setupDots(gridSize, cellSize);
    return {
        scale: gridScale,
        cellSize,
        dots,
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

function getGridScale(): number {
    const scaleSteps = DOT_GRID_CONFIG.scaleSteps;
    const windowHeight = window.innerHeight;
    const verticalScale = windowHeight / DOT_GRID_CONFIG.defaultVerticalResolution;

    const windowWidth = window.innerWidth;
    const horizontalScale = windowWidth / DOT_GRID_CONFIG.defaultHorizontalResolution;
    // phones are much taller than wide so we need the smaller scale 
    // (which mean biggest difference from base)
    const smallerScale = Math.min(horizontalScale, verticalScale);
    const clampedScale = clamp(smallerScale, Math.min(...scaleSteps), 1);
    const steppedScale = scaleSteps.find((n) => n <= clampedScale);
    return steppedScale!; // has to be between 0.65 and 1.
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
    context.moveTo(dot.x + radius, dot.y);
    // it starts drawing from the starting radius, 
    // so we need to move by radius.
    context.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
}

function getDotDrawPosition(row: number, column: number, cellSize: number): position {
    return {
        x: column * cellSize + cellSize / 2,
        y: row * cellSize + cellSize / 2
    }
    // this basically jumps to the start of the chunk 
    // then goes to the middle (where the dot should be)
}


function setupGridSize(canvas: HTMLCanvasElement, cellSize: number): GridSize {
    const { width, height } = canvas.getBoundingClientRect();
    const columns = Math.ceil(width / cellSize);
    const rows = Math.ceil(height / cellSize);
    // floor works but could cause some empty space at the bottom
    return { columns, rows };
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

const windowResizeCallback: WindowResizeCallback = (state) => {
    setupCanvasResolution(state.canvas, state.context);
    const grid = gridAndDotSetup(state.canvas);
    Object.assign(state.grid, grid);
    state.currentEffect?.onResize?.(state);
    state.requestFrame!();
}

// colors
function getBaseColor() {
    const root = document.documentElement;
    return window.getComputedStyle(root).getPropertyValue("--color-border").trim();
}