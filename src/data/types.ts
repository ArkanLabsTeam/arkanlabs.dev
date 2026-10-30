export type TextSection = {
    id: string
    title: string,
    eyebrowTitle: string,
    segments: string[],
    displayName: string,
}

export type HomeTimelineSection = TextSection
    & {
        timeline: {
            progressIndex: number,
            milestones: string[]
        }
    };