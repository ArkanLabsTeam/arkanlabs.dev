import { debounce, smoothStep } from "./code_utils";
import { setupCanvasResolution, resetCanvasSize } from "./window_utils";
type Dot = { x: number, y: number };
type DotGridState = {
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    dots: Dot[][],
    mouse: { x: number, y: number },
    strength: number // how strong the brightness is, 0 for initial
    accentColor: string,
    baseColor: string,
}

type GridSize = {
    columns: number,
    rows: number
}

const DOT_GRID_CONFIG = {
    spacing: 16,
    dotRadius: 1.5, // this means each chunk in the grid is 16 + 1.5 wide,
    glowRadius: 150,
    easing: 0.1,
    canvasId: "dot-canvas"
} as const;

function setupDotLoop() {
    const canvasData = setupCanvas();
    if (canvasData) {
        const { canvas, ctx } = canvasData;
        setupCanvasResolution(canvas, ctx);
        const gridSize = setupGridSize(canvas)
        const dots = setupDots(gridSize);
        const dotGridState: DotGridState = {
            canvas: canvas,
            context: ctx,
            dots: dots,
            mouse: { x: 0, y: 0 },
            strength: 0,
            accentColor: getAccentColor(),
            baseColor: getBaseColor(),
        };
        window.addEventListener("resize", () => debounceDotRebuild(dotGridState, gridSize, 200));
        window.addEventListener("mousemove", (e) => updateMousePositionInState(e, dotGridState))
        animationLoop(dotGridState);
    }
}
// fyi unused variables are dropped by tailwind. use @theme static to avoid that.
function getAccentColor() {
    const root = document.documentElement;
    return window.getComputedStyle(root).getPropertyValue("--color-accent");
}

function getBaseColor() {
    const root = document.documentElement;
    return window.getComputedStyle(root).getPropertyValue("--color-border");
}

function setupCanvas() {
    const canvas = document.getElementById("dot-canvas");
    if (!(canvas instanceof HTMLCanvasElement)) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    return { canvas, ctx };
}

function setupDots(gridSize: GridSize): Dot[][] {
    const dots: Dot[][] = [];
    const chunkSize = DOT_GRID_CONFIG.spacing + DOT_GRID_CONFIG.dotRadius;
    for (let i = 0; i < gridSize.rows; i++) {
        dots.push([])
        const y = i * chunkSize - chunkSize / 2;
        for (let j = 0; j < gridSize.columns; j++) {
            const x = j * chunkSize + chunkSize / 2;
            // this basically jumps to the start of the chunk 
            // then goes to the middle (where the dot should be)
            const dot = { x: x, y: y };
            dots[i].push(dot)
        }
    }
    return dots;
}

function drawBaseDots(state: DotGridState) {
    const context = state.context;
    context.beginPath();
    for (const row of state.dots) {
        for (const dot of row) {
            drawDot(context, dot);
        }
    }
    context.fill();

}

function drawCloseDots(state: DotGridState) {
    const context = state.context;
    context.fillStyle = state.accentColor;
    for (const row of state.dots) {
        for (const dot of row) {
            const mouseDotXDifference = (state.mouse.x - dot.x);
            const mouseDotYDifference = (state.mouse.y - dot.y);
            const distanceFromMouse = Math.hypot(mouseDotXDifference, mouseDotYDifference);
            if (distanceFromMouse < DOT_GRID_CONFIG.glowRadius) {
                context.beginPath();
                const smoothStepValue = smoothStep(distanceFromMouse, 0, DOT_GRID_CONFIG.glowRadius);
                const dotScale = getDotScale(smoothStepValue, 0.5);
                setDotAlpha(smoothStepValue, state);
                drawDot(context, dot, dotScale);
                context.fill();
            }
        }
    }
}


function drawDot(context: CanvasRenderingContext2D, dot: Dot, scale: number = 1) {
    const radius = DOT_GRID_CONFIG.dotRadius * scale;
    context.moveTo(dot.x + radius, dot.y);
    // it starts drawing from the starting radius, 
    // so we need to move by radius.
    context.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
}

// could be used for the strength
function setDotAlpha(smoothStep: number, state: DotGridState) {
    const colorStrength = 1 - smoothStep;
    state.context.globalAlpha = colorStrength;
}

function getDotScale(smoothStep: number, maxScaleIncrase: number = 1): number {
    return 1 + (1 - smoothStep) * maxScaleIncrase;

}


function animationLoop(state: DotGridState) {
    const { canvas, context: ctx } = state;
    //resetting canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    state.context.fillStyle = state.baseColor;
    state.context.globalAlpha = 1;
    drawBaseDots(state);
    drawCloseDots(state);
    requestAnimationFrame(() => animationLoop(state))
}

function setupGridSize(canvas: HTMLCanvasElement): GridSize {
    const { width, height } = canvas.getBoundingClientRect();
    const chunkSize = DOT_GRID_CONFIG.spacing + DOT_GRID_CONFIG.dotRadius;
    const columns = Math.ceil(width / chunkSize);
    const rows = Math.ceil(height / chunkSize);
    // floor works but could cause some empty space at the bottom
    return { columns: columns, rows: rows };
}

function windowResizeCallback(state: DotGridState, gridSize: GridSize) {
    resetCanvasSize(DOT_GRID_CONFIG.canvasId);
    const { rows, columns } = setupGridSize(state.canvas);
    gridSize.columns = columns;
    gridSize.rows = rows;
    state.dots = setupDots(gridSize);
}


function debounceDotRebuild(dotGridState: DotGridState, gridSize: GridSize, delay: number) {
    const debounceWrapper = debounce(
        windowResizeCallback, delay
    );
    debounceWrapper(dotGridState, gridSize)
}

function updateMousePositionInState(mouse: MouseEvent, dotGridState: DotGridState) {
    dotGridState.mouse = { x: mouse.x, y: mouse.y }
}

setupDotLoop();