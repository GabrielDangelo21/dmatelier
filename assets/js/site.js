/* DM Atelier — commande par WhatsApp, sans base de données. */

// Numéro WhatsApp Business de la boutique, format international sans + ni espaces.
// VIDE tant que le numéro n'existe pas : WhatsApp demande alors à qui envoyer.
const WHATSAPP = "";

// Prix TTC par nombre de modules. EXEMPLE, à remplacer par les vrais prix.
const PRIX = { 1: 39, 2: 74, 3: 105 };

// Textes du site et du message WhatsApp, dans la langue de la page (<html lang>).
// Les valeurs des options (Ronds, Ivoire, Droite...) viennent des data-label du HTML.
const TEXTES = {
  fr: {
    locale: "fr-BE",
    sep: " : ",
    defaut: "Votre salon",
    question: "Bonjour DM Atelier, j'ai une question : ",
    flacons: (n) => `${n} flacons`,
    bonjour: "Bonjour DM Atelier ! Je souhaite commander :",
    produit: (m) => `Organisateur de vernis en gradins, ${m} module${m > 1 ? "s" : ""} (${m * 15} flacons)`,
    forme: "Flacons",
    couleur: "Couleur",
    gravure: (nom, style) => `Gravure : « ${nom} », style ${style}`,
    sansGravure: "Sans gravure",
    prix: (p) => `Prix affiché : ${p} TTC`,
    livraison: "Livraison vers (pays et code postal) : ",
  },
  nl: {
    locale: "nl-BE",
    sep: ": ",
    defaut: "Uw salon",
    question: "Hallo DM Atelier, ik heb een vraag: ",
    flacons: (n) => `${n} flesjes`,
    bonjour: "Hallo DM Atelier! Ik wil graag bestellen:",
    produit: (m) => `Trapvormige nagellakorganizer, ${m} module${m > 1 ? "s" : ""} (${m * 15} flesjes)`,
    forme: "Flesjes",
    couleur: "Kleur",
    gravure: (nom, style) => `Gravure: "${nom}", stijl ${style}`,
    sansGravure: "Zonder gravure",
    prix: (p) => `Getoonde prijs: ${p} incl. btw`,
    livraison: "Levering naar (land en postcode): ",
  },
  de: {
    locale: "de-DE",
    sep: ": ",
    defaut: "Ihr Studio",
    question: "Hallo DM Atelier, ich habe eine Frage: ",
    flacons: (n) => `${n} Fläschchen`,
    bonjour: "Hallo DM Atelier! Ich möchte bestellen:",
    produit: (m) => `Stufen-Organizer für Nagellack, ${m} Modul${m > 1 ? "e" : ""} (${m * 15} Fläschchen)`,
    forme: "Fläschchen",
    couleur: "Farbe",
    gravure: (nom, style) => `Gravur: „${nom}“, Stil ${style}`,
    sansGravure: "Ohne Gravur",
    prix: (p) => `Angezeigter Preis: ${p} inkl. MwSt.`,
    livraison: "Lieferung nach (Land und Postleitzahl): ",
  },
  en: {
    locale: "en-IE",
    sep: ": ",
    defaut: "Your salon",
    question: "Hello DM Atelier, I have a question: ",
    flacons: (n) => `${n} bottles`,
    bonjour: "Hello DM Atelier! I would like to order:",
    produit: (m) => `Tiered nail polish organiser, ${m} module${m > 1 ? "s" : ""} (${m * 15} bottles)`,
    forme: "Bottles",
    couleur: "Colour",
    gravure: (nom, style) => `Engraving: "${nom}", ${style} style`,
    sansGravure: "No engraving",
    prix: (p) => `Price shown: ${p} incl. VAT`,
    livraison: "Delivery to (country and postcode): ",
  },
};
const T = TEXTES[document.documentElement.lang] || TEXTES.fr;

const waLien = (texte) =>
  (WHATSAPP ? `https://wa.me/${WHATSAPP}` : "https://wa.me/") + "?text=" + encodeURIComponent(texte);

const euros = (n) => n.toLocaleString(T.locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

// Gravure en direct : le champ alimente tous les [data-gravure].
function gravureEnDirect(source) {
  const cibles = document.querySelectorAll("[data-gravure]");
  const maj = () => {
    const t = source.value.trim() || T.defaut;
    cibles.forEach((c) => { c.textContent = t; });
  };
  source.addEventListener("input", maj);
  maj();
}

// Le nom tapé suit la visiteuse quand elle change de langue.
function garderGravureDansLangues(valeur) {
  document.querySelectorAll(".langues a[hreflang]").forEach((a) => {
    const url = new URL(a.getAttribute("href"), location.href);
    if (valeur) url.searchParams.set("gravure", valeur); else url.searchParams.delete("gravure");
    a.href = url.pathname + url.search;
  });
}

// Accueil
const essai = document.querySelector("#essai-nom");
if (essai) {
  const depuisUrl = new URLSearchParams(location.search).get("gravure");
  if (depuisUrl) essai.value = depuisUrl.slice(0, 22);
  gravureEnDirect(essai);
  const lienProduit = document.querySelector("#vers-produit");
  const garder = () => {
    const v = essai.value.trim();
    lienProduit.href = "organisateur.html" + (v ? "?gravure=" + encodeURIComponent(v) : "");
    garderGravureDansLangues(v);
  };
  essai.addEventListener("input", garder);
  garder();
}
document.querySelectorAll("[data-wa-question]").forEach((a) => {
  a.href = waLien(T.question);
});

// Page produit
const form = document.querySelector("#config");
if (form) {
  const champ = form.querySelector("#gravure");
  const depuisAccueil = new URLSearchParams(location.search).get("gravure");
  if (depuisAccueil) champ.value = depuisAccueil.slice(0, 22);
  gravureEnDirect(champ);

  const val = (nom) => form.querySelector(`input[name="${nom}"]:checked`);
  const libelle = (nom) => { const i = val(nom); return i.dataset.label || i.value; };
  const maj = () => {
    const modules = Number(val("modules").value);
    const prix = PRIX[modules];
    form.querySelector("#prix").textContent = euros(prix);
    form.querySelector("#flacons").textContent = T.flacons(modules * 15);

    const style = val("style").value;
    document.querySelectorAll("[data-gravure]").forEach((g) => g.classList.toggle("classique", style === "Classique"));

    const nom = champ.value.trim();
    const lignes = [
      T.bonjour,
      T.produit(modules),
      `${T.forme}${T.sep}${libelle("forme").toLowerCase()}`,
      `${T.couleur}${T.sep}${libelle("couleur")}`,
      nom ? T.gravure(nom, libelle("style").toLowerCase()) : T.sansGravure,
      T.prix(euros(prix)),
      T.livraison,
    ];
    form.querySelector("#commander").href = waLien(lignes.join("\n"));
    garderGravureDansLangues(nom);
  };
  form.addEventListener("input", maj);
  form.addEventListener("change", maj);
  maj();
}
