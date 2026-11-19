
import { useCallback, useEffect, useRef, useState } from 'react';
import {Activity, ArrowUpRight, Bell, BookOpen, Box, Braces, CalendarDays, Check, ChevronDown, ChevronRight, ChevronsUpDown, CircleHelp, Command, Cpu, Database, Download, HardDrive, Layers3, Menu, Plus, Search, Settings2, Workflow, X, type LucideIcon} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { CorporaPage, DocsPage, ModelsPage, PipelinePage, ProtocolsPage, SettingsPage, TrainingPage, type Page } from './components/Pages';
import { ConfirmDialog, CorpusDialog, ExportDialog, NewCorpusDialog, SearchDialog } from './components/Dialogs';
import { IconButton, NexusLogo, Toast } from './components/ui';
import { DEFAULT_TRAINING, DEFAULT_WEIGHTS, TOKENS, compileNxs, createDemoCorpora, downloadBytes, downloadText, formatBytes, type Corpus, type TrainingConfig } from './lib/nxs';
import { deleteCorpus, loadCorpora, loadPreferences, saveCorpus, savePreferences } from './lib/storage';
import { downloadTrainingNotebook, readTrainingManifest, type TrainingManifest, type TrainingMode, type TrainingPlatform } from './lib/training';

const pageInfo: Record<Page, { title: string; subtitle: string; eyebrow: string }> = {
  overview: { title: 'Vue d’ensemble', subtitle: 'Votre infrastructure d’intelligence, en un seul endroit.', eyebrow: 'WORKSPACE OVERVIEW' },
  corpora: { title: 'Corpus de données', subtitle: 'Un flux universel pour toutes vos modalités.', eyebrow: 'DATA WORKSPACE' },
  pipeline: { title: 'Pipeline d’ingestion', subtitle: 'Transformez vos sources en intelligence native.', eyebrow: 'DATA FACTORY' },
  training: { title: 'Entraînement', subtitle: 'Du premier octet au prochain run de NEXUS-ZERO.', eyebrow: 'OMNICORE ENGINE' },
  models: { title: 'OmniCore Engine', subtitle: 'Le cortex multimodal de NEXUS-ZERO.', eyebrow: 'MODEL REGISTRY' },
  protocols: { title: 'Protocoles .nxs', subtitle: 'Une grammaire d’octets pour un monde multimodal.', eyebrow: 'OMNI-BYTE PROTOCOL' },
  docs: { title: 'Documentation', subtitle: 'Tout ce qu’il faut pour passer de l’idée au corpus.', eyebrow: 'KNOWLEDGE BASE' },
  settings: { title: 'Paramètres', subtitle: 'Un workspace qui vous ressemble.', eyebrow: 'WORKSPACE SETTINGS' },
};
const workspaceNav: { page: Page; title: string; icon: LucideIcon; badge?: string }[] = [
  { page: 'overview', title: 'Vue d’ensemble', icon: Layers3 },
  { page: 'corpora', title: 'Corpus de données', icon: Database },
  { page: 'pipeline', title: 'Pipeline d’ingestion', icon: Workflow },
  { page: 'training', title: 'Entraînement', icon: Activity },
];
const infrastructureNav: { page: Page; title: string; icon: LucideIcon; badge?: string }[] = [
  { page: 'models', title: 'OmniCore Engine', icon: Cpu, badge: 'NEW' },
  { page: 'protocols', title: 'Protocoles .nxs', icon: Braces },
  { page: 'docs', title: 'Documentation', icon: BookOpen },
];
function initialPage(): Page { const hash = window.location.hash.slice(1); return Object.keys(pageInfo).includes(hash) ? hash as Page : 'overview'; }

type Dialog = { type: 'new'; file?: boolean } | { type: 'export' | 'search' | 'help' | 'weights' } | { type: 'corpus'; corpus: Corpus } | { type: 'confirm'; title: string; description: string; action: string; confirm: () => void } | null;

