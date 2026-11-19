

export type Modality = 'think' | 'forge' | 'cyber' | 'mcp' | 'vision' | 'math';
export type CorpusStatus = 'ready' | 'indexing' | 'archived';

export interface Corpus {
  id: string;
  name: string;
  createdAt: number;
  bytes: number;
  sequenceCount: number;
  weights: number[];
  modalities: Modality[];
  status: CorpusStatus;
  data?: Uint8Array;
  demo?: boolean;
}

export interface Segment { type: string; data: Uint8Array }
export interface ParsedSequence { bytes: Uint8Array; segments: Segment[] }
export interface CompileOptions { name: string; multiplier: number; weights: number[]; sequenceLength: number }

export interface TrainingConfig {
  model: string;
  dModel: number;
  heads: number;
  layers: number;
  batchSize: number;
  learningRate: number;
  epochs: number;
  block: number;
}

export const DEFAULT_WEIGHTS = [30, 20, 25, 15, 10];

export const DEFAULT_TRAINING: TrainingConfig = {
  model: 'OmniCore Compact', dModel: 256, heads: 8, layers: 2,
  batchSize: 8, learningRate: 0.0003, epochs: 5, block: 256,
};

export const TOKENS: { type: Modality; name: string; hex: string; byte: number; color: string; description: string }[] = [
  { type: 'think', name: 'THINK', hex: 'FF 01', byte: 1, color: '#8b9bff', description: 'Début d’une chaîne de raisonnement.' },
  { type: 'forge', name: 'FORGE', hex: 'FF 02', byte: 2, color: '#61d5a3', description: 'Code source et création d’outils.' },
  { type: 'cyber', name: 'CYBER', hex: 'FF 03', byte: 3, color: '#66b4ef', description: 'Flux binaires, ELF et trames réseau.' },
  { type: 'mcp', name: 'MCP', hex: 'FF 04', byte: 4, color: '#efbd6b', description: 'Messages JSON-RPC et appels d’outils.' },
  { type: 'vision', name: 'VISION', hex: 'FF 05', byte: 5, color: '#b294ee', description: 'Images et vidéo en octets RVB bruts.' },
];

export const MATH_COLOR = '#df8baf';

export const MODALITY_LABELS: Record<Modality, string> = {
  think: 'Réflexion', forge: 'Code & Forge', cyber: 'Cyber & Binaire', mcp: 'Orchestration MCP', vision: 'Vision & Vidéo', math: 'Logique & Maths',
};

const encoder = new TextEncoder();
const text = (value: string) => encoder.encode(value);

const escapePayload = (bytes: Uint8Array) => {
  const result: number[] = [];
  for (const byte of bytes) { if (byte === 255) result.push(255); result.push(byte); }
  return new Uint8Array(result);
};

const marker = (byte: number) => new Uint8Array([255, byte]);

const concat = (...arrays: Uint8Array[]) => {
  const result = new Uint8Array(arrays.reduce((total, array) => total + array.length, 0));
  let offset = 0;
  for (const array of arrays) { result.set(array, offset); offset += array.length; }
  return result;
};

export function buildSequence(
  kind: Modality,
  variant = 0,
  corpusName = ''
): Uint8Array {
  let payload: Uint8Array;

  if (kind === 'think') {
    payload = text(
      variant % 2
        ? 'OBJECTIF: Analyser la mémoire avant de modifier un fichier.\nJe vérifie les permissions, puis je calcule la taille du flux. Chaque octet est indépendant du tokeniseur.'
        : 'OBJECTIF: Lire un fichier binaire inconnu.\nJe dois identifier ses premiers octets avant de choisir un outil. Je vérifie la signature, puis j’inspecte l’en-tête.'
    );
  } else if (kind === 'forge') {
    payload = text(
      '# Objectif : lire les octets de contrôle sans exécuter le fichier.\ndef read_magic_bytes(filepath):\n    with open(filepath, "rb") as source:\n        return source.read(16).hex()\n\n# Analyse : FF 01, FF 02, FF 03, FF 04, FF 05.\n'
    );
  } else if (kind === 'cyber') {
    const elf = new Uint8Array([
      127, 69, 76, 70, 2, 1, 1, 0,
      0, 0, 0, 0, 0, 0, 0, 0
    ]);

    payload = concat(
      elf,
      text(
        '\nSRC: void audit(char *text) { char buffer[16];\n     strncpy(buffer, text, sizeof(buffer) - 1);\n     buffer[sizeof(buffer) - 1] = 0; }\nPATCH: bornes vérifiées et terminaison NUL explicite.\n'
      )
    );
  } else if (kind === 'mcp') {
    payload = text(
      JSON.stringify(
        {
          jsonrpc: '2.0',
          id: variant + 1,
          method: 'tools/call',
          params: {
            name: 'filesystem.read_file',
            arguments: { path: 'system_logs.txt' }
          }
        },
        null,
        2
      )
    );
  } else if (kind === 'vision') {
    const header = new Uint8Array([3, 8, 8, 3]);
    const pixels = new Uint8Array(3 * 8 * 8 * 3);
    let offset = 0;

    for (let frame = 0; frame < 3; frame++) {
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          pixels[offset++] = Math.round(
            (Math.sin((x + frame + variant) * 0.7) + 1) * 127
          );
          pixels[offset++] = Math.round(
            (Math.cos((y + frame) * 0.7) + 1) * 127
          );
          pixels[offset++] =
            (x * y * (frame + variant)) % 256;
        }
      }
    }

    payload = concat(header, pixels);
  } else {
    payload = text(
      'THEOREM borne_addition (n m : Nat) :\n  n + m = m + n := by\n  rw [Nat.add_comm]\n\nPREUVE: la commutativité est réduite à Nat.add_comm.'
    );
  }

  const type = kind === 'math' ? 'think' : kind;
  const byte = TOKENS.find(token => token.type === type)!.byte;

  const metadata =
    'OBJECTIF: Construire un corpus multimodal cohérent.\n' +
    (corpusName ? `CORPUS: ${corpusName}\n` : '');

  return concat(
    marker(254),
    escapePayload(text(metadata)),
    marker(byte),
    escapePayload(payload),
    marker(0)
  );
}

