import type { TextSection } from "./types";

export const valuesTextSections: TextSection[] = [
    {
        id: "IslamValue",
        title: "Our Beliefs",
        eyebrowTitle:"01 / ISLAM",
        segments: [
            `We are a Muslim team. We make sure our products are Sharia compliant to provide a safe and comfortable experience experience for every user. In Rihla, for example,
            we ensure a rider's safety by guaranteeing they don't end up alone with a driver of the opposite gender, or be seated next to a person of the opposite gender.
            For our games in the future, our games will be free of inappropriate content like nudity or exploitative features like gambling (e.g., loot boxes bought with real money).
            `
        ]
    },
    {
        id: "craftValue",
        title: "Craft Over Speed",
        
        segments: [
            `We enjoy building software, whether it is a ride application or a game.
            To us, it's more of an art than a business model.
            Before releasing a new update or application, we make sure that it's compatible with older or weaker devices,
            we optimize wherever we can, and add our easter eggs that make it feel truly like an Arkan Labs product.
             `,
             
        ],
        eyebrowTitle: "02 / CARE"
    },
    {
        id: "AIValue",
        title: "AI Usage",
        eyebrowTitle:"03 / GEN AI",
        segments: [
            `We build, test and experiment with new features in our products ourselves. AI has its 
            own use cases and benefits, but it does not belong in our products as an asset creator or storyteller or even as a developer.
            We use it to help us trace bugs 
            in our own code, and it helps us with optimization advice. It's a tool to us, not a producer.
            `
        ]
    },
] as const;