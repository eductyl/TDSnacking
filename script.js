// ==========================================================
//  Eat & Fit — script de la page
//  Carte, formules, panier et formulaires
// ==========================================================

// ---------- Réglages du restaurant (à modifier ici) ----------

script.js--fetch()--> api/*php --PDO--> mysql

const SETTINGS = {
  deliveryFee: 3.9,
  deliveryMinimum: 25,
  freeDeliveryFrom: 45,
  prepMinutes: { pickup: 20, delivery: 45 },
  advanceNoticeHours: 24,

  // Horaires par jour : 0 = dimanche, 1 = lundi ... 6 = samedi.
  // Heures décimales (14.5 = 14h30). Un jour absent = fermé.
  openingHours: {
    0: [[12, 15]],
    2: [
      [12, 14.5],
      [19, 22],
    ],
    3: [
      [12, 14.5],
      [19, 22],
    ],
    4: [
      [12, 14.5],
      [19, 22],
    ],
    5: [
      [12, 14.5],
      [19, 23],
    ],
    6: [
      [12, 14.5],
      [19, 23],
    ],
  },

  deliveryZone: "[Communes ou codes postaux desservis]",

  // Passer à true une fois les allergènes validés par le restaurant
  allergensVerified: false,
};

const allergensProvisional = !SETTINGS.allergensVerified;

// ---------- Données ----------

// Les 14 allergènes à déclaration obligatoire (les numéros 1 à 14
// utilisés dans la carte correspondent à l'ordre de cette liste)
const ALLERGENS = [
  "Céréales contenant du gluten",
  "Crustacés",
  "Œufs",
  "Poissons",
  "Arachides",
  "Soja",
  "Lait",
  "Fruits à coque",
  "Céleri",
  "Moutarde",
  "Graines de sésame",
  "Sulfites",
  "Lupin",
  "Mollusques",
];

// Chaque plat : id, catégorie, nom, formats (libellé + prix), description
// et numéros d'allergènes. Champs facultatifs :
//   minPeople     nombre minimum de personnes (raclette, fondues)
//   advanceOrder  à commander 24 h à l'avance
//   surcharge     supplément quand le plat est choisi dans une formule
//   seasonal      "selon arrivage"
//   alcohol       réservé aux majeurs
const MENU_ITEMS = [
  // ----- Entrées -----
  {
    id: "gesiers",
    category: "starter",
    name: "Salade de gésiers",
    formats: [{ label: "", price: 9.5 }],
    description:
      "Gésiers confits tièdes, salade verte, croûtons à l’ail et vinaigrette à la moutarde.",
    allergens: [1, 10, 12],
  },
  {
    id: "museau",
    category: "starter",
    name: "Salade de museau",
    formats: [{ label: "", price: 9 }],
    description:
      "Museau de bœuf en vinaigrette, cornichons, oignons nouveaux et persil plat.",
    allergens: [9, 10, 12],
  },
  {
    id: "huitres",
    category: "starter",
    name: "Huîtres n° 5",
    formats: [
      { label: "6 pièces", price: 13.5 },
      { label: "12 pièces", price: 25 },
    ],
    description:
      "Huîtres creuses de calibre 5, vinaigre d’échalote et pain de seigle beurré.",
    allergens: [1, 7, 12, 14],
    surcharge: 4,
    seasonal: true,
  },
  {
    id: "plateau",
    category: "starter",
    name: "Plateau de charcuteries et fromages",
    formats: [{ label: "", price: 16.5 }],
    description:
      "Jambon sec, rosette, pâté de campagne et trois fromages affinés, cornichons.",
    allergens: [1, 7, 12],
    surcharge: 3,
  },
  {
    id: "maroilles",
    category: "starter",
    name: "Tarte au maroilles",
    formats: [{ label: "", price: 9.5 }],
    description:
      "Tarte fine au maroilles, crème et oignons, servie tiède avec une petite salade.",
    allergens: [1, 3, 7],
  },
  {
    id: "escargots",
    category: "starter",
    name: "Escargots",
    formats: [
      { label: "6 pièces", price: 10.5 },
      { label: "12 pièces", price: 18 },
    ],
    description: "Escargots de Bourgogne au beurre persillé, ail et échalote.",
    allergens: [7, 14],
  },

  // ----- Plats -----
  {
    id: "flammenkuche",
    category: "main",
    name: "Flammenküche",
    formats: [{ label: "", price: 19.5 }],
    description:
      "farine, huile, crème, fromage blanc, oignons, lardons, muscade.",
    allergens: [1, 4, 6, 7, 12],
  },
  {
    id: "cassoulet",
    category: "main",
    name: "Cassoulet",
    formats: [{ label: "", price: 19.5 }],
    description:
      "Haricots blancs mijotés, confit de canard, saucisse de Toulouse et lard, gratinés au four.",
    allergens: [1, 9, 12],
  },
  {
    id: "raclette",
    category: "main",
    name: "Raclette",
    formats: [{ label: "par personne", price: 24 }],
    description:
      "Fromage à raclette fondu à table, charcuteries, pommes de terre et cornichons.",
    allergens: [7, 12],
    minPeople: 2,
    advanceOrder: true,
  },
  {
    id: "savoyarde",
    category: "main",
    name: "Fondue savoyarde",
    formats: [{ label: "par personne", price: 23 }],
    description:
      "Mélange de fromages de Savoie, vin blanc et cubes de pain de campagne.",
    allergens: [1, 7, 12],
    minPeople: 2,
    advanceOrder: true,
  },
  {
    id: "bourguignonne",
    category: "main",
    name: "Fondue bourguignonne",
    formats: [{ label: "par personne", price: 26 }],
    description:
      "Bœuf tendre à plonger dans l’huile, trois sauces maison et pommes grenaille.",
    allergens: [3, 10, 12],
    minPeople: 2,
    advanceOrder: true,
  },
  {
    id: "bourguignon",
    category: "main",
    name: "Bœuf bourguignon",
    formats: [{ label: "", price: 19 }],
    description:
      "Bœuf mijoté au vin rouge, lardons, champignons et pommes vapeur.",
    allergens: [1, 9, 12],
  },
  {
    id: "choucroute",
    category: "main",
    name: "Choucroute",
    formats: [{ label: "", price: 21 }],
    description:
      "Choucroute garnie : saucisse, lard fumé, palette et pommes de terre.",
    allergens: [9, 10, 12],
  },
  {
    id: "aligot",
    category: "main",
    name: "Aligot",
    formats: [{ label: "", price: 17.5 }],
    description:
      "Aligot onctueux à la tomme fraîche, saucisse de Toulouse grillée.",
    allergens: [7],
  },
  {
    id: "rognons",
    category: "main",
    name: "Rognons",
    formats: [{ label: "", price: 18.5 }],
    description:
      "Rognons de veau sautés, sauce moutarde à l’ancienne, gratin dauphinois.",
    allergens: [1, 7, 10],
  },
  {
    id: "tripes",
    category: "main",
    name: "Tripes à la mode de Caen",
    formats: [{ label: "", price: 17.5 }],
    description:
      "Tripes mijotées au cidre et au calvados, carottes, oignons et pommes vapeur.",
    allergens: [9, 12],
  },
  {
    id: "foie",
    category: "main",
    name: "Foie de veau",
    formats: [{ label: "", price: 22 }],
    description: "Foie de veau poêlé, jus au vin et purée maison.",
    allergens: [1, 7, 12],
    surcharge: 3,
  },
  {
    id: "sanglier",
    category: "main",
    name: "Daube de sanglier",
    formats: [{ label: "", price: 21.5 }],
    description:
      "Sanglier mijoté au vin rouge et aux baies de genièvre, pommes de terre.",
    allergens: [9, 12],
    surcharge: 2,
    seasonal: true,
  },
  {
    id: "jarret",
    category: "main",
    name: "Jarret de porc",
    formats: [{ label: "", price: 20 }],
    description: "Jarret braisé à la bière, légumes racines et moutarde.",
    allergens: [1, 9, 10],
  },

  // ----- Desserts -----
  {
    id: "baba",
    category: "dessert",
    name: "Baba au rhum",
    formats: [{ label: "", price: 8.5 }],
    description: "Baba moelleux imbibé de rhum ambré, crème chantilly.",
    allergens: [1, 3, 7],
    alcohol: true,
  },
  {
    id: "fondant",
    category: "dessert",
    name: "Fondant au chocolat",
    formats: [{ label: "", price: 8 }],
    description: "Chocolat noir et cœur coulant, crème anglaise.",
    allergens: [1, 3, 7],
  },
  {
    id: "bananabread",
    category: "dessert",
    name: "Banana bread",
    formats: [{ label: "", price: 7 }],
    description: "Banana bread maison tiède, noix et boule de glace vanille.",
    allergens: [1, 3, 7, 8],
  },
  {
    id: "split",
    category: "dessert",
    name: "Banana split",
    formats: [{ label: "", price: 8.5 }],
    description:
      "Banane, glaces vanille, chocolat et fraise, chantilly et sauce chocolat.",
    allergens: [3, 7, 8],
  },
  {
    id: "profiteroles",
    category: "dessert",
    name: "Profiteroles",
    formats: [{ label: "", price: 9 }],
    description: "Choux garnis de glace vanille, sauce chocolat chaude.",
    allergens: [1, 3, 7],
  },
  {
    id: "speculoos",
    category: "dessert",
    name: "Cheesecake au spéculoos",
    formats: [{ label: "", price: 8 }],
    description: "Cheesecake crémeux sur un lit de spéculoos.",
    allergens: [1, 3, 6, 7],
  },
  {
    id: "colonel",
    category: "dessert",
    name: "Colonel",
    formats: [{ label: "", price: 8.5 }],
    description: "Sorbet citron arrosé de vodka, à déguster à la cuillère.",
    allergens: [],
    alcohol: true,
  },
  {
    id: "parisbrest",
    category: "dessert",
    name: "Paris-Brest",
    formats: [{ label: "", price: 8.5 }],
    description:
      "Pâte à choux, crème mousseline pralinée et éclats de noisettes.",
    allergens: [1, 3, 7, 8],
  },

  // ----- Boissons -----
  {
    id: "biere",
    category: "drink",
    name: "Bière",
    formats: [
      { label: "25 cl", price: 4.5 },
      { label: "50 cl", price: 7.5 },
    ],
    description: "Bière à la pression, sélection du moment.",
    allergens: [1],
    alcohol: true,
  },
  {
    id: "rhum",
    category: "drink",
    name: "Rhum arrangé",
    formats: [{ label: "4 cl", price: 6.5 }],
    description: "Rhum arrangé maison, fruits et épices selon la saison.",
    allergens: [],
    alcohol: true,
  },
  {
    id: "chartreuse",
    category: "drink",
    name: "Chartreuse",
    formats: [{ label: "4 cl", price: 7 }],
    description:
      "Liqueur de plantes des Alpes, à déguster fraîche ou à température ambiante.",
    allergens: [],
    alcohol: true,
  },
  {
    id: "vins",
    category: "drink",
    name: "Vins",
    formats: [
      { label: "Verre 12 cl", price: 5.5 },
      { label: "Bouteille 75 cl", price: 26 },
    ],
    description:
      "Sélection de vins de nos régions, rouge, blanc ou rosé. Carte sur demande.",
    allergens: [12],
    alcohol: true,
  },
  {
    id: "prune",
    category: "drink",
    name: "Prune de Papy",
    formats: [{ label: "4 cl", price: 6 }],
    description: "Notre digestif à la prune, recette maison.",
    allergens: [],
    alcohol: true,
  },
  {
    id: "jacqueline",
    category: "drink",
    name: "Jacqueline",
    formats: [{ label: "4 cl", price: 6.5 }],
    description:
      "Une spécialité de la maison à découvrir. [Description à préciser par le restaurant]",
    allergens: [],
    alcohol: true,
  },
  {
    id: "calvados",
    category: "drink",
    name: "Calvados",
    formats: [{ label: "4 cl", price: 7 }],
    description: "Eau-de-vie de cidre normande, ronde et fruitée.",
    allergens: [],
    alcohol: true,
  },
  {
    id: "armagnac",
    category: "drink",
    name: "Armagnac",
    formats: [{ label: "4 cl", price: 7.5 }],
    description: "Eau-de-vie de Gascogne, boisée et soyeuse.",
    allergens: [],
    alcohol: true,
  },

  // ----- Boissons sans alcool -----
  {
    id: "eau",
    category: "soft",
    name: "Eau minérale",
    formats: [{ label: "50 cl", price: 3 }],
    description: "Plate ou gazeuse.",
    allergens: [],
  },
  {
    id: "soda",
    category: "soft",
    name: "Soda",
    formats: [{ label: "33 cl", price: 3.5 }],
    description: "Sélection de sodas.",
    allergens: [],
  },
  {
    id: "jus",
    category: "soft",
    name: "Jus de fruits",
    formats: [{ label: "25 cl", price: 3.5 }],
    description: "Jus de fruits au choix.",
    allergens: [],
  },
  {
    id: "cafe",
    category: "soft",
    name: "Café",
    formats: [{ label: "", price: 2 }],
    description: "Café serré ou allongé.",
    allergens: [],
  },
];

const FORMULES = [
  {
    name: "Formule Bistro",
    price: 26,
    description: "Une entrée et un plat",
    courses: ["starter", "main"],
  },
  {
    name: "Formule Gourmande",
    price: 32,
    description: "Une entrée, un plat et un dessert",
    courses: ["starter", "main", "dessert"],
  },
  {
    name: "Formule Complète",
    price: 35,
    description: "Une entrée, un plat, un dessert et une boisson sans alcool",
    courses: ["starter", "main", "dessert", "soft"],
  },
];

// Nom affiché pour chaque choix d'une formule
const COURSE_LABELS = {
  starter: "Entrée",
  main: "Plat",
  dessert: "Dessert",
  soft: "Boisson sans alcool",
};

const CATEGORY_ICONS = {
  starter: "🥗",
  main: "🍲",
  dessert: "🍰",
  drink: "🍷",
  soft: "🥤",
};

// Onglets de la carte : les boissons sans alcool sont rangées avec les autres boissons
const MENU_TABS = [
  { id: "starters", label: "Entrées", categories: ["starter"] },
  { id: "mains", label: "Plats principaux", categories: ["main"] },
  { id: "desserts", label: "Desserts", categories: ["dessert"] },
  { id: "drinks", label: "Boissons", categories: ["drink", "soft"] },
];

// Plats mis en avant sur l'accueil
const POPULAR_ITEM_IDS = [
  "cassoulet",
  "bourguignon",
  "escargots",
  "profiteroles",
];

const DAY_NAMES = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];
const WEEK_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // on affiche du lundi au dimanche

const STEP_TITLES = {
  cart: "Mon panier",
  form: "Mes informations",
  review: "Vérification",
  done: "Demande préparée",
};

// ---------- État de la page ----------

const state = {
  cartLines: [],
  step: "cart", // cart → form → review → done
  mode: "pickup", // pickup | delivery
  form: {}, // champs du formulaire de commande
  errors: [],
  activeTab: "starters",
  orderRef: "",
};

// ---------- Petits outils ----------

const $ = (selector) => document.querySelector(selector);

function formatPrice(amount) {
  return amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

// 12 → "12h00", 14.5 → "14h30"
function formatHour(hour) {
  const minutes = Math.round((hour % 1) * 60);
  return Math.floor(hour) + "h" + String(minutes).padStart(2, "0");
}

function formatSlot(date) {
  return date.toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// À utiliser pour tout ce que l'utilisateur a tapé avant de le remettre dans du HTML
function escapeHtml(value) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
  return String(value || "").replace(/[&<>"]/g, (char) => entities[char]);
}

function allergenNames(codes) {
  if (!codes.length) return "Aucun allergène renseigné — à valider";
  return codes.map((code) => ALLERGENS[code - 1]).join(", ");
}

function scrollToSection(id) {
  const section = document.getElementById(id);
  if (!section) return;
  if (section.tagName === "DETAILS") section.open = true;
  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Petit message en bas de l'écran, qui disparaît tout seul
let announceTimer;
function announce(message) {
  const announcer = $("#announcer");
  announcer.textContent = message;
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => {
    announcer.textContent = "";
  }, 2200);
}

// ---------- Affichage de la carte ----------

function renderMenuCard(item) {
  const notes = [];
  if (item.minPeople) {
    notes.push(
      `Sur commande 24 h à l’avance · dès ${item.minPeople} personnes`,
    );
  }
  if (item.seasonal) notes.push("Selon arrivage");
  if (item.alcohol) notes.push("Contient de l’alcool · réservé aux majeurs");
  const notesHtml = notes
    .map((text) => `<p class="card-note">${text}</p>`)
    .join("");

  // Un seul format : on affiche juste le prix. Sinon, un menu déroulant.
  let priceHtml;
  if (item.formats.length > 1) {
    const options = item.formats
      .map(
        (format, index) =>
          `<option value="${index}">${format.label} — ${formatPrice(format.price)}</option>`,
      )
      .join("");
    priceHtml = `<select aria-label="Format de ${item.name}">${options}</select>`;
  } else {
    const [format] = item.formats;
    priceHtml = `<b>${formatPrice(format.price)}</b><small>${format.label}</small>`;
  }

  return `
    <article class="card" data-id="${item.id}">
      <div class="card-icon" aria-hidden="true">${CATEGORY_ICONS[item.category]}</div>
      <div class="card-body">
        <h3>${item.name}</h3>
        <p>${item.description}</p>
        ${notesHtml}
        <details>
          <summary>Allergènes${allergensProvisional ? " (provisoire)" : ""}</summary>
          <p>${allergenNames(item.allergens)}</p>
        </details>
        <div class="card-footer">
          ${priceHtml}
          <button class="btn" data-action="add-item" aria-label="Ajouter ${item.name} au panier">Ajouter au panier</button>
        </div>
      </div>
    </article>`;
}

function renderMenu() {
  $("#menu-tabs").innerHTML = MENU_TABS.map(
    (tab) =>
      `<button class="btn" data-action="switch-tab" data-tab="${tab.id}" aria-pressed="${state.activeTab === tab.id}">${tab.label}</button>`,
  ).join("");

  const activeTab = MENU_TABS.find((tab) => tab.id === state.activeTab);
  const items = MENU_ITEMS.filter((item) =>
    activeTab.categories.includes(item.category),
  );
  $("#menu-items").innerHTML = items.map(renderMenuCard).join("");
}

// ---------- Formules ----------

function renderFormules() {
  $("#formules-grid").innerHTML = FORMULES.map((formule, index) => {
    // un menu déroulant par choix (entrée, plat...), sans les plats à partager
    const selects = formule.courses
      .map((category) => {
        const choices = MENU_ITEMS.filter(
          (item) => item.category === category && !item.minPeople,
        );
        const options = choices
          .map((item) => {
            const surcharge = item.surcharge
              ? ` (+${formatPrice(item.surcharge)})`
              : "";
            return `<option value="${item.id}">${item.name}${surcharge}</option>`;
          })
          .join("");
        return `<label>${COURSE_LABELS[category]}<select data-category="${category}">${options}</select></label>`;
      })
      .join("");

    return `
      <article class="card" data-formule="${index}">
        <div class="card-body">
          <h3>${formule.name}</h3>
          <p>${formule.description}</p>
          ${selects}
          <div class="card-footer">
            <b class="formule-price"></b>
            <button class="btn" data-action="add-formule">Ajouter au panier</button>
          </div>
        </div>
      </article>`;
  }).join("");

  document.querySelectorAll("[data-formule]").forEach(updateFormulePrice);
}

// Lit les choix faits dans une carte de formule et calcule prix, détail et alcool
function computeFormule(card) {
  const formule = FORMULES[card.dataset.formule];
  let price = formule.price;
  let separatePrice = 0; // ce que coûteraient les mêmes plats commandés à la carte
  let containsAlcohol = false;
  const names = [];

  card.querySelectorAll("select").forEach((select) => {
    const item = MENU_ITEMS.find((menuItem) => menuItem.id === select.value);
    price += item.surcharge || 0;
    separatePrice += item.formats[0].price;
    names.push(
      item.name +
        (item.formats.length > 1 ? ` (${item.formats[0].label})` : ""),
    );
    if (item.alcohol) containsAlcohol = true;
  });

  return { price, separatePrice, detail: names.join(" · "), containsAlcohol };
}

function updateFormulePrice(card) {
  const { price, separatePrice } = computeFormule(card);
  const savings =
    separatePrice > price
      ? ` <small>au lieu de ${formatPrice(separatePrice)}</small>`
      : "";
  card.querySelector(".formule-price").innerHTML = formatPrice(price) + savings;
}

// ---------- Créneaux de retrait / livraison ----------

// Un créneau tous les quarts d'heure, à partir de "maintenant + temps de préparation".
// Les plats à commander à l'avance (raclette, fondues) décalent le premier créneau de 24 h.
function getTimeSlots(mode, needsAdvanceNotice) {
  const slots = [];
  const now = Date.now();
  const leadMinutes = needsAdvanceNotice
    ? SETTINGS.advanceNoticeHours * 60
    : SETTINGS.prepMinutes[mode];
  const leadTime = leadMinutes * 60 * 1000;
  const daysToLookAhead = needsAdvanceNotice ? 5 : 3;

  for (let dayOffset = 0; dayOffset < daysToLookAhead; dayOffset++) {
    const day = new Date();
    day.setDate(day.getDate() + dayOffset);

    const openingRanges = SETTINGS.openingHours[day.getDay()] || [];
    openingRanges.forEach(([opening, closing]) => {
      for (let hour = opening; hour < closing; hour += 0.25) {
        const slot = new Date(day);
        slot.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
        if (slot - now >= leadTime) slots.push(slot);
      }
    });
  }

  return slots.slice(0, 48);
}

// ---------- Panier : affichage ----------

function renderTotals({ subtotal, deliveryFee, total, isDelivery }) {
  const deliveryRow = isDelivery
    ? `<div><dt>Livraison</dt><dd>${deliveryFee ? formatPrice(deliveryFee) : "Offerte"}</dd></div>`
    : "";

  return `
    <dl class="totals">
      <div><dt>Sous-total</dt><dd>${formatPrice(subtotal)}</dd></div>
      ${deliveryRow}
      <div class="grand-total"><dt>Total</dt><dd>${formatPrice(total)}</dd></div>
    </dl>`;
}

function renderCartLines() {
  const rows = state.cartLines.map(
    (line) => `
    <li>
      <div><b>${line.name}</b><small>${line.detail}</small></div>
      <div class="quantity-controls">
        <button class="btn btn-outline" data-action="change-quantity" data-key="${line.key}" data-delta="-1" aria-label="Retirer une unité de ${line.name}">−</button>
        <span>${line.quantity}</span>
        <button class="btn btn-outline" data-action="change-quantity" data-key="${line.key}" data-delta="1" aria-label="Ajouter une unité de ${line.name}">+</button>
      </div>
      <b>${formatPrice(line.price * line.quantity)}</b>
    </li>`,
  );

  return `<ul class="cart-lines">${rows.join("")}</ul>`;
}

function renderEmptyCart() {
  return `
    <p>Votre panier est vide. Parcourez la carte et ajoutez vos plats préférés.</p>
    <button class="btn" data-action="close-cart" data-scroll-to="carte">Voir la carte</button>`;
}

// Étape 1 : le contenu du panier et le choix À emporter / Livraison
function renderCartStep(summary) {
  const { isDelivery, needsAdvanceNotice, belowDeliveryMinimum, subtotal } =
    summary;

  const modeSwitch = `
    <div class="mode-switch" role="group" aria-label="Mode de retrait">
      <button class="btn" data-action="set-mode" data-mode="pickup" aria-pressed="${!isDelivery}">À emporter</button>
      <button class="btn" data-action="set-mode" data-mode="delivery" aria-pressed="${isDelivery}">Livraison</button>
    </div>`;

  const modeNote = isDelivery
    ? `<p class="card-note">Livraison ${formatPrice(SETTINGS.deliveryFee)}, offerte dès ${formatPrice(SETTINGS.freeDeliveryFrom)}. Minimum ${formatPrice(SETTINGS.deliveryMinimum)}. Zone : ${SETTINGS.deliveryZone}</p>`
    : `<p class="card-note">Retrait au restaurant, prêt en ${SETTINGS.prepMinutes.pickup} min environ.</p>`;

  const advanceNote = needsAdvanceNotice
    ? `<p class="card-note">Raclette/fondue : commande 24 h à l’avance, créneaux dès demain.</p>`
    : "";

  const minimumWarning = belowDeliveryMinimum
    ? `<p class="notice">Minimum de livraison : ${formatPrice(SETTINGS.deliveryMinimum)}. Il manque ${formatPrice(SETTINGS.deliveryMinimum - subtotal)}.</p>`
    : "";

  return (
    renderCartLines() +
    modeSwitch +
    modeNote +
    advanceNote +
    renderTotals(summary) +
    minimumWarning +
    `<button class="btn" data-action="go-to-form" ${belowDeliveryMinimum ? "disabled" : ""}>Continuer</button>`
  );
}

// Étape 2 : nom, téléphone, adresse, créneau...
function renderFormStep(summary) {
  const { isDelivery, hasAlcohol, needsAdvanceNotice } = summary;
  const form = state.form;
  const slots = getTimeSlots(state.mode, needsAdvanceNotice);

  const errorList = state.errors.length
    ? `<ul class="message-error" role="alert">${state.errors.map((error) => `<li>${error}</li>`).join("")}</ul>`
    : "";

  const addressField = isDelivery
    ? `<label for="order-address">Adresse de livraison</label>
       <input id="order-address" name="address" autocomplete="street-address" value="${escapeHtml(form.address)}">`
    : "";

  let slotField;
  if (slots.length) {
    const options = slots
      .map((slot) => {
        const value = slot.toISOString();
        return `<option value="${value}" ${form.slot === value ? "selected" : ""}>${formatSlot(slot)}</option>`;
      })
      .join("");
    slotField = `<select id="order-slot" name="slot"><option value="">Choisir…</option>${options}</select>`;
  } else {
    slotField = `<p class="notice">Aucun créneau disponible pour le moment.</p>`;
  }

  const adultCheckbox = hasAlcohol
    ? `<label class="checkbox-label"><input type="checkbox" name="adult" ${form.adult ? "checked" : ""}> Je certifie être majeur(e) (alcool dans la commande).</label>`
    : "";

  return `
    ${errorList}
    <form id="order-form" novalidate>
      <label for="order-name">Nom</label>
      <input id="order-name" name="name" autocomplete="name" value="${escapeHtml(form.name)}">

      <label for="order-phone">Téléphone</label>
      <input id="order-phone" name="phone" type="tel" autocomplete="tel" value="${escapeHtml(form.phone)}">

      ${addressField}

      <label for="order-slot">${isDelivery ? "Heure de livraison" : "Heure de retrait"}</label>
      ${slotField}

      <label for="order-note">Instructions (cuisson, précisions)</label>
      <textarea id="order-note" name="note" rows="3">${escapeHtml(form.note)}</textarea>

      ${adultCheckbox}
      <label class="checkbox-label"><input type="checkbox" name="rgpd" ${form.rgpd ? "checked" : ""}> J’accepte que mes données servent à traiter cette commande.</label>

      ${renderTotals(summary)}
      <button type="button" class="btn btn-outline" data-action="back-to-cart">Retour</button>
      <button class="btn">Vérifier ma commande</button>
    </form>`;
}

// Étape 3 : récapitulatif avant confirmation
function renderReviewStep(summary) {
  const { isDelivery } = summary;
  const form = state.form;

  const rows = state.cartLines.map(
    (line) => `
    <li>
      <div><b>${line.quantity} × ${line.name}</b><small>${line.detail}</small></div>
      <span></span>
      <b>${formatPrice(line.price * line.quantity)}</b>
    </li>`,
  );

  const address = isDelivery ? `<br>${escapeHtml(form.address)}` : "";
  const note = form.note ? `<br><i>${escapeHtml(form.note)}</i>` : "";

  return `
    <ul class="cart-lines">${rows.join("")}</ul>
    <p>
      <b>${isDelivery ? "Livraison" : "À emporter"}</b> · ${formatSlot(new Date(form.slot))}<br>
      ${escapeHtml(form.name)} · ${escapeHtml(form.phone)}${address}${note}
    </p>
    ${renderTotals(summary)}
    <p class="notice">Mode démonstration : la confirmation ne transmet rien au restaurant et ne déclenche aucun paiement.</p>
    <button class="btn btn-outline" data-action="edit-order">Modifier</button>
    <button class="btn" data-action="confirm-order">Confirmer la demande (démo)</button>`;
}

function renderDoneStep() {
  return `
    <p class="message-success"><b>Mode démonstration.</b> Demande n° ${state.orderRef} préparée sur cet appareil. Elle n’a pas été transmise au restaurant et aucun paiement n’a été effectué.</p>
    <p>Pour commander réellement, appelez le restaurant : <mark>[Téléphone]</mark>.</p>
    <button class="btn" data-action="reset-order">Nouvelle commande</button>`;
}

// Redessine tout le panier selon l'étape en cours
function renderCart() {
  const lines = state.cartLines;
  const subtotal = lines.reduce(
    (sum, line) => sum + line.price * line.quantity,
    0,
  );
  const isDelivery = state.mode === "delivery";

  // Livraison offerte au-dessus d'un certain montant, et rien à payer si le panier est vide
  let deliveryFee = 0;
  if (isDelivery && subtotal) {
    deliveryFee =
      subtotal >= SETTINGS.freeDeliveryFrom ? 0 : SETTINGS.deliveryFee;
  }

  const summary = {
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    isDelivery,
    hasAlcohol: lines.some((line) => line.alcohol),
    needsAdvanceNotice: lines.some((line) => line.advanceOrder),
    belowDeliveryMinimum: isDelivery && subtotal < SETTINGS.deliveryMinimum,
  };

  $("#cart-count").textContent = lines.reduce(
    (sum, line) => sum + line.quantity,
    0,
  );

  if (!lines.length && state.step !== "done") state.step = "cart";

  let html = `
    <div class="cart-header">
      <h2>${STEP_TITLES[state.step]}</h2>
      <button class="btn btn-outline" data-action="close-cart" aria-label="Fermer le panier">✕</button>
    </div>`;

  if (state.step === "done") html += renderDoneStep();
  else if (!lines.length) html += renderEmptyCart();
  else if (state.step === "cart") html += renderCartStep(summary);
  else if (state.step === "form") html += renderFormStep(summary);
  else html += renderReviewStep(summary);

  $("#cart").innerHTML = html;
}

function setCartOpen(isOpen) {
  $("#cart").classList.toggle("open", isOpen);
  if (isOpen) {
    renderCart();
    $("#cart .cart-header button").focus();
  } else {
    $("#cart-button").focus();
  }
}

// ---------- Validation des formulaires ----------

// Renvoie la liste des problèmes du formulaire de commande (vide = tout est bon)
function validateOrderForm() {
  const form = state.form;
  const errors = [];

  if ((form.name || "").trim().length < 2) {
    errors.push("Indiquez votre nom.");
  }

  const frenchPhone = /^(?:(?:\+|00)33|0)\s?[1-9](?:[\s.-]?\d{2}){4}$/;
  if (!frenchPhone.test((form.phone || "").trim())) {
    errors.push(
      "Le numéro de téléphone n’est pas valide (ex. 06 12 34 56 78).",
    );
  }

  if (state.mode === "delivery" && (form.address || "").trim().length < 8) {
    errors.push("Indiquez votre adresse de livraison complète.");
  }

  if (!form.slot) errors.push("Choisissez un créneau.");

  if (state.cartLines.some((line) => line.alcohol) && !form.adult) {
    errors.push("Confirmez que vous êtes majeur(e).");
  }

  if (!form.rgpd) {
    errors.push("Acceptez le traitement de vos données pour continuer.");
  }

  return errors;
}

function handleOrderFormSubmit() {
  state.errors = validateOrderForm();
  state.step = state.errors.length ? "form" : "review";
  renderCart();
}

function handleContactFormSubmit() {
  const name = $("#contact-name").value.trim();
  const email = $("#contact-email").value.trim();
  const message = $("#contact-message").value.trim();
  const status = $("#contact-status");

  const emailLooksValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

  if (name.length < 2 || !emailLooksValid || message.length < 10) {
    status.className = "message-error";
    status.textContent =
      "Vérifiez votre nom, une adresse e-mail valide et un message d’au moins 10 caractères.";
  } else {
    status.className = "message-success";
    status.textContent =
      "Mode démonstration : votre message n’a pas été envoyé, aucun service d’e-mail n’est connecté. Contactez-nous par téléphone.";
  }
}

// ---------- Actions déclenchées par les boutons (attribut data-action) ----------

const actions = {
  "add-item"(button) {
    const card = button.closest(".card");
    const item = MENU_ITEMS.find((menuItem) => menuItem.id === card.dataset.id);
    const select = card.querySelector("select");
    const formatIndex = select ? Number(select.value) : 0;
    const { label, price } = item.formats[formatIndex];

    // même plat + même format : on augmente la quantité au lieu d'ajouter une ligne
    const key = `${item.id}|${formatIndex}`;
    const existingLine = state.cartLines.find((line) => line.key === key);

    if (existingLine) {
      existingLine.quantity++;
    } else {
      state.cartLines.push({
        key,
        name: item.name,
        detail: label,
        price,
        quantity: item.minPeople || 1,
        minQuantity: item.minPeople || 0,
        alcohol: Boolean(item.alcohol),
        advanceOrder: Boolean(item.advanceOrder),
      });
    }

    announce(`${item.name} ajouté au panier`);
    renderCart();
  },

  "add-formule"(button) {
    const card = button.closest(".card");
    const formule = FORMULES[card.dataset.formule];
    const choice = computeFormule(card);

    state.cartLines.push({
      key: "formule-" + Date.now(),
      name: formule.name,
      detail: choice.detail,
      price: choice.price,
      quantity: 1,
      minQuantity: 0,
      alcohol: choice.containsAlcohol,
      advanceOrder: false,
    });

    announce("Formule ajoutée au panier");
    renderCart();
  },

  "change-quantity"(button) {
    const line = state.cartLines.find(
      (cartLine) => cartLine.key === button.dataset.key,
    );
    line.quantity += Number(button.dataset.delta);

    // sous le minimum (1, ou 2 pour raclette et fondues), la ligne disparaît
    if (line.quantity < (line.minQuantity || 1)) {
      state.cartLines = state.cartLines.filter((cartLine) => cartLine !== line);
    }
    renderCart();
  },

  "set-mode"(button) {
    state.mode = button.dataset.mode;
    state.form.slot = ""; // les créneaux dépendent du mode, il faut en rechoisir un
    renderCart();
  },

  "switch-tab"(button) {
    state.activeTab = button.dataset.tab;
    renderMenu();
  },

  "open-cart"() {
    setCartOpen(true);
  },

  "close-cart"() {
    setCartOpen(false);
  },

  "start-order"() {
    if (state.cartLines.length) setCartOpen(true);
    else scrollToSection("carte");
  },

  "go-to-form"() {
    state.step = "form";
    state.errors = [];
    renderCart();
  },

  "back-to-cart"() {
    state.step = "cart";
    state.errors = [];
    renderCart();
  },

  "edit-order"() {
    state.step = "form";
    renderCart();
  },

  "confirm-order"() {
    state.orderRef =
      "DEMO-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    state.step = "done";
    renderCart();
  },

  "reset-order"() {
    state.cartLines = [];
    state.form = {};
    state.step = "cart";
    renderCart();
    setCartOpen(false);
  },
};

// ---------- Écouteurs d'événements ----------

document.addEventListener("click", (event) => {
  // liens de navigation : défilement doux vers la section
  const scrollLink = event.target.closest("[data-scroll-to]");
  if (scrollLink) {
    event.preventDefault();
    $("#main-nav").classList.remove("open");
    scrollToSection(scrollLink.dataset.scrollTo);
  }

  // boutons d'action
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = actions[button.dataset.action];
  if (action) action(button);
});

// On garde en mémoire ce que l'utilisateur tape dans le panier
document.addEventListener("input", (event) => {
  const field = event.target;
  if (field.closest("#cart") && field.name) {
    state.form[field.name] =
      field.type === "checkbox" ? field.checked : field.value;
  }
});

// Changer un choix dans une formule met à jour son prix
document.addEventListener("change", (event) => {
  const formuleCard = event.target.closest("[data-formule]");
  if (formuleCard) updateFormulePrice(formuleCard);
});

document.addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.target.id === "order-form") handleOrderFormSubmit();
  if (event.target.id === "contact-form") handleContactFormSubmit();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && $("#cart").classList.contains("open")) {
    setCartOpen(false);
  }
});

// Bouton burger du menu (mobile)
$("#menu-toggle").addEventListener("click", (event) => {
  const isOpen = $("#main-nav").classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", isOpen);
});

// ---------- Initialisation de la page ----------

$("#popular-items").innerHTML = POPULAR_ITEM_IDS.map((id) =>
  renderMenuCard(MENU_ITEMS.find((item) => item.id === id)),
).join("");

// Bandeau "allergènes provisoires" masqué une fois les données validées
if (!allergensProvisional) $("#provisional-notice").hidden = true;

$("#allergen-legend").innerHTML = ALLERGENS.map(
  (name) => `<li>${name}</li>`,
).join("");

$("#hours-list").innerHTML = WEEK_DISPLAY_ORDER.map((day) => {
  const ranges = (SETTINGS.openingHours[day] || [])
    .map(
      ([opening, closing]) => `${formatHour(opening)}–${formatHour(closing)}`,
    )
    .join(" · ");
  return `<li><span>${DAY_NAMES[day]}</span><span>${ranges || "Fermé"}</span></li>`;
}).join("");

$("#delivery-zone").textContent = SETTINGS.deliveryZone;

$("#service-columns").innerHTML = `
  <div>
    <h3>À emporter</h3>
    <p>Commandez en ligne et récupérez votre repas au restaurant, prêt en ${SETTINGS.prepMinutes.pickup} minutes environ. Sans frais.</p>
  </div>
  <div>
    <h3>Livraison</h3>
    <p>Livraison en ${SETTINGS.prepMinutes.delivery} minutes environ. Frais de ${formatPrice(SETTINGS.deliveryFee)}, offerts dès ${formatPrice(SETTINGS.freeDeliveryFrom)} d’achat. Commande minimum de ${formatPrice(SETTINGS.deliveryMinimum)}. Zone : ${SETTINGS.deliveryZone}</p>
  </div>
  <div>
    <h3>Sur commande</h3>
    <p>Raclette et fondues : à partir de 2 personnes, à commander 24 h à l’avance.</p>
  </div>`;

$("#delivery-terms").innerHTML =
  `Retrait : prêt en ${SETTINGS.prepMinutes.pickup} min environ. Livraison : ${SETTINGS.prepMinutes.delivery} min environ, frais de ${formatPrice(SETTINGS.deliveryFee)}, minimum ${formatPrice(SETTINGS.deliveryMinimum)}, zone ${SETTINGS.deliveryZone}. Réclamations et litiges : <mark>[À compléter]</mark>.`;

renderMenu();
renderFormules();
renderCart();