export function buildRawSequence(type: Modality, payload: Uint8Array): Uint8Array {
  const byte = type === 'math' ? 1 : TOKENS.find(token => token.type === type)!.byte;
  return concat(marker(254), escapePayload(text('SOURCE: Fichier local importé. Données inertes, sans exécution.')), marker(byte), escapePayload(payload), marker(0));
}

   function limitSequence(
  sequence: Uint8Array,
  maxPayloadBytes: number
): Uint8Array {
  const limit = Math.max(1, Math.floor(maxPayloadBytes));

  let markerIndex = -1;

  for (let i = 2; i < sequence.length - 2; i++) {
    if (sequence[i] !== 255) continue;

    if (
      i + 1 < sequence.length - 2 &&
      sequence[i + 1] === 255
    ) {
      i++;
      continue;
    }

    if (
      i + 1 < sequence.length - 2 &&
      sequence[i + 1] >= 1 &&
      sequence[i + 1] <= 5
    ) {
      markerIndex = i;
      break;
    }
  }

  if (markerIndex === -1) {
    throw new Error('Marqueur de modalité introuvable.');
  }

  const payloadStart = markerIndex + 2;
  let cursor = payloadStart;
  let decodedBytes = 0;

  while (
    cursor < sequence.length - 2 &&
    decodedBytes < limit
  ) {
    if (
      sequence[cursor] === 255 &&
      sequence[cursor + 1] === 255
    ) {
      cursor += 2;
    } else {
      cursor++;
    }

    decodedBytes++;
  }

  return concat(
    sequence.slice(0, payloadStart),
    sequence.slice(payloadStart, cursor),
    marker(0)
  );
}
   
   export function compileNxs(options: CompileOptions): Uint8Array {
  const total = Math.max(
    4,
    Math.min(4000, Math.round(options.multiplier * 4))
  );

  const kinds: Modality[] = [
    'forge',
    'cyber',
    'vision',
    'mcp',
    'think'
  ];

  const sum =
    options.weights.reduce((a, b) => a + b, 0) || 100;

  const counts = options.weights.map(
    weight => Math.floor(total * weight / sum)
  );

  let remainder = total - counts.reduce((a, b) => a + b, 0);

  for (
    let i = 0;
    remainder > 0;
    i = (i + 1) % counts.length, remainder--
  ) {
    counts[i]++;
  }

  const sequenceLength = Math.max(
    1,
    Math.floor(options.sequenceLength)
  );

  const sequences: Uint8Array[] = [];

  counts.forEach((count, index) => {
    for (let i = 0; i < count; i++) {
      const sequence = buildSequence(
        kinds[index],
        i,
        options.name
      );

      sequences.push(
        limitSequence(sequence, sequenceLength)
      );
    }
  });

  let seed = 42;

  for (let i = sequences.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);

    [sequences[i], sequences[j]] = [
      sequences[j],
      sequences[i]
    ];
  }

  const size = sequences.reduce(
    (totalBytes, sequence) =>
      totalBytes + sequence.length + 4,
    0
  );

  const output = new Uint8Array(size);
  const view = new DataView(output.buffer);
  let offset = 0;

  for (const sequence of sequences) {
    view.setUint32(offset, sequence.length, true);
    offset += 4;

    output.set(sequence, offset);
    offset += sequence.length;
  }

  return output;
         }

  export function parseNxs(data: Uint8Array): ParsedSequence[] {
  const view = new DataView(
    data.buffer,
    data.byteOffset,
    data.byteLength
  );

  const result: ParsedSequence[] = [];
  let offset = 0;

  while (offset < data.length) {
    if (offset + 4 > data.length) {
      throw new Error('En-tête de séquence tronqué.');
    }

    const length = view.getUint32(offset, true);
    offset += 4;

    if (length < 4 || length > data.length - offset) {
      throw new Error('Longueur de séquence invalide.');
    }

    const bytes = data.slice(offset, offset + length);
    offset += length;

    if (
      bytes[0] !== 255 ||
      bytes[1] !== 254 ||
      bytes[length - 2] !== 255 ||
      bytes[length - 1] !== 0
    ) {
      throw new Error('Séquence sans début BOS ou fin EOS.');
    }

    const segments: Segment[] = [];
    let cursor = 2;
    let start = 2;
    let activeType: Modality | null = null;

    while (cursor < length - 2) {
      if (bytes[cursor] !== 255) {
        cursor++;
        continue;
      }

      if (
        cursor + 1 < length - 2 &&
        bytes[cursor + 1] === 255
      ) {
        cursor += 2;
        continue;
      }

      if (cursor + 1 >= length - 2) {
        throw new Error('Marqueur de segment tronqué.');
      }

      const type = bytes[cursor + 1];

      if (type < 1 || type > 5) {
        throw new Error('Type de segment inconnu.');
      }

      if (activeType !== null) {
        segments.push({
          type: activeType,
          data: unescape(bytes.slice(start, cursor))
        });
      }

      activeType = TOKENS[type - 1].type;
      cursor += 2;
      start = cursor;
    }

    if (activeType === null) {
      throw new Error('Aucun segment de données trouvé.');
    }

    segments.push({
      type: activeType,
      data: unescape(bytes.slice(start, length - 2))
    });

    result.push({ bytes, segments });
  }

  return result;
    }
      
      function unescape(data: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length);
  let offset = 0;

  for (let i = 0; i < data.length; i++) {
    if (data[i] === 255 && data[i + 1] === 255) { result[offset++] = 255; i++; }
    else result[offset++] = data[i];
  }

  return result.slice(0, offset);
}