export default function App() {
  const [page, setPage] = useState<Page>(initialPage);
  const [corpora, setCorpora] = useState<Corpus[]>(createDemoCorpora);
  const [workspace, setWorkspace] = useState(() => loadPreferences().workspace);
  const [config, setConfig] = useState<TrainingConfig>(() => ({ ...DEFAULT_TRAINING, ...loadPreferences().training }));
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState('');
  const [range, setRange] = useState('30');
  const [mobileNav, setMobileNav] = useState(false);
  const [workspaceMenu, setWorkspaceMenu] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [hasNotification, setHasNotification] = useState(true);
  const [profileMenu, setProfileMenu] = useState(false);
  const [trainingCorpusId, setTrainingCorpusId] = useState<string>();
  const [trainingResult, setTrainingResult] = useState<TrainingManifest | null>(null);
  const [events, setEvents] = useState<string[]>(['Protocole NXS v1.0 chargé', '5 piliers validés · vocabulaire de 256 octets prêt']);
  const mainRef = useRef<HTMLElement>(null);
  const closeDialog = useCallback(() => setDialog(null), []);
  const closeToast = useCallback(() => setToast(''), []);
  const notify = useCallback((message: string) => setToast(message), []);

  useEffect(() => {
    let mounted = true;
    loadCorpora().then(saved => { if (mounted) setCorpora(previous => [...saved.filter(item => !previous.some(local => local.id === item.id)), ...previous]); }).catch(() => { if (mounted) notify('Stockage local indisponible. Les corpus restent accessibles pour cette session.'); });
    return () => { mounted = false; };
  }, [notify]);
  useEffect(() => { savePreferences(config, workspace); }, [config, workspace]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setDialog(previous => previous?.type === 'search' ? null : { type: 'search' }); }
      if (event.key === 'Escape') { setMobileNav(false); setWorkspaceMenu(false); setNotifications(false); setProfileMenu(false); }
    };
    const hashChange = () => setPage(initialPage());
    document.addEventListener('keydown', keydown); window.addEventListener('hashchange', hashChange);
    return () => { document.removeEventListener('keydown', keydown); window.removeEventListener('hashchange', hashChange); };
  }, []);
  const navigate = useCallback((next: Page) => {
    setPage(next); window.location.hash = next; setMobileNav(false); setWorkspaceMenu(false); setNotifications(false); setProfileMenu(false); setDialog(null); mainRef.current?.scrollTo({ top: 0 }); window.scrollTo({ top: 0 });
  }, []);
  const handleCreated = (corpus: Corpus) => { setCorpora(previous => [corpus, ...previous]); setDialog({ type: 'corpus', corpus }); setHasNotification(true); setEvents(previous => [corpus.name + ' compilé · ' + corpus.sequenceCount + ' séquences', ...previous].slice(0, 6)); void saveCorpus(corpus).then(() => notify('Corpus compilé et sauvegardé localement.')).catch(() => notify('Corpus créé pour cette session, mais le stockage local a échoué. Exportez-le pour le conserver.')); };
  const downloadCorpus = (corpus: Corpus) => {
    if (corpus.demo) {
      downloadBytes(compileNxs({ name: corpus.name, multiplier: 25, weights: corpus.weights, sequenceLength: config.block }), corpus.name);
      notify('Aperçu synthétique téléchargé. Ces données de démonstration ne sont pas entraînables.');
      return;
    }
    if (!corpus.data || corpus.data.length === 0) {
      notify('Les octets originaux de ce corpus ne sont pas disponibles. Réimportez le fichier NXS.');
      return;
    }
    downloadBytes(corpus.data, corpus.name);
    notify('Votre corpus .nxs a été téléchargé.');
  };
  const removeCorpus = (corpus: Corpus) => setDialog({ type: 'confirm', title: 'Supprimer ce corpus ?', description: `« ${corpus.name} » sera supprimé de ce workspace. Les fichiers déjà téléchargés ne seront pas affectés.`, action: 'Supprimer le corpus', confirm: () => { setCorpora(previous => previous.filter(item => item.id !== corpus.id)); if (!corpus.demo) deleteCorpus(corpus.id).catch(() => notify('Supprimé pour cette session. Le stockage local n’a pas pu être mis à jour.')); setDialog(null); notify('Corpus supprimé du workspace.'); } });
  const exportEngine = () => setDialog({ type: 'export' });
  const downloadNotebook = async (mode: TrainingMode, platform: TrainingPlatform, modelName: string) => {
    try {
      await downloadTrainingNotebook(mode, config, platform, modelName);
      notify('Notebook autonome généré. Ouvrez-le dans ' + (platform === 'colab' ? 'Google Colab' : 'Kaggle') + '.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Impossible de générer le notebook.');
    }
  };
  const exportTrainingCorpus = (corpus: Corpus) => {
    if (corpus.demo || !corpus.data || corpus.data.length === 0) {
      notify('Seuls les corpus réels dont les octets sont disponibles peuvent être exportés pour l’entraînement.');
      return;
    }
    downloadBytes(corpus.data, corpus.name.toLowerCase().endsWith('.nxs') ? corpus.name : corpus.name + '.nxs');
    notify('Corpus NXS réel exporté.');
  };
  const importTrainingResult = async (file: File) => {
    try {
      const manifest = await readTrainingManifest(file);
      setTrainingResult(manifest);
      setEvents(previous => ['Résultats importés · mode ' + manifest.mode + ' · ' + manifest.datasetName, ...previous].slice(0, 6));
      notify('Manifeste d’entraînement vérifié et importé.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Manifeste invalide.');
    }
  };
  const trainCorpus = (corpus: Corpus) => { setTrainingCorpusId(corpus.id); navigate('training'); };
  const resetWorkspace = () => setDialog({ type: 'confirm', title: 'Réinitialiser le workspace ?', description: 'Tous vos corpus locaux et vos résultats importés seront supprimés. Exportez vos données avant de continuer.', action: 'Réinitialiser', confirm: () => { const ids = corpora.filter(corpus => !corpus.demo).map(corpus => corpus.id); Promise.all(ids.map(id => deleteCorpus(id))).then(() => { setCorpora(createDemoCorpora()); setTrainingResult(null); setTrainingCorpusId(undefined); setConfig(DEFAULT_TRAINING); setWeights(DEFAULT_WEIGHTS); setDialog(null); notify('Workspace réinitialisé. Les corpus de démonstration sont restaurés.'); }).catch(() => notify('La réinitialisation du stockage a échoué.')); } });
  const exportSpec = () => { downloadText(JSON.stringify({ protocol: 'NXS', version: '1.0', header: 'uint32 little-endian sequence length', bos: 'FF FE', eos: 'FF 00', escape: 'FF FF → FF', segments: TOKENS.map(token => ({ name: token.name, marker: token.hex, description: token.description })), math: { marker: 'FF 01', label: 'MATH' }, videoDemo: { frames: 3, width: 8, height: 8, channels: 3, header: 'BBB' }, videoImport: { header: 'BBBB', fields: ['frames', 'width', 'height', 'fps'], channels: 3 }, note: 'Les données sont inertes. Le prochain octet est prédit sur un vocabulaire de 0 à 255.' }, null, 2), 'nxs_protocol_v1.json', 'application/json'); notify('Spécification .nxs téléchargée.'); };
  const selectPillar = (index: number) => { navigate('protocols'); notify(`Pilier ${index + 1} : ${['Méta-Code & Forge', 'Cyber-Ingénierie', 'Vision & Vidéo', 'Orchestration MCP', 'Logique & Mathématiques'][index]}. Explorez le protocole ci-dessous.`); };
  const navItem = (item: { page: Page; title: string; icon: LucideIcon; badge?: string }, count?: string) => <button key={item.page} className={`nav-item ${page === item.page ? 'active' : ''}`} onClick={() => navigate(item.page)} aria-current={page === item.page ? 'page' : undefined}><item.icon size={18} strokeWidth={1.65}/><span>{item.title}</span>{count && <span className="nav-count">{count}</span>}{item.badge && <span className="nav-new">{item.badge}</span>}{page === item.page && <span className="nav-active-dot"/>}</button>;
  const info = pageInfo[page];
  const localBytes = corpora.filter(corpus => !corpus.demo).reduce((total, corpus) => total + corpus.bytes, 0);
  const selectedCorpus = dialog?.type === 'corpus' ? corpora.find(corpus => corpus.id === dialog.corpus.id) || dialog.corpus : undefined;

  return <div className="app-shell">
    {mobileNav && <div className="sidebar-backdrop" onClick={() => setMobileNav(false)}/>}
    <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
      <a className="brand-link" href="#overview" onClick={() => navigate('overview')} aria-label="NEXUSZERO, accueil"><NexusLogo/></a>
      <IconButton icon={X} label="Fermer le menu" onClick={() => setMobileNav(false)} className="mobile-sidebar-close"/>
      <div className="workspace-switcher-wrap"><button className={`workspace-switcher ${workspaceMenu ? 'open' : ''}`} onClick={() => { setWorkspaceMenu(!workspaceMenu); setProfileMenu(false); }} aria-expanded={workspaceMenu}><span className="workspace-avatar"><Box size={19} strokeWidth={1.5}/></span><span><strong>{workspace}</strong><small>Workspace personnel</small></span><ChevronsUpDown size={13}/></button>{workspaceMenu && <><div className="menu-dismiss" onClick={() => setWorkspaceMenu(false)}/><div className="dropdown-menu workspace-dropdown"><div className="dropdown-label">WORKSPACE ACTIF</div><button onClick={() => setWorkspaceMenu(false)}><Box size={14}/>{workspace}<Check size={13}/></button><button onClick={() => navigate('settings')}><Settings2 size={14}/>Paramètres du workspace</button><button onClick={() => { setWorkspaceMenu(false); setDialog({ type: 'new' }); }}><Plus size={14}/>Nouveau corpus</button></div></>}</div>
      <nav className="sidebar-navigation" aria-label="Navigation principale"><div className="nav-section-label">WORKSPACE</div>{workspaceNav.map(item => navItem(item, item.page === 'corpora' ? corpora.length.toString().padStart(2, '0') : undefined))}<div className="nav-section-label second">INFRASTRUCTURE</div>{infrastructureNav.map(item => navItem(item))}</nav>
      <div className="sidebar-bottom"><div className="local-storage-card"><div><span className="storage-card-icon"><HardDrive size={17} strokeWidth={1.5}/></span><strong>Stockage local<span className="live-dot"/></strong></div><p>Vos données. Votre contrôle.</p><div className="storage-capacity"><span>{formatBytes(localBytes)}</span><span>100% privé</span></div><div className="progress-track"><span style={{ width: `${Math.max(8, Math.min(100, localBytes / (32 * 1024 ** 3) * 100))}%` }}/></div><button onClick={() => navigate('settings')}>Gérer le stockage<ArrowUpRight size={12}/></button></div><button className={`nav-item settings-nav ${page === 'settings' ? 'active' : ''}`} onClick={() => navigate('settings')}><Settings2 size={18} strokeWidth={1.6}/><span>Paramètres</span></button><button className="help-link" onClick={() => setDialog({ type: 'help' })}><CircleHelp size={16}/><span>Un peu d’aide ?</span><ArrowUpRight size={13}/></button><div className="sidebar-version"><span><span className="live-dot"/>NEXUS-ZERO</span><span>v0.1.0</span></div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><IconButton icon={Menu} label="Ouvrir le menu" onClick={() => setMobileNav(true)} className="mobile-menu-button"/><Box size={16} strokeWidth={1.5}/><button onClick={() => navigate('overview')}>Workspace</button><ChevronRight size={12}/><span>{info.title}</span></div><div className="topbar-actions"><button className="global-search-button" onClick={() => setDialog({ type: 'search' })}><Search size={15}/><span>Rechercher dans le workspace…</span><kbd><Command size={10}/>K</kbd></button><span className="topbar-divider"/><div className="notification-wrap"><IconButton icon={Bell} label="Notifications" onClick={() => { setNotifications(!notifications); setHasNotification(false); setProfileMenu(false); }} className="notification-button">{hasNotification && <span className="notification-dot"/>}</IconButton>{notifications && <><div className="menu-dismiss" onClick={() => setNotifications(false)}/><div className="dropdown-menu notification-dropdown"><div className="notification-heading"><h3>Notifications</h3><span className="outline-badge">2</span></div><button onClick={() => { setNotifications(false); setDialog({ type: 'new' }); }}><span className="notification-icon"><Database size={17}/></span><div><strong>Votre prochain corpus vous attend</strong><p>Compilez vos cinq piliers en un flux natif.</p><small>À l’instant</small></div><span className="notification-unread"/></button><button onClick={() => navigate('training')}><span className="notification-icon violet"><Cpu size={17}/></span><div><strong>OmniCore Engine est prêt</strong><p>Explorez le pipeline ou exportez le moteur PyTorch.</p><small>Il y a 2 min</small></div></button><div className="notification-footer">Tout est à jour. Place aux octets.</div></div></>}</div><div className="profile-wrap"><button className="profile-button" onClick={() => { setProfileMenu(!profileMenu); setNotifications(false); }} aria-label="Menu de votre profil" aria-expanded={profileMenu}><span className="profile-avatar">AD</span><ChevronDown size={12}/></button>{profileMenu && <><div className="menu-dismiss" onClick={() => setProfileMenu(false)}/><div className="dropdown-menu profile-dropdown"><div className="profile-info"><strong>Architecte de données</strong><span>Lead Data Scientist · Local</span></div><button onClick={() => navigate('settings')}><Settings2 size={14}/>Paramètres du profil</button><button onClick={exportEngine}><Download size={14}/>Exporter le moteur</button><button onClick={() => navigate('docs')}><BookOpen size={14}/>Documentation</button></div></>}</div></div></header>
      <main className="main-content" ref={mainRef}><div className="page-heading"><div><span className="page-eyebrow">{info.eyebrow}</span><h1>{info.title}</h1><p>{info.subtitle}</p></div><div className="page-heading-actions">{page === 'overview' && <div className="date-range-select"><CalendarDays size={14}/><select aria-label="Période du dashboard" value={range} onChange={event => setRange(event.target.value)}><option value="7">7 derniers jours</option><option value="30">30 derniers jours</option><option value="90">90 derniers jours</option></select><ChevronDown size={12}/></div>}{page === 'protocols' ? <button className="button button-primary" onClick={exportSpec}><Plus size={15}/>Exporter la spécification</button> : page === 'training' ? <button className="button button-primary" onClick={exportEngine}><Download size={14}/>Exporter le moteur<ArrowUpRight size={13}/></button> : page === 'docs' ? <button className="button button-outline" onClick={() => navigate('protocols')}><Braces size={14}/>Explorer le protocole</button> : <button className="button button-primary" onClick={() => setDialog({ type: 'new' })}><Plus size={16}/>Nouveau corpus</button>}</div></div>
      <div className="page-content" key={page}>
        {page === 'overview' && <Dashboard corpora={corpora} range={range} onNew={() => setDialog({ type: 'new' })} onProtocol={() => navigate('protocols')} onCorpus={corpus => setDialog({ type: 'corpus', corpus })} onNavigate={navigate} onDownload={downloadCorpus} onDelete={removeCorpus} onPillar={selectPillar}/>}
        {page === 'corpora' && <CorporaPage corpora={corpora} onNew={() => setDialog({ type: 'new' })} onImport={() => setDialog({ type: 'new', file: true })} onSelect={corpus => setDialog({ type: 'corpus', corpus })} onDownload={downloadCorpus} onDelete={removeCorpus}/>}
        {page === 'pipeline' && <PipelinePage weights={weights} onEdit={value => { setWeights(value); setDialog({ type: 'weights' }); }} onCompile={value => { setWeights(value); setDialog({ type: 'new' }); }} onImport={() => setDialog({ type: 'new' })} events={events}/>}
        {page === 'training' && <TrainingPage key={trainingCorpusId || 'training'} initialCorpusId={trainingCorpusId} config={config} setConfig={setConfig} corpora={corpora} trainingResult={trainingResult} onDownloadNotebook={downloadNotebook} onExportCorpus={exportTrainingCorpus} onImportResult={importTrainingResult} onCompile={() => setDialog({ type: 'new' })} onSelect={corpus => setTrainingCorpusId(corpus.id)}/>}
        {page === 'models' && <ModelsPage config={config} onSelect={model => { setConfig(model); notify(`${model.model} sélectionné.`); }} onExport={exportEngine} onTraining={() => navigate('training')}/>}
        {page === 'protocols' && <ProtocolsPage onExport={exportSpec} onCompile={() => setDialog({ type: 'new' })}/>}
        {page === 'docs' && <DocsPage onExport={exportEngine} onProtocol={() => navigate('protocols')} onTraining={() => navigate('training')}/>}
        {page === 'settings' && <SettingsPage workspace={workspace} onWorkspace={value => { setWorkspace(value); notify('Nom du workspace enregistré.'); }} config={config} onReset={resetWorkspace} onExport={() => { downloadText(JSON.stringify({ workspace, protocol: 'NXS v1.0', training: config, weights }, null, 2), 'nexus_workspace.json', 'application/json'); notify('Configuration du workspace exportée.'); }}/>} 
      </div></main>
    </div>
    {dialog?.type === 'new' && <NewCorpusDialog key={dialog.file ? 'import' : 'generate'} initialTab={dialog.file ? 'file' : 'synthetic'} onClose={closeDialog} onCreated={handleCreated} onImport={() => setDialog({ type: 'new' })} initialWeights={weights} block={config.block}/>}
    {dialog?.type === 'corpus' && selectedCorpus && <CorpusDialog corpus={selectedCorpus} onClose={closeDialog} onDownload={downloadCorpus} onTrain={trainCorpus} onDelete={removeCorpus}/>}
    {dialog?.type === 'export' && <ExportDialog config={config} corpus={ corpora.find(corpus => !corpus.demo)} onClose={closeDialog} onExported={notify}/>}
    {dialog?.type === 'search' && <SearchDialog corpora={corpora} onClose={closeDialog} onNavigate={navigate} onSelect={corpus => setDialog({ type: 'corpus', corpus })}/>}
    {dialog?.type === 'confirm' && <ConfirmDialog title={dialog.title} description={dialog.description} action={dialog.action} onClose={closeDialog} onConfirm={dialog.confirm}/>}
    {dialog?.type === 'weights' && (
      <div className="modal-backdrop" role="presentation">
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="weights-title">
          <div className="modal-header">
            <h2 id="weights-title">Répartition des piliers NXS</h2>
            <button className="icon-button" onClick={closeDialog} aria-label="Fermer">
              <X size={18} />
            </button>
          </div>

          <div className="modal-body">
            {['Méta-Code & Forge', 'Cyber-Ingénierie', 'Vision & Vidéo', 'Orchestration MCP', 'Logique & Mathématiques'].map((name, index) => (
              <label key={name} className="weight-field">
                <span>{name}</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={weights[index] ?? 0}
                  onChange={event => {
                    const value = Math.max(0, Math.min(100, Number(event.target.value)));
                    setWeights(previous => previous.map((weight, i) => i === index ? value : weight));
                  }}
                />
              </label>
            ))}
          </div>

          <div className="modal-footer">
            <button className="button button-outline" onClick={() => setWeights(DEFAULT_WEIGHTS)}>
              Réinitialiser
            </button>
            <button className="button button-primary" onClick={closeDialog}>
              Enregistrer
            </button>
          </div>
        </section>
      </div>
    )}

    {toast && <Toast message={toast} onClose={closeToast} />}
  </div>;
}

