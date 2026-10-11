export function resetCanvasSize(canvasId: string) {
    const canvas = document.getElementById(
        canvasId,
    ) as HTMLCanvasElement | null;
    if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
            window.addEventListener("resize", () =>
                setupCanvasResolution(canvas, ctx),
            );
        }
    }
}

export function setupCanvasResolution(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = canvas.getBoundingClientRect();

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

