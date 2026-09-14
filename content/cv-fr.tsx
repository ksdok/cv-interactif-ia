// content/cv-fr.tsx
// GEO-08h — Contenu éditorial FR de la page CV (/fr/cv).
// Dérivé de data/cv.md (source FR du chatbot, wording métier conservé) dans la
// structure éditoriale co-rédigée de content/cv-en.tsx. Les deux fichiers
// partagent la même mise en page ; seul le wording diffère. Convention corpus
// 🔗 SEO-03 : le positionnement est « Business Analyst / AMOA, finance de
// marché » (pas « Product Designer »).
//
// La page app/[lang]/cv/page.tsx ne gère que le metadata + le shell de page.

import type { ReactNode } from 'react'
import Link from 'next/link'
import type { Lang } from '@/lib/i18n/config'

const KICKER = 'text-[0.7rem] uppercase tracking-[0.3em] text-secondary font-semibold'
const SECTION_TITLE = 'text-3xl md:text-4xl font-bold tracking-tighter text-on-surface mt-2 mb-10'
const BODY = 'text-on-surface-variant leading-relaxed'

function Section({ id, kicker, title, children }: { id: string; kicker: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mb-24">
      <span className={KICKER}>{kicker}</span>
      <h2 className={SECTION_TITLE}>{title}</h2>
      {children}
    </section>
  )
}

