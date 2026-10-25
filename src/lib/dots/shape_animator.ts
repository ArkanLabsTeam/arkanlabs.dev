import { getAccentColor, setupCoreLoop, type Dot, type DrawDotFunction, type DrawLineFunction, type EffectSetupFunction, type PublicCoreState, type RequestFrameFunction } from "./dots_core/dots_core";
import { closeTo, debounce, interpolation, smoothStep, type Position } from "../utils/general"
import { getLineThickness, getOpacityFromBrightness, getScaleFromBrightness, getShapeHeight, getShapeWidth, type Segment, type Shape } from "./shapes/shape_utils";
import { alShape } from "./shapes/AL_shape";
import { getMaxScrollHeight, isDocumentScrollable } from "../utils/document";

type ShapeDrawerState = {
    canScroll: boolean,
    accentColor: string,
    requestFrame: RequestFrameFunction
    drawingAreaStart: Position
    shape: Shape
    scrollPosition: number
    maxScrollPosition: number
    segmentsToDraw: Segment[]
}

// only use as arguments or per-update, don't store.
// because updating any original objects won't propagate
type JoinedState = PublicCoreState & ShapeDrawerState

const SHAPE_DRAWING_CONFIG = {
    easing: 0.1,
    snapStrengthThreshold: 0.1,
    glowRadius: 150,
    mainAreaId: "main-space",
    horizontalPadding: 10
} as const;

/**
 * Will refuse to animate if the page can't scroll
 */
