const { chromium } = require("playwright");
const fs = require("fs");

const BASE_URL = "https://www.nopasaran.ch";
const TOTAL_PAGES = 25;

// Parse French date string like "17 mars 2026" to { date: "2026-03-17", year: 2026 }
function parseFrenchDate(dateStr) {
  const months = {
    janv: "01", janvier: "01",
    févr: "02", février: "02",
    mars: "03",
    avr: "04", avril: "04",
    mai: "05",
    juin: "06",
    juil: "07", juillet: "07",
    août: "08",
    sept: "09", septembre: "09",
    oct: "10", octobre: "10",
    nov: "11", novembre: "11",
    déc: "12", décembre: "12",
  };

  // Handle formats like "17 mars 2026" or "27 févr. 2026"
  const cleaned = dateStr.replace(".", "").trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length < 3) return { date: dateStr, year: null };

  const day = parts[0].padStart(2, "0");
  const monthKey = parts[1].toLowerCase();
  const year = parseInt(parts[2]);
  const month = months[monthKey] || "01";

  return { date: `${year}-${month}-${day}`, year };
}

async function scrapeEventLinks(page) {
  const links = [];

  for (let p = 1; p <= TOTAL_PAGES; p++) {
    const url = p === 1 ? `${BASE_URL}/fr-CH` : `${BASE_URL}/fr-CH?page=${p}`;
    console.log(`Scraping page ${p}/${TOTAL_PAGES}...`);
    await page.goto(url, { waitUntil: "networkidle" });

    const pageLinks = await page.$$eval("main ul li a", (anchors) =>
      anchors.map((a) => a.getAttribute("href"))
    );
    links.push(...pageLinks);
  }

  return links;
}

async function scrapeEventDetail(page, path) {
  const url = `${BASE_URL}${path}`;
  await page.goto(url, { waitUntil: "networkidle" });

  const data = await page.evaluate(() => {
    const article = document.querySelector("article");
    if (!article) return null;

    // Title
    const title = article.querySelector("h1")?.textContent?.trim() || "";

    // Meta info: date, category, subcategory are the first 3 .flex.items-center.gap-2
    const metaDivs = article.querySelectorAll(
      ".flex.items-center.gap-2:not(button):not(.px-3)"
    );
    const metas = [];
    metaDivs.forEach((d) => {
      const text = d.textContent?.trim();
      if (
        text &&
        !["Partager", "Story", "Sources"].includes(text) &&
        !text.startsWith("nopasaran")
      ) {
        metas.push(text);
      }
    });

    const dateStr = metas[0] || "";
    const category = metas[1] || "";

    // Description paragraphs (under "Description des faits")
    const descriptionContainer = article.querySelector(
      "h2 + div, h2 + .space-y-4, h2 + .prose"
    );
    let description = "";
    if (descriptionContainer) {
      const paragraphs = descriptionContainer.querySelectorAll("p");
      description = Array.from(paragraphs)
        .map((p) => p.textContent?.trim())
        .filter(Boolean)
        .join("\n\n");
    }

    // Consequences
    const h2s = article.querySelectorAll("h2");
    let consequences = "";
    h2s.forEach((h2) => {
      if (h2.textContent?.includes("Conséquences")) {
        const parent = h2.closest("div");
        if (parent) {
          const p = parent.querySelector("p");
          if (p) consequences = p.textContent?.trim() || "";
        }
      }
    });

    // Person info from sidebar
    const sidebar = article.querySelector("aside");
    let person = "";
    let role = "";
    let party = "";
    if (sidebar) {
      person = sidebar.querySelector("h3")?.textContent?.trim() || "";
      const pars = sidebar.querySelectorAll("p");
      if (pars.length >= 1) role = pars[0]?.textContent?.trim() || "";
      if (pars.length >= 2) party = pars[1]?.textContent?.trim() || "";
    }

    // Sources
    const sourceLinks = article.querySelectorAll(
      "ul li a[href^='http']"
    );
    const sources = Array.from(sourceLinks).map((a) => ({
      name: a.textContent?.trim() || "",
      url: a.getAttribute("href") || "",
    }));

    return {
      title,
      dateStr,
      category,
      description,
      consequences,
      person,
      role,
      party,
      sources,
    };
  });

  return data;
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Collecting event links from all pages...");
  const eventLinks = await scrapeEventLinks(page);
  console.log(`Found ${eventLinks.length} events. Scraping details...\n`);

  const events = [];

  for (let i = 0; i < eventLinks.length; i++) {
    const link = eventLinks[i];
    console.log(`[${i + 1}/${eventLinks.length}] ${link}`);

    try {
      const data = await scrapeEventDetail(page, link);
      if (!data) continue;

      const { date, year } = parseFrenchDate(data.dateStr);

      events.push({
        title: data.title,
        date,
        year,
        category: data.category,
        description: data.description,
        consequences: data.consequences,
        person: data.person,
        role: data.role,
        party: data.party,
        sources: data.sources,
        url: `${BASE_URL}${link}`,
      });
    } catch (err) {
      console.error(`  Error scraping ${link}: ${err.message}`);
    }
  }

  await browser.close();

  // Sort by year (ascending), then by date
  events.sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    return 0;
  });

  // Group by year
  const grouped = {};
  for (const event of events) {
    const y = event.year || "unknown";
    if (!grouped[y]) grouped[y] = [];
    grouped[y].push(event);
  }

  const output = {
    totalEvents: events.length,
    scrapedAt: new Date().toISOString(),
    source: "https://www.nopasaran.ch/fr-CH",
    eventsByYear: grouped,
  };

  fs.writeFileSync("data.json", JSON.stringify(output, null, 2), "utf-8");
  console.log(`\nDone! ${events.length} events saved to data.json`);
}

main().catch(console.error);
