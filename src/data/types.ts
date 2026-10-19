export type HomeTextSection = {
    title: string,
    eyebrowTitle: string,
    segments: string[],
}

export type HomeTimelineSection = HomeTextSection
    & {
        timeline: {
            progressIndex: number,
            milestones: string[]
        }
    };