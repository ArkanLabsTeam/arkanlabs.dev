import { setupCoreLoop, type DrawDotFunction, type EffectSetupFunction, type PublicCoreState, type RequestFrameFunction } from "./dots_core/dots_core";
import { closeTo, debounce, interpolation, smoothStep, type Position } from "../utils/general"
import { getShapeHeight, getShapeWidth, type Shape } from "./shapes/shape_utils";
import { alShape } from "./shapes/AL_shape";

type ShapeDrawerState = {
    accentColor: string,
    requestFrame: RequestFrameFunction
    prefersReducedMotion: boolean
    drawingAreaStart: Position
}

const SHAPE_DRAWING_CONFIG = {
    easing: 0.1,
    snapStrengthThreshold: 0.1,
    glowRadius: 150,
    mainAreaId: "main-space",
    horizontalPadding: 10 // 5 per side
} as const;

function setupMainLoop(shape: Shape): void {
    let abortController: AbortController;
    let mainState: ShapeDrawerState;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const setup: EffectSetupFunction = (requestFrame, drawDot, drawLine, coreState) => {
        const drawingAreaStart = getShapeDrawAreaStart(shape, coreState);
        if (!drawingAreaStart) return;

        mainState = {
            accentColor: getAccentColor(),
            requestFrame,
            prefersReducedMotion,
            drawingAreaStart
        }
        abortController = setupListeners(mainState);

    }

    const cleanup = () => {
        abortController.abort();
    }

    const update = (coreState: PublicCoreState, stepScale: number): boolean => {
        return false
    }

    const draw = (coreState: PublicCoreState) => {
        // if (mainState.prefersReducedMotion) return;
        // drawCloseDots(mainState, coreState);
    }

    const onResize = (coreState: PublicCoreState) => {
        const leftOverSpace = getLeftOverSpaceWidth(coreState);
        const drawingAreaStart = getShapeDrawAreaStart(shape, coreState);
        if (!leftOverSpace || !drawingAreaStart) return;

        // if left over is null this is too, we can do ! safely
        mainState.drawingAreaStart = drawingAreaStart;
    };

    setupCoreLoop({
        setup,
        cleanup,
        update,
        draw,
        onResize
    });

}

setupMainLoop(alShape); // you would wanna build a chooser file


// canvas
/**
 * It must be known this function and most others in the Dot engine 
 * depend on the canvas taking up the entire width and height of the screen
 */
function getShapeDrawAreaStart(shape: Shape, coreState: PublicCoreState): Position | null {
    const mainAreaWidth = getMainAreaWidth();
    const shapeWidth = getShapeWidth(shape, coreState.grid.cellSize);

    const paddedWidth = shapeWidth + SHAPE_DRAWING_CONFIG.horizontalPadding;
    const drawingAreaWidth = getLeftOverSpaceWidth(coreState);

    if (drawingAreaWidth === null || mainAreaWidth === null) return null;

    const canDrawInDrawingArea = paddedWidth >= drawingAreaWidth;
    const canvasCenter = getCanvasCenterShiftedForShape(shape, coreState);
    const drawingAreaCenterVertical = canvasCenter.y;
    const drawingAreaCenterHorizontal = mainAreaWidth - drawingAreaWidth / 2;
        
    const drwaingAreaCenter = {
        x: drawingAreaCenterHorizontal,
        y: drawingAreaCenterVertical
    }
    return canDrawInDrawingArea ? drwaingAreaCenter : canvasCenter;
}

function getCanvasCenterShiftedForShape(shape: Shape, coreState: PublicCoreState) {
    const cellSize = coreState.grid.cellSize;

    const canvasHeight = coreState.canvas.getBoundingClientRect().height;
    const shapeHeight = getShapeHeight(shape, cellSize);
    const drawingCenterVertical = canvasHeight - shapeHeight / 2;

    const canvasWidth = coreState.canvas.getBoundingClientRect().width;
    const shapeWidth = getShapeWidth(shape, cellSize);
    
    const drawingCenterHorizontal = canvasWidth - shapeWidth / 2;

    return { x: drawingCenterHorizontal, y: drawingCenterVertical }
}

function getMainAreaWidth() {
    const element = document.getElementById(SHAPE_DRAWING_CONFIG.mainAreaId);
    const pageWidth = element?.getBoundingClientRect().width ?? null;
    return pageWidth;
}




function getLeftOverSpaceWidth(coreState: PublicCoreState) {
    const pageWidth = getMainAreaWidth();
    if (!pageWidth) return null;
    const canvasWidth = coreState.canvas.getBoundingClientRect().width;
    return canvasWidth - pageWidth;
}


// dots


//colors
function getAccentColor() {
    const root = document.documentElement;
    return window.getComputedStyle(root).getPropertyValue("--color-accent").trim();
}

//listeners 
function setupListeners(state: ShapeDrawerState): AbortController {
    const controller = new AbortController();
    const { signal } = controller;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // window.addEventListener("mousemove", (e) => updateMousePositionState(e, state), { signal })
    // document.addEventListener("mouseenter", (e) => updateMousePositionState(e, state), { signal });
    // document.addEventListener("mouseleave", () => updateMousePositionStateOnLeave(state), { signal });
    motionQuery.addEventListener('change', (e) => updatePreferReducedMotion(e, state), { signal });
    return controller;
}

function updatePreferReducedMotion(e: MediaQueryListEvent, dotGridState: ShapeDrawerState) {
    dotGridState.prefersReducedMotion = e.matches
    dotGridState.requestFrame();
}