export default function CvContentFr({ lang }: { lang: Lang }) {
  return (
    <div className="max-w-5xl mx-auto px-8 py-24">
      {/* ---------------------------------------------------------------- Header */}
      <header className="mb-24">
        <span className={KICKER}>Curriculum Vitae</span>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-on-surface leading-[1.05] mt-2 mb-6">
          Kim-san DOK
        </h1>
        <p className="text-xl md:text-2xl text-on-surface font-light leading-relaxed max-w-3xl">
          Business Analyst Senior Freelance · AMOA · Finance de marché — 10 ans à faire le lien
          entre métier et IT sur des systèmes de marché critiques &amp; post-marché.
        </p>
        <p className="text-secondary text-sm mt-6">
          Paris, France · dokkimsan@gmail.com · kimsandok.com
        </p>
      </header>

      {/* ---------------------------------------------------------------- Profile */}
      <Section id="profil" kicker="Profil" title="Business Analyst Senior, Finance de marché">
        <p className={`${BODY} text-xl`}>
          Business Analyst Senior avec{' '}
          <strong className="text-on-surface">10 ans d’expérience en finance de marché</strong>,
          intervenant sur des systèmes critiques à forte volumétrie chez Société Générale.
          Spécialisé dans la simplification de SI complexes, la réduction des coûts et la
          sécurisation des processus front-to-back — en faisant le lien entre équipes métier
          et IT pour livrer des solutions robustes, scalables et prêtes pour la production sur{' '}
          <strong className="text-on-surface">Securities Lending, Repo, Forex et Hedging</strong>.
        </p>
      </Section>

      {/* ---------------------------------------------------------------- Key figures */}
      <Section id="chiffres" kicker="En chiffres" title="Impact sélectionné">
        <div className="overflow-hidden border border-surface-variant rounded-lg">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-surface-variant">
              <Figure figure="10 ans" context="Business Analyst en finance de marché" />
              <Figure figure="14 M de transactions/an" context="Plateforme Securities Lending / Repo / Triparty — scalabilité ×4 cadrée" />
              <Figure figure="500 000€/an d’économies" context="Remplacement de Kondor+ et K+TP (Front + Back Office) par des solutions internes" />
              <Figure figure="Ouverture de nouvelles activités" context="Migration de 4Sight Financial vers SFCM (Repo, Triparty)" />
            </tbody>
          </table>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- Expertise */}
      <Section id="expertises" kicker="Expertises" title="Trois axes de compétence">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-surface-variant border border-surface-variant rounded-lg overflow-hidden">
          <ExpertiseCol
            label="Finance de marché"
            items={['Securities Lending', 'Repo', 'Forex', 'Hedging', 'Triparty', 'Collatéral', 'OST', 'Settlement', 'Billing', 'Référentiel']}
          />
          <ExpertiseCol
            label="Business Analysis / AMOA"
            items={['Cadrage besoins', 'Cartographie processus', 'Spécifications fonctionnelles', 'Recette / UAT', 'KPI & Monitoring', 'Gestion incidents critiques']}
          />
          <ExpertiseCol
            label="Outils & technique"
            items={['SFCM Broadridge', 'Kondor+', 'TIBCO BusinessWorks', 'SQL', 'Unix Shell', 'Java', 'Agile / Scrum', 'PSM I', 'BDD', 'IA générative pour cadrage & recette']}
          />
        </div>
      </Section>

      {/* ---------------------------------------------------------------- Experience */}
      <Section id="experiences" kicker="Expériences" title="5 rôles sur 10 ans">
        <div className="space-y-16">
          <Article
            role="Analyste SI Senior — Securities Lending, Repo & Triparty"
            org="Société Générale, La Défense"
            dates="Juil. 2025 – Juin 2026"
            context="Intervention sur X-One Secloan, application critique globale utilisée pour les opérations de Repo, Securities Lending, Triparty et collatéral par les équipes Front Office et Sales (US, Europe, Asie), couvrant l’ensemble du cycle de vie des opérations."
            points={[
              'Contribution à la migration de la gestion du settlement des opérations Repo, Securities Lending, Triparty et collatéral vers la solution GTPM (Broadridge) ; animation de workshops avec l’éditeur pour formaliser les besoins et arbitrer les choix fonctionnels.',
              'Cadrage de la scalabilité de la plateforme (14 M de transactions annuelles, montée en charge ×4) — identification des points de fragilité (bases de données, traitements critiques) et priorisation des actions correctives pour respecter les SLA.',
              'Mise en place d’un monitoring structuré par processus pour anticiper les incidents et sécuriser la production ; formalisation de la documentation pour réduire la dépendance aux connaissances implicites.',
              'Alignement du design applicatif X-One avec les standards du groupe — réutilisabilité des composants et réduction de la dette technique.',
              'Cartographie des processus front-to-back et définition de KPI pour clarifier les responsabilités et piloter la performance opérationnelle.',
            ]}
          />
          <Article
            role="Analyste SI Senior — Forex / Hedging"
            org="Société Générale"
            dates="Juin 2022 – Juil. 2025"
            context="Référent fonctionnel sur les activités Forex, Share Class Hedging et Multi-Currency Hedging, dans un contexte de transformation et de simplification du système d’information."
            points={[
              'Rôle clé dans le remplacement des solutions Kondor+ (Front Office) et K+TP (Back Office) par des solutions internes — environ 500 000€/an d’économies de licences et de support, et une simplification significative de l’architecture SI.',
              'Intervention sur l’ensemble du cycle projet (cadrage des besoins, spécifications, phases de test et déploiement) pour sécuriser les livraisons sur des flux critiques.',
              'Contribution à la transformation organisationnelle en recentrant l’activité sur le Front Office, tandis que les fonctions Back Office ont été mutualisées et transférées vers X-One FX.',
              'Migration des environnements Solaris vers Red Hat Linux pour améliorer la maintenabilité et réduire les coûts d’exploitation de 500 000€/an.',
            ]}
          />
          <Article
            role="Analyste SI — Agency Securities Lending"
            org="Société Générale"
            dates="Juin 2016 – Juin 2022"
            context="Référent technico-fonctionnel sur les activités prêts/emprunts de titres et réinvestissement de cash, avec interactions directes avec le Front Office et les équipes Middle/Back Office (settlement, collatéral, billing, OST, référentiel)."
            points={[
              'Intervention sur des flux critiques de marché soumis à des contraintes de cut-off, notamment sur les opérations de réinvestissement de cash à échéance intraday.',
              'Rôle clé dans la migration de la plateforme de trading 4Sight Financial vers SFCM — ouverture à de nouvelles activités (Repo et Triparty) et évolution du périmètre métier.',
              'Animation de workshops avec l’éditeur Broadridge afin d’adapter la solution aux besoins métier et accompagner les évolutions fonctionnelles.',
              'Intervention sur l’ensemble du cycle projet (cadrage, spécifications, tests, déploiement) pour sécuriser les mises en production.',
              'Onboarding de nouveaux clients internes et externes, avec coordination des équipes métier, IT et support pour garantir un démarrage sécurisé.',
              'Migration et modernisation des traitements TIBCO (Solaris → Red Hat Linux, montée de version) pour gérer les messages MX et réduire les coûts de maintenance.',
            ]}
          />
          <Article
            role="Référentiel Administration de Fonds"
            org="BNP Paribas Securities & Services, Pantin"
            dates="Nov. 2014 – Mai 2016"
            context="Membre d’une équipe référentiel en charge de la gestion des prix pour la valorisation des fonds."
            points={[
              'Assurer la cohérence des informations financières auprès des fournisseurs (Bloomberg, Reuters).',
              'Contrôle de l’intégration des prix (clients et fournisseurs) dans les outils internes.',
              'Analyse et développement de services spécifiques pour l’onboarding de nouveaux clients.',
              'Implémentation de nouvelles politiques de contrôle et processus de production pour l’amélioration continue de l’équipe Référentiel.',
              'Succès : automatisation de la récupération et de la validation des prix provenant de Reuters.',
            ]}
          />
          <Article
            role="Développeur Web"
            org="University of New South Wales, Sydney, Australie"
            dates="Août 2013 – Août 2014"
            context="Membre du groupe d’études « New Financial Services » dirigé par le Prof. Fethi Rahbi."
            points={[
              'Développement d’une application web (D3.js) pour visualiser les impacts des opérations sur titres sur les différents marchés via des graphes interactifs.',
              'Développement d’un outil Java pour récupérer, extraire et nettoyer des données financières provenant de Reuters.',
              'Succès : l’application web a été utilisée lors de démonstrations aux sponsors des recherches du professeur.',
            ]}
          />
        </div>
      </Section>

      {/* ---------------------------------------------------------------- Skills & Certs */}
      <Section id="competences" kicker="Compétences & Certifications" title="Boîte à outils">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          <SkillRow term="Certification" items={['Professional Scrum Master I (PSM I)']} />
          <SkillRow term="Langues" items={['Anglais — courant (TOEIC 895)', 'Khmer — courant', 'Français — courant', 'Japonais — débutant']} />
          <SkillRow term="Langages" items={['SQL', 'Unix shell', 'Java', 'HTML', 'CSS']} />
          <SkillRow term="Logiciels" items={['SFCM Broadridge', 'Kondor+', 'TIBCO BusinessWorks']} />
        </dl>
      </Section>

      {/* ---------------------------------------------------------------- Education */}
      <Section id="formation" kicker="Formation" title="Parcours académique">
        <ul className="space-y-6">
          <EduRow degree="Master — Management des Systèmes d’Information" school="ESIEE Paris, Champs-sur-Marne" years="2012 – 2014" />
          <EduRow degree="Licence — Mathématiques et Informatique" school="Université de Marne-la-Vallée, Champs-sur-Marne" years="2011 – 2012" />
          <EduRow degree="DUT — Informatique" school="IUT de Villetaneuse, Paris 13" years="2011" />
        </ul>
      </Section>

      {/* ---------------------------------------------------------------- Personal projects */}
      <Section id="projets" kicker="Projets personnels" title="Construits en dehors du poste">
        <div className="space-y-8">
          <Project
            name="Site CV interactif IA"
            what="Ce site — les recruteurs discutent avec un assistant IA (Nicky) pour poser des questions sur le parcours du candidat. Réponses fondées sur le CV réel via CAG (Cache-Augmented Generation), avec prompt caching provider-side pour réduire le coût et la latence."
            stack="Next.js 16, TypeScript, Tailwind 4, Supabase (pgvector), Vercel — multi-provider OpenAI/Gemini avec fallback automatique. Inclut un Job Matcher analysant l’adéquation CV/offre d’emploi."
            url="github.com/ksdok/cv-interactif-ia"
          />
          <Project
            name="Menu Renzu"
            what="Application iOS qui lit les menus de restaurant de n’importe quel pays par IA vision — photographier une ou plusieurs cartes, obtenir texte original, romanisation, traduction, catégories et prix, puis composer une commande lue à voix haute dans la langue du menu. Sessions multi-photos avec détection de doublons, BYOK (clés en Keychain) ou proxy Cloudflare Worker sécurisé par App Attest."
            stack="Swift / SwiftUI (MVVM, iOS 16+), Gemini 2.5 Flash-Lite Vision avec fallback GPT-4o Vision, TTS OpenAI / ElevenLabs, Cloudflare Workers + App Attest, SwiftData, String Catalog EN/FR/KM — 599 tests Swift + 243 tests Worker."
            url="menurenzu.app"
          />
          <Project
            name="YouTube Audio Converter"
            what="Script Bash modulaire pour extraire l’audio de vidéos YouTube et le convertir en MP3 (qualité maximale). Multi-source (URL unique, multiple, fichier texte), mode playlist, anti-doublons, dry-run preview, assistant interactif."
            stack="yt-dlp + ffmpeg — installable via install.sh."
            url="github.com/ksdok/youtube-audio-converter"
          />
          <Project
            name="Hermes Skills"
            what="Collection de skills pour Hermes Agent (agent IA par Nous Research). Chaque skill est un module réutilisable avec son fichier SKILL.md (YAML frontmatter + markdown)."
            stack="Markdown / YAML."
            url="github.com/ksdok/hermes-skills"
          />
        </div>
      </Section>

      {/* ---------------------------------------------------------------- Interests */}
      <Section id="interets" kicker="Au-delà du travail" title="Intérêts">
        <ul className="space-y-3 text-on-surface-variant">
          <li><span className="text-on-surface font-medium">Cyclisme</span> — les cols de montagne avec les amis.</li>
          <li><span className="text-on-surface font-medium">Course</span> — Marathon de Paris, semi-marathon de Paris, Oxy’Trail, 10KM de Paris.</li>
        </ul>
      </Section>

      {/* ---------------------------------------------------------------- Contact */}
      <Section id="contact" kicker="Contact" title="Discutons">
        <p className={BODY}>
          Disponible pour des missions freelance Business Analyst / AMOA en finance de marché.
          Contactez-moi pour évoquer vos besoins :
        </p>
        <ul className="mt-6 space-y-2 text-on-surface">
          <li>E-mail : <a className="underline decoration-surface-variant underline-offset-4 hover:text-secondary" href="mailto:dokkimsan@gmail.com">dokkimsan@gmail.com</a></li>
          <li>Site : <a className="underline decoration-surface-variant underline-offset-4 hover:text-secondary" href="https://kimsandok.com">kimsandok.com</a></li>
        </ul>
        <p className="mt-10 text-secondary text-sm">
          Plutôt une conversation ?{' '}
          <Link className="underline underline-offset-4 hover:text-on-surface" href={`/${lang}`}>
            Discutez avec Nicky, mon jumeau numérique IA →
          </Link>
        </p>
      </Section>
    </div>
  )
}

