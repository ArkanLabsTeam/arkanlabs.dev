import { number } from "astro:schema"
import type { Dot } from "../dots_core/dots_core"

export enum Brightness {
    dim, bright
}

export type Shape = {
    sizeRequiredInDots: Size, // in grid format
    segments: Segment[],

}

export type Size = { width: number, height: number };

export type Segment = {
    dot1: Dot,
    dot2: Dot,
    brightness: Brightness

}

export function getShapeWidth(shape: Shape, cellSize: number) {
    return shape.sizeRequiredInDots.width * cellSize
}

export function getShapeHeight(shape: Shape, cellSize: number) {
    return shape.sizeRequiredInDots.height * cellSize
}
