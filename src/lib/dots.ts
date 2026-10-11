import { debounce } from "./code_utils";
import { setupCanvasResolution, resetCanvasSize } from "./window_utils";
type Dot = { x: number, y: number };
type DotGridState = {
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    dots: Dot[][],
    // mouse: { x: number, y: number }
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
            dots: dots
        };
        window.addEventListener("resize", () => debounceDotRebuild(dotGridState, gridSize, 200));
        animationLoop(dotGridState, gridSize);
    }
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

function drawDots(context: CanvasRenderingContext2D, dots: Dot[][]) {
    context.beginPath();
    const radius = DOT_GRID_CONFIG.dotRadius;
    for (const row of dots) {
        for (const dot of row) {
            context.moveTo(dot.x, dot.y);
            context.arc(dot.x + radius, dot.y, radius, 0, Math.PI * 2);
            // it starts drawing from the starting radius, 
            // so we need to move by radius.
        }
    }
    context.fill();

}

function animationLoop(state: DotGridState, gridSize: GridSize) {
    const { canvas, context: ctx } = state;
    const root = document.documentElement;
    // fyi unused variables are dropped by tailwind. use @theme static to avoid that.
    const baseDotColor = window.getComputedStyle(root).getPropertyValue("--color-border")
    //resetting canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = baseDotColor.trim();
    drawDots(ctx, state.dots);
    requestAnimationFrame(() => animationLoop(state, gridSize))
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

setupDotLoop();