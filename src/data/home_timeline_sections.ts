import type { HomeTimelineSection } from "./types";

export let homeProjectSection: HomeTimelineSection[] = [
    {
        title: "Comfortable and Affordable Rides",
        eyebrowTitle: "02 / RIHLA",
        segments: [
            `Rihla (Arabic for "journey")
            is a ride-sharing service designed for university students,
            allowing them to get to their universities quickly and 
            affordably.`,

            `Rihla uses a scheduling feature where you book at least
            a day ahead. And in return it gives us time to find 
            the most suitable and affordable rides for you and for all students.
            `,
            `Rihla has built-in filters that prevent you from being alone with a driver of the opposite gender, 
            or sitting next to a person of the opposite gender. 
            These filters can't be disabled, as Rihla was built on values we truly care about. 
            Rihla also protects your anonymity by hiding your contact information and name from the other riders. 
            We disclose your name to the driver and temporarily disclose your phone number on their arrival to your pickup location.`
        ],
        timeline: {
            progressIndex: 1,
            milestones: [
                "Closed Alpha Testing",
                "Open Beta at Al-Huson University",
                "Full Release at All Irbid Universities",
                "Group Rides",
                "iOS Release",
            ]
        }
    }
] as const;
