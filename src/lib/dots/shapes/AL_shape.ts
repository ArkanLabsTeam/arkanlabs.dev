import { Brightness, type Shape } from "./shape_utils";

export const alShape: Shape = {
    sizeRequiredInDots: {
        width: 26,
        height: 17
    }, // max coords + 1 since the index is form 0
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
        },
        {
            dot1: {
                x: 5,
                y: 0,
            },

            dot2: {
                x: 2,
                y: 3,
            },
            brightness: Brightness.bright
        },
        {
            dot1: {
                x: 9,
                y: 0,
            },

            dot2: {
                x: 12,
                y: 3,
            },
            brightness: Brightness.bright
        },
        {
            dot1: {
                x: 12,
                y: 3,
            },

            dot2: {
                x: 12,
                y: 14,
            },
            brightness: Brightness.bright
        },
        {
            dot1: {
                x: 2,
                y: 3,
            },

            dot2: {
                x: 2,
                y: 14,
            },
            brightness: Brightness.bright
        },
        {
            dot1: {
                x: 2,
                y: 14,
            },

            dot2: {
                x: 5,
                y: 14,
            },
            brightness: Brightness.bright
        },
        {
            dot1: {
                x: 12,
                y: 14,
            },

            dot2: {
                x: 9,
                y: 14,
            },
            brightness: Brightness.bright
        },
        {
            dot1: {
                x: 9,
                y: 14,
            },

            dot2: {
                x: 9,
                y: 11,
            },
            brightness: Brightness.bright
        },
        {
            dot1: {
                x: 5,
                y: 14,
            },

            dot2: {
                x: 5,
                y: 11,
            },
            brightness: Brightness.bright
        },
        {
            dot1: {
                x: 5,
                y: 11,
            },

            dot2: {
                x: 9,
                y: 11,
            },
            brightness: Brightness.bright
        },
        {
            dot1: {
                x: 5,
                y: 3,
            },

            dot2: {
                x: 9,
                y: 3,
            },
            brightness: Brightness.bright
        },
        {
            dot1: {
                x: 9,
                y: 3,
            },

            dot2: {
                x: 9,
                y: 6,
            },
            brightness: Brightness.bright
        },
        {
            dot1: {
                x: 5,
                y: 3,
            },

            dot2: {
                x: 5,
                y: 6,
            },
            brightness: Brightness.bright
        },
        {
            dot1: {
                x: 5,
                y: 6,
            },

            dot2: {
                x: 9,
                y: 6,
            },
            brightness: Brightness.bright
        },
        {
            dot1: {
                x: 2,
                y: 3,
            },

            dot2: {
                x: 0,
                y: 5,
            },
            brightness: Brightness.dim
        },
        {
            dot1: {
                x: 0,
                y: 5,
            },

            dot2: {
                x: 0,
                y: 16,
            },
            brightness: Brightness.dim
        },
        {
            dot1: {
                x: 0,
                y: 16,
            },

            dot2: {
                x: 2,
                y: 14,
            },
            brightness: Brightness.dim
        },
        {
            dot1: {
                x: 0,
                y: 16,
            },

            dot2: {
                x: 3,
                y: 16,
            },
            brightness: Brightness.dim
        },
        {
            dot1: {
                x: 0,
                y: 16,
            },

            dot2: {
                x: 5,
                y: 14,
            },
            brightness: Brightness.dim
        },
        {
            dot1: {
                x: 5,
                y: 13,
            },

            dot2: {
                x: 7,
                y: 13,
            },
            brightness: Brightness.dim
        },
        {
            dot1: {
                x: 7,
                y: 13,
            },

            dot2: {
                x: 9,
                y: 11,
            },
            brightness: Brightness.dim
        },
        {
            dot1: {
                x: 7,
                y: 13,
            },

            dot2: {
                x: 7,
                y: 16,
            },
            brightness: Brightness.dim
        },
        {
            dot1: {
                x: 7,
                y: 16,
            },

            dot2: {
                x: 9,
                y: 14,
            },
            brightness: Brightness.dim
        },
        {
            dot1: {
                x: 7,
                y: 16,
            },

            dot2: {
                x: 10,
                y: 16,
            },
            brightness: Brightness.dim
        },
        {
            dot1: {
                x: 10,
                y: 16,
            },

            dot2: {
                x: 12,
                y: 14,
            },
            brightness: Brightness.dim
        },
        {
            dot1: {
                x: 5,
                y: 5,
            },

            dot2: {
                x: 7,
                y: 5,
            },
            brightness: Brightness.dim
        },
        {
            dot1: {
                x: 7,
                y: 5,
            },

            dot2: {
                x: 9,
                y: 3,
            },
            brightness: Brightness.dim
        },
        {
            dot1: {
                x: 7,
                y: 5,
            },

            dot2: {
                x: 7,
                y: 6,
            },
            brightness: Brightness.dim
        },
        {
            dot1: {
                x: 16,
                y: 0,
            },

            dot2: {
                x: 19,
                y: 0,
            },
            brightness: Brightness.bright
        },
        {
            dot1: {
                x: 19,
                y: 0,
            },

            dot2: {
                x: 19,
                y: 11,
            },
            brightness: Brightness.bright
        },
        {
            dot1: {
                x: 16,
                y: 0,
            },

            dot2: {
                x: 16,
                y: 14,
            },
            brightness: Brightness.bright
        },
        {
            dot1: {
                x: 19,
                y: 11,
            },

            dot2: {
                x: 25,
                y: 11,
            },
            brightness: Brightness.bright
        },
        {
            dot1: {
                x: 16,
                y: 14,
            },

            dot2: {
                x: 25,
                y: 14,
            },
            brightness: Brightness.bright
        },
        {
            dot1: {
                x: 25,
                y: 14,
            },

            dot2: {
                x: 25,
                y: 11,
            },
            brightness: Brightness.bright
        },
        {
            dot1: {
                x: 16,
                y: 0,
            },

            dot2: {
                x: 14,
                y: 2,
            },
            brightness: Brightness.dim
        },
        {
            dot1: {
                x: 14,
                y: 2,
            },

            dot2: {
                x: 14,
                y: 16,
            },
            brightness: Brightness.dim
        },
        {
            dot1: {
                x: 14,
                y: 16,
            },

            dot2: {
                x: 23,
                y: 16,
            },
            brightness: Brightness.dim
        },
        {
            dot1: {
                x: 14,
                y: 16,
            },

            dot2: {
                x: 16,
                y: 14,
            },
            brightness: Brightness.dim
        },
        {
            dot1: {
                x: 23,
                y: 16,
            },

            dot2: {
                x: 25,
                y: 14,
            },
            brightness: Brightness.dim
        },
    ] // values here are counted from the top most corner

} as const;