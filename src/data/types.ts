export type HomeTextSection = {
    id: string
    title: string,
    eyebrowTitle: string,
    segments: string[],
    displayName: string,
}

export type HomeTimelineSection = HomeTextSection
    & {
        timeline: {
            progressIndex: number,
            milestones: string[]
        }
    };