export function createDemoCorpora(): Corpus[] {
  const now = Date.now();

  return [
    { id: 'demo-core', name: 'omniverse_core_v3.nxs', createdAt: now - 3600000, bytes: 1.28 * 1024 ** 4, sequenceCount: 2400000, weights: DEFAULT_WEIGHTS, modalities: ['forge', 'cyber', 'vision', 'mcp', 'think', 'math'], status: 'ready', demo: true },
    { id: 'demo-reason', name: 'reasoning_code_v2.nxs', createdAt: now - 86400000, bytes: 842 * 1024 ** 3, sequenceCount: 1200000, weights: [40, 35, 0, 10, 15], modalities: ['forge', 'cyber', 'mcp', 'think', 'math'], status: 'ready', demo: true },
    { id: 'demo-vision', name: 'vision_stream_v1.nxs', createdAt: now - 172800000, bytes: 426 * 1024 ** 3, sequenceCount: 800000, weights: [5, 0, 70, 10, 15], modalities: ['vision', 'mcp', 'think', 'math'], status: 'indexing', demo: true },
  ];
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes) return '0 o';
  const units = ['o', 'Ko', 'Mo', 'Go', 'To', 'Po'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);

  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(bytes / 1024 ** index)} ${units[index]}`;
}

export function formatNumber(number: number): string {
  return new Intl.NumberFormat('fr-FR').format(number);
}

export function downloadBytes(data: Uint8Array, filename: string, mime = 'application/octet-stream') {
  const blob = new Blob([data.slice().buffer as ArrayBuffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(value: string, filename: string, mime = 'text/plain;charset=utf-8') {
  downloadBytes(text(value), filename, mime);
}

export function previewSequence(sequence: ParsedSequence): string {
  return sequence.segments.map(segment => {
    const token = TOKENS.find(item => item.type === segment.type)!;

    if (segment.type === 'vision') {
      return `[VISION] ${segment.data[0]} trames · ${segment.data[1]} × ${segment.data[2]} · ${segment.data[3] || 3} FPS · ${segment.data.length - 4} octets RVB`;
    }

    return `[${token.name}] ${new TextDecoder().decode(segment.data)}`;
  }).join('\n\n');
}
