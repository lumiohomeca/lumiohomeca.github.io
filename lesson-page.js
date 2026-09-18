const topic = new URLSearchParams(location.search).get("topic");
const detail = window.academyDetails?.[topic];
const levelFor = (title) => {
  const beginner = ["How a watch keeps time.","Mechanical, automatic or quartz?","What specifications matter.","Water resistance, without the confusion.","Finding the right fit.","Care from day one.","What the crown does.","Power reserve, in plain language.","Crystal: mineral, sapphire or acrylic?","Date windows and calendar care.","Why lume matters.","Bracelet basics.","Reading the caseback.","Your first watch rotation."];
  const intermediate = ["Dress, field, diver or chronograph?","What a brand can signal.","Complications, explained simply.","Steel, titanium, gold and ceramic.","Straps change the whole watch.","Dial anatomy and legibility.","What a bezel can do.","Understanding accuracy.","How to read a reference number.","Buying online with discipline.","How a watch wears with style."];
  return beginner.includes(title) ? "Beginner" : intermediate.includes(title) ? "Intermediate" : "Collector";
};
const sourceSets = {
  Beginner: [
    ["FHH Academy · Watchmaking foundations","https://www.hautehorlogerie.org/en/fhh-academy/our-offers/courses/introduction-to-complications","Independent horology learning and terminology."],
    ["Seiko · movement information","https://www.seikowatches.com/us-en/products/presage/presage-movement-info","Official overview of watch movement basics."],
    ["Seiko · water resistance guidance","https://www.seikowatches.com/ca-en/customerservice/faq/general-information-8","Official care and water-resistance notes for owners."]
  ],
  Intermediate: [
    ["FHH · watch complications","https://www.hautehorlogerie.org/en/watches-and-culture/library/watch-complications","Independent guide to GMT, calendars, chronographs and more."],
    ["HODINKEE Watch 101","https://www.hodinkee.com/watch101","Reference glossary for movement and complication terminology."],
    ["FHH · professional study topics","https://www.hautehorlogerie.org/en/fhh-academy/trainings-for-professionals","Topics spanning materials, diving watches, history and design."]
  ],
  Collector: [
    ["FHH Watch Specialist","https://www.hautehorlogerie.org/en/fhh-academy/fhh-certification/fhh-watch-specialist","A look at the next level of technical horology study."],
    ["FHH · trainings for professionals","https://www.hautehorlogerie.org/en/fhh-academy/trainings-for-professionals","Includes collecting, vintage, market and advanced watchmaking themes."],
    ["HODINKEE Watch 101","https://www.hodinkee.com/watch101","Useful technical terminology while comparing references."]
  ]
};
const studyNotes = {
  Beginner: "This first level is about building a dependable vocabulary before spending. Use the lesson to identify what you are looking at on a product page, then compare the manufacturer’s specification sheet with your own habits. A movement, crystal or water-resistance number has value only when it matches how you will wear the watch. Keep a short note of the references you consider, including dimensions, movement, seller, final price and warranty. That simple discipline will make your first serious purchase calmer and more satisfying. You do not need to memorize every term; learn the few details that change comfort, care and confidence.",
  Intermediate: "At this level, move from reading specifications to interpreting them. Compare two watches that serve the same role and ask why they feel different: dial balance, case material, thickness, strap, movement and brand position all contribute. Use official product pages for exact facts, then read independent educational sources for the vocabulary and historical context. Avoid treating any one specification as a winner by itself. A more complex movement, premium material or famous brand only matters when it serves the purpose of the watch and your own use. Good judgment is the ability to connect details into a complete picture.",
  Collector: "Collector-level thinking is deliberate rather than speculative. Document the reference, condition, service history, seller terms and purchase rationale before money changes hands. Compare similar examples rather than relying on one listing or a headline about resale. When assessing pre-owned or vintage pieces, uncertainty should make you slow down, not rush in. Research the calibre, case shape and original configuration; if something cannot be verified, price that uncertainty into the decision or simply leave it. A durable collection grows through patience, focused taste and proper care. The goal is ownership you enjoy, not a promise about future market performance."
};
const level = detail ? levelFor(topic) : "Academy";
const sources = sourceSets[level] || [];
document.title = detail ? `${topic} · Lumio Watch Academy` : "Lesson not found · Lumio Watch Academy";
document.querySelector("#lesson").innerHTML = detail ? `
  <section class="hero"><div class="eyebrow">Lumio Watch Academy · ${level}</div><h1>${topic}</h1><p>Complete lesson with context, practical application and sources for further study.</p></section>
  <section class="section"><h2>The lesson</h2><p class="copy">${detail}</p></section>
  <section class="section"><div class="eyebrow">How to study it</div><h2>Put the idea into practice.</h2><p class="copy">${studyNotes[level]}</p></section>
  <section class="section"><div class="eyebrow">Sources & further reading</div><h2>Keep exploring.</h2><p class="copy">Lumio is an independent educational guide. These links are provided to help you verify terms and go deeper with specialist and official resources.</p><div class="sources">${sources.map(([name,url,description]) => `<a class="source" href="${url}" target="_blank" rel="noopener"><b>${name}</b><span>${description}</span></a>`).join("")}</div></section>
  <a class="back" href="academy.html#${level.toLowerCase()}">← Back to ${level}</a>` : `<section class="hero"><div class="eyebrow">Lumio Watch Academy</div><h1>Lesson not found.</h1><p>Please return to the Academy and choose a lesson from the curriculum.</p></section><a class="back" href="academy.html">← Back to Academy</a>`;
