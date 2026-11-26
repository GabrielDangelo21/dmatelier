/* DM Atelier — panier : gardé dans le navigateur de la cliente, payé via Stripe Checkout.
   Les prix ici servent à l'affichage. Le prix réellement payé est recalculé par la fonction
   Netlify (netlify/functions/checkout.mjs) : si vous changez un prix, changez-le aux DEUX endroits. */

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
const LIVRAISON_OFFERTE = 150; // Belgique
const NOMS_ONGLES = { amande: "Amande", "carre-effile": "Carré effilé", naturelle: "Naturelle", squoval: "Squoval" };
const CLE_PANIER = "dm-panier";

const Panier = {
  lire() {
    try { const v = JSON.parse(localStorage.getItem(CLE_PANIER) || "[]"); return Array.isArray(v) ? v.filter((i) => CATALOGUE[i?.type]) : []; }
    catch { return []; }
  },
  ecrire(items) {
    try { localStorage.setItem(CLE_PANIER, JSON.stringify(items)); } catch { /* navigation privée : panier perdu en quittant */ }
    Panier.majCompteur();
    document.dispatchEvent(new CustomEvent("panier:change"));
  },
  // Même produit avec les mêmes options : on augmente la quantité au lieu d'ajouter une ligne.
  ajouter(item) {
    const items = Panier.lire();
    const cle = JSON.stringify([item.type, item.opts || {}]);
    const existant = items.find((i) => JSON.stringify([i.type, i.opts || {}]) === cle);
    if (existant) existant.qte = Math.min(10, existant.qte + (item.qte || 1));
    else items.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type: item.type, opts: item.opts || {}, qte: item.qte || 1 });
    Panier.ecrire(items);
  },
  changerQte(id, qte) {
    const items = Panier.lire().map((i) => (i.id === id ? { ...i, qte: Math.max(1, Math.min(10, qte)) } : i));
    Panier.ecrire(items);
  },
  retirer(id) { Panier.ecrire(Panier.lire().filter((i) => i.id !== id)); },
  vider() { Panier.ecrire([]); },
  nombre() { return Panier.lire().reduce((n, i) => n + i.qte, 0); },
  prixUnitaire(item) {
    const c = CATALOGUE[item.type];
    if (!c) return 0;
    if (item.type === "kit") {
      const o = item.opts || {};
      const couleurs = Object.values(o.ongles || {}).some(Boolean);
      return c.prix + (o.nom ? c.perso : 0) + (couleurs ? c.couleurs : 0);
    }
    if (item.type === "jetons") return (c.variantes[item.opts?.variante] || {}).prix || 0;
    return c.prix;
  },
  sousTotal() { return Panier.lire().reduce((s, i) => s + Panier.prixUnitaire(i) * i.qte, 0); },
  // Lignes de détail lisibles (panier, message WhatsApp).
  details(item) {
    const o = item.opts || {};
    if (item.type === "kit") {
      const l = [o.nom ? `Gravure « ${o.nom} » (+${CATALOGUE.kit.perso} €)` : "Kit normal, gravé Dayse Marques"];
      l.push(`Anneaux : ${(o.anneaux || "rouge").toLowerCase()}`);
      const ong = Object.entries(o.ongles || {}).filter(([, v]) => v).map(([f, v]) => `${NOMS_ONGLES[f] || f} en ${v.toLowerCase()}`);
      l.push(ong.length ? `Ongles : ${ong.join(", ")} (+${CATALOGUE.kit.couleurs} €)` : "Ongles blancs");
      return l;
    }
    if (item.type === "jetons") {
      const c = CATALOGUE.jetons;
      return [`Forme ${c.formes[o.forme] || o.forme}, ${(c.variantes[o.variante] || {}).nom || ""}`, "Monogramme DM"];
    }
    return [];
  },
  majCompteur() {
    const n = Panier.nombre();
    document.querySelectorAll("[data-panier-nb]").forEach((el) => { el.textContent = n; el.hidden = n === 0; });
    document.querySelectorAll(".panier-lien").forEach((a) => a.setAttribute("aria-label", a.dataset.aria.replace("{n}", n)));
  },
};
const eurosPanier = (n) => `${Number.isInteger(n) ? n : n.toFixed(2).replace(".", ",")} €`;
Panier.majCompteur();
// Le panier suit la cliente d'un onglet à l'autre.
window.addEventListener("storage", (e) => { if (e.key === CLE_PANIER) { Panier.majCompteur(); document.dispatchEvent(new CustomEvent("panier:change")); } });

// ---------- Page accessoires : boutons « Ajouter au panier » ----------
document.querySelectorAll("form[data-accessoire]").forEach((f) => {
  // Le prix affiché suit la version choisie (jetons : avec anneau 10 €, seul 8 €).
  const prixAff = f.querySelector("[data-prix-jetons]");
  if (prixAff) {
    const majPrix = () => { const v = f.querySelector('input[name="variante"]:checked'); if (v) prixAff.textContent = eurosPanier(Number(v.dataset.prix)); };
    f.addEventListener("change", majPrix);
    majPrix();
  }
  f.addEventListener("change", () => { const ok = f.querySelector(".ajoute"); if (ok) ok.hidden = true; });
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const type = f.dataset.accessoire;
    const opts = {};
    f.querySelectorAll("input:checked, input[type=hidden]").forEach((i) => { opts[i.name] = i.value; });
    Panier.ajouter({ type, opts, qte: 1 });
    const ok = f.querySelector(".ajoute");
    if (ok) { ok.hidden = false; ok.focus(); }
  });
});

