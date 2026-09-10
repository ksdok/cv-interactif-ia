# INFRA-11 — Adresse contact@kimsandok.com (transfert vers Gmail)

- **Priorité** : P3 · **Effort** : S (< 1 h) · **Statut** : ⬜
- **Dépendances** : aucune pour la mise en place infra. **Débloque** : le remplacement
  de l'email personnel par l'email pro dans SEO-01 (JSON-LD `Person.email`) et la
  cohérence NAP de GEO-09 (même contact partout).
- **Décision produit** : à faire plus tard (2026-09-10).

## Pourquoi

Aujourd'hui le contact公开 passe par `dokkimsan@gmail.com` (adresse perso) — visible
dans `data/cv.md` et, depuis SEO-01, dans le JSON-LD `Person.email`. Trois problèmes :

1. **Image / entité** : une adresse `@gmail.com` sur un domaine personnel `kimsandok.com`
   affaiblit le NAP (Name-Address-Phone) du GEO-09 — les LLM et les recruteurs croisent
   moins bien l'entité « Kim-san DOK » si le contact n'est pas sur le domaine.
2. **Vie privée** : l'adresse perso est récoltable par tout scraper qui lit le JSON-LD
   ou le `data/cv.md` rendu (cf. SEO-03). Une adresse `contact@kimsandok.com` découplée
   est plus propre à exposer.
3. **Pérennité** : si l'adresse perso change, un alias `contact@` reste stable — un seul
   point de redirection à mettre à jour.

Une **boîte mail complète** (Google Workspace ~6 €/mo) n'est pas nécessaire pour un usage
de CV : un simple **transfert** (alias sans stockage) vers `dokkimsan@gmail.com` suffit.

## État actuel du domaine (audit 2026-09-10)

- DNS géré par **Vercel** (`ns1/ns2.vercel-dns.com`).
- **Aucun enregistrement MX** présent → aucun mail configuré.
- **Vercel ne propose pas de mail/forwarding** → il faut passer par un tiers.

## Décision d'approche

| Option | Coût | Effort | Migration DNS | Verdict |
|---|---|---|---|---|
| **A. ImprovMX** | Gratuit | ~5 min | **Non** (ajout de MX dans le DNS Vercel actuel) | ✅ **Recommandée** |
| B. Cloudflare Email Routing | Gratuit | ~20 min | **Oui** (migrer DNS Vercel → Cloudflare, changer NS) | Alternative si migration DNS déjà planifiée |
| C. Google Workspace | ~6 €/mo | ~15 min | Non (MX Google) | Refusée — boîte complète non nécessaire pour un CV |

**Choix retenu : option A (ImprovMX)** — pas de migration DNS, pas de risque sur le
routage Vercel existant, mise en place en quelques minutes.

> Si la décision change pour B (Cloudflare), voir le plan alternatif en bas de ticket.

## Comment (plan d'implémentation — option A, ImprovMX)

