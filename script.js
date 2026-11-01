// ==========================================================
//  Eat & Fit — script de la page
//  Carte, formules, panier et formulaires
// ==========================================================

// ---------- Réglages du restaurant ----------

// Horaires, frais de livraison, etc. : ils viennent du serveur (inc/settings.php)
// et sont chargés au démarrage par loadMenu(), tout en bas de ce fichier.
const SETTINGS = {};
let allergensProvisional = true;

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

// La carte et les formules viennent de la base de données (api/menu.php).
// Chaque plat : id, category, name, formats [{ label, price }], description,
// allergens (numéros), puis minPeople, advanceOrder, surcharge, seasonal, alcohol.
let MENU_ITEMS = [];
let FORMULES = [];   // chaque formule : id, name, price, description, courses

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
  done: "Commande enregistrée",
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
  submitting: false, // vrai pendant l'envoi de la commande
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

// Envoie du JSON à un fichier PHP. Renvoie la réponse décodée,
// ou lève une erreur dont le message est lisible par le client.
async function postJson(url, payload) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Connexion impossible. Vérifiez votre connexion et réessayez.");
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // réponse qui n'est pas du JSON (erreur PHP) : message générique ci-dessous
  }

  if (!response.ok) {
    const error = new Error(
      (data && data.error) || "Une erreur est survenue. Réessayez dans un instant.",
    );
    error.details = data && data.errors;
    throw error;
  }
  return data;
}

