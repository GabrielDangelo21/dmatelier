// DM Atelier — crée la page de paiement Stripe (Checkout) à partir du panier.
// Les prix sont recalculés ICI : on ne fait jamais confiance au prix envoyé par le navigateur.
// Si vous changez un prix, changez-le aussi dans assets/js/panier.js (affichage).
//
// Variable à définir dans Netlify (Site configuration > Environment variables) :
//   STRIPE_SECRET_KEY = clé secrète Stripe (rk_live_... restreinte, ou sk_live_...)
// Elle ne doit JAMAIS être écrite dans ce dépôt.

const CATALOGUE = {
  kit: { nom: "Kit doigt de démonstration 3D", prix: 119, perso: 20, couleurs: 10, img: "assets/img/fraises-set-deux-ongles.webp" },
  "porte-cotons": { nom: "Porte-cotons et cotons-tiges", prix: 12, img: "assets/img/accessoires/porte-cotons-1.webp" },
  jetons: {
    nom: "Jetons de caddie porte-clés, lot de 30",
    img: "assets/img/accessoires/jeton-caddie-1.webp",
    variantes: { "avec-anneau": { nom: "avec anneau et sachet individuel", prix: 30 } },
    formes: { ovale: "ovale", goutte: "goutte", etiquette: "étiquette" },
  },
  // Porte-pinceaux (15 €) : à ajouter quand les photos seront prêtes.
};
const LIVRAISON_OFFERTE = 150; // euros, Belgique
const LIVRAISONS = [
  { nom: "Belgique, point relais DPD", prix: 5 },
  { nom: "Belgique, à domicile DPD", prix: 7 },
];
const ANNEAUX = ["Rouge"]; // « Autre couleur » passe par WhatsApp
const COULEURS = ["Bordeaux", "Orange", "Jaune", "Vert", "Bleu", "Violet", "Fuchsia", "Rose pâle", "Blanc nacré", "Marron"];
const ONGLES = { amande: "Amande", "carre-effile": "Carré effilé", naturelle: "Naturelle", squoval: "Squoval" };

const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

// Valide une ligne et renvoie { nom, description, prix (euros), qte, image, resume } ou lève une erreur.
function ligne(item) {
  const qte = Number(item?.qte);
  if (!Number.isInteger(qte) || qte < 1 || qte > 10) throw new Error("quantité");
  const o = item?.opts && typeof item.opts === "object" ? item.opts : {};
  const c = CATALOGUE[item?.type];
  if (!c) throw new Error("produit");

  if (item.type === "kit") {
    const nom = typeof o.nom === "string" ? o.nom.trim() : "";
    if (nom.length > 16) throw new Error("gravure");
    const anneaux = o.anneaux || "Rouge";
    if (!ANNEAUX.includes(anneaux)) throw new Error("anneaux");
    const ongles = {};
    for (const [f, v] of Object.entries(o.ongles || {})) {
      if (!v) continue;
      if (!ONGLES[f] || !COULEURS.includes(v)) throw new Error("ongles");
      ongles[f] = v;
    }
    const avecCouleurs = Object.keys(ongles).length > 0;
    const prix = c.prix + (nom ? c.perso : 0) + (avecCouleurs ? c.couleurs : 0);
    const d = [
      nom ? `Gravure « ${nom} »` : "Kit normal, gravé Dayse Marques",
      `Anneaux ${anneaux.toLowerCase()}`,
      avecCouleurs ? "Ongles : " + Object.entries(ongles).map(([f, v]) => `${ONGLES[f]} ${v.toLowerCase()}`).join(", ") : "Ongles blancs",
    ];
    return { nom: c.nom, description: d.join(". "), prix, qte, image: c.img, resume: `${qte}x kit | ${d.join(" | ")}` };
  }

  if (item.type === "jetons") {
    const v = c.variantes[o.variante];
    const forme = c.formes[o.forme];
    if (!v || !forme) throw new Error("jetons");
    const d = `Forme ${forme}, ${v.nom}, monogramme DM`;
    return { nom: c.nom, description: d, prix: v.prix, qte, image: c.img, resume: `${qte}x jetons | ${d}` };
  }

  return { nom: c.nom, description: "", prix: c.prix, qte, image: c.img, resume: `${qte}x ${item.type}` };
}

// Stripe attend du x-www-form-urlencoded avec des clés imbriquées : a[b][0][c]=...
function formulaire(obj, prefixe = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    const cle = prefixe ? `${prefixe}[${k}]` : k;
    if (typeof v === "object") formulaire(v, cle, out);
    else out.append(cle, String(v));
  }
  return out;
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { erreur: "méthode" });
  const cle = process.env.STRIPE_SECRET_KEY;
  if (!cle) return json(503, { erreur: "paiement indisponible" });

  let lignes;
  try {
    const corps = await req.json();
    if (!Array.isArray(corps?.items) || corps.items.length === 0 || corps.items.length > 20) throw new Error("panier");
    lignes = corps.items.map(ligne);
  } catch (e) {
    return json(400, { erreur: `panier invalide (${e.message})` });
  }

  const site = (process.env.URL || new URL(req.url).origin).replace(/\/$/, "");
  const sousTotal = lignes.reduce((s, l) => s + l.prix * l.qte, 0);
  const livraisons = sousTotal >= LIVRAISON_OFFERTE
    ? [{ nom: "Livraison offerte (DPD, Belgique)", prix: 0 }]
    : LIVRAISONS;

  const session = {
    mode: "payment",
    locale: "fr",
    success_url: `${site}/merci.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/panier.html`,
    allow_promotion_codes: "true",
    phone_number_collection: { enabled: "true" },
    shipping_address_collection: { allowed_countries: ["BE"] },
    line_items: lignes.map((l) => ({
      quantity: l.qte,
      price_data: {
        currency: "eur",
        unit_amount: Math.round(l.prix * 100),
        product_data: { name: l.nom, description: l.description, images: [`${site}/${l.image}`] },
      },
    })),
    shipping_options: livraisons.map((s) => ({
      shipping_rate_data: {
        type: "fixed_amount",
        display_name: s.nom,
        fixed_amount: { amount: s.prix * 100, currency: "eur" },
        delivery_estimate: { minimum: { unit: "business_day", value: 1 }, maximum: { unit: "business_day", value: 2 } },
      },
    })),
    // Le détail de chaque ligne, lisible par la Dayse dans le tableau de bord Stripe (500 caractères max par clé).
    metadata: Object.fromEntries(lignes.map((l, i) => [`ligne_${i + 1}`, l.resume.slice(0, 500)])),
    payment_intent_data: { description: lignes.map((l) => l.resume).join(" / ").slice(0, 1000) },
  };

  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: formulaire(session),
  });
  const d = await r.json();
  if (!r.ok) {
    console.error("Stripe:", d?.error?.message);
    return json(502, { erreur: "Stripe" });
  }
  return json(200, { url: d.url });
};
