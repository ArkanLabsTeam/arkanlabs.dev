export const SITE = {
    title: "Arkan Labs",
    tagline: "blah bleh bluh blah, something, be creative",
    url: "https://arkanlabs.dev",
    supportEmail: "support@arkanlabs.dev"
} as const;

type Mode = "Legal" | "Navbar" | "Labs" | "Section"
type LinkEntry = {
    href: string,
    label: string,
    mode: Mode
}



export const links = {
    rihla: {
        href: "/rihla/legal", label: "Rihla Legal", mode: "Legal"
    },
    values: { href: "/values", label: "Values", mode: "Navbar" },
    aboutUs: {
        href: "/#aboutus", label: "About Us", mode: "Section"
    }
} satisfies Record<string, LinkEntry>;

const linkValues = Object.values(links);

export const legalLinks: LinkEntry[] = linkValues.filter((l) => l.mode == "Legal");
export const navbarLinks: LinkEntry[] = linkValues.filter((l) => l.mode == "Navbar");
export const labLinks: LinkEntry[] = linkValues.filter((l) => ["Section", "Labs", "Navbar"].includes(l.mode))
