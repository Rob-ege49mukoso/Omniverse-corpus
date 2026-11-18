

import { Activity, ArrowRight, Database, Download, Layers3, Plus, Settings2, Trash2 } from 'lucide-react';
import type { Corpus } from '../lib/nxs';

type DashboardPage =
  | 'overview'
  | 'corpora'
  | 'pipeline'
  | 'training'
  | 'models'
  | 'protocols'
  | 'docs'
  | 'settings';

interface DashboardProps {
  corpora: Corpus[];
  range: string;
  onNew: () => void;
  onProtocol: () => void;
  onCorpus: (corpus: Corpus) => void;
  onNavigate: (page: DashboardPage) => void;
  onDownload: (corpus: Corpus) => void;
  onDelete: (corpus: Corpus) => void;
  onPillar: (index: number) => void;
}

const pillars = [
  { name: 'Méta-Code & Forge', description: 'Création et génération de code.' },
  { name: 'Cyber-Ingénierie', description: 'Structures et flux binaires.' },
  { name: 'Vision & Vidéo', description: 'Données visuelles multimodales.' },
  { name: 'Orchestration MCP', description: 'Connexion aux outils et services.' },
  { name: 'Logique & Mathématiques', description: 'Structures et données mathématiques.' },
];

export function Dashboard({
  corpora,
  range,
  onNew,
  onProtocol,
  onCorpus,
  onNavigate,
  onDownload,
  onDelete,
  onPillar,
}: DashboardProps) {
  const totalBytes = corpora
    .filter(corpus => !corpus.demo)
    .reduce((total, corpus) => total + corpus.bytes, 0);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} octets`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className="dashboard-content space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="stat-card">
          <div className="flex items-center justify-between">
            <span>Corpus disponibles</span>
            <Database size={19} />
          </div>
          <strong>{corpora.length}</strong>
          <small>Corpus dans votre workspace</small>
        </article>

        <article className="stat-card">
          <div className="flex items-center justify-between">
            <span>Stockage utilisé</span>
            <Layers3 size={19} />
          </div>
          <strong>{formatSize(totalBytes)}</strong>
          <small>Données locales hors démonstrations</small>
        </article>

        <article className="stat-card">
          <div className="flex items-center justify-between">
            <span>État du workspace</span>
            <Activity size={19} />
          </div>
          <strong className="text-emerald-400">Opérationnel</strong>
          <small>Environnement local actif</small>
        </article>
      </section>

      <section className="dashboard-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2>Votre espace de travail</h2>
            <p>Vue d’ensemble · {range} derniers jours</p>
          </div>
          <button className="button button-primary" onClick={onNew}>
            <Plus size={15} /> Nouveau corpus
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button className="button button-outline" onClick={() => onNavigate('corpora')}>
            <Database size={15} /> Explorer les corpus
          </button>
          <button className="button button-outline" onClick={() => onNavigate('training')}>
            <Settings2 size={15} /> Entraînement
          </button>
          <button className="button button-outline" onClick={onProtocol}>
            <Layers3 size={15} /> Protocole NXS
          </button>
        </div>
      </section>

      <section className="dashboard-panel">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2>Vos corpus récents</h2>
            <p>Consultez et gérez vos données.</p>
          </div>
          <button className="button button-outline" onClick={() => onNavigate('corpora')}>
            Tout voir <ArrowRight size={14} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {corpora.length === 0 ? (
            <p>Aucun corpus disponible. Créez votre premier corpus.</p>
          ) : (
            corpora.slice(0, 5).map(corpus => (
              <article key={corpus.id} className="corpus-row">
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => onCorpus(corpus)}
                >
                  <strong className="block truncate">{corpus.name}</strong>
                  <small>
                    {corpus.sequenceCount} séquences · {formatSize(corpus.bytes)}
                  </small>
                </button>

                <span className="text-xs">{corpus.status}</span>

                <button
                  className="icon-button"
                  aria-label={`Télécharger ${corpus.name}`}
                  onClick={() => onDownload(corpus)}
                >
                  <Download size={16} />
                </button>

                <button
                  className="icon-button"
                  aria-label={`Supprimer ${corpus.name}`}
                  onClick={() => onDelete(corpus)}
                >
                  <Trash2 size={16} />
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="dashboard-panel">
        <h2>Les cinq piliers NEXUS-ZERO</h2>
        <p>Explorez les fondations de votre infrastructure multimodale.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pillars.map((pillar, index) => (
            <button
              key={pillar.name}
              className="pillar-card text-left"
              onClick={() => onPillar(index)}
            >
              <strong>{String(index + 1).padStart(2, '0')} · {pillar.name}</strong>
              <small>{pillar.description}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
  
