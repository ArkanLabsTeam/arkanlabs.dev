import { Brightness } from "./shape_utils";

export const alShape = {
    sizeRequiredInDots: [26, 17], // x,y
    segments: [
        {
            dot1: {
                x: 5,
                y: 0, // 0 means top, just like css
            },

            dot2: {
                x: 9,
                y: 0,
            },
            brightness: Brightness.bright

        }
    ] // values here are counted from the top most corner

} as const;