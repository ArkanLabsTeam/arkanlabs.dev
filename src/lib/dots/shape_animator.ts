import { getAccentColor, setupCoreLoop, type Dot, type DrawDotFunction, type DrawLineFunction, type EffectSetupFunction, type PublicCoreState, type RequestFrameFunction } from "./dots_core/dots_core";
import { smoothStep, type Position } from "../utils/general"
import { Brightness, getLineThickness, getOpacityFromBrightness, getScaleFromBrightness, getShapeHeight, getShapeWidth, type Segment, type Shape } from "./shapes/shape_utils";
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
    segmentsToDraw: SegmentWithShouldDrawFlag[]
    allSegments: SegmentWithShouldDrawFlag[]
}

// only use as arguments or per-update, don't store.
// because updating any original objects won't propagate
type JoinedState = PublicCoreState & ShapeDrawerState
type DotWithBrightness = Dot & { brightness: Brightness }
type DotWithDrawingFlag = Dot & { shouldDraw: boolean, brightness?: Brightness };
type SegmentWithShouldDrawFlag = {
    dot1: DotWithDrawingFlag,
    dot2: DotWithDrawingFlag,
    brightness: Brightness
}
const SHAPE_DRAWING_CONFIG = {
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
            segmentsToDraw: [],
            allSegments: []
        }
        const joinedState = { ...mainState, ...coreState };
        mainState.allSegments = getSegmentsToDrawWithoutCollisions(joinedState, shape.segments)
        abortController = setupListeners(mainState);

    }

    const cleanup = () => {
        abortController.abort();
    }

    // "_" is the time scale.
    const update = (coreState: PublicCoreState, _: number): boolean => {
        if (!mainState.canScroll || coreState.prefersReducedMotion) {
            // shape appears fully drawed
            mainState.segmentsToDraw = mainState.allSegments;
            return false;
        }

        mainState.segmentsToDraw = getSegmentsToDraw(mainState);
        return false
    }

    const draw = (coreState: PublicCoreState) => {
        for (let segment of mainState.segmentsToDraw) {
            drawSegment(coreState, mainState, segment, drawDotFunction, drawLineFunction);
        }
    }

    const onResize = (coreState: PublicCoreState) => {
        const joinedState = { ...mainState, ...coreState };
        const leftOverSpace = getSideAreaWidth(coreState);
        const drawingAreaStart = getShapeDrawAreaStart(shape, coreState);
        const canScroll = isDocumentScrollable();
        if (leftOverSpace == null || drawingAreaStart == null) return;
        mainState.allSegments = getSegmentsToDrawWithoutCollisions(joinedState, shape.segments)

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
    const drawingAreaStartVertical = getVerticalDrawingStartInCenter(coreState, shape);

    // since the mainAreaWidth is centered, we need to add one side area width to get the width 
    // from the left till the end of the main area
    const startingPositionHorizontal = mainAreaWidth + sideAreaWidth + SHAPE_DRAWING_CONFIG.horizontalPadding
    const drawingAreaStartHorizontalSnapped = translateAbsoluteCoordinateToDot(coreState, startingPositionHorizontal);
    return {
        x: drawingAreaStartHorizontalSnapped,
        y: drawingAreaStartVertical
    }

}


