import jsPDF from "jspdf";

const GOLD = [201, 168, 76] as const;
const DARK = [14, 20, 42] as const;
const WHITE = [255, 255, 255] as const;
const GRAY = [160, 170, 190] as const;

const formatPrice = (val: number | null) => {
  if (!val) return "";
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString("en-IN")}`;
};

export const generateBrochure = (builder: any) => {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const margin = 20;
  const contentW = W - margin * 2;
  const name = builder.builder_name || "Builder";

  const setDarkBg = () => { pdf.setFillColor(...DARK); pdf.rect(0, 0, W, H, "F"); };
  const goldLine = (y: number) => { pdf.setDrawColor(...GOLD); pdf.setLineWidth(0.5); pdf.line(margin, y, W - margin, y); };
  const pageNum = (n: number) => { pdf.setFontSize(8); pdf.setTextColor(...GRAY); pdf.text(`${n}`, W / 2, H - 10, { align: "center" }); };

  // ─── PAGE 1: COVER ───
  setDarkBg();
  pdf.setFontSize(12); pdf.setTextColor(...GOLD);
  pdf.text("EXCLUSIVE BROCHURE", W / 2, 60, { align: "center" });
  goldLine(68);
  pdf.setFontSize(36); pdf.setTextColor(...WHITE);
  pdf.text(name, W / 2, 100, { align: "center", maxWidth: contentW });
  if (builder.tagline) {
    pdf.setFontSize(14); pdf.setTextColor(...GRAY);
    pdf.text(builder.tagline, W / 2, 120, { align: "center", maxWidth: contentW });
  }
  if (builder.project_location) {
    pdf.setFontSize(11); pdf.setTextColor(...GOLD);
    pdf.text(builder.project_location, W / 2, 145, { align: "center", maxWidth: contentW });
  }
  goldLine(230);
  pdf.setFontSize(9); pdf.setTextColor(...GRAY);
  pdf.text("www.jaagax.com", W / 2, 240, { align: "center" });
  pageNum(1);

  // ─── PAGE 2: ABOUT ───
  pdf.addPage(); setDarkBg();
  pdf.setFontSize(24); pdf.setTextColor(...GOLD);
  pdf.text(`About ${name}`, margin, 35);
  goldLine(40);
  if (builder.description) {
    pdf.setFontSize(11); pdf.setTextColor(...WHITE);
    pdf.text(pdf.splitTextToSize(builder.description, contentW), margin, 55);
  }
  if (builder.about_mission) {
    pdf.setFontSize(13); pdf.setTextColor(...GOLD); pdf.text("Our Mission", margin, 120);
    pdf.setFontSize(10); pdf.setTextColor(...GRAY);
    pdf.text(pdf.splitTextToSize(builder.about_mission, contentW), margin, 130);
  }
  if (builder.about_vision) {
    pdf.setFontSize(13); pdf.setTextColor(...GOLD); pdf.text("Our Vision", margin, 165);
    pdf.setFontSize(10); pdf.setTextColor(...GRAY);
    pdf.text(pdf.splitTextToSize(builder.about_vision, contentW), margin, 175);
  }
  pageNum(2);

  // ─── PAGE 3: KEY HIGHLIGHTS ───
  pdf.addPage(); setDarkBg();
  pdf.setFontSize(24); pdf.setTextColor(...GOLD); pdf.text("Key Highlights", margin, 35); goldLine(40);
  const highlights = [
    { label: "Configuration", value: builder.bhk_types_offered },
    { label: "Size Range", value: builder.size_range },
    { label: "Land Area", value: builder.land_area },
    { label: "Total Units", value: builder.total_units_count?.toString() },
    { label: "Towers", value: builder.towers_count?.toString() },
    { label: "Floors", value: builder.total_floors_count },
    { label: "RERA No.", value: builder.rera_number },
    { label: "Experience", value: builder.years_of_experience ? `${builder.years_of_experience}+ Years` : null },
  ].filter(h => h.value);
  let hy = 55;
  highlights.forEach((h) => {
    pdf.setFillColor(20, 28, 50); pdf.roundedRect(margin, hy, contentW, 18, 3, 3, "F");
    pdf.setFontSize(10); pdf.setTextColor(...GRAY); pdf.text(h.label, margin + 8, hy + 11);
    pdf.setTextColor(...GOLD); pdf.text(h.value!, W - margin - 8, hy + 11, { align: "right" });
    hy += 22;
  });
  pageNum(3);

  // ─── PAGE 4: PROJECT PORTFOLIO ───
  pdf.addPage(); setDarkBg();
  pdf.setFontSize(24); pdf.setTextColor(...GOLD); pdf.text("Project Portfolio", margin, 35); goldLine(40);
  const portfolio = [
    { label: "Total Projects", value: builder.number_of_projects },
    { label: "Completed", value: builder.completed_projects_count },
    { label: "Ongoing", value: builder.ongoing_projects_count },
    { label: "Upcoming", value: builder.upcoming_projects_count },
    { label: "Units Delivered", value: builder.total_units_delivered },
  ].filter(p => p.value);
  let py = 55;
  const colW = contentW / 2;
  portfolio.forEach((p, i) => {
    const x = margin + (i % 2) * colW;
    const y = py + Math.floor(i / 2) * 40;
    pdf.setFillColor(20, 28, 50); pdf.roundedRect(x, y, colW - 5, 32, 3, 3, "F");
    pdf.setFontSize(22); pdf.setTextColor(...GOLD); pdf.text(String(p.value), x + 10, y + 16);
    pdf.setFontSize(9); pdf.setTextColor(...GRAY); pdf.text(p.label, x + 10, y + 25);
  });
  // Price Range
  if (builder.price_range_min || builder.price_range_max) {
    const priceY = py + Math.ceil(portfolio.length / 2) * 40 + 10;
    pdf.setFontSize(14); pdf.setTextColor(...GOLD); pdf.text("Price Range", margin, priceY);
    pdf.setFontSize(18); pdf.setTextColor(...WHITE);
    const priceText = `${formatPrice(builder.price_range_min)} - ${formatPrice(builder.price_range_max)}`;
    pdf.text(priceText, margin, priceY + 15);
  }
  pageNum(4);

  // ─── PAGE 5: AMENITIES ───
  pdf.addPage(); setDarkBg();
  pdf.setFontSize(24); pdf.setTextColor(...GOLD); pdf.text("World-Class Amenities", margin, 35); goldLine(40);
  const amenities = builder.amenities || [];
  let ay = 55;
  const amenCols = 3;
  const amenW = contentW / amenCols;
  amenities.forEach((a: string, i: number) => {
    const x = margin + (i % amenCols) * amenW;
    const y = ay + Math.floor(i / amenCols) * 25;
    pdf.setFillColor(20, 28, 50); pdf.roundedRect(x, y, amenW - 4, 20, 3, 3, "F");
    pdf.setFontSize(10); pdf.setTextColor(...WHITE);
    pdf.text(`• ${a}`, x + 6, y + 12);
  });
  pageNum(5);

  // ─── PAGE 6: FLOOR PLANS OVERVIEW ───
  pdf.addPage(); setDarkBg();
  pdf.setFontSize(24); pdf.setTextColor(...GOLD); pdf.text("Floor Plans", margin, 35); goldLine(40);
  const fpData = builder.floor_plans_data || {};
  let fy = 55;
  for (const [cat, plans] of Object.entries(fpData)) {
    if (!Array.isArray(plans) || plans.length === 0) continue;
    pdf.setFontSize(16); pdf.setTextColor(...GOLD); pdf.text(cat, margin, fy); fy += 8;
    (plans as any[]).forEach((fp) => {
      if (fy > 260) { pdf.addPage(); setDarkBg(); fy = 30; }
      pdf.setFillColor(20, 28, 50); pdf.roundedRect(margin, fy, contentW, 22, 3, 3, "F");
      pdf.setFontSize(10); pdf.setTextColor(...WHITE); pdf.text(fp.name || cat, margin + 6, fy + 9);
      pdf.setTextColor(...GRAY); pdf.text(`${fp.size || ""} | ${fp.facing || ""} | ${fp.beds || ""}B/${fp.baths || ""}Ba`, margin + 6, fy + 17);
      if (fp.priceRange) { pdf.setTextColor(...GOLD); pdf.text(fp.priceRange, W - margin - 6, fy + 13, { align: "right" }); }
      fy += 26;
    });
    fy += 5;
  }
  pageNum(6);

  // ─── PAGE 7: LOCATION ───
  pdf.addPage(); setDarkBg();
  pdf.setFontSize(24); pdf.setTextColor(...GOLD); pdf.text("Location", margin, 35); goldLine(40);
  if (builder.project_location) {
    pdf.setFontSize(12); pdf.setTextColor(...WHITE); pdf.text(builder.project_location, margin, 55);
  }
  if (builder.latitude && builder.longitude) {
    pdf.setFontSize(10); pdf.setTextColor(...GRAY);
    pdf.text(`GPS: ${builder.latitude}, ${builder.longitude}`, margin, 70);
  }
  if (builder.google_maps_link) {
    pdf.setFontSize(10); pdf.setTextColor(...GOLD);
    pdf.text("Google Maps: " + builder.google_maps_link, margin, 85, { maxWidth: contentW });
  }
  // Nearby features placeholder
  pdf.setFontSize(14); pdf.setTextColor(...GOLD); pdf.text("Why This Location?", margin, 110);
  const locationFeatures = [
    "Close to IT hubs and business parks",
    "Well-connected to metro and highways",
    "Surrounded by top schools and hospitals",
    "Growing real estate appreciation zone",
    "Peaceful neighborhood with green spaces",
  ];
  locationFeatures.forEach((f, i) => {
    pdf.setFontSize(10); pdf.setTextColor(...WHITE);
    pdf.text(`✓  ${f}`, margin + 5, 125 + i * 14);
  });
  pageNum(7);

  // ─── PAGE 8: TRUST & VERIFICATION ───
  pdf.addPage(); setDarkBg();
  pdf.setFontSize(24); pdf.setTextColor(...GOLD); pdf.text("Trust & Verification", margin, 35); goldLine(40);
  let ty = 55;
  if (builder.rera_number) {
    pdf.setFillColor(20, 50, 35); pdf.roundedRect(margin, ty, contentW, 20, 3, 3, "F");
    pdf.setFontSize(11); pdf.setTextColor(100, 220, 120); pdf.text(`✓ RERA Verified: ${builder.rera_number}`, margin + 8, ty + 13);
    ty += 28;
  }
  if (builder.certifications) {
    pdf.setFontSize(11); pdf.setTextColor(...WHITE); pdf.text(`Certifications: ${builder.certifications}`, margin, ty + 5);
    ty += 18;
  }
  if (builder.awards?.length > 0) {
    pdf.setFontSize(14); pdf.setTextColor(...GOLD); pdf.text("Awards & Recognition", margin, ty + 10); ty += 20;
    builder.awards.forEach((a: string) => {
      pdf.setFontSize(10); pdf.setTextColor(...WHITE); pdf.text(`🏆  ${a}`, margin + 5, ty + 5); ty += 12;
    });
  }
  pageNum(8);

  // ─── PAGE 9: TIMELINE / LEGACY ───
  pdf.addPage(); setDarkBg();
  pdf.setFontSize(24); pdf.setTextColor(...GOLD); pdf.text("Our Legacy", margin, 35); goldLine(40);
  const timeline = builder.timeline_data || [];
  if (timeline.length > 0) {
    let tly = 55;
    timeline.forEach((t: any) => {
      if (tly > 260) { pdf.addPage(); setDarkBg(); tly = 30; }
      pdf.setFillColor(20, 28, 50); pdf.roundedRect(margin, tly, contentW, 22, 3, 3, "F");
      pdf.setFontSize(12); pdf.setTextColor(...GOLD); pdf.text(t.year, margin + 6, tly + 10);
      pdf.setFontSize(10); pdf.setTextColor(...WHITE); pdf.text(t.title, margin + 30, tly + 10);
      if (t.desc) { pdf.setTextColor(...GRAY); pdf.text(t.desc, margin + 30, tly + 18, { maxWidth: contentW - 36 }); }
      tly += 28;
    });
  } else {
    pdf.setFontSize(12); pdf.setTextColor(...GRAY); pdf.text("Legacy details coming soon.", margin, 55);
  }
  pageNum(9);

  // ─── PAGE 10: CONTACT ───
  pdf.addPage(); setDarkBg();
  pdf.setFontSize(24); pdf.setTextColor(...GOLD); pdf.text("Get In Touch", margin, 35); goldLine(40);
  pdf.setFontSize(14); pdf.setTextColor(...WHITE);
  pdf.text(`Ready to make ${name} your home?`, margin, 60);
  pdf.setFontSize(11); pdf.setTextColor(...GRAY);
  pdf.text("Contact us today for exclusive offers and site visits.", margin, 75);

  let cy = 100;
  const contactItems = [
    { label: "Phone", value: builder.phone },
    { label: "WhatsApp", value: builder.whatsapp },
    { label: "Email", value: builder.email },
    { label: "Website", value: builder.website },
    { label: "Location", value: builder.project_location },
  ].filter(c => c.value);
  contactItems.forEach((c) => {
    pdf.setFillColor(20, 28, 50); pdf.roundedRect(margin, cy, contentW, 18, 3, 3, "F");
    pdf.setFontSize(10); pdf.setTextColor(...GOLD); pdf.text(c.label, margin + 8, cy + 11);
    pdf.setTextColor(...WHITE); pdf.text(c.value!, margin + 50, cy + 11, { maxWidth: contentW - 58 });
    cy += 22;
  });

  goldLine(250);
  pdf.setFontSize(10); pdf.setTextColor(...GOLD);
  pdf.text(name, W / 2, 260, { align: "center" });
  pdf.setFontSize(8); pdf.setTextColor(...GRAY);
  pdf.text("Powered by JaagaX • www.jaagax.com", W / 2, 270, { align: "center" });
  pageNum(10);

  // Save
  pdf.save(`${name.replace(/\s+/g, "_")}_Brochure.pdf`);
};
