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
    produit: "Kit doigt de démonstration 3D (doigt 20 cm, 4 ongles, 6 embouts et support, 2 limes)",
    ongles: "Couleurs des ongles (supplément)",
    logo: "Logo sur le support : je joins le fichier à ce message.",
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

// Logo de la cliente : lu sur son appareil, jamais envoyé.
// Transformé en marque d'une couleur (comme une gravure) et posé sur la face du support.
let logoCharge = false;
function gravureDuLogo(img) {
  const w0 = img.naturalWidth || 600, h0 = img.naturalHeight || 300;
  const k = Math.min(1, 900 / w0, 400 / h0);
  const w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
  const tmp = document.createElement("canvas");
  tmp.width = w; tmp.height = h;
  const ctx = tmp.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h), px = d.data;
  // Fond transparent ? On garde la forme. Sinon on sépare l'encre du fond par la luminosité.
  let transparents = 0;
  for (let i = 3; i < px.length; i += 4) if (px[i] < 200) transparents++;
  const parAlpha = transparents > (w * h) * 0.02;
  const lum = (i) => 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
  let fond = 0;
  if (!parAlpha) {
    const coins = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + w - 1) * 4];
    fond = coins.reduce((a, i) => a + lum(i), 0) / 4;
  }
  let x0 = w, y0 = h, x1 = -1, y1 = -1, somme = 0, n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const encre = parAlpha ? px[i + 3] > 128 : Math.abs(lum(i) - fond) > 48;
    px[i] = 24; px[i + 1] = 25; px[i + 2] = 28; px[i + 3] = encre ? 205 : 0;
    if (encre) { somme += x; n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return null;
  ctx.putImageData(d, 0, 0);
  const out = document.querySelector("#logo-canvas");
  out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext("2d").drawImage(tmp, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  // Centrage optique : un logo plus lourd d'un côté (pastille + texte fin) paraît décentré
  // si on centre sa boîte. On le décale vers le côté léger, sans dépasser 12 % de sa largeur.
  const ecart = (somme / n - (x0 + x1) / 2) / out.width;
  out.style.translate = `${Math.max(-12, Math.min(12, -ecart * 60)).toFixed(1)}% 0`;
  return out;
}

// Page du kit
const form = document.querySelector("#config");
if (form) {
  const champ = form.querySelector("#gravure");
  const depuisUrl = new URLSearchParams(location.search).get("gravure");
  if (depuisUrl) champ.value = depuisUrl.slice(0, Number(champ.maxLength) || 16);

  const choisi = (nom) => form.querySelector(`input[name="${nom}"]:checked`);
  const maj = () => {
    const nom = champ.value.trim();
    const ongles = (form.querySelector("#ongles")?.value || "").trim();
    const anneau = choisi("anneaux");
    const couleur = anneau.value === "Autre" ? T.autre : anneau.dataset.label.toLowerCase();
    const lignes = [
      T.bonjour,
      T.produit,
      nom ? T.gravure(nom) : T.sansGravure,
      `${T.anneaux}${T.sep}${couleur}`,
      ...(ongles && T.ongles ? [`${T.ongles}${T.sep}${ongles}`] : []),
      ...(logoCharge && T.logo ? [T.logo] : []),
      T.livraison,
      T.fin,
    ];
    form.querySelector("#commander").href = waLien(lignes.join("\n"));
    garderGravureDansLangues(nom);
  };
  form.addEventListener("input", maj);
  form.addEventListener("change", maj);

  // Aperçu du support : le logo, ou à défaut le nom du salon.
  const fichier = form.querySelector("#logo-fichier");
  if (fichier) {
    const canvas = form.querySelector("#logo-canvas");
    const nomGrave = form.querySelector("#logo-nom");
    const etat = form.querySelector("#logo-etat");
    const retirer = form.querySelector("#logo-retirer");
    const taille = form.querySelector("#logo-taille");
    const blocTaille = form.querySelector(".logo-taille");
    const face = form.querySelector(".support-apercu .face");
    const defaut = nomGrave.textContent;
    const afficher = () => {
      canvas.hidden = !logoCharge; nomGrave.hidden = logoCharge;
      retirer.hidden = !logoCharge; blocTaille.hidden = !logoCharge;
      nomGrave.textContent = champ.value.trim() || defaut;
    };
    champ.addEventListener("input", afficher);
    taille.addEventListener("input", () => face.style.setProperty("--taille", taille.value / 100));
    fichier.addEventListener("change", () => {
      const f = fichier.files[0];
      if (!f) return;
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => {
        logoCharge = !!gravureDuLogo(img);
        etat.textContent = logoCharge ? etat.dataset.ok : etat.dataset.erro;
        URL.revokeObjectURL(url); afficher(); maj();
      };
      img.onerror = () => { logoCharge = false; etat.textContent = etat.dataset.erro; URL.revokeObjectURL(url); afficher(); maj(); };
      img.src = url;
    });
    retirer.addEventListener("click", () => {
      logoCharge = false; fichier.value = ""; etat.textContent = etat.dataset.vazio; afficher(); maj(); form.querySelector("#logo-ajouter").focus();
    });
    form.querySelector("#logo-ajouter").addEventListener("click", () => fichier.click());
    afficher();
  }
  maj();
}
