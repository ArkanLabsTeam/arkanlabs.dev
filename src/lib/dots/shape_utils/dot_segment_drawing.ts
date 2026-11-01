import type { Position } from "../../utils/general";
import type { Dot, PublicCoreState } from "../dots_core/dots_core";
import { translateGlobalPositionToGridIndex, translateGridPositionToGlobalPosition } from "./position_translators";
import { Brightness, type DotWithBrightness, type DotWithDrawingFlag, type Segment, type SegmentWithShouldDrawFlag } from "./shape";

function getDotsToDrawMapWithBrightness(segments: Segment[]): Map<number, DotWithBrightness | undefined> {
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

export function getDotsToDrawWithoutCollisions(state: PublicCoreState, segments: SegmentWithShouldDrawFlag[]): Map<number, Dot> {
    const map: Map<number, Dot> = new Map();
    for (const segment of segments) {
        const dot1 = segment.dot1;
        const dot2 = segment.dot2;
        const dots = [dot1, dot2];
        for (const dot of dots) {
            if (dot.shouldDraw) {
                const dotInGridIndex = translateGlobalPositionToGridIndex(state, dot);
                const key = getDotKeyForMap(dotInGridIndex);
                map.set(key, dot);
            }
        }
    }


    return map;
}



export function getSegmentsToDrawWithoutCollisions(drawingAreaStart: Position, state: PublicCoreState, segments: Segment[]): SegmentWithShouldDrawFlag[] {
    const newSegments: SegmentWithShouldDrawFlag[] = [];
    const dotsToDrawWithoutCollisions = getDotsToDrawMapWithBrightness(segments);
    for (const segment of segments) {
        const dot1 = segment.dot1;
        const dot2 = segment.dot2;
        const brightness = segment.brightness;

        const dot1Key = getDotKeyForMap(dot1);
        const dot2Key = getDotKeyForMap(dot2);

        const dot1FromMap = dotsToDrawWithoutCollisions.get(dot1Key);
        const dot2FromMap = dotsToDrawWithoutCollisions.get(dot2Key);

        const { dot1: globalDot1, dot2: globalDot2 } = getGlobalDotPositions(drawingAreaStart, state, dot1, dot2);


        let dot1ToAdd: DotWithDrawingFlag = { ...globalDot1, shouldDraw: dot1FromMap != undefined, brightness: dot1FromMap?.brightness };
        let dot2ToAdd: DotWithDrawingFlag = { ...globalDot2, shouldDraw: dot2FromMap != undefined, brightness: dot2FromMap?.brightness };

        dotsToDrawWithoutCollisions.delete(dot1Key);
        dotsToDrawWithoutCollisions.delete(dot2Key);

        newSegments.push({ dot1: dot1ToAdd, dot2: dot2ToAdd, brightness: brightness })

    }
    return newSegments;

}

function getGlobalDotPositions(drawingAreaStart: Position, state: PublicCoreState, dot1: Dot, dot2: Dot): { dot1: Dot, dot2: Dot } {
    const dot1InGlobalCoords = translateGridPositionToGlobalPosition(drawingAreaStart, state, dot1);
    const dot2InGlobalCoords = translateGridPositionToGlobalPosition(drawingAreaStart, state, dot2);
    return { dot1: dot1InGlobalCoords, dot2: dot2InGlobalCoords }
}




/**
* To use this function you must ensure that all places that use the Map this key is for use the same origin.
* Some dots use css px format, others use coordiates local to shape start and others use global grid coordinates
*/
export function getDotKeyForMap(dot: Dot) {

    return dot.x * 10_000 + dot.y;
}
