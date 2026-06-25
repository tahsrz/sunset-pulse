import { spawnSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

type ImportDocOptions = {
  inputPath: string;
  outputPath?: string;
  outputDir: string;
  title?: string;
  concept?: string;
  aliases: string[];
  domain: string;
  trust: string;
  vitality: string;
  python: string;
  maxChars: number;
  usePlugins: boolean;
};

type MarkItDownPayload = {
  sourcePath: string;
  textContent: string;
};

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, '..');
const INVOCATION_CWD = process.cwd();
const DEFAULT_OUTPUT_DIR = path.resolve(APP_ROOT, 'cartridges', 'imports');
const DEFAULT_MAX_CHARS = 160_000;

function printUsage() {
  console.log(`Usage:
  npm run tah:import-doc -- -- <document-path> [options]

Options:
  --title <text>          Display title for the imported cartridge.
  --concept <slug>        Stable concept id. Defaults to a slug from title/file name.
  --aliases <csv>         Comma-separated search aliases.
  --domain <text>         Domain label. Default: imported_document.
  --trust <text>          Trust label. Default: local_import.
  --vitality <text>       Vitality label. Default: draft.
  --output <path>         Exact .tah output path.
  --output-dir <path>     Output directory. Default: cartridges/imports.
  --python <command>      Python command. Default: python.
  --max-chars <number>    Trim extracted Markdown for a compact draft. Default: ${DEFAULT_MAX_CHARS}.
  --use-plugins           Enable installed MarkItDown plugins.
  --help                  Show this message.

Install MarkItDown first:
  python -m pip install -r apps/pulse/requirements-markitdown.txt`);
}