function getDrawingAreaStartInCenter(shape: Shape, coreState: PublicCoreState) {
    const drawingStartVertical = getVerticalDrawingStartInCenter(coreState, shape);
    const drawingStartHorizontal = getHorizontalDrawingStartInCenter(coreState, shape);


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

function getHorizontalDrawingStartInCenter(coreState: PublicCoreState, shape: Shape) {
    const cellSize = coreState.grid.cellSize;
    const canvasWidth = coreState.canvas.getBoundingClientRect().width;
    const shapeWidth = getShapeWidth(shape, cellSize);
    const absoluteStartHorizontal = canvasWidth / 2 - shapeWidth / 2;
    const drawingStartHorizontal = translateAbsoluteCoordinateToDot(coreState, absoluteStartHorizontal);

    return drawingStartHorizontal;

}

function getVerticalDrawingStartInCenter(coreState: PublicCoreState, shape: Shape): number {
    const cellSize = coreState.grid.cellSize;
    const canvasHeight = coreState.canvas.getBoundingClientRect().height;
    const shapeHeight = getShapeHeight(shape, cellSize);
    const absoluteCenter = canvasHeight / 2 - shapeHeight / 2;
    return translateAbsoluteCoordinateToDot(coreState, absoluteCenter);
}



function getSideAreaWidth(coreState: PublicCoreState) {
    const pageWidth = getMainAreaWidth();
    if (!pageWidth) return null;
    const canvasWidth = coreState.canvas.getBoundingClientRect().width;
    // since the main area is centered, this returns the sum of 2 areas
    // divide them by 2 to get the area of 1 side
    return (canvasWidth - pageWidth) / 2;
}

/**
 * 
 * @param coreState The public state provided by dots core
 * @param coordinate The x/y coordinate to translate to dot coordinates
 * @returns the new transformed coordinate
 */
function translateAbsoluteCoordinateToDot(coreState: PublicCoreState, coordinate: number) {
    const cellSize = coreState.grid.cellSize;
    // since dots land in the middle of cells we remove half a cell
    const dotIndex = Math.round((coordinate - cellSize / 2) / cellSize);

    const centeredOnDot = dotIndex * cellSize + cellSize / 2;
    return centeredOnDot;
}


// dots
function drawSegment(coreState: PublicCoreState, mainState: ShapeDrawerState, segment: SegmentWithShouldDrawFlag, drawDotFunction: DrawDotFunction, drawLineFunction: DrawLineFunction) {
    const joinedState = { ...coreState, ...mainState };
    const context = coreState.context;

    context.globalAlpha = getOpacityFromBrightness(segment.brightness);
    context.strokeStyle = joinedState.accentColor;
    context.lineWidth = getLineThickness(joinedState.grid.baseDotRadius);

    context.beginPath();
    drawLineFunction(segment.dot1, segment.dot2);
    context.stroke();

    drawDots(segment, drawDotFunction, joinedState);
}

function drawDots(segment: SegmentWithShouldDrawFlag, drawDotFunction: DrawDotFunction, joinedState: JoinedState) {
    const context = joinedState.context;
    context.fillStyle = joinedState.accentColor;

    const dot1 = segment.dot1;
    const dot2 = segment.dot2;
    const dots = [dot1, dot2];


    // currently we could draw a bright dot because a dot happens to sit on another bright dot area even though 
    // the bright dot appears much later, we could resolve this in the draw function instead of precalculate it
    // if it becomes an issue
    for (const dot of dots) {
        // the first one already "guarantees" the other by the code but this makes it defensive
        if (dot.shouldDraw && dot.brightness !== undefined) {
            context.beginPath();
            context.globalAlpha = getOpacityFromBrightness(dot.brightness);
            const scale = getScaleFromBrightness(dot.brightness);
            drawDotFunction(dot, scale);
            context.fill();

        }
    }
}


function getDotsToDrawWithoutCollisions(segments: Segment[]): Map<number, DotWithBrightness | undefined> {
    const map: Map<number, DotWithBrightness> = new Map();
    for (const segment of segments) {
        const dot1 = segment.dot1;
        const dot2 = segment.dot2;

        const brightness = segment.brightness;

        const key1 = getDotKeyForMap(dot1);
        const key2 = getDotKeyForMap(dot2);

        const dot1InMap = map.get(key1);
        const dot2InMap = map.get(key2);

        const newBrightness1 = Math.max((dot1InMap?.brightness) ?? Brightness.dim, brightness);
        const newBrightness2 = Math.max((dot2InMap?.brightness) ?? Brightness.dim, brightness);

        map.set(key1, { ...dot1, brightness: newBrightness1 });
        map.set(key2, { ...dot2, brightness: newBrightness2 });
    }
    return map;
}

function getDotKeyForMap(dot: Dot) {
    return dot.x * 1000 + dot.y;
}


function getSegmentsToDrawWithoutCollisions(joinedState: JoinedState, segments: Segment[]): SegmentWithShouldDrawFlag[] {
    // go over the list
    // check if the dict has it, if it does add it and remove it, set the should draw to true
    // if it doesnt add it but set the should draw to false
    const newSegments: SegmentWithShouldDrawFlag[] = [];
    const dotsToDrawWithoutCollisions = getDotsToDrawWithoutCollisions(segments);
    for (const segment of segments) {
        const dot1 = segment.dot1;
        const dot2 = segment.dot2;
        const brightness = segment.brightness;

        const dot1Key = getDotKeyForMap(dot1);
        const dot2Key = getDotKeyForMap(dot2);

        const dot1FromMap = dotsToDrawWithoutCollisions.get(dot1Key);
        const dot2FromMap = dotsToDrawWithoutCollisions.get(dot2Key);

        const { dot1: globalDot1, dot2: globalDot2 } = getGlobalDotPositions(joinedState, dot1, dot2);


        let dot1ToAdd: DotWithDrawingFlag = { ...globalDot1, shouldDraw: dot1FromMap != undefined, brightness: dot1FromMap?.brightness };
        let dot2ToAdd: DotWithDrawingFlag = { ...globalDot2, shouldDraw: dot2FromMap != undefined, brightness: dot2FromMap?.brightness };

        dotsToDrawWithoutCollisions.delete(dot1Key);
        dotsToDrawWithoutCollisions.delete(dot2Key);

        newSegments.push({ dot1: dot1ToAdd, dot2: dot2ToAdd, brightness: brightness })

    }
    return newSegments;

}

function getGlobalDotPositions(state: JoinedState, dot1: Dot, dot2: Dot): { dot1: Dot, dot2: Dot } {
    const dot1InGlobalCoords = translateGridPositionToGlobalPosition(state, dot1);
    const dot2InGlobalCoords = translateGridPositionToGlobalPosition(state, dot2);
    return { dot1: dot1InGlobalCoords, dot2: dot2InGlobalCoords }
}

function getSegmentsToDraw(state: ShapeDrawerState): SegmentWithShouldDrawFlag[] {
    const progress = getAnimationProgress(state);

    // it's not called index because it's not an index, it goes till max length
    const endPosition = animationProgressToSegment(progress, state);
    return state.allSegments.slice(0, endPosition);
}


function translateGridPositionToGlobalPosition(state: JoinedState, gridCoordinates: Position): Position {
    const cellSize = state.grid.cellSize;
    const drawingAreaStart = state.drawingAreaStart; // this is the [0, 0] basically of the drwaing
    const verticalShiftFromOrigin = gridCoordinates.y * cellSize;
    const horizontalShiftFromOrigin = gridCoordinates.x * cellSize;
    const x = drawingAreaStart.x + horizontalShiftFromOrigin;
    const y = drawingAreaStart.y + verticalShiftFromOrigin;
    return { x, y }
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
    // incase something updates for some reason
    document.addEventListener('load', () => { state.maxScrollPosition = getMaxScrollHeight(); })
    document.addEventListener('scroll', () => updateScrollPosition(state), { signal });
    return controller;
}



function updateScrollPosition(state: ShapeDrawerState) {
    state.scrollPosition = window.scrollY;
    state.requestFrame();
}