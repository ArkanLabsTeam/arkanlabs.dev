import type { Position } from "../../utils/general";
import type { PublicCoreState } from "../dots_core/dots_core";

export function getOpacityDecreaseEffectStartCoordinate(center: Position, radius: number): Position {
    const x = center.x - radius;
    const y = center.y - radius;
    return { x, y }
}

export function getRadiusInGridIndices(state: PublicCoreState, backgroundDotOpacityDecrease: number) {
    const cellSize = state.grid.cellSize;
    const radius = backgroundDotOpacityDecrease;
    return Math.max(Math.round(radius / cellSize), 1);
}
