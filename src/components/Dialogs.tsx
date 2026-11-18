
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  X, Search, Upload, Download, FilePlus2, Trash2,
  Play, CheckCircle2, AlertCircle, Database
} from 'lucide-react';
import {
  buildRawSequence,
  compileNxs,
  downloadBytes,
  formatBytes,
  type Corpus,
  type Modality,
  type TrainingConfig
} from '../lib/nxs';

type NewCorpusDialogProps = {
  initialTab: 'file' | 'synthetic';
  onClose: () => void;
  onCreated: (corpus: Corpus) => void;
  onImport: () => void;
  initialWeights: number[];
  block: number;
};

type CorpusDialogProps = {
  corpus: Corpus;
  onClose: () => void;
  onDownload: (corpus: Corpus) => void;
  onTrain: (corpus: Corpus) => void;
  onDelete: (corpus: Corpus) => void;
};

type ExportDialogProps = {
  config: TrainingConfig;
  corpus?: Corpus;
  onClose: () => void;
  onExported: (message: string) => void;
};

type SearchDialogProps = {
  corpora: Corpus[];
  onClose: () => void;
  onNavigate: (page: 'corpora') => void;
  onSelect: (corpus: Corpus) => void;
};

type ConfirmDialogProps = {
  title: string;
  description: string;
  action: string;
  onClose: () => void;
  onConfirm: () => void;
};

