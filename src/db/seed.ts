import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import * as schema from "./schema";

// NOTE: Every name, award, case result, and testimonial below is entirely
// fictional placeholder content generated for demonstration purposes. It
// must be replaced with the firm's real, approved information before this
// site goes live — see the README's "Replacing placeholder content" section.

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client, { schema });

  console.log("Seeding database...");

  // --- Admin users ---------------------------------------------------------
  const superAdminPassword = await bcrypt.hash("ChangeMe123!", 12);
  const editorPassword = await bcrypt.hash("ChangeMe123!", 12);

  const [superAdmin] = await db
    .insert(schema.users)
    .values({
      name: "Amara Osei",
      email: "admin@harcourtvale.example",
      passwordHash: superAdminPassword,
      role: "SUPER_ADMIN",
    })
    .returning();

  const [editor] = await db
    .insert(schema.users)
    .values({
      name: "Daniel Reyes",
      email: "editor@harcourtvale.example",
      passwordHash: editorPassword,
      role: "EDITOR",
    })
    .returning();

  console.log("Created admin users. Login with:");
  console.log("  admin@harcourtvale.example / ChangeMe123!  (Super Admin)");
  console.log("  editor@harcourtvale.example / ChangeMe123!  (Editor)");
  console.log("CHANGE THESE PASSWORDS IMMEDIATELY — see README.");

  // --- Site settings ---------------------------------------------------------
  await db.insert(schema.siteSettings).values({
    id: "singleton",
    firmName: "Harcourt & Vale LLP",
    tagline: "Strategic Legal Counsel. Trusted Representation.",
    description:
      "Harcourt & Vale LLP is a full-service law firm advising businesses and individuals on their most important legal matters, combining deep sector knowledge with a client-first approach.",
    email: "info@harcourtvale.example",
    phone: "+1 (212) 555-0148",
    whatsapp: "+1 (212) 555-0148",
    address: "180 Meridian Avenue, Suite 2400, New York, NY 10005",
    workingHours: "Monday–Friday: 8:30 AM – 6:00 PM\nSaturday: By appointment\nSunday: Closed",
    socialLinkedin: "https://linkedin.com/company/example",
    socialFacebook: "https://facebook.com/example",
    socialInstagram: "https://instagram.com/example",
    socialX: "https://x.com/example",
    heroHeading: "Strategic Legal Counsel. Trusted Representation.",
    heroSubheading:
      "For over two decades, Harcourt & Vale has guided businesses and individuals through their most consequential legal matters with clarity, discretion, and results.",
    heroCtaText: "Book a Consultation",
    heroCtaLink: "/consultation",
    heroSecondaryCtaText: "Explore Our Practice Areas",
    heroSecondaryCtaLink: "/practice-areas",
    statYearsExperience: 22,
    statLawyersCount: 16,
    statPracticeAreasCount: 6,
    statClientsServed: 540,
    siteTitle: "Harcourt & Vale LLP | Strategic Legal Counsel",
    siteDescription:
      "Harcourt & Vale LLP advises businesses and individuals on corporate, litigation, real estate, IP, employment, and tax matters.",
    footerDescription:
      "Harcourt & Vale LLP provides strategic legal counsel across corporate, litigation, and regulatory matters.",
    copyrightText: `© ${new Date().getFullYear()} Harcourt & Vale LLP. All rights reserved.`,
  });

  // --- About content -----------------------------------------------------
  await db.insert(schema.aboutContent).values({
    id: "singleton",
    introHeading: "About Harcourt & Vale",
    introText:
      "Founded on the principle that great legal counsel starts with genuinely understanding a client's business and goals, Harcourt & Vale LLP has grown into a firm trusted by organizations and individuals across a wide range of industries.",
    historyText:
      "Harcourt & Vale was founded in 2003 by two litigators who believed clients deserved both rigorous legal analysis and straightforward, practical advice. What began as a four-person practice has grown into a full-service firm, while keeping the close, senior-led attention that defined it from day one.",
    missionText:
      "To provide clear, strategic legal counsel that helps our clients make confident decisions — not just win arguments.",
    visionText:
      "To be the firm our clients call first, not last, when something important is on the line.",
    approachText:
      "We take the time to understand the commercial and personal context behind every matter, and we communicate in plain language rather than legalese. Every client works directly with senior lawyers, not just support staff.",
    whyClientsText:
      "Clients choose Harcourt & Vale for our combination of big-firm expertise and boutique-firm attention — responsive communication, transparent fees, and lawyers who are genuinely invested in the outcome.",
  });

  await db.insert(schema.coreValues).values([
    { title: "Integrity", description: "We give honest advice, even when it isn't what a client hopes to hear.", displayOrder: 1 },
    { title: "Diligence", description: "We prepare thoroughly for every matter, large or small.", displayOrder: 2 },
    { title: "Clarity", description: "We explain legal issues in plain language, not jargon.", displayOrder: 3 },
    { title: "Discretion", description: "We treat every client matter with strict confidentiality.", displayOrder: 4 },
  ]);

  await db.insert(schema.whyChooseUsItems).values([
    { title: "Experienced Legal Professionals", description: "Our team brings decades of combined experience across every major practice area.", iconName: "gavel", displayOrder: 1 },
    { title: "Client-Centered Approach", description: "You work directly with senior lawyers who take the time to understand your goals.", iconName: "users", displayOrder: 2 },
    { title: "Strategic Legal Advice", description: "We focus on practical outcomes, not just legal theory.", iconName: "target", displayOrder: 3 },
    { title: "Confidentiality & Professionalism", description: "Every matter is handled with the discretion it deserves.", iconName: "shield-check", displayOrder: 4 },
    { title: "Strong Industry Knowledge", description: "Deep sector experience across finance, technology, real estate, and more.", iconName: "building-2", displayOrder: 5 },
  ]);

  // --- Practice Areas ------------------------------------------------------
  const practiceAreaData = [
    {
      name: "Corporate & Commercial Law",
      shortDescription: "Advisory, contracts, and governance support for growing businesses.",
      fullDescription:
        "Our corporate team advises businesses at every stage, from formation through growth, financing, and exit. We combine commercial pragmatism with technical precision on contracts, governance, and regulatory matters.",
      iconName: "briefcase",
      services: ["Corporate advisory", "Contract drafting", "Corporate restructuring", "Mergers & acquisitions", "Corporate governance", "Regulatory compliance"],
    },
    {
      name: "Litigation & Dispute Resolution",
      shortDescription: "Skilled representation in commercial disputes, arbitration, and litigation.",
      fullDescription:
        "We represent clients in complex commercial disputes before courts and arbitral tribunals, and work to resolve conflicts efficiently through negotiation and mediation wherever possible.",
      iconName: "scale",
      services: ["Commercial litigation", "Arbitration & mediation", "Contract disputes", "Shareholder disputes", "Enforcement of judgments"],
    },
    {
      name: "Real Estate Law",
      shortDescription: "Guidance on acquisitions, leasing, development, and property disputes.",
      fullDescription:
        "From acquisitions and financing to leasing and development, our real estate practice supports clients through every stage of a property transaction.",
      iconName: "building",
      services: ["Property acquisitions", "Commercial leasing", "Real estate financing", "Development agreements", "Title due diligence"],
    },
    {
      name: "Intellectual Property",
      shortDescription: "Protecting trademarks, copyrights, and trade secrets.",
      fullDescription:
        "We help clients identify, protect, and enforce their intellectual property, from trademark registration to licensing and enforcement strategy.",
      iconName: "lightbulb",
      services: ["Trademark registration", "Copyright protection", "Licensing agreements", "IP enforcement", "Trade secret strategy"],
    },
    {
      name: "Employment & Labour Law",
      shortDescription: "Advising employers and executives on workplace law.",
      fullDescription:
        "Our employment team advises on the full employment lifecycle — hiring, policies, workplace investigations, and separations — helping clients manage risk while treating employees fairly.",
      iconName: "users",
      services: ["Employment contracts", "Workplace policies", "Executive agreements", "Workplace investigations", "Separation agreements"],
    },
    {
      name: "Tax & Regulatory Law",
      shortDescription: "Navigating tax planning and regulatory compliance.",
      fullDescription:
        "We advise businesses and individuals on tax structuring and regulatory compliance across a range of industries, working closely with accountants and financial advisors.",
      iconName: "landmark",
      services: ["Tax planning", "Regulatory compliance", "Corporate tax structuring", "Cross-border transactions"],
    },
  ];

  const practiceAreas: (typeof schema.practiceAreas.$inferSelect)[] = [];
  for (const [index, pa] of practiceAreaData.entries()) {
    const [row] = await db
      .insert(schema.practiceAreas)
      .values({
        name: pa.name,
        slug: toSlug(pa.name),
        shortDescription: pa.shortDescription,
        fullDescription: pa.fullDescription,
        iconName: pa.iconName,
        published: true,
        displayOrder: index,
        seoTitle: `${pa.name} | Harcourt & Vale LLP`,
        seoDescription: pa.shortDescription,
      })
      .returning();
    practiceAreas.push(row);

    for (const [sIndex, serviceName] of pa.services.entries()) {
      await db.insert(schema.practiceAreaServices).values({
        practiceAreaId: row.id,
        name: serviceName,
        displayOrder: sIndex,
      });
    }
  }

  // --- Lawyers ---------------------------------------------------------------
  const lawyerData = [
    {
      name: "Elena Marchetti",
      position: "Managing Partner",
      bioShort: "Elena leads the firm's corporate practice and has advised on transactions across three continents.",
      bio: "Elena Marchetti co-founded Harcourt & Vale in 2003 and serves as Managing Partner. She advises boards and executive teams on high-stakes corporate transactions, governance, and strategic disputes.",
      education: "J.D., Columbia Law School\nB.A. Economics, Georgetown University",
      qualifications: "Admitted to the New York State Bar",
      experienceYears: 24,
      memberships: "American Bar Association\nNew York City Bar Association",
      awards: "Named 'Dealmaker of the Year' by a regional legal publication (2022)",
      languages: "English, Italian",
      practiceAreaIndexes: [0, 5],
      featured: true,
    },
    {
      name: "Marcus Whitfield",
      position: "Senior Partner, Litigation",
      bioShort: "Marcus is a trial lawyer known for his work in complex commercial disputes.",
      bio: "Marcus Whitfield leads the litigation and dispute resolution practice. He has represented clients in high-value commercial disputes before state and federal courts, as well as international arbitral tribunals.",
      education: "J.D., New York University School of Law",
      qualifications: "Admitted to the New York and New Jersey State Bars",
      experienceYears: 20,
      memberships: "American College of Trial Lawyers (Fellow)",
      languages: "English",
      practiceAreaIndexes: [1],
      featured: true,
    },
    {
      name: "Priya Nandakumar",
      position: "Partner, Real Estate",
      bioShort: "Priya advises developers and institutional investors on complex real estate transactions.",
      bio: "Priya Nandakumar heads the real estate practice, advising developers, landlords, and institutional investors on acquisitions, financing, and leasing across commercial and residential portfolios.",
      education: "J.D., Fordham University School of Law",
      qualifications: "Admitted to the New York State Bar",
      experienceYears: 15,
      languages: "English, Hindi, Tamil",
      practiceAreaIndexes: [2],
      featured: true,
    },
    {
      name: "James Okoro",
      position: "Partner, Intellectual Property",
      bioShort: "James helps clients protect and monetize their intellectual property portfolios.",
      bio: "James Okoro advises technology and consumer brands on trademark strategy, licensing, and IP enforcement, with a particular focus on early-stage and growth companies.",
      education: "J.D., University of Pennsylvania Carey Law School\nB.S. Computer Science, University of Michigan",
      experienceYears: 12,
      languages: "English",
      practiceAreaIndexes: [3, 0],
      featured: true,
    },
    {
      name: "Sofia Bergqvist",
      position: "Senior Associate, Employment Law",
      bioShort: "Sofia advises employers on workplace policy, compliance, and dispute prevention.",
      bio: "Sofia Bergqvist advises employers across industries on employment contracts, workplace policy, and compliance, helping clients manage risk proactively.",
      education: "J.D., Boston University School of Law",
      experienceYears: 8,
      languages: "English, Swedish",
      practiceAreaIndexes: [4],
      featured: false,
    },
    {
      name: "David Chen",
      position: "Associate, Corporate & Tax",
      bioShort: "David supports corporate transactions and tax structuring for growth-stage companies.",
      bio: "David Chen works closely with founders and finance teams on transaction structuring, corporate governance, and tax planning matters.",
      education: "J.D., University of Chicago Law School",
      experienceYears: 5,
      languages: "English, Mandarin",
      practiceAreaIndexes: [0, 5],
      featured: false,
    },
  ];

  for (const [index, l] of lawyerData.entries()) {
    const [lawyer] = await db
      .insert(schema.lawyers)
      .values({
        name: l.name,
        slug: toSlug(l.name),
        position: l.position,
        bioShort: l.bioShort,
        bio: l.bio,
        education: l.education,
        qualifications: l.qualifications ?? null,
        experienceYears: l.experienceYears,
        memberships: l.memberships ?? null,
        awards: l.awards ?? null,
        languages: l.languages,
        published: true,
        featuredHome: l.featured,
        displayOrder: index,
        seoTitle: `${l.name} | Harcourt & Vale LLP`,
        seoDescription: l.bioShort,
      })
      .returning();

    for (const paIndex of l.practiceAreaIndexes) {
      await db.insert(schema.lawyerPracticeAreas).values({
        lawyerId: lawyer.id,
        practiceAreaId: practiceAreas[paIndex].id,
      });
    }
  }

  // --- Blog categories, tags, posts ------------------------------------------
  const [corporateCategory] = await db
    .insert(schema.blogCategories)
    .values({ name: "Corporate Law", slug: "corporate-law" })
    .returning();
  const [litigationCategory] = await db
    .insert(schema.blogCategories)
    .values({ name: "Litigation", slug: "litigation" })
    .returning();
  const [employmentCategory] = await db
    .insert(schema.blogCategories)
    .values({ name: "Employment Law", slug: "employment-law" })
    .returning();

  const [tagContracts] = await db.insert(schema.blogTags).values({ name: "Contracts", slug: "contracts" }).returning();
  const [tagStartups] = await db.insert(schema.blogTags).values({ name: "Startups", slug: "startups" }).returning();
  const [tagCompliance] = await db.insert(schema.blogTags).values({ name: "Compliance", slug: "compliance" }).returning();

  const posts = [
    {
      title: "Five Contract Clauses Every Founder Should Understand",
      excerpt: "Before you sign your next commercial agreement, make sure you understand these five common clauses and how they can affect your business.",
      content:
        "<p>Commercial contracts often contain clauses that look routine but carry significant consequences. Here are five that founders should read carefully before signing.</p><h2>1. Indemnification</h2><p>This clause determines who bears financial responsibility if something goes wrong. Understanding its scope — and any caps on liability — matters more than most founders realize.</p><h2>2. Termination for Convenience</h2><p>Some contracts allow either party to walk away without cause, given notice. Knowing whether this right exists (and on what timeline) shapes how much you can rely on a given relationship.</p><h2>3. Limitation of Liability</h2><p>This caps how much a party can be forced to pay if things go wrong. It's one of the most heavily negotiated clauses in commercial agreements.</p><h2>4. Assignment</h2><p>This governs whether either party can transfer the contract to someone else — relevant in a merger, acquisition, or reorganization.</p><h2>5. Governing Law and Dispute Resolution</h2><p>This determines which state's laws apply and how disputes will be resolved — litigation, arbitration, or mediation.</p><p>Our corporate team regularly helps founders review agreements before signing. If you'd like a second set of eyes on a contract, we're happy to help.</p>",
      categoryId: corporateCategory.id,
      tags: [tagContracts.id, tagStartups.id],
      author: superAdmin.id,
      daysAgo: 4,
    },
    {
      title: "Understanding Non-Disclosure Agreements: A Practical Guide",
      excerpt: "NDAs are one of the most commonly signed — and least understood — legal documents in business. Here's what to look for.",
      content:
        "<p>Non-disclosure agreements (NDAs) are ubiquitous in business dealings, from early investor conversations to vendor relationships. Yet many people sign them without fully understanding their scope.</p><h2>What an NDA Actually Protects</h2><p>An NDA defines what counts as \"confidential information\" and restricts how the receiving party can use or disclose it. The definition of confidential information is often broader — or narrower — than people expect.</p><h2>Mutual vs. One-Way NDAs</h2><p>A one-way NDA protects only the party disclosing information. A mutual NDA protects both parties — important when both sides will be sharing sensitive information during due diligence.</p><h2>Duration Matters</h2><p>Confidentiality obligations should have a defined end date. Perpetual NDAs can create long-tail liability that's easy to forget about.</p><p>If you're negotiating an NDA and want a second opinion, our corporate team is available for a consultation.</p>",
      categoryId: corporateCategory.id,
      tags: [tagContracts.id],
      author: editor.id,
      daysAgo: 11,
    },
    {
      title: "What to Expect During Commercial Arbitration",
      excerpt: "Arbitration is often faster and more private than litigation — but the process has its own rules. Here's an overview.",
      content:
        "<p>Many commercial contracts now require disputes to be resolved through arbitration rather than the courts. If you find yourself facing arbitration for the first time, here's what the process generally looks like.</p><h2>Selecting an Arbitrator</h2><p>Unlike litigation, the parties typically have a say in who decides their case, whether a sole arbitrator or a panel of three.</p><h2>Discovery Is More Limited</h2><p>Arbitration generally involves narrower discovery than court litigation, which can reduce cost and time — but also means less visibility into the other side's evidence before the hearing.</p><h2>The Award Is (Usually) Final</h2><p>Arbitral awards are difficult to appeal, which brings finality but also raises the stakes of getting your presentation right the first time.</p><p>Our litigation team represents clients in both domestic and international arbitration. Reach out if you'd like to discuss a pending or upcoming dispute.</p>",
      categoryId: litigationCategory.id,
      tags: [],
      author: superAdmin.id,
      daysAgo: 20,
    },
    {
      title: "A Founder's Guide to Employment Contracts",
      excerpt: "Getting your first employment agreements right can save significant cost and risk down the line.",
      content:
        "<p>As companies make their first hires, employment contracts are often adapted hastily from templates found online. Here are a few areas worth getting right from the start.</p><h2>Classification</h2><p>Correctly classifying workers as employees or independent contractors affects tax obligations and legal exposure.</p><h2>At-Will Language</h2><p>Where applicable, contracts should clearly state the employment relationship's at-will nature, along with any exceptions.</p><h2>Restrictive Covenants</h2><p>Non-compete and non-solicitation clauses are increasingly scrutinized by regulators and courts — enforceability varies significantly by jurisdiction.</p><p>Our employment team can help you build a contract template appropriate to your business and location.</p>",
      categoryId: employmentCategory.id,
      tags: [tagCompliance.id, tagStartups.id],
      author: editor.id,
      daysAgo: 35,
    },
  ];

  for (const post of posts) {
    const publishedAt = new Date();
    publishedAt.setDate(publishedAt.getDate() - post.daysAgo);

    const [row] = await db
      .insert(schema.blogPosts)
      .values({
        title: post.title,
        slug: toSlug(post.title),
        excerpt: post.excerpt,
        content: post.content,
        authorId: post.author,
        categoryId: post.categoryId,
        status: "PUBLISHED",
        publishedAt,
        seoTitle: post.title,
        seoDescription: post.excerpt,
      })
      .returning();

    for (const tagId of post.tags) {
      await db.insert(schema.blogPostTags).values({ blogPostId: row.id, tagId });
    }
  }

  // A draft post, to demonstrate the draft/published workflow.
  await db.insert(schema.blogPosts).values({
    title: "Draft: Upcoming Changes to State Corporate Filing Requirements",
    slug: toSlug("Draft Upcoming Changes to State Corporate Filing Requirements"),
    excerpt: "A look at proposed changes to annual filing requirements for corporations.",
    content: "<p>This article is still being drafted.</p>",
    authorId: editor.id,
    categoryId: corporateCategory.id,
    status: "DRAFT",
  });

  // --- FAQs ------------------------------------------------------------------
  await db.insert(schema.faqs).values([
    {
      question: "How much does an initial consultation cost?",
      answer: "Initial consultations are complimentary for most matters. We'll discuss your situation, outline your options, and provide a clear estimate of fees before any engagement begins.",
      category: "General",
      displayOrder: 1,
    },
    {
      question: "How are legal fees structured?",
      answer: "Depending on the matter, we offer hourly billing, flat fees, or retainer arrangements. We always agree on fee structure in writing before starting work.",
      category: "General",
      displayOrder: 2,
    },
    {
      question: "Do you represent clients outside New York?",
      answer: "Yes. While our office is based in New York, we regularly advise clients across the country and internationally, particularly on corporate and commercial matters.",
      category: "General",
      displayOrder: 3,
    },
    {
      question: "How long does a typical commercial litigation matter take?",
      answer: "It varies widely depending on complexity and whether the matter settles, but many commercial disputes resolve within 12–24 months if litigated, or considerably faster through mediation or arbitration.",
      category: "Litigation",
      practiceAreaId: practiceAreas[1].id,
      displayOrder: 1,
    },
    {
      question: "Can you help draft an employment handbook?",
      answer: "Yes, our employment team regularly drafts and reviews employee handbooks to ensure they reflect current law and your company's policies.",
      category: "Employment",
      practiceAreaId: practiceAreas[4].id,
      displayOrder: 1,
    },
  ]);

  // --- Testimonials ------------------------------------------------------------
  await db.insert(schema.testimonials).values([
    {
      clientName: "Founder, Technology Startup",
      isAnonymous: true,
      testimonial:
        "Harcourt & Vale guided us through our Series A with clarity and speed. They explained every term in plain language and never made us feel rushed.",
      companyPosition: "Series A Technology Company",
      published: true,
      featured: true,
      dateGiven: new Date("2025-11-02"),
    },
    {
      clientName: "Regional Property Developer",
      isAnonymous: true,
      testimonial:
        "Priya and her team handled a complex acquisition for us with real precision. We felt genuinely looked after throughout the process.",
      companyPosition: "Commercial Real Estate",
      published: true,
      featured: true,
      dateGiven: new Date("2025-08-14"),
    },
    {
      clientName: "CEO, Consumer Products Company",
      isAnonymous: true,
      testimonial:
        "When we faced a trademark dispute, James moved quickly and kept us informed at every step. The outcome exceeded our expectations.",
      companyPosition: "Consumer Products",
      published: true,
      featured: false,
      dateGiven: new Date("2025-05-30"),
    },
  ]);

  // --- Legal pages -------------------------------------------------------------
  await db.insert(schema.pages).values([
    {
      slug: "disclaimer",
      title: "Legal Disclaimer",
      content:
        "<p>[Placeholder — replace with firm-approved wording.] The content on this website is provided for general informational purposes only and does not constitute legal advice. No attorney-client relationship is formed by viewing this website or submitting an enquiry through it. You should consult a qualified attorney regarding your specific situation before taking any action.</p>",
    },
    {
      slug: "privacy-policy",
      title: "Privacy Policy",
      content:
        "<p>[Placeholder — replace with firm-approved wording.] This privacy policy explains how Harcourt & Vale LLP collects, uses, and protects information submitted through this website.</p>",
    },
    {
      slug: "terms",
      title: "Terms of Use",
      content:
        "<p>[Placeholder — replace with firm-approved wording.] By using this website, you agree to these terms of use.</p>",
    },
  ]);

  // --- Sample enquiries (so the admin dashboard has something to show) ---------
  await db.insert(schema.enquiries).values([
    {
      type: "CONTACT",
      fullName: "Rachel Kim",
      email: "rachel.kim@example.com",
      phone: "+1 (646) 555-0134",
      subject: "Question about commercial lease review",
      areaOfLaw: "Real Estate Law",
      message: "We're finalizing a commercial lease and would like a lawyer to review the terms before we sign. Could someone reach out to discuss timing and fees?",
      status: "NEW",
    },
    {
      type: "CONSULTATION",
      fullName: "Thomas Adeyemi",
      email: "t.adeyemi@example.com",
      phone: "+1 (917) 555-0177",
      areaOfLaw: "Corporate & Commercial Law",
      preferredContactMethod: "Phone",
      preferredTime: "Afternoon",
      message: "Looking to set up a consultation regarding a potential joint venture agreement with an overseas partner.",
      status: "CONTACTED",
    },
  ]);

  console.log("Seed complete.");
  await client.end();
  process.exit(0);
}

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
