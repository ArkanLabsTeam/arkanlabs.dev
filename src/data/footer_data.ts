import { labLinks, legalLinks, links, navbarLinks } from "../lib/utils/consts";
import { homeTimelineSections } from "./home_timeline_sections";

export const footerData = [
    {
        title: "Labs",
        items: labLinks.map((l) => ({
            name: l.label,
            link: l.href
        })),
    },
    {
        title: "Projects",
        items:
            homeTimelineSections.map(
                (p) => ({
                    name: p.displayName,
                    link: `/#${p.id}`
                })
            ),
    },
    {
        title: "Legal",
        items:
            legalLinks.map((l) => ({
                name: l.label,
                link: l.href
            })),
    },
] as const;