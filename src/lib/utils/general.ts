export type Position = { x: number, y: number }

export function debounce(func: Function, delay: number) {
    let timeout: number;
    return function (this: unknown, ...args: any) {
        // this can be anything
        // this is not passed as an argument, it's taken from the caller
        // this is a reserved keyword not an argument, that's why it's confusing
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            //arrow functions don't have a this, so they take the parent this
            func.call(this, ...args);
            // function called with the this of the returned function
        }, delay);
    };
}


export function smoothStep(x: number, min: number, max: number) {
    if (min == max) {
        throw RangeError("Cant have min and max equal")
    }
    const t = clamp((x - min) / (max - min), 0, 1);
    return t ** 2 * (3 - t * 2)

}

export function interpolation(a: number, b: number, t: number, stepScale: number = 1) {
    const clampedStepScale = clamp(stepScale, 0, 4);
    const aWeight = (1 - t) ** clampedStepScale;
    const bWeight = 1 - aWeight
    return aWeight * a + b * bWeight;
    // when we interpolate 10%, we're asking to return 90% of the value
    // that represents a step, if we wanna move 2 steps, we return 90% of the 90%, or 90%^2
    // so the power of (1 - t) represents the step, we can use this to speed or slow the animation based on the framrate 
    // to make it consistent on all screens
}
export function clamp(val: number, min: number, max: number): number {
    return Math.min(Math.max(val, min), max);
}

export function closeTo(x: number, y: number, tolerance: number) {
    return Math.abs(x - y) < tolerance
}