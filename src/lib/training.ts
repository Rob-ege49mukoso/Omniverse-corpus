import type { TrainingConfig } from './nxs';

export type TrainingMode = 'A' | 'B' | 'C';
export type TrainingPlatform = 'colab' | 'kaggle';

export interface TrainingManifest {
  schemaVersion: 1;
  status: 'completed';
  mode: TrainingMode;
  engine: string;
  modelName: string;
  datasetName: string;
  datasetSha256: string;
  sequenceCount: number;
  trainSampleCount: number;
  validationSampleCount: number;
  validationFallback: boolean;
  metrics: Record<string, unknown>;
  artifact: string;
  device: string;
  completedAt: string;
  durationSeconds?: number;
  notes?: string[];
}

export async function downloadTrainingNotebook(
  mode: TrainingMode,
  config: TrainingConfig,
  platform: TrainingPlatform,
  pretrainedModel = 'Qwen/Qwen2.5-0.5B'
): Promise<void> {
  const response = await fetch('/training/omniverse_train.py');
  if (!response.ok) throw new Error('Le moteur Python n’est pas disponible dans cette version du site.');
  const script = await response.text();
  const install = '!pip -q install "transformers>=4.45,<5" "peft>=0.13" "accelerate>=1.0" "safetensors>=0.4"\nprint("Dépendances installées.")';
  const writeScript = 'from pathlib import Path\nPath("omniverse_train.py").write_text(' +
    JSON.stringify(script) + ', encoding="utf-8")\nprint("Moteur Omniverse prêt.")';
  const selectData = platform === 'colab'
    ? 'from google.colab import files\nuploaded = files.upload()\ndata_path = next((name for name in uploaded if name.lower().endswith(".nxs")), None)\nif not data_path: raise RuntimeError("Téléversez un fichier .nxs exporté depuis Omniverse.")\nprint("Corpus :", data_path)'
    : 'from pathlib import Path\ncandidates = sorted(Path("/kaggle/input").rglob("*.nxs"))\nif not candidates: raise RuntimeError("Ajoutez un dataset Kaggle contenant un fichier .nxs.")\ndata_path = str(candidates[0])\nprint("Corpus :", data_path)';
  const command = 'import subprocess\nargs = ["python", "omniverse_train.py", "--mode", "' + mode +
    '", "--data", data_path, "--output_dir", "omniverse-results", "--model_name", ' + JSON.stringify(pretrainedModel) +
    ', "--d_model", "' + Math.max(16, Math.floor(config.dModel)) +
    '", "--heads", "' + Math.max(1, Math.floor(config.heads)) +
    '", "--layers", "' + Math.max(1, Math.floor(config.layers)) +
    '", "--batch_size", "' + Math.max(1, Math.floor(config.batchSize)) +
    '", "--learning_rate", "' + config.learningRate +
    '", "--epochs", "' + Math.max(1, Math.floor(config.epochs)) +
    '", "--block_size", "' + Math.max(2, Math.floor(config.block)) +
    '"]\nprint("Lancement du vrai entraînement :", " ".join(args))\nsubprocess.run(args, check=True)\nfrom pathlib import Path\nprint(Path("omniverse-results/manifest.json").read_text(encoding="utf-8"))';
  const notebook = {
    cells: [
      {cell_type:'markdown',metadata:{},source:[
        '# Omniverse — entraînement réel NXS\n\n',
        'Mode '+mode+' · '+(platform==='colab'?'Google Colab':'Kaggle')+'\n\n',
        mode==='A'?'Fine-tuning LoRA du modèle préentraîné '+pretrainedModel+' sur le texte NXS. VISION est exclu.':
        mode==='B'?'Entraînement PyTorch de l’architecture OmniCore personnalisée sur les octets NXS.':
        'Entraînement PyTorch from scratch d’un Transformer initialisé aléatoirement sur les octets NXS.',
        '\n\nB/C apprennent des régularités d’octets, pas une compréhension visuelle sémantique. Le calcul s’exécute dans le runtime externe, pas dans le site.'
      ]},
      {cell_type:'code',execution_count:null,metadata:{},outputs:[],source:install.split('\n').map(x=>x+'\n')},
      {cell_type:'code',execution_count:null,metadata:{},outputs:[],source:writeScript.split('\n').map(x=>x+'\n')},
      {cell_type:'code',execution_count:null,metadata:{},outputs:[],source:selectData.split('\n').map(x=>x+'\n')},
      {cell_type:'code',execution_count:null,metadata:{},outputs:[],source:command.split('\n').map(x=>x+'\n')},
      {cell_type:'markdown',metadata:{},source:[
        '## Après l’entraînement\n\nTéléchargez omniverse-results/manifest.json et les artefacts. Importez le manifeste JSON dans Omniverse pour afficher les métriques. Les poids restent des fichiers séparés.'
      ]}
    ],
    metadata:{accelerator:'GPU',kernelspec:{display_name:'Python 3',language:'python',name:'python3'},
      language_info:{name:'python',version:'3'},colab:{name:'Omniverse NXS Training',provenance:[]}},
    nbformat:4,nbformat_minor:5
  };
  const blob = new Blob([JSON.stringify(notebook,null,2)],{type:'application/x-ipynb+json'});
  const url=URL.createObjectURL(blob); const anchor=document.createElement('a');
  anchor.href=url; anchor.download='omniverse-training-'+mode+'-'+platform+'.ipynb';
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export async function readTrainingManifest(file: File): Promise<TrainingManifest> {
  const value: unknown = JSON.parse(await file.text());
  if (!value || typeof value !== 'object') throw new Error('Le manifeste JSON est invalide.');
  const data=value as Record<string,unknown>;
  if (data.schemaVersion!==1 || data.status!=='completed' ||
      !['A','B','C'].includes(String(data.mode)) || typeof data.engine!=='string' ||
      typeof data.datasetName!=='string' || typeof data.datasetSha256!=='string' ||
      typeof data.completedAt!=='string' || typeof data.metrics!=='object' || data.metrics===null) {
    throw new Error('Ce fichier ne correspond pas à un manifeste Omniverse v1 terminé.');
  }
  return data as unknown as TrainingManifest;
}
