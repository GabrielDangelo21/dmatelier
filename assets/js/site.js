/* DM Atelier — commande par WhatsApp, sans base de données. */

// Numéro WhatsApp Business de la boutique, format international sans + ni espaces.
// VIDE tant que le numéro n'existe pas : WhatsApp demande alors à qui envoyer.
const WHATSAPP = "32493733912"; // provisório: número do Gabriel até o WhatsApp Business da loja existir

// Textes du message WhatsApp, dans la langue de la page (<html lang>).
// Les noms des options traduits viennent des data-label du HTML.
const TEXTES = {
  fr: {
    sep: " : ",
    question: "Bonjour DM Atelier, j'ai une question : ",
    bonjour: "Bonjour DM Atelier ! Je souhaite commander :",
    produit: "Kit de fraises de démonstration (6 fraises, base, doigt, 5 ongles)",
    gravure: (nom) => `Gravure : « ${nom} »`,
    sansGravure: "Sans nom de salon",
    anneaux: "Anneaux",
    autre: "autre couleur, à préciser : ",
    fin: "Merci de m'indiquer le prix et le délai.",
    livraison: "Livraison vers (pays et code postal) : ",
  },
  nl: {
    sep: ": ",
    question: "Hallo DM Atelier, ik heb een vraag: ",
    bonjour: "Hallo DM Atelier! Ik wil graag bestellen:",
    produit: "Demonstratiekit met frezen (6 frezen, houder, vinger, 5 nagels)",
    gravure: (nom) => `Gravure: "${nom}"`,
    sansGravure: "Zonder salonnaam",
    anneaux: "Ringen",
    autre: "andere kleur, namelijk: ",
    fin: "Kunt u mij de prijs en de levertijd laten weten?",
    livraison: "Levering naar (land en postcode): ",
  },
  de: {
    sep: ": ",
    question: "Hallo DM Atelier, ich habe eine Frage: ",
    bonjour: "Hallo DM Atelier! Ich möchte bestellen:",
    produit: "Demo-Set mit Fräsern (6 Fräser, Halter, Finger, 5 Nägel)",
    gravure: (nom) => `Gravur: „${nom}“`,
    sansGravure: "Ohne Studionamen",
    anneaux: "Ringe",
    autre: "andere Farbe, und zwar: ",
    fin: "Bitte nennen Sie mir Preis und Lieferzeit.",
    livraison: "Lieferung nach (Land und Postleitzahl): ",
  },
  en: {
    sep: ": ",
    question: "Hello DM Atelier, I have a question: ",
    bonjour: "Hello DM Atelier! I would like to order:",
    produit: "Nail drill bit demo kit (6 bits, stand, finger, 5 nails)",
    gravure: (nom) => `Engraving: "${nom}"`,
    sansGravure: "No salon name",
    anneaux: "Rings",
    autre: "another colour: ",
    fin: "Could you tell me the price and lead time?",
    livraison: "Delivery to (country and postcode): ",
  },
};
const T = TEXTES[document.documentElement.lang] || TEXTES.fr;

const waLien = (texte) =>
  (WHATSAPP ? `https://wa.me/${WHATSAPP}` : "https://wa.me/") + "?text=" + encodeURIComponent(texte);

// Le nom tapé suit la visiteuse quand elle change de langue.
function garderGravureDansLangues(valeur) {
  document.querySelectorAll(".langues a[hreflang]").forEach((a) => {
    const url = new URL(a.getAttribute("href"), location.href);
    if (valeur) url.searchParams.set("gravure", valeur); else url.searchParams.delete("gravure");
    a.href = url.pathname + url.search;
  });
}

document.querySelectorAll("[data-wa-question]").forEach((a) => {
  a.href = waLien(T.question);
});

// Vidéo : lecture automatique sans son, sauf si la visiteuse a réduit les animations.
// Le bouton met en pause et relance.
const calme = matchMedia("(prefers-reduced-motion: reduce)");
document.querySelectorAll("video[data-auto]").forEach((video) => {
  const bouton = video.parentElement.querySelector(".pause");
  const etat = () => {
    const enPause = video.paused;
    bouton.classList.toggle("lire", enPause);
    bouton.setAttribute("aria-label", enPause ? bouton.dataset.lire : bouton.dataset.pause);
  };
  bouton.hidden = false;
  bouton.addEventListener("click", () => { video.paused ? video.play() : video.pause(); });
  video.addEventListener("play", etat);
  video.addEventListener("pause", etat);
  if (!calme.matches) video.play().catch(() => {});
  etat();
});

// Page du kit
const form = document.querySelector("#config");
if (form) {
  const champ = form.querySelector("#gravure");
  const depuisUrl = new URLSearchParams(location.search).get("gravure");
  if (depuisUrl) champ.value = depuisUrl.slice(0, Number(champ.maxLength) || 16);

  const choisi = (nom) => form.querySelector(`input[name="${nom}"]:checked`);
  const maj = () => {
    const nom = champ.value.trim();
    const anneau = choisi("anneaux");
    const couleur = anneau.value === "Autre" ? T.autre : anneau.dataset.label.toLowerCase();
    const lignes = [
      T.bonjour,
      T.produit,
      nom ? T.gravure(nom) : T.sansGravure,
      `${T.anneaux}${T.sep}${couleur}`,
      T.livraison,
      T.fin,
    ];
    form.querySelector("#commander").href = waLien(lignes.join("\n"));
    garderGravureDansLangues(nom);
  };
  form.addEventListener("input", maj);
  form.addEventListener("change", maj);
  maj();
}