/* ------------------------------------------------------------------ helpers */

function Figure({ figure, context }: { figure: string; context: string }) {
  return (
    <tr className="bg-surface-container-lowest">
      <th scope="row" className="font-semibold text-on-surface px-5 py-4 align-top text-left">
        {context}
      </th>
      <td className="text-on-surface-variant px-5 py-4 text-right whitespace-nowrap w-[40%]">{figure}</td>
    </tr>
  )
}

function ExpertiseCol({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="bg-surface-container-lowest p-6">
      <h3 className="text-on-surface font-semibold mb-4">{label}</h3>
      <ul className="space-y-2 text-sm text-on-surface-variant">
        {items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
    </div>
  )
}

function Article({ role, org, dates, context, points }: { role: string; org: string; dates: string; context: string; points: string[] }) {
  return (
    <article>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 mb-1">
        <h3 className="text-xl font-semibold text-on-surface tracking-tight">{role}</h3>
        <time className="text-secondary text-sm whitespace-nowrap">{dates}</time>
      </div>
      <p className="text-secondary text-sm mb-4">{org}</p>
      <p className={`${BODY} mb-5`}>{context}</p>
      <ul className="space-y-3 text-on-surface-variant">
        {points.map((p, i) => (
          <li key={i} className="pl-5 relative before:content-[''] before:absolute before:left-0 before:top-[0.6em] before:w-2 before:h-px before:bg-secondary">
            {p}
          </li>
        ))}
      </ul>
    </article>
  )
}

function SkillRow({ term, items }: { term: string; items: string[] }) {
  return (
    <div>
      <dt className="text-secondary text-sm uppercase tracking-wider mb-2">{term}</dt>
      <dd className="text-on-surface">{items.join(' · ')}</dd>
    </div>
  )
}

function EduRow({ degree, school, years }: { degree: string; school: string; years: string }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-surface-variant pb-4">
      <div>
        <p className="text-on-surface font-medium">{degree}</p>
        <p className="text-secondary text-sm">{school}</p>
      </div>
      <time className="text-secondary text-sm">{years}</time>
    </li>
  )
}

function Project({ name, what, stack, url }: { name: string; what: string; stack: string; url: string }) {
  return (
    <article>
      <h3 className="text-lg font-semibold text-on-surface tracking-tight mb-2">{name}</h3>
      <p className={`${BODY} mb-2`}>{what}</p>
      <p className="text-secondary text-sm mb-1">Stack : {stack}</p>
      <p className="text-secondary text-sm">{url}</p>
    </article>
  )
}