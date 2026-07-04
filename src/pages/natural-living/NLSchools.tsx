import NLLayout from "@/features/natural-living/NLLayout";
import { PageHeader, Section, Eyebrow, CTA } from "@/features/natural-living/ui";
import { School, Sprout, BookOpen, TreeDeciduous, Gamepad2, Trophy } from "lucide-react";

const PROGRAMS = [
  { icon: TreeDeciduous, title: "Plant-a-Tree Day", copy: "A full day in a JAGAA village · 1 sapling per student · geo-tagged · followed up over the year." },
  { icon: School, title: "3-day Village Immersion", copy: "Grades 6-10 · stay in village homes · farm chores · cooking · storytelling · reflection journals." },
  { icon: BookOpen, title: "Curriculum-linked visits", copy: "Aligned to CBSE, ICSE and IB units on ecology, food systems, community and sustainability." },
  { icon: Sprout, title: "School Garden Kits", copy: "Set up an organic garden on your school campus — with seeds, tools, curriculum and remote expert support." },
  { icon: Gamepad2, title: "Nature Games & Quizzes", copy: "Digital and physical games teaching kids about plants, seasons, water, and Indian food systems." },
  { icon: Trophy, title: "Rewards & Portfolios", copy: "Every child earns a digital portfolio of trees planted, meals cooked, and skills learned." },
];

export default function NLSchools() {
  return (
    <NLLayout>
      <PageHeader
        eyebrow="For Schools"
        title="Children remember what they plant, cook and carry."
        lede="JAGAA runs day trips, immersive programs and on-campus garden projects for schools across India — designed with teachers, tested with kids, and reported to parents."
      />

      <Section>
        <div className="grid md:grid-cols-3 gap-10">
          {PROGRAMS.map((p) => (
            <div key={p.title} className="border-t border-[hsl(var(--nl-forest)/0.25)] pt-6">
              <p.icon className="h-6 w-6 mb-4" style={{ color: "hsl(var(--nl-forest))" }} />
              <h3 className="nl-serif text-2xl mb-3">{p.title}</h3>
              <p className="text-[hsl(var(--nl-ink)/0.75)] leading-relaxed text-sm">{p.copy}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="sage">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { n: "2,400+", label: "Students hosted" },
            { n: "42", label: "Schools partnered" },
            { n: "18,000", label: "Trees planted by kids" },
          ].map((s) => (
            <div key={s.label} className="border-t border-[hsl(var(--nl-forest)/0.3)] pt-5">
              <div className="nl-serif text-5xl" style={{ color: "hsl(var(--nl-forest))" }}>{s.n}</div>
              <div className="mt-3 text-sm text-[hsl(var(--nl-ink)/0.75)]">{s.label}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <CTA
          title="Bring your school on the land."
          copy="Our school programs team will design a program that fits your calendar, ages and curriculum."
          primary={{ label: "Talk to us", to: "/natural-living/contact" }}
          secondary={{ label: "See success stories", to: "/natural-living/success-stories" }}
        />
      </Section>
    </NLLayout>
  );
}
