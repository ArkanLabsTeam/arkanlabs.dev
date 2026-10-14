import { setupCoreLoop, type DrawDotFunction, type EffectSetupFunction, type PublicCoreState, type RequestFrameFunction } from "./dots_core/dots_core";
import { closeTo, debounce, interpolation, smoothStep, type Position } from "../utils/general"
import { getShapeHeight, getShapeWidth, type Shape } from "./shapes/shape_utils";
import { alShape } from "./shapes/AL_shape";

type MainPageDesktopState = {
    accentColor: string,
    requestFrame: RequestFrameFunction
    prefersReducedMotion: boolean
    paddedRightSpace: number // currently useless but could be used to change size of text
    drawingAreaStart: number | null
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
    let mainState: MainPageDesktopState;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const setup: EffectSetupFunction = (requestFrame, drawDot, drawLine, coreState) => {
        const leftOverRightSpace = getLeftOverSpaceWidth(coreState);
        const drawingAreaStart = getMainAreaWidth(); // this also is where the drawing area starts
        if (!leftOverRightSpace) return;
        mainState = {
            accentColor: getAccentColor(),
            requestFrame,
            prefersReducedMotion,
            paddedRightSpace: leftOverRightSpace,
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
        const mainAreaWidth = getMainAreaWidth();
        if (!leftOverSpace) return;

        // if left over is null this is too, we can do ! safely
        mainState.drawingAreaStart = mainAreaWidth! + SHAPE_DRAWING_CONFIG.horizontalPadding;
        mainState.paddedRightSpace = leftOverSpace - SHAPE_DRAWING_CONFIG.horizontalPadding;
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
function getShapeDrawAreaStart(shape: Shape, coreState: PublicCoreState) {
    const mainAreaWidth = getMainAreaWidth();
    const shapeWidth = getShapeWidth(shape, coreState.grid.cellSize);

    const paddedWidth = shapeWidth + SHAPE_DRAWING_CONFIG.horizontalPadding;
    const drawingAreaWidth = getLeftOverSpaceWidth(coreState);
    if (!drawingAreaWidth || !mainAreaWidth) return;

    const canDrawInDrawingArea = paddedWidth >= drawingAreaWidth;
    const drawingAreaCenter = mainAreaWidth + drawingAreaWidth / 2;
    const canvasCenter = getCanvasCenterShiftedForShape(shape, coreState);
    return canDrawInDrawingArea ? drawingAreaCenter : canvasCenter;
}

function getCanvasCenterShiftedForShape(shape: Shape, coreState: PublicCoreState) {
    const cellSize = coreState.grid.cellSize;

    const canvasHeight = coreState.canvas.getBoundingClientRect().height;
    const shapeHeight = getShapeHeight(shape, cellSize);
    const drawingCenterVertical = canvasHeight - shapeHeight / 2;

    const canvasWidth = coreState.canvas.getBoundingClientRect().width;
    const shapeWidth = getShapeWidth(shape, cellSize);
    const drawingCenterHorizontal = canvasWidth - shapeWidth / 2;

    return { width: drawingCenterHorizontal, height: drawingCenterVertical }
}

function getMainAreaWidth() {
    const element = document.getElementById(SHAPE_DRAWING_CONFIG.mainAreaId);
    const pageWidth = element?.getBoundingClientRect().width ?? null;
    return pageWidth;
}




function getLeftOverSpaceWidth(coreState: PublicCoreState) {
    const pageWidth = getMainAreaWidth();
    if (!pageWidth) return;
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
function setupListeners(state: MainPageDesktopState): AbortController {
    const controller = new AbortController();
    const { signal } = controller;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // window.addEventListener("mousemove", (e) => updateMousePositionState(e, state), { signal })
    // document.addEventListener("mouseenter", (e) => updateMousePositionState(e, state), { signal });
    // document.addEventListener("mouseleave", () => updateMousePositionStateOnLeave(state), { signal });
    motionQuery.addEventListener('change', (e) => updatePreferReducedMotion(e, state), { signal });
    return controller;
}

function updatePreferReducedMotion(e: MediaQueryListEvent, dotGridState: MainPageDesktopState) {
    dotGridState.prefersReducedMotion = e.matches
    dotGridState.requestFrame();
}