function DialogShell({
  title,
  children,
  onClose
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}

export function NewCorpusDialog({
  initialTab,
  onClose,
  onCreated,
  onImport,
  initialWeights,
  block
}: NewCorpusDialogProps) {
  const [tab, setTab] = useState<'synthetic' | 'file'>(initialTab);
  const [name, setName] = useState('mon_premier_corpus.nxs');
  const [multiplier, setMultiplier] = useState(25);
  const [weights, setWeights] = useState(initialWeights);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const createSynthetic = () => {
    if (!name.trim()) {
      setError('Veuillez saisir un nom de corpus.');
      return;
    }

    setLoading(true);
    try {
      const data = compileNxs({
        name,
        multiplier,
        weights,
        sequenceLength: block
      });

      const sequenceCount = Math.max(4, Math.min(4000, Math.round(multiplier * 4)));
      const modalities: Modality[] = ['forge', 'cyber', 'vision', 'mcp', 'think'];

      onCreated({
        id: crypto.randomUUID(),
        name: name.endsWith('.nxs') ? name : `${name}.nxs`,
        createdAt: Date.now(),
        bytes: data.byteLength,
        sequenceCount,
        weights,
        modalities: modalities.filter((_, index) => (weights[index] ?? 0) > 0),
        status: 'ready',
        data
      });
    } catch {
      setError('La génération du corpus a échoué.');
      setLoading(false);
    }
  };

  const importFile = async () => {
    if (!file) {
      setError('Choisissez d’abord un fichier.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const source = new Uint8Array(await file.arrayBuffer());
      const sequence = buildRawSequence('forge', source);
      const data = new Uint8Array(sequence.length + 4);
      new DataView(data.buffer).setUint32(0, sequence.length, true);
      data.set(sequence, 4);

      onCreated({
        id: crypto.randomUUID(),
        name: file.name.endsWith('.nxs') ? file.name : `${file.name}.nxs`,
        createdAt: Date.now(),
        bytes: data.byteLength,
        sequenceCount: 1,
        weights: initialWeights,
        modalities: ['forge'],
        status: 'ready',
        data
      });
    } catch {
      setError('Impossible de lire ce fichier.');
      setLoading(false);
    }
  };

  return (
    <DialogShell title="Créer un corpus" onClose={onClose}>
      <div className="flex gap-2 mb-5">
        <button
          className={`button ${tab === 'synthetic' ? 'button-primary' : 'button-outline'}`}
          onClick={() => setTab('synthetic')}
        >
          <FilePlus2 size={15} /> Générer
        </button>
        <button
          className={`button ${tab === 'file' ? 'button-primary' : 'button-outline'}`}
          onClick={() => setTab('file')}
        >
          <Upload size={15} /> Importer un fichier
        </button>
      </div>

      {tab === 'synthetic' ? (
        <div className="space-y-4">
          <label className="block">
            <span className="block mb-2">Nom du corpus</span>
            <input
              className="w-full"
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="mon_corpus.nxs"
            />
          </label>

          <label className="block">
            <span className="block mb-2">Taille de génération : {multiplier}</span>
            <input
              className="w-full"
              type="range"
              min="1"
              max="1000"
              value={multiplier}
              onChange={event => setMultiplier(Number(event.target.value))}
            />
            <small>{Math.max(4, multiplier * 4)} séquences estimées</small>
          </label>

          <h3 className="font-semibold">Répartition des piliers</h3>
          {['Méta-Code & Forge', 'Cyber-Ingénierie', 'Vision & Vidéo', 'Orchestration MCP', 'Réflexion'].map((label, index) => (
            <label key={label} className="block">
              <span className="flex justify-between mb-1">
                <span>{label}</span>
                <strong>{weights[index] ?? 0}%</strong>
              </span>
              <input
                className="w-full"
                type="range"
                min="0"
                max="100"
                value={weights[index] ?? 0}
                onChange={event => setWeights(previous =>
                  previous.map((value, i) => i === index ? Number(event.target.value) : value)
                )}
              />
            </label>
          ))}

          <button className="button button-outline" onClick={() => setWeights(initialWeights)}>
            Réinitialiser la répartition
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block">
            <span className="block mb-2">Fichier à importer</span>
            <input
              className="w-full"
              type="file"
              onChange={event => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {file && (
            <p className="text-sm">
              {file.name} · {formatBytes(file.size)}
            </p>
          )}
          <p className="text-sm opacity-70">
            Le fichier sera intégré comme données inertes dans un corpus NXS.
          </p>
          <button className="button button-outline" onClick={onImport}>
            Revenir à la génération
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

      <footer className="modal-footer">
        <button className="button button-outline" onClick={onClose}>Annuler</button>
        <button
          className="button button-primary"
          disabled={loading}
          onClick={tab === 'synthetic' ? createSynthetic : importFile}
        >
          {loading ? 'Traitement...' : tab === 'synthetic' ? 'Générer le corpus' : 'Importer'}
        </button>
      </footer>
    </DialogShell>
  );
}

export function CorpusDialog({
  corpus,
  onClose,
  onDownload,
  onTrain,
  onDelete
}: CorpusDialogProps) {
  return (
    <DialogShell title="Détails du corpus" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <Database size={26} />
          <h3 className="font-semibold mt-2">{corpus.name}</h3>
          <p className="text-sm opacity-70">{corpus.demo ? 'Corpus de démonstration' : 'Corpus local'}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="stat-card">
            <small>Taille</small>
            <strong>{formatBytes(corpus.bytes)}</strong>
          </div>
          <div className="stat-card">
            <small>Séquences</small>
            <strong>{corpus.sequenceCount.toLocaleString('fr-FR')}</strong>
          </div>
        </div>

        <p>État : <strong>{corpus.status}</strong></p>
        <p className="text-sm opacity-70">
          Créé le {new Date(corpus.createdAt).toLocaleString('fr-FR')}
        </p>

        <div className="flex flex-wrap gap-2">
          <button className="button button-outline" onClick={() => onDownload(corpus)}>
            <Download size={15} /> Télécharger
          </button>
          <button className="button button-primary" onClick={() => onTrain(corpus)}>
            <Play size={15} /> Entraîner
          </button>
          <button className="button button-outline" onClick={() => onDelete(corpus)}>
            <Trash2 size={15} /> Supprimer
          </button>
        </div>
      </div>
    </DialogShell>
  );
}

export function ExportDialog({
  config,
  corpus,
  onClose,
  onExported
}: ExportDialogProps) {
  const [format, setFormat] = useState<'nxs' | 'json'>('nxs');

  const exportData = () => {
    try {
      if (format === 'nxs') {
        const data = corpus?.data ?? compileNxs({
          name: corpus?.name ?? 'omniverse_export.nxs',
          multiplier: 25,
          weights: corpus?.weights ?? [30, 20, 25, 15, 10],
          sequenceLength: config.block
        });
        downloadBytes(data, 'omniverse_export.nxs');
      } else {
        const data = JSON.stringify({
          format: 'NXS',
          version: '1.0',
          training: config,
          corpus: corpus ? {
            name: corpus.name,
            sequenceCount: corpus.sequenceCount,
            bytes: corpus.bytes,
            weights: corpus.weights
          } : null
        }, null, 2);
        downloadBytes(new TextEncoder().encode(data), 'omniverse_export.json', 'application/json');
      }

      onExported('Exportation terminée.');
      onClose();
    } catch {
      onExported('Échec de l’exportation.');
    }
  };

  return (
    <DialogShell title="Exporter les données" onClose={onClose}>
      <p className="mb-4 text-sm opacity-70">
        Choisissez le format de sortie de votre exportation.
      </p>

      <label className="block mb-3">
        <span className="block mb-2">Format</span>
        <select className="w-full" value={format} onChange={event => setFormat(event.target.value as 'nxs' | 'json')}>
          <option value="nxs">Corpus NXS (.nxs)</option>
          <option value="json">Configuration JSON (.json)</option>
        </select>
      </label>

      {corpus && <p className="text-sm">Corpus sélectionné : {corpus.name}</p>}

      <footer className="modal-footer">
        <button className="button button-outline" onClick={onClose}>Annuler</button>
        <button className="button button-primary" onClick={exportData}>
          <Download size={15} /> Exporter
        </button>
      </footer>
    </DialogShell>
  );
}

export function SearchDialog({
  corpora,
  onClose,
  onNavigate,
  onSelect
}: SearchDialogProps) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return corpora.slice(0, 8);
    return corpora.filter(corpus =>
      corpus.name.toLowerCase().includes(value) ||
      corpus.status.toLowerCase().includes(value)
    );
  }, [corpora, query]);

  return (
    <DialogShell title="Rechercher dans le workspace" onClose={onClose}>
      <label className="flex items-center gap-2">
        <Search size={18} />
        <input
          className="w-full"
          autoFocus
          placeholder="Nom ou état d’un corpus..."
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </label>

      <div className="mt-4 space-y-2">
        {results.length === 0 ? (
          <p className="text-sm opacity-70">Aucun résultat trouvé.</p>
        ) : results.map(corpus => (
          <button
            key={corpus.id}
            className="corpus-row w-full text-left"
            onClick={() => onSelect(corpus)}
          >
            <Database size={17} />
            <span className="min-w-0 flex-1">
              <strong className="block truncate">{corpus.name}</strong>
              <small>{corpus.status} · {formatBytes(corpus.bytes)}</small>
            </span>
          </button>
        ))}
      </div>

      <footer className="modal-footer">
        <button className="button button-outline" onClick={() => {
          onClose();
          onNavigate('corpora');
        }}>
          Voir tous les corpus
        </button>
      </footer>
    </DialogShell>
  );
}

export function ConfirmDialog({
  title,
  description,
  action,
  onClose,
  onConfirm
}: ConfirmDialogProps) {
  return (
    <DialogShell title={title} onClose={onClose}>
      <div className="flex gap-3 items-start">
        <AlertCircle size={22} className="text-amber-400 shrink-0" />
        <p>{description}</p>
      </div>

      <footer className="modal-footer">
        <button className="button button-outline" onClick={onClose}>Annuler</button>
        <button className="button button-primary" onClick={onConfirm}>
          <CheckCircle2 size={15} /> {action}
        </button>
      </footer>
    </DialogShell>
  );
      }
                                                          
