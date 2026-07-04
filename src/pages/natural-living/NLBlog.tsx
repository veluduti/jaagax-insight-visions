import NLLayout from "@/features/natural-living/NLLayout";
import { PageHeader, Section, Eyebrow, EditorialCard, CTA } from "@/features/natural-living/ui";
import produce from "@/assets/nl-produce.jpg";
import stay from "@/assets/nl-stay.jpg";
import hero from "@/assets/nl-hero.jpg";
import hands from "@/assets/nl-hands.jpg";

const POSTS = [
  { image: hero, eyebrow: "Season · Monsoon", title: "Why the first rain matters more than the last." },
  { image: produce, eyebrow: "Food · Millets", title: "A short history of the grains we forgot." },
  { image: stay, eyebrow: "Travel · Coorg", title: "What a proper Coorg breakfast actually looks like." },
  { image: hands, eyebrow: "Farming · Compost", title: "The three-week compost every home garden needs." },
  { image: produce, eyebrow: "Wellness · Ayurveda", title: "Eating with the seasons: a beginner's calendar." },
  { image: hero, eyebrow: "Village · Wayanad", title: "A morning walk that takes six hours (and is worth it)." },
];

export default function NLBlog() {
  return (
    <NLLayout>
      <PageHeader
        eyebrow="The Journal"
        title="Long reads from the land."
        lede="Ideas, essays and how-to guides on organic farming, seasonal eating, village travel and slow living — written by our team, farmers, and guest contributors."
      />

      <Section>
        <div className="grid md:grid-cols-3 gap-x-10 gap-y-16">
          {POSTS.map((p) => (
            <EditorialCard
              key={p.title}
              image={p.image}
              eyebrow={p.eyebrow}
              title={p.title}
              excerpt="A field-tested essay from the JAGAA editorial team."
              to="/natural-living/blog"
            />
          ))}
        </div>
      </Section>

      <Section tone="sage">
        <CTA
          title="One long read, every Sunday morning."
          copy="Join the JAGAA Journal newsletter — no ads, no sponsors, no growth hacks. Just one considered essay a week."
          primary={{ label: "Subscribe to the Journal", to: "/natural-living/contact" }}
        />
      </Section>
    </NLLayout>
  );
}
