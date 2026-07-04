import NLLayout from "@/features/natural-living/NLLayout";
import { PageHeader, Section, Eyebrow, EditorialCard, CTA } from "@/features/natural-living/ui";
import produce from "@/assets/nl-produce.jpg";
import hero from "@/assets/nl-hero.jpg";
import stay from "@/assets/nl-stay.jpg";
import hands from "@/assets/nl-hands.jpg";

const STORIES = [
  {
    image: produce,
    eyebrow: "Harvest · Karnataka",
    title: "The red rice that took three generations to save.",
    excerpt: "A farmer, a lost seed, and a village that decided to grow it again — despite the market.",
  },
  {
    image: hero,
    eyebrow: "Land · Coorg",
    title: "Lakshmi's twelve acres.",
    excerpt: "How one land owner turned a debt-ridden estate into a farmer-run organic collective.",
  },
  {
    image: stay,
    eyebrow: "Farm Stay · Chikmagalur",
    title: "Two nights, one long dinner, no signal.",
    excerpt: "A city family finds silence, terracotta and a rhythm they had forgotten they wanted.",
  },
  {
    image: hands,
    eyebrow: "People · Wayanad",
    title: "The Ayurveda cook who came home.",
    excerpt: "After a decade in a Dubai kitchen, Rema returned to serve seasonal meals in her mother's village.",
  },
  {
    image: produce,
    eyebrow: "Recipe · Tamil Nadu",
    title: "A millet dosa that predates the wheel.",
    excerpt: "Six ingredients. One iron pan. A recipe carried on grandmothers' fingertips.",
  },
  {
    image: hero,
    eyebrow: "Season · Kerala",
    title: "What the first monsoon smells like.",
    excerpt: "A dispatch from the coffee slopes, the paddy shoots, and the villages that live by rain.",
  },
];

export default function NLStorytelling() {
  return (
    <NLLayout>
      <PageHeader
        eyebrow="Field Notes"
        title="Stories from the land."
        lede="Long-form dispatches from JAGAA villages — the farmers, the food, the seasons, and the quiet moments in between. Written on the ground, not in a studio."
      />

      <Section>
        <div className="grid md:grid-cols-3 gap-x-10 gap-y-16">
          {STORIES.map((s) => (
            <EditorialCard key={s.title} {...s} to="/natural-living/stories" />
          ))}
        </div>
      </Section>

      <Section tone="sage">
        <CTA
          title="Have a story to tell?"
          copy="If you are a farmer, a cook, a guide or a guest with a story from a JAGAA village — we'd love to hear it, and publish it, in your voice."
          primary={{ label: "Submit a story", to: "/natural-living/contact" }}
        />
      </Section>
    </NLLayout>
  );
}
