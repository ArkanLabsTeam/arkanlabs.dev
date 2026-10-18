import { setupCoreLoop, type DrawDotFunction, type EffectSetupFunction, type PublicCoreState, type RequestFrameFunction } from "./dots_core/dots_core";
import { closeTo, interpolation, smoothStep, type Position } from "../utils/general"

type MainPageDesktopState = {
    mouse: Position,
    glow: Position,
    strength: number,
    accentColor: string,
    isMouseInScreen: boolean,
    requestFrame: RequestFrameFunction
    prefersReducedMotion: boolean
}

const GLOW_ANIMATION_CONFIG = {
    easing: 0.1,
    snapStrengthThreshold: 0.1,
    glowRadius: 150,

} as const;

function setupMainLoop(): void {
    let abortController: AbortController;
    let mainState: MainPageDesktopState;
    let drawDot: DrawDotFunction;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const setup: EffectSetupFunction = (requestFrame, drawDotFunction, drawLine, coreState: PublicCoreState) => {
        mainState = {
            mouse: { x: 0, y: 0 },
            glow: getScreenCenter(),
            strength: 0,
            accentColor: getAccentColor(),
            isMouseInScreen: false,
            requestFrame,
            prefersReducedMotion
        }
        abortController = setupListeners(mainState);
        drawDot = drawDotFunction;
    }

    const cleanup = () => {
        abortController.abort();
    }

    const update = (coreState: PublicCoreState, stepScale: number): boolean => {
        if (mainState.prefersReducedMotion) return false;
        interpolateGlowPosition(mainState, stepScale);
        updateStrengthBasedOnMousePosition(mainState, stepScale);
        const shouldRequestFrameForMousePresence = shouldRequestFrameForMouseWindowPresence(mainState);
        const shouldRequestFrameForMouseMovement = shouldRequestFrameForMouseWindowMovement(mainState);
        if (!shouldRequestFrameForMousePresence) {
            snapStrength(mainState);
        }

        if (!shouldRequestFrameForMouseMovement) {
            snapGlow(mainState);
        }

        return shouldRequestFrameForMousePresence || shouldRequestFrameForMouseMovement;
    }

    const draw = (coreState: PublicCoreState) => {
        if (mainState.prefersReducedMotion) return;
        drawCloseDots(mainState, coreState, drawDot);
    }

    setupCoreLoop({
        setup,
        cleanup,
        update,
        draw
    });

}
setupMainLoop(); // you would wanna build a chooser file
function snapGlow(mainState: MainPageDesktopState) {
    mainState.glow = { x: mainState.mouse.x, y: mainState.mouse.y };
}


function snapStrength(mainState: MainPageDesktopState) {
    const mouseInScreen = mainState.isMouseInScreen;
    if (mouseInScreen) {
        mainState.strength = 1;
    }
    if (!mouseInScreen) {
        mainState.strength = 0;
    }
}

function shouldRequestFrameForMouseWindowMovement(mainState: MainPageDesktopState): boolean {
    const { mouse, glow } = mainState;
    const mouseGlowDistance = Math.hypot(mouse.x - glow.x, mouse.y - glow.y);
    const tolerance = 0.5;
    return !closeTo(mouseGlowDistance, 0, tolerance);

}
function shouldRequestFrameForMouseWindowPresence(mainState: MainPageDesktopState): boolean {
    const strength = mainState.strength;
    const mouseInScreen = mainState.isMouseInScreen;
    const tolerance = 0.01;
    if (mouseInScreen) {
        return !closeTo(strength, 1, tolerance);
    } else {
        return !closeTo(strength, 0, tolerance)
    }
}


// canvas
function getScreenCenter(): Position {
    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;
    return { x, y }
}

// dots
function drawCloseDots(state: MainPageDesktopState, coreState: PublicCoreState, draw: DrawDotFunction) {
    const context = coreState.context;
    context.fillStyle = state.accentColor;
    for (const row of coreState.grid.dots) {
        for (const dot of row) {
            const glowCenterDotXDifference = (state.glow.x - dot.x);
            const glowCenterDotYDifference = (state.glow.y - dot.y);
            const distanceFromGlowCenter = Math.hypot(glowCenterDotXDifference, glowCenterDotYDifference);

            if (distanceFromGlowCenter < GLOW_ANIMATION_CONFIG.glowRadius) {
                context.beginPath();
                const smoothStepValue = smoothStep(distanceFromGlowCenter, 0, GLOW_ANIMATION_CONFIG.glowRadius);
                const dotScale = getDotScale(smoothStepValue, 0.5);
                setDotAlpha(smoothStepValue, state, coreState);
                draw(dot, dotScale);
                context.fill();
            }
        }
    }
}

function setDotAlpha(smoothStep: number, state: MainPageDesktopState, coreState: PublicCoreState) {
    const colorStrength = (1 - smoothStep) * state.strength;
    coreState.context.globalAlpha = colorStrength;
}

function getDotScale(smoothStep: number, maxScaleIncrease: number = 1): number {
    return 1 + (1 - smoothStep) * maxScaleIncrease;

}

function interpolateGlowPosition(state: MainPageDesktopState, stepScale: number) {
    const newXGlowPosition = interpolation(state.glow.x, state.mouse.x, GLOW_ANIMATION_CONFIG.easing, stepScale);
    const newYGlowPosition = interpolation(state.glow.y, state.mouse.y, GLOW_ANIMATION_CONFIG.easing, stepScale);

    state.glow = { x: newXGlowPosition, y: newYGlowPosition };
}

function updateStrengthBasedOnMousePosition(state: MainPageDesktopState, stepScale: number) {
    if (state.isMouseInScreen) {
        state.strength = interpolation(state.strength, 1, GLOW_ANIMATION_CONFIG.easing, stepScale);
    } else {
        state.strength = interpolation(state.strength, 0, GLOW_ANIMATION_CONFIG.easing, stepScale)
    }
}



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

    window.addEventListener("mousemove", (e) => updateMousePositionState(e, state), { signal })
    document.addEventListener("mouseenter", (e) => updateMousePositionState(e, state), { signal });
    document.addEventListener("mouseleave", () => updateMousePositionStateOnLeave(state), { signal });
    motionQuery.addEventListener('change', (e) => updatePreferReducedMotion(e, state), { signal });
    return controller;
}

function updatePreferReducedMotion(e: MediaQueryListEvent, dotGridState: MainPageDesktopState) {
    dotGridState.prefersReducedMotion = e.matches
    dotGridState.requestFrame();
}

function updateMousePositionStateOnLeave(dotGridState: MainPageDesktopState) {
    dotGridState.isMouseInScreen = false
    dotGridState.requestFrame();
}

function updateMousePositionState(mouse: MouseEvent, dotGridState: MainPageDesktopState) {
    dotGridState.mouse = { x: mouse.x, y: mouse.y }
    dotGridState.isMouseInScreen = true;
    if (dotGridState.strength <= GLOW_ANIMATION_CONFIG.snapStrengthThreshold) {
        dotGridState.glow = { x: mouse.x, y: mouse.y }
    }
    dotGridState.requestFrame();
}