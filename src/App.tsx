import { useMemo, useState } from 'react';
import JSZip from 'jszip';
import {
  Check,
  Copy,
  Download,
  FileCode2,
  FolderArchive,
  Play,
  Search,
  ShieldCheck,
} from 'lucide-react';

import manifestRaw from '../extension/manifest.json?raw';
import popupHtmlRaw from '../extension/popup.html?raw';
import popupCssRaw from '../extension/popup.css?raw';
import popupJsRaw from '../extension/popup.js?raw';
import contentJsRaw from '../extension/content.js?raw';
import contentCssRaw from '../extension/content.css?raw';
import readmeRaw from '../extension/README.md?raw';

import icon16Url from '../extension/icons/icon16.png';
import icon32Url from '../extension/icons/icon32.png';
import icon48Url from '../extension/icons/icon48.png';
import icon128Url from '../extension/icons/icon128.png';

interface ExtensionFile {
  path: string;
  role: string;
  language: string;
  content: string;
}

type PreviewRoute = 'home' | 'watch' | 'search';

const EXTENSION_FILES: ExtensionFile[] = [
  {
    path: 'manifest.json',
    role: 'Manifest V3 config',
    language: 'json',
    content: manifestRaw,
  },
  {
    path: 'popup.html',
    role: 'Popup markup',
    language: 'html',
    content: popupHtmlRaw,
  },
  {
    path: 'popup.css',
    role: 'Popup stylesheet',
    language: 'css',
    content: popupCssRaw,
  },
  {
    path: 'popup.js',
    role: 'Popup storage sync',
    language: 'javascript',
    content: popupJsRaw,
  },
  {
    path: 'content.js',
    role: 'SPA & DOM controller',
    language: 'javascript',
    content: contentJsRaw,
  },
  {
    path: 'content.css',
    role: 'Scoped hiding rules',
    language: 'css',
    content: contentCssRaw,
  },
  {
    path: 'README.md',
    role: 'Install & test guide',
    language: 'markdown',
    content: readmeRaw,
  },
];

const ICON_ASSETS = [
  { path: 'icons/icon16.png', size: 16, url: icon16Url },
  { path: 'icons/icon32.png', size: 32, url: icon32Url },
  { path: 'icons/icon48.png', size: 48, url: icon48Url },
  { path: 'icons/icon128.png', size: 128, url: icon128Url },
];

const INSTALL_STEPS = [
  {
    step: '01',
    title: 'Download and extract the extension folder',
    detail:
      'Click Download Extension (.zip) above, right-click the downloaded archive in Windows Explorer, and select Extract All so manifest.json sits directly inside the extracted folder.',
  },
  {
    step: '02',
    title: 'Open Chrome Extensions settings',
    detail:
      'In Google Chrome, open a new tab, enter chrome://extensions in the address bar, and press Enter.',
  },
  {
    step: '03',
    title: 'Enable Developer mode and Load unpacked',
    detail:
      'Switch on Developer mode in the top-right corner, click Load unpacked, and select the extracted folder containing manifest.json.',
  },
  {
    step: '04',
    title: 'Pin and test on YouTube',
    detail:
      'Open youtube.com, verify the homepage feed and watch sidebar suggestions are hidden, and toggle Block recommendations OFF/ON from the toolbar popup.',
  },
];