function parseArgs(argv: string[]): ImportDocOptions | null {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    printUsage();
    return null;
  }

  const inputPath = argv[0];
  const options: ImportDocOptions = {
    inputPath,
    outputDir: DEFAULT_OUTPUT_DIR,
    aliases: [],
    domain: 'imported_document',
    trust: 'local_import',
    vitality: 'draft',
    python: process.env.PYTHON || 'python',
    maxChars: DEFAULT_MAX_CHARS,
    usePlugins: false,
  };

  applyNpmConfigOptions(options);

  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    const requireValue = () => {
      if (!next || next.startsWith('--')) {
        throw new Error(`Missing value for ${arg}`);
      }
      index += 1;
      return next;
    };

    switch (arg) {
      case '--title':
        options.title = requireValue();
        break;
      case '--concept':
        options.concept = slugify(requireValue());
        break;
      case '--aliases':
        options.aliases = requireValue()
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        break;
      case '--domain':
        options.domain = requireValue();
        break;
      case '--trust':
        options.trust = requireValue();
        break;
      case '--vitality':
        options.vitality = requireValue();
        break;
      case '--output':
        options.outputPath = path.resolve(INVOCATION_CWD, requireValue());
        break;
      case '--output-dir':
        options.outputDir = path.resolve(INVOCATION_CWD, requireValue());
        break;
      case '--python':
        options.python = requireValue();
        break;
      case '--max-chars': {
        const parsed = Number(requireValue());
        if (!Number.isFinite(parsed) || parsed < 1) {
          throw new Error('--max-chars must be a positive number');
        }
        options.maxChars = Math.floor(parsed);
        break;
      }
      case '--use-plugins':
        options.usePlugins = true;
        break;
      default:
        if (!arg.startsWith('--')) {
          break;
        }
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function applyNpmConfigOptions(options: ImportDocOptions) {
  const getConfig = (name: string) => process.env[`npm_config_${name.replace(/-/g, '_')}`];
  const output = getConfig('output');
  const outputDir = getConfig('output-dir');
  const title = getConfig('title');
  const concept = getConfig('concept');
  const aliases = getConfig('aliases');
  const domain = getConfig('domain');
  const trust = getConfig('trust');
  const vitality = getConfig('vitality');
  const python = getConfig('python');
  const maxChars = getConfig('max-chars');
  const usePlugins = getConfig('use-plugins');

  if (output && output !== 'true') options.outputPath = path.resolve(INVOCATION_CWD, output);
  if (outputDir && outputDir !== 'true') options.outputDir = path.resolve(INVOCATION_CWD, outputDir);
  if (title && title !== 'true') options.title = title;
  if (concept && concept !== 'true') options.concept = slugify(concept);
  if (aliases && aliases !== 'true') {
    options.aliases = aliases
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (domain && domain !== 'true') options.domain = domain;
  if (trust && trust !== 'true') options.trust = trust;
  if (vitality && vitality !== 'true') options.vitality = vitality;
  if (python && python !== 'true') options.python = python;
  if (maxChars && maxChars !== 'true') {
    const parsed = Number(maxChars);
    if (!Number.isFinite(parsed) || parsed < 1) {
      throw new Error('--max-chars must be a positive number');
    }
    options.maxChars = Math.floor(parsed);
  }
  if (usePlugins === 'true') options.usePlugins = true;
}

function runImport(options: ImportDocOptions) {
  const inputPath = path.resolve(INVOCATION_CWD, options.inputPath);
  if (!fs.existsSync(inputPath) || !fs.statSync(inputPath).isFile()) {
    throw new Error(`Input file does not exist: ${inputPath}`);
  }

  const bridgePath = path.resolve(APP_ROOT, 'scripts', 'markitdown_bridge.py');
  const args = [bridgePath, inputPath];
  if (options.usePlugins) args.push('--use-plugins');

  const result = spawnSync(options.python, args, {
    cwd: APP_ROOT,
    encoding: 'utf8',
    maxBuffer: 30 * 1024 * 1024,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `MarkItDown exited with ${result.status}`).trim());
  }

  const payload = parseBridgePayload(result.stdout);
  const markdown = normalizeMarkdown(payload.textContent);
  if (!markdown) {
    throw new Error('MarkItDown returned no text content.');
  }

  const title = options.title || titleFromPath(inputPath);
  const concept = options.concept || slugify(title);
  const outputPath = options.outputPath || path.join(options.outputDir, `${concept}.tah`);
  const sourceHash = crypto.createHash('sha256').update(fs.readFileSync(inputPath)).digest('hex');
  const importedAt = new Date().toISOString();
  const trimmedMarkdown = trimText(markdown, options.maxChars);
  const cartridge = formatTah({
    title,
    concept,
    aliases: options.aliases,
    domain: options.domain,
    trust: options.trust,
    vitality: options.vitality,
    sourcePath: payload.sourcePath || inputPath,
    sourceHash,
    importedAt,
    markdown: trimmedMarkdown,
    wasTrimmed: trimmedMarkdown.length < markdown.length,
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, cartridge, 'utf8');

  return {
    outputPath,
    title,
    concept,
    sourcePath: payload.sourcePath || inputPath,
    inputBytes: fs.statSync(inputPath).size,
    markdownChars: markdown.length,
    writtenChars: cartridge.length,
    wasTrimmed: trimmedMarkdown.length < markdown.length,
  };
}

function parseBridgePayload(stdout: string): MarkItDownPayload {
  try {
    return JSON.parse(stdout) as MarkItDownPayload;
  } catch (error) {
    throw new Error(`Could not parse MarkItDown bridge output as JSON: ${(error as Error).message}`);
  }
}

function formatTah(input: {
  title: string;
  concept: string;
  aliases: string[];
  domain: string;
  trust: string;
  vitality: string;
  sourcePath: string;
  sourceHash: string;
  importedAt: string;
  markdown: string;
  wasTrimmed: boolean;
}) {
  const aliases = unique([input.concept, ...input.aliases, ...keywordsFromText(input.title)]).join(', ');
  const trimNote = input.wasTrimmed
    ? 'NOTE: Content was trimmed by --max-chars. Re-run with a larger limit if this cartridge needs full-fidelity context.\n\n'
    : '';

  return [
    `TITLE: ${input.title}`,
    `CONCEPT: ${input.concept}`,
    `ALIASES: ${aliases}`,
    `DOMAIN: ${input.domain}`,
    `TRUST: ${input.trust}`,
    `VITALITY: ${input.vitality}`,
    `SOURCE_TYPE: markitdown_import`,
    `SOURCE_PATH: ${input.sourcePath}`,
    `SOURCE_SHA256: ${input.sourceHash}`,
    `IMPORTED_AT: ${input.importedAt}`,
    '',
    'PURPOSE:',
    'Use this imported document as source-grounded context. Prefer explicit text from the document over inference, and flag missing or ambiguous source facts.',
    '',
    'DOCUMENT MARKDOWN:',
    `${trimNote}${input.markdown}`,
    '',
  ].join('\n');
}

function titleFromPath(filePath: string) {
  const base = path.basename(filePath, path.extname(filePath));
  return base
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'imported_document';
}

function normalizeMarkdown(value: string) {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

function trimText(value: string, maxChars: number) {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars).trimEnd()}\n\n[TRIMMED_AFTER_${maxChars}_CHARS]`;
}

function keywordsFromText(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3)
    .slice(0, 8);
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isMainModule() {
  const scriptPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
  return import.meta.url === scriptPath;
}

if (isMainModule()) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options) {
      const result = runImport(options);
      console.log(`TAH import written: ${result.outputPath}`);
      console.log(`Source: ${result.sourcePath}`);
      console.log(`Concept: ${result.concept}`);
      console.log(`Markdown chars: ${result.markdownChars}${result.wasTrimmed ? ' (trimmed)' : ''}`);
    }
  } catch (error) {
    console.error(`TAH import failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

export { formatTah, parseArgs, runImport, slugify };
