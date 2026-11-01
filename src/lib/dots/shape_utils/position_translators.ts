import type { Position } from "../../utils/general";
import type { Dot, PublicCoreState } from "../dots_core/dots_core";

export function translateGridPositionToGlobalPosition(drawingAreaStart: Position, state: PublicCoreState, gridCoordinates: Position): Position {
    const cellSize = state.grid.cellSize;
    const verticalShiftFromOrigin = gridCoordinates.y * cellSize;
    const horizontalShiftFromOrigin = gridCoordinates.x * cellSize;
    const x = drawingAreaStart.x + horizontalShiftFromOrigin;
    const y = drawingAreaStart.y + verticalShiftFromOrigin;
    return { x, y }
}

export function translateGlobalPositionToGridIndex(state: PublicCoreState, dot: Dot): Dot {
    const cellSize = state.grid.cellSize;
    const x = Math.round((dot.x - cellSize / 2) / cellSize);
    const y = Math.round((dot.y - cellSize / 2) / cellSize);
    return { x, y };
}

export function translateGridIndexToGlobalPosition(state: PublicCoreState, dot: Dot): Dot {
    const cellSize = state.grid.cellSize;
    const x = dot.x * cellSize + cellSize / 2;
    const y = dot.y * cellSize + cellSize / 2;
    return { x, y }

}
