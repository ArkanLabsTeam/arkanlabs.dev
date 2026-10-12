import { setupCoreLoop, type DrawDotFunction, type PublicCoreState, type RequestFrameFunction } from "./dots_core/dots_core";
import { closeTo, debounce, interpolation, smoothStep, type position } from "../utils/general"

type MainPageDesktopState = {
    accentColor: string,
    requestFrame: RequestFrameFunction
    prefersReducedMotion: boolean
    paddedRightSpace: number // currently useless but could be used to change size of text
    drawingAreaStart: number | null
}

const AL_LETTERS_CONFIG = {
    easing: 0.1,
    snapStrengthThreshold: 0.1,
    glowRadius: 150,
    mainAreaId: "main-space",
    horizontalPadding: 10
} as const;

function setupMainLoop(): void {
    let abortController: AbortController;
    let mainState: MainPageDesktopState;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const setup = (requestFrame: RequestFrameFunction, draw: DrawDotFunction, coreState: PublicCoreState) => {
        const leftOverRightSpace = getLeftOverSpaceWidth(coreState);
        const drawingAreaStart = getMainAreaWidth(); // this also is where the drawing area starts
        if (!leftOverRightSpace) return;
        mainState = {
            accentColor: getAccentColor(),
            requestFrame,
            prefersReducedMotion,
            paddedRightSpace: leftOverRightSpace,
            drawingAreaStart
        }
        abortController = setupListeners(mainState);
    }

    const cleanup = () => {
        abortController.abort();
    }

    const update = (coreState: PublicCoreState, stepScale: number): boolean => {
        return false
    }

    const draw = (coreState: PublicCoreState) => {
        // if (mainState.prefersReducedMotion) return;
        // drawCloseDots(mainState, coreState);
    }

    const onResize = (coreState: PublicCoreState) => {
        const leftOverSpace = getLeftOverSpaceWidth(coreState);
        const mainAreaWidth = getMainAreaWidth();
        if (!leftOverSpace) return;

        // if left over is null this is too, we can do ! safely
        mainState.drawingAreaStart = mainAreaWidth! + AL_LETTERS_CONFIG.horizontalPadding;
        mainState.paddedRightSpace = leftOverSpace - AL_LETTERS_CONFIG.horizontalPadding;
    };

    setupCoreLoop({
        setup,
        cleanup,
        update,
        draw,
        onResize
    });

}

setupMainLoop(); // you would wanna build a chooser file


// canvas
function getMainAreaWidth() {
    const element = document.getElementById(AL_LETTERS_CONFIG.mainAreaId);
    const pageWidth = element?.getBoundingClientRect().width ?? null;
    return pageWidth;
}


function getLeftOverSpaceWidth(coreState: PublicCoreState) {
    const pageWidth = getMainAreaWidth();
    if (!pageWidth) return;
    const canvasWidth = coreState.canvas.getBoundingClientRect().width;
    return canvasWidth - pageWidth;
}


// dots


//colors
function getAccentColor() {
    const root = document.documentElement;
    return window.getComputedStyle(root).getPropertyValue("--color-accent").trim();
}

//listeners 
function setupListeners(state: MainPageDesktopState): AbortController {
    const controller = new AbortController();
    const { signal } = controller;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // window.addEventListener("mousemove", (e) => updateMousePositionState(e, state), { signal })
    // document.addEventListener("mouseenter", (e) => updateMousePositionState(e, state), { signal });
    // document.addEventListener("mouseleave", () => updateMousePositionStateOnLeave(state), { signal });
    motionQuery.addEventListener('change', (e) => updatePreferReducedMotion(e, state), { signal });
    return controller;
}

function updatePreferReducedMotion(e: MediaQueryListEvent, dotGridState: MainPageDesktopState) {
    dotGridState.prefersReducedMotion = e.matches
    dotGridState.requestFrame();
}
