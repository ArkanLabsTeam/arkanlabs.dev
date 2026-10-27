export function setupCanvasResolution(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // || since it's limited availability, not all browsers support it
    const { width, height } = canvas.getBoundingClientRect();

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function setupCanvas(canvasId: string) {
    const canvas = document.getElementById(canvasId);
    if (!(canvas instanceof HTMLCanvasElement)) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    return { canvas, ctx };
}