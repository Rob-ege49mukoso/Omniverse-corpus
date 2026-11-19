
import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {Activity, BookOpen, Braces, Check, Cpu, Database, Download, Play, Plus, RefreshCw, ShieldCheck, SlidersHorizontal, Upload, Zap} from 'lucide-react';
import {
  TOKENS,
  type Corpus,
  type TrainingConfig
} from '../lib/nxs';

export type Page =
  | 'overview'
  | 'corpora'
  | 'pipeline'
  | 'training'
  | 'models'
  | 'protocols'
  | 'docs'
  | 'settings';

const panel = 'dashboard-panel';
const button = 'button button-outline';

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm opacity-70 py-4">{message}</p>;
}

function PageTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm opacity-70">{description}</p>
    </div>
  );
}

/* CORPUS */

export function CorporaPage({
  corpora,
  onNew,
  onImport,
  onSelect,
  onDownload,
  onDelete
}: {
  corpora: Corpus[];
  onNew: () => void;
  onImport: () => void;
  onSelect: (corpus: Corpus) => void;
  onDownload: (corpus: Corpus) => void;
  onDelete: (corpus: Corpus) => void;
}) {
  return (
    <div className="space-y-5">
      <section className={panel}>
        <PageTitle
          title="Bibliothèque de corpus"
          description="Gérez vos ensembles de données multimodales."
        />
        <div className="flex flex-wrap gap-2">
          <button className="button button-primary" onClick={onNew}>
            <Plus size={15} /> Nouveau corpus
          </button>
          <button className={button} onClick={onImport}>
            <Upload size={15} /> Importer un fichier
          </button>
        </div>
      </section>

      <section className={panel}>
        <div className="flex justify-between items-center gap-3">
          <h2 className="font-semibold">Corpus disponibles</h2>
          <span className="text-sm opacity-70">{corpora.length} élément(s)</span>
        </div>

        <div className="mt-4 space-y-3">
          {corpora.length === 0 ? (
            <EmptyState message="Aucun corpus. Créez ou importez votre premier corpus." />
          ) : corpora.map(corpus => (
            <article className="corpus-row" key={corpus.id}>
              <button className="min-w-0 flex-1 text-left" onClick={() => onSelect(corpus)}>
                <strong className="block truncate">{corpus.name}</strong>
                <small>
                  {corpus.sequenceCount.toLocaleString('fr-FR')} séquences ·
                  {' '}{(corpus.bytes / 1024 / 1024).toFixed(2)} Mo
                </small>
              </button>
              <span className="text-xs">{corpus.status}</span>
              <button className="icon-button" aria-label="Télécharger" onClick={() => onDownload(corpus)}>
                <Download size={16} />
              </button>
              <button className="icon-button" aria-label="Supprimer" onClick={() => onDelete(corpus)}>
                <span aria-hidden="true">×</span>
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

/* PIPELINE */

export function PipelinePage({
  weights,
  onEdit,
  onCompile,
  onImport,
  events
}: {
  weights: number[];
  onEdit: (value: number[]) => void;
  onCompile: (value: number[]) => void;
  onImport: () => void;
  events: string[];
}) {
  const names = [
    'Méta-Code & Forge',
    'Cyber-Ingénierie',
    'Vision & Vidéo',
    'Orchestration MCP',
    'Logique & Mathématiques'
  ];

  return (
    <div className="space-y-5">
      <section className={panel}>
        <PageTitle
          title="Pipeline d’ingestion"
          description="Configurez la répartition des données entre les piliers NXS."
        />

        <div className="space-y-4">
          {names.map((name, index) => (
            <div key={name}>
              <div className="flex justify-between text-sm mb-1">
                <span>{name}</span>
                <strong>{weights[index] ?? 0}%</strong>
              </div>
              <div className="progress-track">
                <span style={{ width: `${weights[index] ?? 0}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mt-5">
          <button className={button} onClick={() => onEdit([...weights])}>
            <SlidersHorizontal size={15} /> Modifier les poids
          </button>
          <button className="button button-primary" onClick={() => onCompile([...weights])}>
            <Zap size={15} /> Compiler
          </button>
          <button className={button} onClick={onImport}>
            <Upload size={15} /> Importer
          </button>
        </div>
      </section>

      <section className={panel}>
        <PageTitle title="Journal du pipeline" description="Événements récents de votre espace." />
        {events.length === 0 ? (
          <EmptyState message="Aucun événement enregistré." />
        ) : (
          <div className="space-y-3">
            {events.map((event, index) => (
              <div className="flex items-center gap-2 text-sm" key={`${event}-${index}`}>
                <Check size={15} className="text-emerald-400" />
                {event}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* REAL TRAINING WORKFLOW */

import type { TrainingManifest, TrainingMode, TrainingPlatform } from '../lib/training';

export function TrainingPage({
  initialCorpusId, config, setConfig, corpora, trainingResult,
  onDownloadNotebook, onExportCorpus, onImportResult, onCompile, onSelect
}: {
  initialCorpusId?: string;
  config: TrainingConfig;
  setConfig: Dispatch<SetStateAction<TrainingConfig>>;
  corpora: Corpus[];
  trainingResult: TrainingManifest | null;
  onDownloadNotebook: (mode: TrainingMode, platform: TrainingPlatform, modelName: string) => void;
  onExportCorpus: (corpus: Corpus) => void;
  onImportResult: (file: File) => void;
  onCompile: () => void;
  onSelect: (corpus: Corpus) => void;
}) {
  const [mode,setMode]=useState<TrainingMode>('B');
  const [platform,setPlatform]=useState<TrainingPlatform>('colab');
  const [pretrainedModel,setPretrainedModel]=useState('Qwen/Qwen2.5-0.5B');
  const selected=corpora.find(item=>item.id===initialCorpusId);
  const canExport=Boolean(selected && !selected.demo && selected.data && selected.data.length>0);
  const update=(key:keyof TrainingConfig,value:number|string)=>setConfig(previous=>({...previous,[key]:value}));
  return (
    <div className="space-y-5">
      <section className={panel}>
        <PageTitle title="OmniCore — entraînement réel" description="Préparez un entraînement PyTorch ou Hugging Face dans un runtime gratuit externe."/>
        <label className="block mb-4 text-sm">Corpus d'entraînement
          <select className="w-full mt-2" value={selected?.id??''} onChange={event=>{
            const corpus=corpora.find(item=>item.id===event.target.value); if(corpus) onSelect(corpus);
          }}>
            <option value="">Choisir un corpus</option>
            {corpora.map(corpus=><option key={corpus.id} value={corpus.id}>{corpus.name}{corpus.demo?' — démonstration non entraînable':''}</option>)}
          </select>
        </label>
        {selected?.demo && <p className="text-sm text-amber-400 mb-3">Ce corpus est une démonstration. Il ne peut pas être exporté pour l’entraînement.</p>}
        {selected && !selected.demo && !selected.data && <p className="text-sm text-amber-400 mb-3">Les octets de ce corpus ne sont pas disponibles. Réimportez le fichier NXS original.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">Stratégie d'entraînement
            <select className="w-full mt-2" value={mode} onChange={event=>setMode(event.target.value as TrainingMode)}>
              <option value="A">A — Fine-tuning d’un modèle préentraîné</option>
              <option value="B">B — Architecture OmniCore personnalisée</option>
              <option value="C">C — Transformer from scratch</option>
            </select>
          </label>
          <label className="block text-sm">Environnement gratuit
            <select className="w-full mt-2" value={platform} onChange={event=>setPlatform(event.target.value as TrainingPlatform)}>
              <option value="colab">Google Colab</option><option value="kaggle">Kaggle Notebooks</option>
            </select>
          </label>
          {mode==='A' && <label className="block text-sm sm:col-span-2">Modèle préentraîné
            <input className="w-full mt-2" value={pretrainedModel} onChange={event=>setPretrainedModel(event.target.value)}/>
            <small className="opacity-70">Valeur initiale : Qwen/Qwen2.5-0.5B. Le runtime doit pouvoir télécharger le modèle.</small>
          </label>}
          {([
            ['dModel','Dimension du modèle'],['heads','Nombre de têtes'],['layers','Nombre de couches'],
            ['batchSize','Taille du batch'],['epochs','Nombre d’epochs'],['block','Taille des blocs']
          ] as [keyof TrainingConfig,string][]).map(([key,label])=><label className="block text-sm" key={key}>{label}
            <input className="w-full mt-2" type="number" min="1" value={config[key]} onChange={event=>update(key,Number(event.target.value))}/>
          </label>)}
          <label className="block text-sm">Learning rate
            <input className="w-full mt-2" type="number" step="0.0001" min="0.000001" value={config.learningRate} onChange={event=>update('learningRate',Number(event.target.value))}/>
          </label>
        </div>
        <div className="flex flex-wrap gap-2 mt-5">
          <button className="button button-outline" disabled={!canExport} onClick={()=>selected&&onExportCorpus(selected)}><Download size={15}/> Exporter le corpus NXS</button>
          <button className="button button-primary" disabled={mode==='A'&&!pretrainedModel.trim()} onClick={()=>onDownloadNotebook(mode,platform,pretrainedModel.trim())}><Download size={15}/> Générer le notebook {platform==='colab'?'Colab':'Kaggle'}</button>
          <button className={button} onClick={onCompile}><Plus size={15}/> Nouveau corpus</button>
        </div>
      </section>
      <section className={panel}>
        <PageTitle title="Exécution et résultats" description="Le calcul s’effectue dans Colab ou Kaggle, pas dans le navigateur."/>
        <p className="text-sm opacity-80 mb-3">1. Exportez un corpus réel. 2. Générez le notebook. 3. Exécutez les cellules dans l’environnement choisi. 4. Téléchargez manifest.json puis importez-le ici.</p>
        <label className="button button-outline inline-flex cursor-pointer"><Upload size={15}/> Importer manifest.json
          <input className="sr-only" type="file" accept=".json,application/json" onChange={event=>{
            const file=event.target.files?.[0]; if(file) onImportResult(file); event.currentTarget.value='';
          }}/>
        </label>
        {!trainingResult ? <p className="text-sm opacity-60 mt-4">Aucun résultat réel importé. La progression ne sera affichée qu’après réception d’un manifeste terminé.</p> :
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><strong>Entraînement terminé · Mode {trainingResult.mode}</strong><span>{trainingResult.device}</span></div>
            <p>Moteur : {trainingResult.engine}</p><p>Corpus : {trainingResult.datasetName} · {trainingResult.sequenceCount.toLocaleString('fr-FR')} séquences</p>
            <p>Modèle : {trainingResult.modelName}</p><p>Terminé : {new Date(trainingResult.completedAt).toLocaleString('fr-FR')}</p>
            {Object.entries(trainingResult.metrics).map(([key,value])=><p key={key}>{key} : <strong>{typeof value==='number'?value.toLocaleString('fr-FR',{maximumFractionDigits:5}):String(value)}</strong></p>)}
            {trainingResult.validationFallback&&<p className="text-amber-400">Corpus trop petit pour une validation indépendante : les données d’entraînement sont réutilisées.</p>}
            <p className="opacity-60">Artefact dans le runtime : {trainingResult.artifact}</p>
          </div>}
      </section>
      <section className={panel}>
        <PageTitle title="Limites du mode gratuit" description="Les ressources de calcul gratuites ne sont pas garanties."/>
        <ul className="list-disc pl-5 space-y-1 text-sm opacity-80">
          <li>Disponibilité GPU, durée des sessions et quotas dépendent de la plateforme.</li>
          <li>Les checkpoints sont enregistrés pendant l’entraînement, mais la reprise doit être faite dans le runtime.</li>
          <li>Le mode A adapte un modèle préentraîné ; B/C initialisent et entraînent leurs propres poids.</li>
          <li>Les octets d’images dans B/C ne remplacent pas un encodeur visuel spécialisé.</li>
        </ul>
      </section>
    </div>
  );
}

/* MODÈLES */

export function ModelsPage({
  config,
  onSelect,
  onExport,
  onTraining
}: {
  config: TrainingConfig;
  onSelect: (config: TrainingConfig) => void;
  onExport: () => void;
  onTraining: () => void;
}) {
  const models = [
    { name: 'OmniCore Compact', description: 'Configuration légère pour les premiers tests.', dimension: 256, heads: 8, layers: 2 },
    { name: 'OmniCore Base', description: 'Configuration intermédiaire.', dimension: 512, heads: 8, layers: 6 },
    { name: 'OmniCore Experimental', description: 'Configuration expérimentale.', dimension: 768, heads: 12, layers: 8 }
  ];

  return (
    <div className="space-y-5">
      <section className={panel}>
        <PageTitle title="Registre des modèles" description="Sélectionnez une configuration de modèle." />
        <div className="space-y-3">
          {models.map(model => {
            const active = config.model === model.name;
            return (
              <article className="corpus-row" key={model.name}>
                <Cpu size={20} />
                <div className="min-w-0 flex-1">
                  <strong className="block">{model.name}</strong>
                  <small>{model.description}</small>
                  <small className="block">{model.dimension} dimensions · {model.heads} têtes · {model.layers} couches</small>
                </div>
                {active ? (
                  <span className="text-xs text-emerald-400">Actif</span>
                ) : (
                  <button className={button} onClick={() => onSelect({
                    ...config,
                    model: model.name,
                    dModel: model.dimension,
                    heads: model.heads,
                    layers: model.layers
                  })}>Sélectionner</button>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className={panel}>
        <div className="flex flex-wrap gap-2">
          <button className="button button-primary" onClick={onTraining}><Activity size={15} /> Entraînement</button>
          <button className={button} onClick={onExport}><Download size={15} /> Exporter</button>
        </div>
      </section>
    </div>
  );
}

/* PROTOCOLES */

export function ProtocolsPage({
  onExport,
  onCompile
}: {
  onExport: () => void;
  onCompile: () => void;
}) {
  return (
    <div className="space-y-5">
      <section className={panel}>
        <PageTitle title="Protocole NXS" description="Structure des séquences et marqueurs multimodaux." />
        <div className="space-y-3">
          <div className="corpus-row"><code>FF FE</code><span className="flex-1">Début de séquence (BOS)</span></div>
          {TOKENS.map(token => (
            <div className="corpus-row" key={token.type}>
              <code>{token.hex}</code>
              <span className="flex-1"><strong>{token.name}</strong><small className="block">{token.description}</small></span>
            </div>
          ))}
          <div className="corpus-row"><code>FF 00</code><span className="flex-1">Fin de séquence (EOS)</span></div>
          <div className="corpus-row"><code>FF FF</code><span className="flex-1">Échappement d’octet FF</span></div>
        </div>
      </section>

      <section className={panel}>
        <div className="flex flex-wrap gap-2">
          <button className="button button-primary" onClick={onExport}><Download size={15} /> Exporter la spécification</button>
          <button className={button} onClick={onCompile}><Plus size={15} /> Créer un corpus</button>
        </div>
      </section>
    </div>
  );
}

/* DOCUMENTATION */

export function DocsPage({
  onExport,
  onProtocol,
  onTraining
}: {
  onExport: () => void;
  onProtocol: () => void;
  onTraining: () => void;
}) {
  const sections = [
    { icon: Database, title: 'Corpus', description: 'Les corpus regroupent les séquences de données multimodales.' },
    { icon: Braces, title: 'Protocole NXS', description: 'Le format NXS organise les données en séquences et segments.' },
    { icon: Cpu, title: 'OmniCore Engine', description: 'La configuration du moteur définit les paramètres de simulation.' },
    { icon: ShieldCheck, title: 'Données locales', description: 'Les corpus créés restent dans le stockage local du navigateur.' }
  ];

  return (
    <div className="space-y-5">
      <section className={panel}>
        <PageTitle title="Centre de documentation" description="Repères pour utiliser NEXUS-ZERO." />
        <div className="space-y-4">
          {sections.map(section => {
            const Icon = section.icon;
            return (
              <div className="flex gap-3" key={section.title}>
                <Icon size={20} />
                <div>
                  <strong>{section.title}</strong>
                  <p className="text-sm opacity-70">{section.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className={panel}>
        <div className="flex flex-wrap gap-2">
          <button className={button} onClick={onProtocol}><BookOpen size={15} /> Consulter le protocole</button>
          <button className={button} onClick={onTraining}><Activity size={15} /> Entraînement</button>
          <button className="button button-primary" onClick={onExport}><Download size={15} /> Exporter le moteur</button>
        </div>
      </section>
    </div>
  );
}

/* PARAMÈTRES */

export function SettingsPage({
  workspace,
  onWorkspace,
  config,
  onReset,
  onExport
}: {
  workspace: string;
  onWorkspace: (value: string) => void;
  config: TrainingConfig;
  onReset: () => void;
  onExport: () => void;
}) {
  const [name, setName] = useState(workspace);

  useEffect(() => {
    setName(workspace);
  }, [workspace]);

  return (
    <div className="space-y-5">
      <section className={panel}>
        <PageTitle title="Paramètres du workspace" description="Personnalisez votre espace de travail." />
        <label className="block text-sm">
          Nom du workspace
          <input className="w-full mt-2" value={name} onChange={event => setName(event.target.value)} />
        </label>
        <button
          className="button button-primary mt-3"
          disabled={!name.trim()}
          onClick={() => onWorkspace(name.trim())}
        >
          <Check size={15} /> Enregistrer
        </button>
      </section>

      <section className={panel}>
        <PageTitle title="Configuration du moteur" description="Paramètres actuellement utilisés." />
        <p className="text-sm">Modèle : <strong>{config.model}</strong></p>
        <p className="text-sm">Dimensions : {config.dModel}</p>
        <p className="text-sm">Couches : {config.layers}</p>
        <p className="text-sm">Taille des blocs : {config.block}</p>
        <button className={button + ' mt-3'} onClick={onExport}>
          <Download size={15} /> Exporter la configuration
        </button>
      </section>

      <section className={panel}>
        <PageTitle title="Zone de réinitialisation" description="Cette action restaure les paramètres et corpus de démonstration." />
        <button className={button} onClick={onReset}>
          <RefreshCw size={15} /> Réinitialiser le workspace
        </button>
      </section>
    </div>
  );
          }
          
