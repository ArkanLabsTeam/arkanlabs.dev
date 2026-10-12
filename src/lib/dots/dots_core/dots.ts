import { debounce, interpolation, smoothStep } from "../../utils/general";
import { setupCanvasResolution } from "../../utils/canvas";
type Dot = { x: number, y: number };
type DotGridState = {
    canvas: HTMLCanvasElement
    context: CanvasRenderingContext2D
    dots: Dot[][]
    mouse: { x: number, y: number }
    glow: { x: number, y: number }
    strength: number // how strong the brightness is, 0 for initial
    accentColor: string
    baseColor: string
    isMouseInScreen: boolean
    gridSize: GridSize
}

type GridSize = {
    columns: number
    rows: number
}

const DOT_GRID_CONFIG = {
    spacing: 16,
    dotRadius: 1.5, // this means each chunk in the grid is 16 + 3 wide,
    glowRadius: 150,
    easing: 0.1,
    canvasId: "dot-canvas",
    snapStrengthThreshold: 0.3
} as const;

function setupDotLoop() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvasData = setupCanvas();
    if (!canvasData) return;
    const { canvas, ctx } = canvasData;
    setupCanvasResolution(canvas, ctx);
    const sizeGrid = setupGridSize(canvas);
    const dots = setupDots(sizeGrid);
    const xCenter = window.innerWidth / 2;
    const yCenter = window.innerHeight / 2;
    const dotGridState: DotGridState = {
        canvas: canvas,
        context: ctx,
        dots: dots,
        mouse: { x: 0, y: 0 },
        glow: { x: xCenter, y: yCenter },
        strength: 0,
        accentColor: getAccentColor(),
        baseColor: getBaseColor(),
        isMouseInScreen: false,
        gridSize: setupGridSize(canvas)
    };
    drawBaseDots(dotGridState);
    const debounceFunction = debounceDotRebuild(200);
    window.addEventListener("resize", () => debounceFunction(dotGridState));
    window.addEventListener("mousemove", (e) => updateMousePositionInState(e, dotGridState))
    document.addEventListener("mouseenter", (e) => mouseEnterCallback(e, dotGridState));
    document.addEventListener("mouseleave", () => dotGridState.isMouseInScreen = false);

    if (prefersReducedMotion) return;
    requestAnimationFrame((timestamp) => animationLoop(dotGridState, timestamp));
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

function drawCloseDots(state: DotGridState) {
    const context = state.context;
    context.fillStyle = state.accentColor;
    for (const row of state.dots) {
        for (const dot of row) {
            const glowCenterDotXDifference = (state.glow.x - dot.x);
            const glowCenterDotYDifference = (state.glow.y - dot.y);
            const distanceFromGlowCenter = Math.hypot(glowCenterDotXDifference, glowCenterDotYDifference);

            if (distanceFromGlowCenter < DOT_GRID_CONFIG.glowRadius) {
                context.beginPath();
                const smoothStepValue = smoothStep(distanceFromGlowCenter, 0, DOT_GRID_CONFIG.glowRadius);
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



function interpolateGlowPosition(state: DotGridState, stepScale: number) {
    const newXGlowPosition = interpolation(state.glow.x, state.mouse.x, DOT_GRID_CONFIG.easing, stepScale);
    const newYGlowPosition = interpolation(state.glow.y, state.mouse.y, DOT_GRID_CONFIG.easing, stepScale);
    // when we interpolate 10%, we're asking to return 90% of the value
    // that represents a step, if we wanna move 2 steps, we return 90% of the 90%, or 90%^2
    // so the power of (1 - t) represents the step, we can use this to speed or slow the animation based on the framrate 
    // to make it consistent on all screens
    state.glow = { x: newXGlowPosition, y: newYGlowPosition };
}


function animationLoop(state: DotGridState, timestamp: number) {
    const { canvas, context: ctx } = state;
    const stepScale = getStepScale(timestamp);
    interpolateGlowPosition(state, stepScale);
    if (state.isMouseInScreen) {
        state.strength = interpolation(state.strength, 1, DOT_GRID_CONFIG.easing, stepScale);
    } else {
        state.strength = interpolation(state.strength, 0, DOT_GRID_CONFIG.easing, stepScale)
    }
    // update then render
    ctx.clearRect(0, 0, canvas.width, canvas.height); //resetting canvas
    drawBaseDots(state);
    drawCloseDots(state);
    requestAnimationFrame((timestamp) => animationLoop(state, timestamp))
}


function getStepScale(timestamp: number): number {
    const time_per_60_frames = 16.7; // ms
    return timestamp / time_per_60_frames; // basically how much we should move, so on slower or faster screens it doesn't change speed
}

function setupGridSize(canvas: HTMLCanvasElement): GridSize {
    const { width, height } = canvas.getBoundingClientRect();
    const chunkSize = DOT_GRID_CONFIG.spacing + DOT_GRID_CONFIG.dotRadius;
    const columns = Math.ceil(width / chunkSize);
    const rows = Math.ceil(height / chunkSize);
    // floor works but could cause some empty space at the bottom
    return { columns: columns, rows: rows };
}

function windowResizeCallback(state: DotGridState) {
    setupCanvasResolution(state.canvas, state.context);
    const gridSize = state.gridSize;
    const { rows, columns } = setupGridSize(state.canvas);
    gridSize.columns = columns;
    gridSize.rows = rows;
    state.dots = setupDots(gridSize);
    drawBaseDots(state);
}

function mouseEnterCallback(mouse: MouseEvent, state: DotGridState) {
    state.isMouseInScreen = true;
    state.mouse = { x: mouse.x, y: mouse.y };
}


function debounceDotRebuild(delay: number) {
    const debounceWrapper = debounce(
        windowResizeCallback, delay
    );
    return debounceWrapper;
}

function updateMousePositionInState(mouse: MouseEvent, dotGridState: DotGridState) {
    dotGridState.mouse = { x: mouse.x, y: mouse.y }
    dotGridState.isMouseInScreen = true;
}

setupDotLoop();