// Une ligne du panier → ce que le serveur attend : des identifiants et une quantité.
// Les noms et les prix ne sont PAS envoyés : le serveur les relit dans la base.
function toOrderLine(line) {
  return line.formuleId
    ? { formuleId: line.formuleId, choices: line.choices, quantity: line.quantity }
    : { itemId: line.itemId, formatIndex: line.formatIndex, quantity: line.quantity };
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
          `<option value="${index}">${escapeHtml(format.label)} — ${formatPrice(format.price)}</option>`,
      )
      .join("");
    priceHtml = `<select aria-label="Format de ${escapeHtml(item.name)}">${options}</select>`;
  } else {
    const [format] = item.formats;
    priceHtml = `<b>${formatPrice(format.price)}</b><small>${escapeHtml(format.label)}</small>`;
  }

  return `
    <article class="card" data-id="${escapeHtml(item.id)}">
      <div class="card-icon" aria-hidden="true">${CATEGORY_ICONS[item.category]}</div>
      <div class="card-body">
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.description)}</p>
        ${notesHtml}
        <details>
          <summary>Allergènes${allergensProvisional ? " (provisoire)" : ""}</summary>
          <p>${allergenNames(item.allergens)}</p>
        </details>
        <div class="card-footer">
          ${priceHtml}
          <button class="btn" data-action="add-item" aria-label="Ajouter ${escapeHtml(item.name)} au panier">Ajouter au panier</button>
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
            return `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}${surcharge}</option>`;
          })
          .join("");
        return `<label>${COURSE_LABELS[category]}<select data-category="${category}">${options}</select></label>`;
      })
      .join("");

    return `
      <article class="card" data-formule="${index}">
        <div class="card-body">
          <h3>${escapeHtml(formule.name)}</h3>
          <p>${escapeHtml(formule.description)}</p>
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
  const choices = []; // ids des plats choisis, dans l'ordre des catégories

  card.querySelectorAll("select").forEach((select) => {
    const item = MENU_ITEMS.find((menuItem) => menuItem.id === select.value);
    price += item.surcharge || 0;
    separatePrice += item.formats[0].price;
    choices.push(item.id);
    names.push(
      item.name +
        (item.formats.length > 1 ? ` (${item.formats[0].label})` : ""),
    );
    if (item.alcohol) containsAlcohol = true;
  });

  return { price, separatePrice, detail: names.join(" · "), containsAlcohol, choices };
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
      <div><b>${escapeHtml(line.name)}</b><small>${escapeHtml(line.detail)}</small></div>
      <div class="quantity-controls">
        <button class="btn btn-outline" data-action="change-quantity" data-key="${line.key}" data-delta="-1" aria-label="Retirer une unité de ${escapeHtml(line.name)}">−</button>
        <span>${line.quantity}</span>
        <button class="btn btn-outline" data-action="change-quantity" data-key="${line.key}" data-delta="1" aria-label="Ajouter une unité de ${escapeHtml(line.name)}">+</button>
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
      <label for="order-firstname">Prénom</label>
      <input id="order-firstname" name="firstname" autocomplete="given-name" value="${escapeHtml(form.firstname)}">

      <label for="order-lastname">Nom</label>
      <input id="order-lastname" name="lastname" autocomplete="family-name" value="${escapeHtml(form.lastname)}">

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
      <div><b>${line.quantity} × ${escapeHtml(line.name)}</b><small>${escapeHtml(line.detail)}</small></div>
      <span></span>
      <b>${formatPrice(line.price * line.quantity)}</b>
    </li>`,
  );

  const address = isDelivery ? `<br>${escapeHtml(form.address)}` : "";
  const note = form.note ? `<br><i>${escapeHtml(form.note)}</i>` : "";

  // erreurs renvoyées par le serveur au moment de la confirmation
  const errorList = state.errors.length
    ? `<ul class="message-error" role="alert">${state.errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>`
    : "";
  const busy = state.submitting ? "disabled" : "";

  return `
    ${errorList}
    <ul class="cart-lines">${rows.join("")}</ul>
    <p>
      <b>${isDelivery ? "Livraison" : "À emporter"}</b> · ${formatSlot(new Date(form.slot))}<br>
      ${escapeHtml(form.firstname)} ${escapeHtml(form.lastname)} · ${escapeHtml(form.phone)}${address}${note}
    </p>
    ${renderTotals(summary)}
    <p class="notice">Cette commande ne comprend pas de paiement en ligne. <mark>[Modalités de paiement à préciser par le restaurant]</mark></p>
    <button class="btn btn-outline" data-action="edit-order" ${busy}>Modifier</button>
    <button class="btn" data-action="confirm-order" ${busy}>${state.submitting ? "Envoi en cours…" : "Confirmer la commande"}</button>`;
}

function renderDoneStep() {
  const when = state.form.slot
    ? ` pour le ${formatSlot(new Date(state.form.slot))}`
    : "";
  return `
    <p class="message-success"><b>Commande enregistrée.</b> Votre commande n° <b>${escapeHtml(state.orderRef)}</b>${when} a bien été transmise au restaurant. Conservez ce numéro.</p>
    <p>Une question ? Appelez le restaurant : <mark>[Téléphone]</mark>.</p>
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

  if ((form.firstname || "").trim().length < 1) {
    errors.push("Indiquez votre prénom.");
  }

  if ((form.lastname || "").trim().length < 2) {
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

async function handleContactFormSubmit() {
  const name = $("#contact-name").value.trim();
  const email = $("#contact-email").value.trim();
  const message = $("#contact-message").value.trim();
  const status = $("#contact-status");

  const emailLooksValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

  if (name.length < 2 || !emailLooksValid || message.length < 10) {
    status.className = "message-error";
    status.textContent =
      "Vérifiez votre nom, une adresse e-mail valide et un message d’au moins 10 caractères.";
    return;
  }

  const sendButton = $("#contact-form button");
  sendButton.disabled = true;
  status.className = "";
  status.textContent = "Envoi en cours…";

  try {
    await postJson("api/contact.php", { name, email, message });
    status.className = "message-success";
    status.textContent = "Merci, votre message a bien été envoyé.";
    $("#contact-form").reset();
  } catch (error) {
    status.className = "message-error";
    status.textContent = error.message;
  } finally {
    sendButton.disabled = false;
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
        itemId: item.id,
        formatIndex,
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
      formuleId: formule.id,
      choices: choice.choices,
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

  // Envoie la commande au serveur (api/commande.php) ; la référence vient de la base
  async "confirm-order"() {
    if (state.submitting) return;
    state.submitting = true;
    state.errors = [];
    renderCart();

    const form = state.form;
    try {
      const result = await postJson("api/commande.php", {
        mode: state.mode,
        form: {
          firstname: form.firstname,
          lastname: form.lastname,
          phone: form.phone,
          address: state.mode === "delivery" ? form.address : "",
          slot: form.slot,
          note: form.note,
          adult: Boolean(form.adult),
          rgpd: Boolean(form.rgpd),
        },
        lines: state.cartLines.map(toOrderLine),
      });
      state.orderRef = result.reference;
      state.step = "done";
    } catch (error) {
      state.errors =
        error.details && error.details.length ? error.details : [error.message];
    }

    state.submitting = false;
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

// Ce qui ne dépend pas de la base de données
$("#allergen-legend").innerHTML = ALLERGENS.map(
  (name) => `<li>${name}</li>`,
).join("");

// Ce qui dépend des réglages et de la carte : dessiné une fois les données reçues
function renderDataSections() {
  $("#popular-items").innerHTML = POPULAR_ITEM_IDS.map((id) =>
    MENU_ITEMS.find((item) => item.id === id),
  )
    .filter(Boolean)
    .map(renderMenuCard)
    .join("");

  // Bandeau "allergènes provisoires" masqué une fois les données validées
  $("#provisional-notice").hidden = !allergensProvisional;

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
}

// Si la carte ne peut pas être chargée (serveur arrêté, base absente...)
function showMenuError() {
  const message = `<p class="notice">La carte est momentanément indisponible. Réessayez dans un instant ou appelez le restaurant : <mark>[Téléphone]</mark>.</p>`;
  $("#popular-items").innerHTML = message;
  $("#menu-items").innerHTML = message;
  $("#formules-grid").innerHTML = message;
}

// Charge la carte, les formules et les réglages depuis la base (api/menu.php)
async function loadMenu() {
  try {
    const response = await fetch("api/menu.php");
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    if (!data.items || !data.items.length) throw new Error("carte vide");

    Object.assign(SETTINGS, data.settings);
    allergensProvisional = !SETTINGS.allergensVerified;
    MENU_ITEMS = data.items;
    FORMULES = data.formules;
    renderDataSections();
  } catch (error) {
    console.error("Chargement de la carte impossible :", error);
    showMenuError();
  }
}

renderCart();
loadMenu();