function setupMainLoop(shape: Shape): void {
    let abortController: AbortController;
    let mainState: ShapeDrawerState;
    let drawDotFunction: DrawDotFunction;
    let drawLineFunction: DrawLineFunction;
    const setup: EffectSetupFunction = (requestFrame, drawDot, drawLine, coreState) => {
        const drawingAreaStart = getShapeDrawAreaStart(shape, coreState);
        const maxScrollPosition = getMaxScrollHeight();
        const currentScrollPosition = window.scrollY;
        if (!drawingAreaStart) throw Error("Can't load drawing area");

        drawDotFunction = drawDot;
        drawLineFunction = drawLine;
        mainState = {
            canScroll: isDocumentScrollable(),
            accentColor: getAccentColor(),
            requestFrame,
            drawingAreaStart,
            shape,
            scrollPosition: currentScrollPosition,
            maxScrollPosition,
            segmentsToDraw: []
        }
        abortController = setupListeners(mainState);

    }

    const cleanup = () => {
        abortController.abort();
    }

    // "_" is the time scale.
    const update = (coreState: PublicCoreState, _: number): boolean => {
        if (!mainState.canScroll) {
            // shape appears fully drawed
            mainState.segmentsToDraw = mainState.shape.segments;
            return false;
        }

        mainState.maxScrollPosition = getMaxScrollHeight(); // incase something updates for some reason
        mainState.segmentsToDraw = getSegmentsToDraw(mainState);
        // We "can" interpolate the animation steps, 
        // but it's not worth it.
        // Steps are already small.
        // If they looked to choppy we can interpolate
        return false
    }

    const draw = (coreState: PublicCoreState) => {
        for (let segment of mainState.segmentsToDraw) {
            drawSegment(coreState, mainState, segment, drawDotFunction, drawLineFunction);
        }
    }

    const onResize = (coreState: PublicCoreState) => {
        const leftOverSpace = getSideAreaWidth(coreState);
        const drawingAreaStart = getShapeDrawAreaStart(shape, coreState);
        const canScroll = isDocumentScrollable();
        if (leftOverSpace == null || drawingAreaStart == null) return;

        mainState.drawingAreaStart = drawingAreaStart;
        mainState.maxScrollPosition = getMaxScrollHeight();
        mainState.canScroll = canScroll;
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
    const sideAreaWidth = getSideAreaWidth(coreState);
    const canDrawInSide = canDrawInSideArea(shape, coreState, sideAreaWidth);

    if (mainAreaWidth == null || canDrawInSide == null || sideAreaWidth === null) return null;

    const drawingAreaStartInCenter = getDrawingAreaStartInCenter(shape, coreState);
    const drawingAreaStartOnSide = getDrawingAreaStartOnSide(shape, mainAreaWidth, sideAreaWidth, coreState);

    return canDrawInSide ? drawingAreaStartOnSide : drawingAreaStartInCenter;
}

function getDrawingAreaStartOnSide(shape: Shape, mainAreaWidth: number, sideAreaWidth: number, coreState: PublicCoreState): Position {
    const drawingAreaStartVertical = getVerticalShapeCenter(coreState, shape);

    // since the mainAreaWidth is centered, we need to add one side area width to get the width 
    // from the left till the end of the main area
    const drawingAreaStartHorizontal = mainAreaWidth + sideAreaWidth + SHAPE_DRAWING_CONFIG.horizontalPadding;
    return {
        x: drawingAreaStartHorizontal,
        y: drawingAreaStartVertical
    }

}



function getDrawingAreaStartInCenter(shape: Shape, coreState: PublicCoreState) {
    const cellSize = coreState.grid.cellSize;

    const drawingStartVertical = getVerticalShapeCenter(coreState, shape);

    const canvasWidth = coreState.canvas.getBoundingClientRect().width;
    const shapeWidth = getShapeWidth(shape, cellSize);

    const drawingStartHorizontal = canvasWidth / 2 - shapeWidth / 2;

    return { x: drawingStartHorizontal, y: drawingStartVertical }
}

function getMainAreaWidth() {
    const element = document.getElementById(SHAPE_DRAWING_CONFIG.mainAreaId);
    const pageWidth = element?.getBoundingClientRect().width ?? null;
    return pageWidth;
}


function canDrawInSideArea(shape: Shape, coreState: PublicCoreState, sideAreaWidth: number | null): boolean | null {
    const shapeWidth = getShapeWidth(shape, coreState.grid.cellSize);

    const paddedWidth = shapeWidth + SHAPE_DRAWING_CONFIG.horizontalPadding * 2;

    if (sideAreaWidth === null) return null;

    return paddedWidth <= sideAreaWidth;

}


function getVerticalShapeCenter(coreState: PublicCoreState, shape: Shape): number {
    const cellSize = coreState.grid.cellSize;
    const canvasHeight = coreState.canvas.getBoundingClientRect().height;
    const shapeHeight = getShapeHeight(shape, cellSize);
    const absoluteCenter = canvasHeight / 2 - shapeHeight / 2;
    return transformAbsoluteCoordinateToDot(coreState, absoluteCenter);
}



function getSideAreaWidth(coreState: PublicCoreState) {
    const pageWidth = getMainAreaWidth();
    if (!pageWidth) return null;
    const canvasWidth = coreState.canvas.getBoundingClientRect().width;
    // since the main area is centered, this returns the sum of 2 areas
    // divide them by 2 to get the area of 1 side
    const absoluteCenter = (canvasWidth - pageWidth) / 2;
    return transformAbsoluteCoordinateToDot(coreState, absoluteCenter);
}

/**
 * 
 * @param coreState The public state provided by dots core
 * @param coordinate The x/y coordinate to translate to dot coordinates
 * @returns the new transformed coordinate
 */
function transformAbsoluteCoordinateToDot(coreState: PublicCoreState, coordinate: number) {
    const cellSize = coreState.grid.cellSize;
    const numberOfCells = Math.ceil(coordinate / cellSize);

    const centeredOnDot = numberOfCells * cellSize + cellSize / 2;
    return centeredOnDot;
}


// dots
function drawSegment(coreState: PublicCoreState, mainState: ShapeDrawerState, segment: Segment, drawDotFunction: DrawDotFunction, drawLineFunction: DrawLineFunction) {
    const joinedState = { ...coreState, ...mainState };
    const context = coreState.context;
    context.beginPath();


    const scale = getScaleFromBrightness(segment.brightness);
    context.globalAlpha = getOpacityFromBrightness(segment.brightness);
    context.fillStyle = joinedState.accentColor;
    context.strokeStyle = joinedState.accentColor;
    context.lineWidth = getLineThickness(joinedState.grid.baseDotRadius);
    const { dot1, dot2 } = getGlobalDotPositions(joinedState, segment.dot1, segment.dot2);


    drawDotFunction(dot1, scale);
    drawDotFunction(dot2, scale);
    context.fill();

    context.beginPath();
    drawLineFunction(dot1, dot2);
    context.stroke();
}

function getGlobalDotPositions(state: JoinedState, dot1: Dot, dot2: Dot): { dot1: Dot, dot2: Dot } {
    const dot1InGlobalCoords = translateGridPositionToGlobalPosition(state, dot1);
    const dot2InGlobalCoords = translateGridPositionToGlobalPosition(state, dot2);
    return { dot1: dot1InGlobalCoords, dot2: dot2InGlobalCoords }
}

function getSegmentsToDraw(state: ShapeDrawerState): Segment[] {
    const progress = getAnimationProgress(state);

    // it's not called index because it's not an index, it goes till max length
    const endPosition = animationProgressToSegment(progress, state);
    return state.shape.segments.slice(0, endPosition);
}


function translateGridPositionToGlobalPosition(state: JoinedState, gridCoordinates: Position): Position {
    const cellSize = state.grid.cellSize;
    const drawingAreaStart = state.drawingAreaStart; // this is the [0, 0] basically of the drwaing
    const verticalShiftFromStart = gridCoordinates.y * cellSize;
    const horizontalShiftFromStart = gridCoordinates.x * cellSize;
    return {
        x: drawingAreaStart.x + horizontalShiftFromStart,
        y: drawingAreaStart.y + verticalShiftFromStart
    }
}

function getAnimationProgress(state: ShapeDrawerState): number {
    const currentScrollPosition = state.scrollPosition;
    const maxScrollPosition = state.maxScrollPosition;
    const animationProgressPadding = maxScrollPosition / 4; // start and end 1/4 progress before
    const paddedProgress = currentScrollPosition + animationProgressPadding;
    const progress = smoothStep(paddedProgress, 0, maxScrollPosition)
    return progress;
}

function animationProgressToSegment(progress: number, state: ShapeDrawerState): number {
    const maxSegmentIndex = state.shape.segments.length;
    // slicing is exclusive
    return Math.round(progress * maxSegmentIndex);
}


//listeners 
function setupListeners(state: ShapeDrawerState): AbortController {
    const controller = new AbortController();
    const { signal } = controller;

    // window.addEventListener("mousemove", (e) => updateMousePositionState(e, state), { signal })
    // document.addEventListener("mouseenter", (e) => updateMousePositionState(e, state), { signal });
    // document.addEventListener("mouseleave", () => updateMousePositionStateOnLeave(state), { signal });
    document.addEventListener('scroll', () => updateScrollPosition(state), { signal });
    return controller;
}



function updateScrollPosition(state: ShapeDrawerState) {
    state.scrollPosition = window.scrollY;
    state.requestFrame();
}