export default function App() {
  const [selectedPath, setSelectedPath] = useState<string>('manifest.json');
  const [blockingEnabled, setBlockingEnabled] = useState<boolean>(true);
  const [previewRoute, setPreviewRoute] = useState<PreviewRoute>('home');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const selectedFile = useMemo(
    () => EXTENSION_FILES.find((file) => file.path === selectedPath) ?? EXTENSION_FILES[0],
    [selectedPath]
  );

  const selectedLineCount = useMemo(
    () => selectedFile.content.split('\n').length,
    [selectedFile]
  );

  async function handleDownloadZip() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const zip = new JSZip();
      const rootFolder = zip.folder('youtube-recommendation-blocker');
      if (!rootFolder) {
        throw new Error('Failed to initialize ZIP directory.');
      }

      for (const file of EXTENSION_FILES) {
        rootFolder.file(file.path, file.content);
      }

      for (const icon of ICON_ASSETS) {
        const response = await fetch(icon.url);
        if (!response.ok) {
          throw new Error(`Failed to bundle ${icon.path}.`);
        }
        const buffer = await response.arrayBuffer();
        rootFolder.file(icon.path, buffer);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'youtube-recommendation-blocker-v1.0.0.zip';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : 'Unable to generate extension archive.'
      );
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopyFile(file: ExtensionFile) {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopiedPath(file.path);
      window.setTimeout(() => {
        setCopiedPath((prev) => (prev === file.path ? null : prev));
      }, 1800);
    } catch {
      // Clipboard write may be restricted in some sandboxed contexts.
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#18181B]">
      {/* Top Bar: 3-Zone Contract */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
          <a
            href="#package"
            className="flex items-center gap-2.5 text-base font-bold tracking-tight text-zinc-900 whitespace-nowrap shrink-0"
          >
            <img
              src={icon32Url}
              alt="YouTube Recommendation Blocker icon"
              width={24}
              height={24}
              className="h-6 w-6 rounded-md"
            />
            <span>YouTube Recommendation Blocker</span>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600">
            <a
              href="#package"
              className="hover:text-zinc-900 transition-colors whitespace-nowrap shrink-0"
            >
              Package
            </a>
            <a
              href="#preview"
              className="hover:text-zinc-900 transition-colors whitespace-nowrap shrink-0"
            >
              Interactive Preview
            </a>
            <a
              href="#source"
              className="hover:text-zinc-900 transition-colors whitespace-nowrap shrink-0"
            >
              Source Files
            </a>
            <a
              href="#install"
              className="hover:text-zinc-900 transition-colors whitespace-nowrap shrink-0"
            >
              Install Guide
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{downloading ? 'Packaging...' : 'Download .zip'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-12">
        {/* Hero / Package Summary */}
        <section
          id="package"
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch border-b border-zinc-200 pb-10"
        >
          <div className="lg:col-span-7 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500">
                <span>Google Chrome Extension</span>
                <span aria-hidden="true">·</span>
                <span>Manifest V3</span>
                <span aria-hidden="true">·</span>
                <span>Local Storage Only</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 text-balance max-w-2xl">
                Distraction-free YouTube without breaking search, playback, or playlists.
              </h1>

              <p className="text-base leading-relaxed text-zinc-600 max-w-2xl">
                Complete Manifest V3 extension source package ready to extract on Windows and load
                via <code className="text-sm text-zinc-900 font-medium">chrome://extensions</code>.
                Hides the homepage recommended grid and watch page right-sidebar suggestions while
                preserving every core YouTube feature.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={downloading}
                className="inline-flex items-center gap-2 rounded-lg bg-[#E11D48] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#BE123C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FolderArchive className="h-4 w-4" aria-hidden="true" />
                <span>{downloading ? 'Building ZIP...' : 'Download Extension (.zip)'}</span>
              </button>

              <a
                href="#install"
                className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 whitespace-nowrap shrink-0"
              >
                Read Install Steps
              </a>
            </div>

            {downloadError && (
              <p role="alert" className="text-sm font-medium text-red-700">
                {downloadError}
              </p>
            )}
          </div>

          {/* Package Specification Table */}
          <div className="lg:col-span-5 rounded-xl border border-zinc-200 bg-white p-6 flex flex-col justify-between gap-5">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-zinc-900">Package Specification</h2>
              <p className="text-xs text-zinc-500">
                Minimal permissions, zero external network requests.
              </p>
            </div>

            <dl className="divide-y divide-zinc-100 text-sm">
              <div className="flex items-center justify-between py-2.5 gap-4">
                <dt className="text-zinc-500">Manifest version</dt>
                <dd className="font-mono text-xs font-medium text-zinc-900 tabular-nums">MV3 (v1.0.0)</dd>
              </div>
              <div className="flex items-center justify-between py-2.5 gap-4">
                <dt className="text-zinc-500">Permissions</dt>
                <dd className="font-mono text-xs font-medium text-zinc-900">storage</dd>
              </div>
              <div className="flex items-center justify-between py-2.5 gap-4">
                <dt className="text-zinc-500">Content match</dt>
                <dd className="font-mono text-xs font-medium text-zinc-900">
                  https://www.youtube.com/*
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5 gap-4">
                <dt className="text-zinc-500">Bundled files</dt>
                <dd className="font-mono text-xs font-medium text-zinc-900 tabular-nums">
                  11 files (7 source + 4 icons)
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5 gap-4">
                <dt className="text-zinc-500">Icon sizes</dt>
                <dd className="font-mono text-xs font-medium text-zinc-900 tabular-nums">
                  16, 32, 48, 128 px
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Interactive Extension Popup & Behavior Preview */}
        <section id="preview" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900">
                Interactive Popup & Behavior Preview
              </h2>
              <p className="text-sm text-zinc-600">
                Test the exact popup UI and see how YouTube layouts respond when toggling blocking ON
                or OFF.
              </p>
            </div>

            <div
              className="inline-flex items-center gap-1 rounded-lg bg-zinc-200/70 p-1"
              role="tablist"
              aria-label="YouTube route simulation"
            >
              {(
                [
                  { id: 'home', label: 'Homepage (/)' },
                  { id: 'watch', label: 'Watch (/watch)' },
                  { id: 'search', label: 'Search (/results)' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={previewRoute === tab.id}
                  onClick={() => setPreviewRoute(tab.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    previewRoute === tab.id
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Actual Extension Popup Preview */}
            <div className="lg:col-span-4 rounded-xl border border-zinc-200 bg-white p-6 flex flex-col justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-900">Extension Popup (320px)</h3>
                <p className="text-xs text-zinc-500">
                  Interactive replica of <code className="text-zinc-700">popup.html</code>
                </p>
              </div>

              {/* Exact 320px Popup Frame */}
              <div className="mx-auto w-full max-w-[320px] rounded-xl border border-zinc-200 bg-[#FAFAFA] p-4 shadow-sm">
                <div className="flex flex-col gap-3.5">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={icon32Url}
                      alt="YouTube Recommendation Blocker icon"
                      width={24}
                      height={24}
                      className="h-6 w-6 rounded-md shrink-0"
                    />
                    <span className="text-[14px] font-semibold tracking-tight text-zinc-900">
                      YouTube Recommendation Blocker
                    </span>
                  </div>

                  <div className="rounded-[10px] border border-zinc-200 bg-white p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <label
                          htmlFor="preview-toggle-blocking"
                          className="block text-[14px] font-semibold text-zinc-900 cursor-pointer"
                        >
                          Block recommendations
                        </label>
                        <p className="text-xs text-zinc-600">
                          Status:{' '}
                          <span
                            className={`font-bold ${
                              blockingEnabled ? 'text-emerald-700' : 'text-zinc-500'
                            }`}
                          >
                            {blockingEnabled ? 'ON' : 'OFF'}
                          </span>
                        </p>
                      </div>

                      <button
                        id="preview-toggle-blocking"
                        type="button"
                        role="switch"
                        aria-checked={blockingEnabled}
                        aria-label="Block recommendations"
                        onClick={() => setBlockingEnabled((prev) => !prev)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 ${
                          blockingEnabled ? 'bg-[#E11D48]' : 'bg-zinc-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-150 ${
                            blockingEnabled ? 'translate-x-[22px]' : 'translate-x-[2px]'
                          }`}
                        />
                      </button>
                    </div>

                    <p className="border-t border-zinc-200 pt-2.5 text-xs leading-relaxed text-zinc-500">
                      Hides homepage video feed and watch page right-sidebar suggestions.
                    </p>
                  </div>

                  <p className="text-[11.5px] text-zinc-500">Your settings stay on your device.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <ShieldCheck className="h-4 w-4 text-zinc-700 shrink-0" aria-hidden="true" />
                <span>Saved via chrome.storage.local across restarts</span>
              </div>
            </div>

            {/* Simulated YouTube Layout Response */}
            <div className="lg:col-span-8 rounded-xl border border-zinc-200 bg-white p-6 flex flex-col justify-between gap-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-600">
                  <span>
                    {previewRoute === 'home' && 'https://www.youtube.com/'}
                    {previewRoute === 'watch' && 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'}
                    {previewRoute === 'search' &&
                      'https://www.youtube.com/results?search_query=typescript'}
                  </span>
                </div>
                <span className="text-xs font-medium text-zinc-500">
                  DOM gate:{' '}
                  <code className="text-zinc-900">
                    data-yrb-blocked=&quot;{blockingEnabled ? 'true' : 'false'}&quot; ·
                    data-yrb-page=&quot;{previewRoute === 'search' ? 'other' : previewRoute}&quot;
                  </code>
                </span>
              </div>

              {/* Simulated YouTube Shell */}
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-4">
                {/* Masthead (Always Visible) */}
                <div className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
                    <span className="inline-flex h-5 w-7 items-center justify-center rounded bg-[#E11D48] text-white">
                      <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                    </span>
                    <span>YouTube</span>
                  </div>
                  <div className="flex flex-1 max-w-sm items-center justify-between rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-500">
                    <span>Search (always preserved)</span>
                    <Search className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
                  </div>
                  <span className="text-xs text-zinc-500 hidden sm:inline">Account Menu</span>
                </div>

                {/* Route Body */}
                {previewRoute === 'home' && (
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-3 space-y-2 border-r border-zinc-200 pr-3 text-xs text-zinc-700">
                      <div className="font-semibold text-zinc-900">Left Navigation</div>
                      <div>Home</div>
                      <div>Shorts</div>
                      <div>Subscriptions</div>
                      <div>History</div>
                    </div>
                    <div className="col-span-9">
                      {blockingEnabled ? (
                        <div className="flex h-44 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center">
                          <p className="text-sm font-semibold text-zinc-900">
                            Homepage feed hidden
                          </p>
                          <p className="mt-1 text-xs text-zinc-500 max-w-sm">
                            <code>ytd-browse[page-subtype=&quot;home&quot;] ytd-rich-grid-renderer</code>{' '}
                            is hidden. Search bar and left navigation remain active.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3">
                          {[1, 2, 3, 4, 5, 6].map((idx) => (
                            <div
                              key={idx}
                              className="rounded-md border border-zinc-200 bg-white p-2 space-y-2"
                            >
                              <div className="h-14 rounded bg-zinc-200" />
                              <div className="h-2.5 w-4/5 rounded bg-zinc-300" />
                              <div className="h-2 w-1/2 rounded bg-zinc-200" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {previewRoute === 'watch' && (
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-8 space-y-3">
                      <div className="flex h-32 items-center justify-center rounded-md bg-zinc-900 text-xs font-medium text-zinc-100">
                        Video Player + Controls + End-Screens (Preserved)
                      </div>
                      <div className="rounded-md border border-zinc-200 bg-white p-2.5 text-xs text-zinc-700">
                        Video Title, Description &amp; Comments (Preserved)
                      </div>
                    </div>
                    <div className="col-span-4 space-y-2">
                      <div className="rounded-md border border-zinc-200 bg-white p-2 text-[11px] font-medium text-zinc-600">
                        Playlist / Live Chat (Preserved)
                      </div>
                      {blockingEnabled ? (
                        <div className="flex h-28 flex-col items-center justify-center rounded-md border border-dashed border-zinc-300 bg-white p-3 text-center">
                          <p className="text-xs font-semibold text-zinc-900">
                            Sidebar suggestions hidden
                          </p>
                          <p className="mt-1 text-[11px] text-zinc-500">
                            <code>#related</code> hidden
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {[1, 2, 3].map((idx) => (
                            <div
                              key={idx}
                              className="flex gap-2 rounded-md border border-zinc-200 bg-white p-1.5"
                            >
                              <div className="h-9 w-14 shrink-0 rounded bg-zinc-200" />
                              <div className="flex-1 space-y-1.5 py-0.5">
                                <div className="h-2 w-full rounded bg-zinc-300" />
                                <div className="h-2 w-2/3 rounded bg-zinc-200" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {previewRoute === 'search' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-zinc-600">
                      <span>Search results (Never blocked, even when toggle is ON)</span>
                      <span className="font-mono text-zinc-900">page=&quot;other&quot;</span>
                    </div>
                    <div className="space-y-2">
                      {[1, 2, 3].map((idx) => (
                        <div
                          key={idx}
                          className="flex gap-3 rounded-md border border-zinc-200 bg-white p-2.5"
                        >
                          <div className="h-12 w-24 shrink-0 rounded bg-zinc-200" />
                          <div className="flex-1 space-y-2 py-1">
                            <div className="h-2.5 w-3/5 rounded bg-zinc-300" />
                            <div className="h-2 w-2/5 rounded bg-zinc-200" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-xs text-zinc-500">
                Preserved areas: Search, Video playback &amp; controls, End-screens, Comments,
                Descriptions, Subscriptions, Channel pages, Shorts, and Ads.
              </div>
            </div>
          </div>
        </section>

        {/* Source File Inspector */}
        <section id="source" className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">
              Extension Source Files
            </h2>
            <p className="text-sm text-zinc-600">
              Inspect every file included in the downloadable Manifest V3 package.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* File Sidebar */}
            <aside className="lg:col-span-4 rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100 overflow-hidden">
              {EXTENSION_FILES.map((file) => {
                const isActive = file.path === selectedFile.path;
                return (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => setSelectedPath(file.path)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-zinc-900 text-white'
                        : 'bg-white text-zinc-800 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileCode2
                        className={`h-4 w-4 shrink-0 ${
                          isActive ? 'text-zinc-300' : 'text-zinc-400'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="font-mono text-xs font-medium truncate">{file.path}</span>
                    </div>
                    <span
                      className={`text-xs shrink-0 ml-2 ${
                        isActive ? 'text-zinc-300' : 'text-zinc-500'
                      }`}
                    >
                      {file.role}
                    </span>
                  </button>
                );
              })}

              {/* Icon Strip */}
              <div className="px-4 py-3.5 bg-zinc-50 space-y-2.5">
                <div className="text-xs font-medium text-zinc-600">icons/ (Generated PNGs)</div>
                <div className="flex items-center gap-3">
                  {ICON_ASSETS.map((icon) => (
                    <div key={icon.path} className="flex items-center gap-1.5">
                      <img
                        src={icon.url}
                        alt={icon.path}
                        width={20}
                        height={20}
                        className="h-5 w-5 rounded border border-zinc-200 bg-white"
                      />
                      <span className="font-mono text-[11px] text-zinc-600 tabular-nums">
                        {icon.size}px
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* Code Viewer */}
            <div className="lg:col-span-8 rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-3 bg-zinc-50">
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <span className="font-mono font-semibold text-zinc-900">{selectedFile.path}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{selectedLineCount} lines</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{selectedFile.content.length} bytes</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyFile(selectedFile)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedPath === selectedFile.path ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="max-h-[460px] overflow-auto p-4 text-xs leading-relaxed text-zinc-800 font-mono bg-white">
                <code>{selectedFile.content}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* Windows Installation Guide */}
        <section id="install" className="space-y-5 border-t border-zinc-200 pt-10">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">
              Load Unpacked in Google Chrome (Windows)
            </h2>
            <p className="text-sm text-zinc-600">
              Follow these four steps after downloading the extension package.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {INSTALL_STEPS.map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-zinc-200 bg-white p-5 space-y-2.5"
              >
                <div className="font-mono text-xs font-semibold text-[#E11D48] tabular-nums">
                  Step {item.step}
                </div>
                <h3 className="text-sm font-semibold text-zinc-900">{item.title}</h3>
                <p className="text-xs leading-relaxed text-zinc-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