// ---------- Page panier ----------
const zone = document.querySelector("#panier");
if (zone) {
  const liste = zone.querySelector("#panier-liste");
  const vide = zone.querySelector("#panier-vide");
  const resume = zone.querySelector("#panier-resume");
  const t = zone.dataset;
  const rendre = () => {
    const items = Panier.lire();
    const err = zone.querySelector("#panier-erreur"); if (err) err.hidden = true;
    vide.hidden = items.length > 0;
    resume.hidden = items.length === 0;
    liste.innerHTML = "";
    items.forEach((it) => {
      const c = CATALOGUE[it.type];
      if (!c) return;
      const li = document.createElement("li");
      li.className = "ligne";
      const pu = Panier.prixUnitaire(it);
      li.innerHTML = `
        <img src="${c.img}" alt="" width="120" height="150" loading="lazy">
        <div class="ligne-texte">
          <h3></h3>
          <ul class="ligne-details"></ul>
          <div class="ligne-actions">
            <div class="qte" role="group">
              <button type="button" class="moins"></button>
              <output></output>
              <button type="button" class="plus"></button>
            </div>
            <button type="button" class="lien-btn retirer"></button>
          </div>
        </div>
        <p class="ligne-prix"></p>`;
      li.querySelector("h3").textContent = c.nom;
      Panier.details(it).forEach((d) => { const x = document.createElement("li"); x.textContent = d; li.querySelector(".ligne-details").appendChild(x); });
      li.querySelector(".qte").setAttribute("aria-label", t.qte);
      li.querySelector("output").textContent = it.qte;
      const moins = li.querySelector(".moins"), plus = li.querySelector(".plus");
      moins.textContent = "−"; moins.setAttribute("aria-label", t.moins); moins.disabled = it.qte <= 1;
      plus.textContent = "+"; plus.setAttribute("aria-label", t.plus); plus.disabled = it.qte >= 10;
      moins.addEventListener("click", () => Panier.changerQte(it.id, it.qte - 1));
      plus.addEventListener("click", () => Panier.changerQte(it.id, it.qte + 1));
      const ret = li.querySelector(".retirer");
      ret.textContent = t.retirer;
      ret.addEventListener("click", () => Panier.retirer(it.id));
      li.querySelector(".ligne-prix").textContent = eurosPanier(pu * it.qte);
      liste.appendChild(li);
    });
    const st = Panier.sousTotal();
    zone.querySelector("#sous-total").textContent = eurosPanier(st);
    const manque = LIVRAISON_OFFERTE - st;
    const barre = zone.querySelector("#livraison-barre");
    barre.style.setProperty("--p", Math.min(1, st / LIVRAISON_OFFERTE));
    zone.querySelector("#livraison-msg").textContent = manque > 0
      ? t.manque.replace("{x}", eurosPanier(Math.round(manque * 100) / 100))
      : t.offerte;
    zone.querySelector("#livraison-cout").textContent = manque > 0 ? t.cout : t.coutOfferte;
    // WhatsApp : même panier, envoyé en message (hors Belgique, question…).
    const lignes = ["Bonjour DM Atelier ! Je souhaite commander :"];
    items.forEach((it) => {
      lignes.push(`${it.qte} × ${CATALOGUE[it.type].nom} : ${eurosPanier(Panier.prixUnitaire(it) * it.qte)}`);
      Panier.details(it).forEach((d) => lignes.push(`   ${d}`));
    });
    lignes.push(`Sous-total : ${eurosPanier(st)}`, "Livraison vers (pays et code postal) : ");
    const wa = zone.querySelector("#panier-whatsapp");
    if (wa && typeof waLien === "function") wa.href = waLien(lignes.join("\n"));
  };
  document.addEventListener("panier:change", rendre);
  rendre();

  const payer = zone.querySelector("#panier-payer");
  const erreur = zone.querySelector("#panier-erreur");
  payer.addEventListener("click", async () => {
    erreur.hidden = true;
    payer.disabled = true;
    payer.textContent = t.attente;
    try {
      const r = await fetch("/.netlify/functions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: Panier.lire().map(({ type, opts, qte }) => ({ type, opts, qte })) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.url) throw new Error(d.erreur || "erreur");
      location.href = d.url;
    } catch {
      erreur.hidden = false;
      payer.disabled = false;
      payer.textContent = t.payer;
    }
  });
}

// ---------- Page merci : la commande est payée, on vide le panier ----------
if (document.querySelector("[data-vider-panier]") && new URLSearchParams(location.search).get("session_id")) Panier.vider();
