import type { Position } from "../../utils/general";
import type { PublicCoreState } from "../dots_core/dots_core";
import { getShapeHeight, getShapeWidth, type Shape } from "./shape";

export function getShapeDrawAreaStart(shape: Shape, coreState: PublicCoreState, mainAreaId: string, horizontalPadding: number): Position | null {
    const mainAreaWidth = getMainAreaWidth(mainAreaId);
    const sideAreaWidth = getSideAreaWidth(coreState, mainAreaId);
    const canDrawInSide = canDrawInSideArea(shape, coreState, sideAreaWidth, horizontalPadding);

    if (mainAreaWidth == null || canDrawInSide == null || sideAreaWidth === null) return null;

    const drawingAreaStartInCenter = getDrawingAreaStartInCenter(shape, coreState);
    const drawingAreaStartOnSide = getDrawingAreaStartOnSide(shape, mainAreaWidth, sideAreaWidth, coreState, horizontalPadding);

    return canDrawInSide ? drawingAreaStartOnSide : drawingAreaStartInCenter;
}

function getDrawingAreaStartOnSide(shape: Shape, mainAreaWidth: number, sideAreaWidth: number, coreState: PublicCoreState, horizontalPadding: number): Position {
    const drawingAreaStartVertical = getVerticalDrawingStartInCenter(coreState, shape);

    // since the mainAreaWidth is centered, we need to add one side area width to get the width 
    // from the left till the end of the main area
    const startingPositionHorizontal = mainAreaWidth + sideAreaWidth + horizontalPadding
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

function getMainAreaWidth(mainAreaId: string) {
    const element = document.getElementById(mainAreaId);
    const pageWidth = element?.getBoundingClientRect().width ?? null;
    return pageWidth;
}


function canDrawInSideArea(shape: Shape, coreState: PublicCoreState, sideAreaWidth: number | null, horizontalPadding: number): boolean | null {
    const shapeWidth = getShapeWidth(shape, coreState.grid.cellSize);

    const paddedWidth = shapeWidth + horizontalPadding * 2;

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



function getSideAreaWidth(coreState: PublicCoreState, mainAreaId: string) {
    const pageWidth = getMainAreaWidth(mainAreaId);
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
