import { defineCollection } from "astro/content/config";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const rihlaLegal = defineCollection(
    {
        loader: glob({ pattern: "**/*.md", base: "./src/content/rihla/legal" }),
        schema: z.object(
            {
                title: z.string(),
                description: z.string(),
                lastUpdated: z.coerce.date(),
                effectiveDate: z.coerce.date()
            }
        )
    }
);

export const collections = { rihlaLegal };