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
    const aWeight = (1 - t) ** stepScale;
    const bWeight = 1 - aWeight
    return aWeight * a + b * bWeight;
}

function clamp(val: number, min: number, max: number): number {
    return Math.min(Math.max(val, min), max);
}