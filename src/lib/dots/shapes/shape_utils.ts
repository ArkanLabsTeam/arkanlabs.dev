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
    return shape.sizeRequiredInDots.width * cellSize;
}

export function getShapeHeight(shape: Shape, cellSize: number) {
    return shape.sizeRequiredInDots.height * cellSize
}

export function getOpacityFromBrightness(brightness: Brightness) {
    switch (brightness) {
        case Brightness.bright:
            return 1
        case Brightness.dim:
            return 0.51
    }
}

export function getScaleFromBrightness(brightness: Brightness) {
    switch (brightness) {
        case Brightness.bright:
            return 2.2
        case Brightness.dim:
            return 1.65
    }
}

export function getLineThickness(dotSize: number) {
    return dotSize * 0.45;
}