1. **Créer le compte / alias sur ImprovMX** (https://app.improvmx.com) :
   - Domaine : `kimsandok.com`.
   - Alias : `contact@kimsandok.com` → forward to `dokkimsan@gmail.com`.
   - (Optionnel) catch-all `*@kimsandok.com` → `dokkimsan@gmail.com` pour absorber les
     fautes de frappe et futurs aliases sans reconfigurer.
2. **Ajouter les enregistrements MX dans le DNS Vercel** (Dashboard Vercel → projet →
   Settings → Domains → `kimsandok.com` → DNS records) :

   | Type | Nom | Valeur | Priorité |
   |---|---|---|---|
   | MX | `@` (ou `kimsandok.com`) | `mx1.improvmx.com` | 10 |
   | MX | `@` | `mx2.improvmx.com` | 20 |

   > MX records vérifiés sur le guide officiel ImprovMX (improvmx.com/guides/mx-records).
3. **Ajouter l'enregistrement SPF** (TXT, racine) pour autoriser ImprovMX à relayer :
   - `v=spf1 include:spf.improvmx.com ~all`
   - > À **vérifier sur le guide SPF ImprovMX au moment de l'implémentation**
     > (improvmx.com/guides/mx-spf-records) — la valeur exacte peut évoluer. Si d'autres
     > includes SPF existent déjà, **fusionner dans un seul** `v=spf1` (SPF n'accepte qu'un
     > seul enregistrement par domaine).
4. **Attendre la propagation DNS** (~ minutes à quelques heures).
5. **Test d'envoi** : depuis une adresse externe, envoyer un mail à `contact@kimsandok.com`
   → doit arriver dans la boîte `dokkimsan@gmail.com` (boîte de réception, pas spam).
6. **Anti-spam Gmail** : si Gmail marque le transfert comme suspect, créer un filtre
   Gmail `to:(contact@kimsandok.com) → Ne jamais envoyer au spam`. ImprovMX faisant du
   rewriting SRS, le SPF devrait passer sans ça, mais le filtre est un filet de sécurité.
7. **(Optionnel, plus tard) Envoyer DEPUIS contact@kimsandok.com** : ImprovMX permet
   d'envoyer via SMTP en configurant Gmail « Send mail as » avec les identifiants SMTP
   ImprovMX. Hors périmètre de ce ticket (réception seule suffit pour le CV).

## Fichiers impactés (code, après validation du transfert)

- `app/layout.tsx` — JSON-LD `Person.email` : `dokkimsan@gmail.com` → `contact@kimsandok.com`
- `data/cv.md` — ligne de contact : remplacer l'email perso par `contact@kimsandok.com`
- (Le DNS Vercel n'est pas dans le repo — configuration via dashboard.)

## Résultat attendu

`contact@kimsandok.com` reçoit du mail et le transfère vers `dokkimsan@gmail.com` ;
SPF valide ; l'email exposé publiquement (JSON-LD + CV) devient l'adresse pro du domaine.

## Critères d'acceptation

1. `dig MX kimsandok.com` retourne `mx1.improvmx.com` et `mx2.improvmx.com`.
2. `dig TXT kimsandok.com` contient un enregistrement SPF incluant `spf.improvmx.com`.
3. Un mail de test envoyé à `contact@kimsandok.com` depuis une adresse externe arrive
   dans la boîte de réception `dokkimsan@gmail.com` (pas dans spam).
4. L'en-tête `Authentication-Results` du mail reçu montre `spf=pass`.
5. (Suivi code) `app/layout.tsx` et `data/cv.md` exposent `contact@kimsandok.com` et plus
   l'adresse perso.

## KPI / Mesure

- Mail de test reçu en < 1 min après propagation.
- Taux de délivrabilité : pas de marquage spam sur 5 mails de test depuis des émetteurs
  différents (Gmail, Outlook, Proton).

---

## Plan alternatif — Option B (Cloudflare Email Routing)

Si la décision bascule sur Cloudflare (par ex. pour consolider le DNS sur l'écosystème
Cloudflare déjà utilisé) :

1. **Migrer le DNS de Vercel vers Cloudflare** :
   - Dans Cloudflare, ajouter le domaine `kimsandok.com`.
   - Recréer les enregistrements A/CNAME Vercel actuels (vérifier via
     `dig A kimsandok.com` avant migration) pour ne pas casser le routage web.
   - Changer les NS chez le registrar vers les NS Cloudflare attribués.
   - Attendre la propagation NS (jusqu'à 24-48 h, souvent < 1 h).
2. **Activer Email Routing** dans Cloudflare (Email → Email Routing → Onboard Domain) :
   - Cloudflare **ajoute automatiquement** les MX (`route1..4.mx.cloudflare.net`) et le
     SPF. Ne pas écraser un SPF existant — **fusionner** si besoin.
3. **Créer la route** : `contact@kimsandok.com` → `dokkimsan@gmail.com` (ou catch-all
   `*@kimsandok.com`).
4. Vérifier l'adresse de destination (Cloudflare envoie un mail de confirmation à
   `dokkimsan@gmail.com`).
5. Tests identiques aux critères d'acceptation ci-dessus.

> ⚠️ La migration DNS est **impactante** : une erreur sur les enregistrements A/CNAME
> peut rendre le site indisponible. À planifier avec une fenêtre de maintenance et un
> rollback possible (garder les anciens NS notés). Ne pas entreprendre uniquement pour
> le mail — à combiner avec une volonté de déplacer le DNS sur Cloudflare.