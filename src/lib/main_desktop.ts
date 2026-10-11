import { drawDot, type PublicCoreState, type RequestFrameFunction } from "./dots_core/dots_core";
import { closeTo, interpolation, smoothStep, type position } from "./utils/general"

type MainPageDesktopState = {
    mouse: position,
    glow: position,
    strength: number,
    accentColor: string,
    isMouseInScreen: boolean,
    requestFrame: RequestFrameFunction
    prefersReducedMotion: boolean
}

type JoinedState = MainPageDesktopState & PublicCoreState;

const GLOW_ANIMATION_CONFIG = {
    spacing: 16,
    easing: 0.1,
    snapStrengthThreshold: 0.3,
    glowRadius: 150,

} as const;

function setupMainLoop(): void {
    let abortController: AbortController;
    let mainState: MainPageDesktopState;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const setup = (requestFrame: RequestFrameFunction) => {
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
    }

    const cleanup = () => {
        abortController.abort();
    }

    const update = (coreState: PublicCoreState, stepScale: number): boolean => {
        const joinedState = joinStates(coreState, mainState);
        if (prefersReducedMotion) return false;
        interpolateGlowPosition(joinedState, stepScale);
        updateStrengthBasedOnMousePosition(joinedState, stepScale);
        const shouldRequestFrameForMousePresence = shouldRequestFrameForMouseWindowPresence(joinedState) ?? false;
        const shouldReuqestFrameForMouseMovement = shouldReuqestFrameForMouseWindowMovement(joinedState) ?? false;
        return shouldRequestFrameForMousePresence || shouldReuqestFrameForMouseMovement;
    }

    const draw = (coreState: PublicCoreState) => {

    }

}


function shouldReuqestFrameForMouseWindowMovement(joinedState: JoinedState): boolean | void {
    const { mouse, glow } = joinedState;
    const mouseGlowDistance = Math.hypot(mouse.x - glow.x, mouse.y - glow.y);
    const tolerance = 0.5;
    if (!closeTo(mouseGlowDistance, 0, tolerance)) {
        return true;
    } else {
        joinedState.glow = mouse;
    }

}
function shouldRequestFrameForMouseWindowPresence(joinedState: JoinedState): boolean | void {
    const strength = joinedState.strength;
    const mouseInScreen = joinedState.isMouseInScreen;
    const tolerance = 0.01;
    if (mouseInScreen) {
        if (!closeTo(strength, 1, tolerance)) {
            return true;
        } else {
            joinedState.strength = 1;
        }
    }
    if (!mouseInScreen) {
        if (!closeTo(strength, 0, tolerance)) {
            return true;

        } else {
            joinedState.strength = 0;
        }
    }
}


// canvas
function getScreenCenter(): position {
    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;
    return { x, y }
}

// dots
function drawCloseDots(state: JoinedState) {
    const context = state.context;
    context.fillStyle = state.accentColor;
    for (const row of state.dots) {
        for (const dot of row) {
            const glowCenterDotXDifference = (state.glow.x - dot.x);
            const glowCenterDotYDifference = (state.glow.y - dot.y);
            const distanceFromGlowCenter = Math.hypot(glowCenterDotXDifference, glowCenterDotYDifference);

            if (distanceFromGlowCenter < GLOW_ANIMATION_CONFIG.glowRadius) {
                context.beginPath();
                const smoothStepValue = smoothStep(distanceFromGlowCenter, 0, GLOW_ANIMATION_CONFIG.glowRadius);
                const dotScale = getDotScale(smoothStepValue, 0.5);
                setDotAlpha(smoothStepValue, state);
                drawDot(context, dot, dotScale);
                context.fill();
            }
        }
    }
}

function setDotAlpha(smoothStep: number, state: JoinedState) {
    const colorStrength = (1 - smoothStep) * state.strength;
    state.context.globalAlpha = colorStrength;
}

function getDotScale(smoothStep: number, maxScaleIncrease: number = 1): number {
    return 1 + (1 - smoothStep) * maxScaleIncrease;

}

function interpolateGlowPosition(state: JoinedState, stepScale: number) {
    const newXGlowPosition = interpolation(state.glow.x, state.mouse.x, GLOW_ANIMATION_CONFIG.easing, stepScale);
    const newYGlowPosition = interpolation(state.glow.y, state.mouse.y, GLOW_ANIMATION_CONFIG.easing, stepScale);
    // when we interpolate 10%, we're asking to return 90% of the value
    // that represents a step, if we wanna move 2 steps, we return 90% of the 90%, or 90%^2
    // so the power of (1 - t) represents the step, we can use this to speed or slow the animation based on the framrate 
    // to make it consistent on all screens
    state.glow = { x: newXGlowPosition, y: newYGlowPosition };
}

function updateStrengthBasedOnMousePosition(state: JoinedState, stepScale: number) {
    if (state.isMouseInScreen) {
        state.strength = interpolation(state.strength, 1, GLOW_ANIMATION_CONFIG.easing, stepScale);
    } else {
        state.strength = interpolation(state.strength, 0, GLOW_ANIMATION_CONFIG.easing, stepScale)
    }
}



//colors
function getAccentColor() {
    const root = document.documentElement;
    return window.getComputedStyle(root).getPropertyValue("--color-accent");
}

//listeners 
function setupListeners(state: MainPageDesktopState): AbortController {
    const controller = new AbortController();
    const { signal } = controller;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    window.addEventListener("mousemove", (e) => updateMousePositionState(e, state), { signal })
    document.addEventListener("mouseenter", (e) => updateMousePositionState(e, state), { signal });
    document.addEventListener("mouseleave", () => state.isMouseInScreen = false, { signal });
    motionQuery.addEventListener('change', (e) => e.matches, { signal });
    return controller;
}

function updateMousePositionState(mouse: MouseEvent, dotGridState: MainPageDesktopState) {
    dotGridState.mouse = { x: mouse.x, y: mouse.y }
    dotGridState.isMouseInScreen = true;
}

function joinStates(coreState: PublicCoreState, mainState: MainPageDesktopState): JoinedState {
    return { ...coreState, ...mainState };
}