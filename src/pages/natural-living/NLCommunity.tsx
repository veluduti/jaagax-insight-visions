import NLLayout from "@/features/natural-living/NLLayout";
import { PageHeader, Section, Eyebrow, EditorialCard, CTA } from "@/features/natural-living/ui";
import produce from "@/assets/nl-produce.jpg";
import hero from "@/assets/nl-hero.jpg";
import stay from "@/assets/nl-stay.jpg";
import hands from "@/assets/nl-hands.jpg";

export default function NLCommunity() {
  return (
    <NLLayout>
      <PageHeader
        eyebrow="Community"
        title="A village square, in your pocket."
        lede="Recipes, harvest stories, farmer dispatches, gardening questions, wellness rituals — the JAGAA community is where thousands of families, farmers and travellers meet between visits."
      />

      <Section>
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          {[
            { label: "Active members", n: "14,200" },
            { label: "Recipes shared", n: "980" },
            { label: "Harvest posts", n: "3,400" },
            { label: "Villages posting", n: "148" },
          ].map((s) => (
            <div key={s.label} className="border-t border-[hsl(var(--nl-forest)/0.3)] pt-5">
              <div className="nl-serif text-4xl" style={{ color: "hsl(var(--nl-forest))" }}>{s.n}</div>
              <div className="mt-2 text-sm text-[hsl(var(--nl-ink)/0.75)]">{s.label}</div>
            </div>
          ))}
        </div>

        <Eyebrow>What people are sharing</Eyebrow>
        <div className="grid md:grid-cols-3 gap-10 mt-6">
          <EditorialCard image={produce} eyebrow="Recipe" title="Grandma's ragi porridge, three ways." excerpt="From a kitchen in rural Karnataka." to="/natural-living/community" />
          <EditorialCard image={hands} eyebrow="Farmer update" title="This week we harvested 800 kg of red rice." excerpt="Rajanna, Nagamangala village." to="/natural-living/community" />
          <EditorialCard image={stay} eyebrow="Guest story" title="What a JAGAA farm stay does to your sleep." excerpt="A city couple's weekend log." to="/natural-living/community" />
          <EditorialCard image={hero} eyebrow="Question" title="Why is my tulsi wilting after monsoon?" excerpt="Answered by 4 organic experts." to="/natural-living/community" />
          <EditorialCard image={produce} eyebrow="Group · Healthy Living" title="Meal plans for the JAGAA subscription box." excerpt="This week: 34 replies." to="/natural-living/community" />
          <EditorialCard image={hands} eyebrow="Village story" title="Our children painted the school in indigo." excerpt="Wayanad village diary." to="/natural-living/community" />
        </div>
      </Section>

      <Section tone="sage">
        <CTA
          title="Join the JAGAA community."
          copy="Free forever for members, farmers and land owners. Sign up and post your first recipe, question or story."
          primary={{ label: "Create an account", to: "/auth" }}
          secondary={{ label: "Explore villages", to: "/natural-living/villages" }}
        />
      </Section>
    </NLLayout>
  );
}
