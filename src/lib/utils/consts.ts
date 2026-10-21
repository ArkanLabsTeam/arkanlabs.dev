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


export const links: LinkEntry[] = [
    { href: "/values", label: "Values", mode: "Navbar" },
    { href: "/rihla-legal", label: "Rihla Legal", mode: "Legal" },
    {href: "/#aboutus", label:"About Us", mode: "Section"}
] as const;


export const legalLinks: LinkEntry[] = links.filter((l) => l.mode == "Legal");
export const navbarLinks: LinkEntry[] = links.filter((l) => l.mode == "Navbar");
export const labLinks: LinkEntry[] = links.filter((l) => ["Section", "Labs", "Navbar"].includes(l.mode))
