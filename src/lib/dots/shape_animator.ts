import { dotDistance, getAccentColor, getBackgroundColor, getBaseColor, setupCoreLoop, type Dot, type DrawDotFunction, type DrawLineFunction, type EffectSetupFunction, type PublicCoreState, type RequestFrameFunction } from "./dots_core/dots_core";
import { clamp, smoothStep, type Position } from "../utils/general"
import { Brightness, getLineThickness, getOpacityFromBrightness, getScaleFromBrightness, getShapeHeight, getShapeWidth, type DotWithBrightness, type Segment, type SegmentWithShouldDrawFlag, type Shape } from "./shape_utils/shape";
import { alShape } from "./shapes/AL_shape";
import { getMaxScrollHeight, isDocumentScrollable } from "../utils/document";
import { getShapeDrawAreaStart } from "./shape_utils/drawing_area";
import { translateGlobalPositionToGridIndex, translateGridIndexToGlobalPosition } from "./shape_utils/position_translators";
import { getDotKeyForMap, getDotsToDrawWithoutCollisions, getSegmentsToDrawWithoutCollisions } from "./shape_utils/dot_segment_drawing";
import { getOpacityDecreaseEffectStartCoordinate, getRadiusInGridIndices } from "./shape_utils/background_opacity";

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
    dotsMap: Map<number, Dot>
    backgroundColor: string
    backgroundOpacityMap: Map<number, DotWithBrightness>
}

// only use as arguments or per-update, don't store.
// because updating any original objects won't propagate
type JoinedState = PublicCoreState & ShapeDrawerState
const SHAPE_DRAWING_CONFIG = {
    mainAreaId: "main-space",
    horizontalPadding: 10,
    backgroundDotOpacityDecrease: 50,
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
        const drawingAreaStart = getShapeDrawAreaStart(shape, coreState, SHAPE_DRAWING_CONFIG.mainAreaId, SHAPE_DRAWING_CONFIG.horizontalPadding);
        const maxScrollPosition = getMaxScrollHeight();
        const currentScrollPosition = window.scrollY;
        if (!drawingAreaStart) throw Error("Can't load drawing area");
        const segmentsWithoutCollisions = getSegmentsToDrawWithoutCollisions(drawingAreaStart, coreState, shape.segments)
        const dotsMap = getDotsToDrawWithoutCollisions(coreState, segmentsWithoutCollisions);

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
            allSegments: segmentsWithoutCollisions,
            dotsMap,
            backgroundColor: getBackgroundColor(),
            backgroundOpacityMap: new Map()
        }
        abortController = setupListeners(mainState);
    }

    const cleanup = () => {
        abortController.abort();
    }

    // "_" is the time scale.
    const update = (coreState: PublicCoreState, _: number): boolean => {
        const joinedState = { ...coreState, ...mainState };
        if (!mainState.canScroll || coreState.prefersReducedMotion) {
            // shape appears fully drawed
            mainState.segmentsToDraw = mainState.allSegments;
            resetAndFillOpacityMap(joinedState);
            return false;
        }

        mainState.segmentsToDraw = getSegmentsToDraw(mainState);
        resetAndFillOpacityMap(joinedState);

        return false
    }

    const draw = (coreState: PublicCoreState) => {
        const joinedState = { ...coreState, ...mainState }
        reduceBackgroundOpacityAroundShape(joinedState, drawDotFunction);
        
        for (const segment of mainState.segmentsToDraw) {
            drawSegment(joinedState, segment, drawDotFunction, drawLineFunction);
        }
    }

    const onResize = (coreState: PublicCoreState) => {
        const drawingAreaStart = getShapeDrawAreaStart(shape, coreState, SHAPE_DRAWING_CONFIG.mainAreaId, SHAPE_DRAWING_CONFIG.horizontalPadding);
        const canScroll = isDocumentScrollable();
        if (drawingAreaStart == null) return;

        mainState.drawingAreaStart = drawingAreaStart;
        mainState.maxScrollPosition = getMaxScrollHeight();

        mainState.allSegments = getSegmentsToDrawWithoutCollisions(drawingAreaStart, coreState, shape.segments)
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



// dots
function drawSegment(joinedState: JoinedState, segment: SegmentWithShouldDrawFlag, drawDotFunction: DrawDotFunction, drawLineFunction: DrawLineFunction) {
    const context = joinedState.context;

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

function reduceBackgroundOpacityAroundShape(state: JoinedState, drawDot: DrawDotFunction) {
    const map = state.backgroundOpacityMap;
    const context = state.context;
    context.fillStyle = state.backgroundColor;

    for (const dot of map.values()) {
        const dotInGlobalFormat = translateGridIndexToGlobalPosition(state, dot);
        
        const brightness = dot.brightness;
        if (brightness == 0) continue;
        context.globalAlpha = brightness;
        context.beginPath()
        drawDot(dotInGlobalFormat, 1.1);
        context.fill();
    }
}

function resetAndFillOpacityMap(state: JoinedState) {
    const segmentsToDraw = state.segmentsToDraw;
    const map = state.backgroundOpacityMap;
    map.clear();
    for (const segment of segmentsToDraw) {
        const dot1 = segment.dot1;
        const dot2 = segment.dot2;
        const dots = [dot1, dot2];
        for (const dot of dots) {
            if (dot.shouldDraw) {
                lowerBackgroundDotOpacity(state, dot)
            }
        }
    }
}


function lowerBackgroundDotOpacity(joinedState: JoinedState, dot: Dot) {
    const dotMap = joinedState.dotsMap;
    const gridWidth = joinedState.grid.columns;
    const gridHeight = joinedState.grid.rows;
    const opacityMap = joinedState.backgroundOpacityMap;

    const center = translateGlobalPositionToGridIndex(joinedState, dot);

    const radiusInGridFormat = getRadiusInGridIndices(joinedState, SHAPE_DRAWING_CONFIG.backgroundDotOpacityDecrease);
    const start = getOpacityDecreaseEffectStartCoordinate(center, radiusInGridFormat);
    const diameterInGridFormatClampedWidth = Math.min(radiusInGridFormat * 2, gridWidth - start.x);
    const diameterInGridFormatClamped2D = Math.min(diameterInGridFormatClampedWidth, gridHeight - start.y);
    for (let i = 0; i < diameterInGridFormatClamped2D; i++) {
        for (let j = 0; j < diameterInGridFormatClamped2D; j++) {
            const dotToDecreaseOpacity: Dot = { x: start.x + j, y: start.y + i };
            const dotKey = getDotKeyForMap(dotToDecreaseOpacity);
            if (dotMap.get(dotKey) != undefined) continue;

            const distanceFromCenter = dotDistance(dotToDecreaseOpacity, center);
            const reversedSmoothStepValue = 1 - smoothStep(distanceFromCenter, 0, radiusInGridFormat);
            const currentOpacity = opacityMap.get(dotKey)?.brightness;
            const opacity = Math.max(currentOpacity ?? 0, reversedSmoothStepValue);
            opacityMap.set(dotKey, { ...dotToDecreaseOpacity, brightness: opacity });
        }
    }
}




function getSegmentsToDraw(state: ShapeDrawerState): SegmentWithShouldDrawFlag[] {
    const progress = getAnimationProgress(state);

    // it's not called index because it's not an index, it goes till max length
    const endPosition = animationProgressToSegment(progress, state);
    return state.allSegments.slice(0, endPosition);
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