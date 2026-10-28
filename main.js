require('./tray-main.cjs'); // first: tray icon + only one TwoCode at a time
require('./island-window-main');
const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  safeStorage,
  screen,
  dialog
} = require('electron');

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const os = require('os');

require('./project-mode-main');
require('./ai-monitor-main.cjs');
require('./extras-main.cjs');
require('./settings-app-main.cjs'); // TwoCode Instellingen: settings as their own app
require('./license-main.cjs'); // packs bought on twocode.nl: which extra apps are open

app.setAppUserModelId(
  'nl.twocode.assistent'
);


// ============================================================
// WINDOW
// ============================================================

const PANEL_WIDTH = 860; // wide and low, like NotchNook
const PANEL_HEIGHT = 320;
const ISLAND_FLOAT = 0; // the island hangs from the top edge of the screen (like the notch on a MacBook)

let mascotWindow = null;
let pointerTimer = null;
let mascotInteractive = false;


// ============================================================
// TWOCODE
// ============================================================

const API_BASE =
  'https://twocode.nl/wp-json/twocode/v1/companion';


const CONNECTION_FILE = () =>
  path.join(
    app.getPath('userData'),
    'twocode-connection.json'
  );


// ============================================================
// PROJECT MODE
// ============================================================

const PROJECT_FILE = () =>
  path.join(
    app.getPath('userData'),
    'twocode-project.json'
  );


const PROJECT_MAX_FILES = 5000;

const PROJECT_MAX_DEPTH = 18;

const PROJECT_SEARCH_MAX_FILES = 1200;

const PROJECT_SEARCH_MAX_TOTAL_BYTES =
  60 * 1024 * 1024;

const PROJECT_MAX_SINGLE_FILE_BYTES =
  1024 * 1024;

const PROJECT_READ_MAX_BYTES =
  2 * 1024 * 1024;


// directories that should never be scanned
const PROJECT_IGNORE_DIRECTORIES =
  new Set([
    'node_modules',
    '.git',
    '.svn',
    '.hg',

    'dist',
    'build',
    'out',
    'coverage',

    '.next',
    '.nuxt',

    '.cache',
    '.parcel-cache',

    '.idea',
    '.vscode',

    'vendor',

    '__pycache__',
    '.pytest_cache',

    'target'
  ]);


// huge/generated files that are not useful for code search
const PROJECT_IGNORE_FILES =
  new Set([
    'package-lock.json',
    'pnpm-lock.yaml',
    'yarn.lock',
    'composer.lock',
    'cargo.lock'
  ]);


const PROJECT_TEXT_EXTENSIONS =
  new Set([
    '.js',
    '.jsx',
    '.mjs',
    '.cjs',

    '.ts',
    '.tsx',

    '.html',
    '.htm',

    '.css',
    '.scss',
    '.sass',
    '.less',

    '.json',

    '.md',
    '.mdx',

    '.txt',

    '.xml',

    '.yaml',
    '.yml',

    '.vue',
    '.svelte',

    '.php',

    '.py',

    '.rb',

    '.java',
    '.kt',
    '.kts',

    '.go',

    '.rs',

    '.cs',

    '.c',
    '.cpp',
    '.cc',
    '.h',
    '.hpp',

    '.swift',

    '.sql',

    '.sh',
    '.bash',

    '.ps1',

    '.bat',
    '.cmd'
  ]);


// ============================================================
// PROJECT SECURITY
// ============================================================

function isSensitiveProjectFile(
  filename
) {
  const name =
    String(
      filename ||
      ''
    ).toLowerCase();


  if (
    name ===
    '.env'
  ) {
    return true;
  }


  if (
    name.startsWith(
      '.env.'
    )
  ) {
    return true;
  }


  const blockedNames = [
    'credentials.json',
    'credentials.yml',
    'credentials.yaml',

    'secrets.json',
    'secrets.yml',
    'secrets.yaml',

    'secret.json',

    'id_rsa',
    'id_ed25519',

    '.npmrc',

    '.pypirc'
  ];


  if (
    blockedNames.includes(
      name
    )
  ) {
    return true;
  }


  const extension =
    path.extname(
      name
    );


  return [
    '.pem',
    '.key',
    '.p12',
    '.pfx',
    '.jks'
  ].includes(
    extension
  );
}


function isProjectTextFile(
  filename
) {
  const name =
    String(
      filename ||
      ''
    ).toLowerCase();


  if (
    isSensitiveProjectFile(
      name
    )
  ) {
    return false;
  }


  if (
    PROJECT_IGNORE_FILES.has(
      name
    )
  ) {
    return false;
  }


  if (
    name ===
    'dockerfile'
  ) {
    return true;
  }


  if (
    name ===
    'makefile'
  ) {
    return true;
  }


  if (
    name ===
    '.gitignore'
  ) {
    return true;
  }


  const extension =
    path.extname(
      name
    );


  return PROJECT_TEXT_EXTENSIONS.has(
    extension
  );
}


function normalizePathCompare(
  value
) {
  const normalized =
    path.resolve(
      value
    );


  if (
    process.platform ===
    'win32'
  ) {
    return normalized.toLowerCase();
  }


  return normalized;
}


function pathIsInside(
  root,
  candidate
) {
  const rootNormalized =
    normalizePathCompare(
      root
    );


  const candidateNormalized =
    normalizePathCompare(
      candidate
    );


  return (
    candidateNormalized ===
      rootNormalized ||
    candidateNormalized.startsWith(
      rootNormalized +
      path.sep
    )
  );
}


// ============================================================
// PROJECT STORAGE
// ============================================================

function saveProjectSelection(
  rootPath
) {
  writeJson(
    PROJECT_FILE(),
    {
      rootPath
    }
  );
}


function loadProjectSelection() {
  const saved =
    readJson(
      PROJECT_FILE()
    );


  const rootPath =
    saved?.rootPath;


  if (
    !rootPath ||
    typeof rootPath !==
    'string'
  ) {
    return null;
  }


  try {
    const stat =
      fs.statSync(
        rootPath
      );


    if (
      !stat.isDirectory()
    ) {
      return null;
    }


    return rootPath;

  } catch {
    return null;
  }
}


// ============================================================
// PROJECT SCAN
// ============================================================

function incrementMap(
  map,
  key
) {
  if (!key) {
    return;
  }


  map.set(
    key,
    (
      map.get(
        key
      ) ||
      0
    ) +
    1
  );
}


function detectProjectTechnology(
  rootPath,
  extensionCounts
) {
  let packageJson =
    null;


  const packagePath =
    path.join(
      rootPath,
      'package.json'
    );


  try {
    if (
      fs.existsSync(
        packagePath
      )
    ) {
      packageJson =
        JSON.parse(
          fs.readFileSync(
            packagePath,
            'utf8'
          )
        );
    }
  } catch {}


  const dependencies = {
    ...(
      packageJson?.dependencies ||
      {}
    ),

    ...(
      packageJson?.devDependencies ||
      {}
    )
  };


  const has =
    name =>
      Boolean(
        dependencies[
          name
        ]
      );


  const tsCount =
    (
      extensionCounts.get(
        '.ts'
      ) ||
      0
    ) +
    (
      extensionCounts.get(
        '.tsx'
      ) ||
      0
    );


  const jsCount =
    (
      extensionCounts.get(
        '.js'
      ) ||
      0
    ) +
    (
      extensionCounts.get(
        '.jsx'
      ) ||
      0
    ) +
    (
      extensionCounts.get(
        '.mjs'
      ) ||
      0
    ) +
    (
      extensionCounts.get(
        '.cjs'
      ) ||
      0
    );


  const language =
    tsCount >
    jsCount
      ?
        'TypeScript'
      :
      jsCount >
      0
        ?
          'JavaScript'
        :
          '';


  if (
    has(
      'electron'
    )
  ) {
    return language
      ?
        `Electron · ${language}`
      :
        'Electron';
  }


  if (
    has(
      '@tauri-apps/api'
    ) ||
    fs.existsSync(
      path.join(
        rootPath,
        'src-tauri'
      )
    )
  ) {
    return language
      ?
        `Tauri · ${language}`
      :
        'Tauri';
  }


  if (
    has(
      'next'
    )
  ) {
    return language
      ?
        `Next.js · ${language}`
      :
        'Next.js';
  }


  if (
    has(
      'react'
    )
  ) {
    return language
      ?
        `React · ${language}`
      :
        'React';
  }


  if (
    has(
      'vue'
    )
  ) {
    return language
      ?
        `Vue · ${language}`
      :
        'Vue';
  }


  if (
    packageJson
  ) {
    return language ||
      'Node.js';
  }


  if (
    (
      extensionCounts.get(
        '.php'
      ) ||
      0
    ) >
    0
  ) {
    return 'PHP';
  }


  if (
    (
      extensionCounts.get(
        '.py'
      ) ||
      0
    ) >
    0
  ) {
    return 'Python';
  }


  if (
    (
      extensionCounts.get(
        '.rs'
      ) ||
      0
    ) >
    0
  ) {
    return 'Rust';
  }


  if (
    (
      extensionCounts.get(
        '.java'
      ) ||
      0
    ) >
    0
  ) {
    return 'Java';
  }


  if (
    (
      extensionCounts.get(
        '.cs'
      ) ||
      0
    ) >
    0
  ) {
    return 'C#';
  }


  return 'Project';
}


async function scanProject(
  inputRoot
) {
  if (
    !inputRoot
  ) {
    return {
      ok: true,
      selected: false
    };
  }


  let rootPath;


  try {
    rootPath =
      await fs.promises.realpath(
        inputRoot
      );

  } catch {
    return {
      ok: false,
      selected: false,

      error:
        'De gekozen projectmap bestaat niet meer.'
    };
  }


  let rootStat;


  try {
    rootStat =
      await fs.promises.stat(
        rootPath
      );

  } catch {
    return {
      ok: false,
      selected: false,

      error:
        'De projectmap kan niet gelezen worden.'
    };
  }


  if (
    !rootStat.isDirectory()
  ) {
    return {
      ok: false,
      selected: false,

      error:
        'De geselecteerde locatie is geen map.'
    };
  }


  let fileCount =
    0;

  let folderCount =
    0;

  let ignoredCount =
    0;

  let textFileCount =
    0;

  let truncated =
    false;


  const extensionCounts =
    new Map();


  async function walk(
    directory,
    depth
  ) {
    if (
      truncated ||
      depth >
      PROJECT_MAX_DEPTH
    ) {
      return;
    }


    let entries;


    try {
      entries =
        await fs.promises.readdir(
          directory,
          {
            withFileTypes:
              true
          }
        );

    } catch {
      ignoredCount++;

      return;
    }


    for (
      const entry of entries
    ) {
      if (
        fileCount >=
        PROJECT_MAX_FILES
      ) {
        truncated =
          true;

        return;
      }


      if (
        entry.isSymbolicLink()
      ) {
        ignoredCount++;

        continue;
      }


      if (
        entry.isDirectory()
      ) {
        if (
          PROJECT_IGNORE_DIRECTORIES.has(
            entry.name
          )
        ) {
          ignoredCount++;

          continue;
        }


        folderCount++;


        await walk(
          path.join(
            directory,
            entry.name
          ),

          depth +
          1
        );


        continue;
      }


      if (
        !entry.isFile()
      ) {
        continue;
      }


      if (
        isSensitiveProjectFile(
          entry.name
        )
      ) {
        ignoredCount++;

        continue;
      }


      fileCount++;


      if (
        isProjectTextFile(
          entry.name
        )
      ) {
        textFileCount++;
      }


      const extension =
        path.extname(
          entry.name
        ).toLowerCase();


      incrementMap(
        extensionCounts,
        extension
      );
    }
  }


  await walk(
    rootPath,
    0
  );


  const git =
    fs.existsSync(
      path.join(
        rootPath,
        '.git'
      )
    );


  const technology =
    detectProjectTechnology(
      rootPath,
      extensionCounts
    );


  return {
    ok: true,
    selected: true,

    name:
      path.basename(
        rootPath
      ),

    path:
      rootPath,

    technology,

    git,

    fileCount,
    textFileCount,
    folderCount,
    ignoredCount,

    truncated,

    maxFiles:
      PROJECT_MAX_FILES,

    scannedAt:
      Date.now()
  };
}


async function getCurrentProject() {
  const rootPath =
    loadProjectSelection();


  if (!rootPath) {
    return {
      ok: true,
      selected: false
    };
  }


  return scanProject(
    rootPath
  );
}


async function chooseProject() {
  const currentPath =
    loadProjectSelection();


  const options = {
    title:
      'Kies je TwoCode-project',

    defaultPath:
      currentPath ||
      app.getPath(
        'documents'
      ),

    buttonLabel:
      'Project kiezen',

    properties: [
      'openDirectory'
    ]
  };


  const result =
    mascotWindow &&
    !mascotWindow.isDestroyed()
      ?
        await dialog.showOpenDialog(
          mascotWindow,
          options
        )
      :
        await dialog.showOpenDialog(
          options
        );


  if (
    result.canceled ||
    !result.filePaths?.[0]
  ) {
    return {
      ok: true,
      cancelled: true
    };
  }


  let rootPath;


  try {
    rootPath =
      await fs.promises.realpath(
        result.filePaths[0]
      );

  } catch {
    return {
      ok: false,

      error:
        'Deze map kon niet geopend worden.'
    };
  }


  saveProjectSelection(
    rootPath
  );


  return scanProject(
    rootPath
  );
}


// ============================================================
// PROJECT SEARCH FILE COLLECTION
// ============================================================

async function collectProjectTextFiles(
  rootPath
) {
  const files =
    [];


  let totalBytes =
    0;

  let truncated =
    false;


  async function walk(
    directory,
    depth
  ) {
    if (
      truncated ||
      depth >
      PROJECT_MAX_DEPTH
    ) {
      return;
    }


    let entries;


    try {
      entries =
        await fs.promises.readdir(
          directory,
          {
            withFileTypes:
              true
          }
        );

    } catch {
      return;
    }


    entries.sort(
      (
        a,
        b
      ) =>
        a.name.localeCompare(
          b.name
        )
    );


    for (
      const entry of entries
    ) {
      if (
        files.length >=
        PROJECT_SEARCH_MAX_FILES ||
        totalBytes >=
        PROJECT_SEARCH_MAX_TOTAL_BYTES
      ) {
        truncated =
          true;

        return;
      }


      if (
        entry.isSymbolicLink()
      ) {
        continue;
      }


      const fullPath =
        path.join(
          directory,
          entry.name
        );


      if (
        entry.isDirectory()
      ) {
        if (
          PROJECT_IGNORE_DIRECTORIES.has(
            entry.name
          )
        ) {
          continue;
        }


        await walk(
          fullPath,
          depth +
          1
        );


        continue;
      }


      if (
        !entry.isFile()
      ) {
        continue;
      }


      if (
        !isProjectTextFile(
          entry.name
        )
      ) {
        continue;
      }


      let stat;


      try {
        stat =
          await fs.promises.stat(
            fullPath
          );

      } catch {
        continue;
      }


      if (
        stat.size >
        PROJECT_MAX_SINGLE_FILE_BYTES
      ) {
        continue;
      }


      if (
        totalBytes +
        stat.size >
        PROJECT_SEARCH_MAX_TOTAL_BYTES
      ) {
        truncated =
          true;

        return;
      }


      totalBytes +=
        stat.size;


      files.push({
        fullPath,

        relativePath:
          path
            .relative(
              rootPath,
              fullPath
            )
            .replace(
              /\\/g,
              '/'
            ),

        size:
          stat.size
      });
    }
  }


  await walk(
    rootPath,
    0
  );


  return {
    files,
    truncated
  };
}


// ============================================================
// PROJECT QUERY
// ============================================================

const PROJECT_STOP_WORDS =
  new Set([
    'de',
    'het',
    'een',
    'en',
    'of',

    'ik',
    'jij',
    'je',
    'mijn',
    'me',

    'dit',
    'dat',
    'die',
    'deze',

    'kan',
    'kun',
    'moet',
    'wil',
    'willen',

    'maak',
    'maken',
    'fix',
    'fixen',

    'haal',
    'weg',

    'even',
    'gewoon',

    'naar',
    'van',
    'voor',
    'met',
    'bij',
    'op',
    'in',
    'uit',

    'er',
    'is',
    'zijn',

    'waar',
    'hoe',

    'code',
    'bestand',
    'bestanden'
  ]);


const PROJECT_QUERY_EXPANSIONS = {
  spotify: [
    'spotify',
    'player',
    'playback',
    'track'
  ],

  play: [
    'play',
    'pause',
    'playing',
    'control'
  ],

  knop: [
    'button',
    'control',
    'hit',
    'click'
  ],

  button: [
    'button',
    'control',
    'hit',
    'click'
  ],

  wave: [
    'wave',
    'waveform',
    'bars',
    'audio'
  ],

  waves: [
    'wave',
    'waveform',
    'bars',
    'audio'
  ],

  geluid: [
    'sound',
    'audio',
    'speaker',
    'volume'
  ],

  sound: [
    'sound',
    'audio',
    'speaker',
    'volume'
  ],

  album: [
    'album',
    'cover',
    'image',
    'image_url'
  ],

  cover: [
    'cover',
    'album',
    'image',
    'image_url'
  ],

  instellingen: [
    'settings',
    'setting',
    'config'
  ],

  instelling: [
    'settings',
    'setting',
    'config'
  ],

  spook: [
    'ghost',
    'mascot'
  ],

  spookje: [
    'ghost',
    'mascot'
  ],

  mascot: [
    'ghost',
    'mascot'
  ],

  menu: [
    'menu',
    'home',
    'apps',
    'view'
  ],

  project: [
    'project'
  ],

  animatie: [
    'animation',
    'animate',
    'transition',
    'motion'
  ],

  animaties: [
    'animation',
    'animate',
    'transition',
    'motion'
  ],

  hover: [
    'hover',
    'mousemove',
    'pointer',
    'mouseenter',
    'mouseleave'
  ],

  klik: [
    'click',
    'onclick',
    'pointerdown',
    'hit'
  ],

  klikken: [
    'click',
    'onclick',
    'pointerdown',
    'hit'
  ]
};


function normalizeSearchText(
  value
) {
  return String(
    value ||
    ''
  )
    .normalize(
      'NFD'
    )
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .toLowerCase();
}


function buildProjectSearchTerms(
  query
) {
  const normalized =
    normalizeSearchText(
      query
    );


  const rawTerms =
    normalized.match(
      /[a-z0-9_$.-]+/g
    ) ||
    [];


  const terms =
    new Set();


  for (
    const rawTerm of rawTerms
  ) {
    const term =
      rawTerm.trim();


    if (
      term.length <
      2
    ) {
      continue;
    }


    if (
      PROJECT_STOP_WORDS.has(
        term
      )
    ) {
      continue;
    }


    terms.add(
      term
    );


    const directExpansion =
      PROJECT_QUERY_EXPANSIONS[
        term
      ];


    if (
      directExpansion
    ) {
      for (
        const expanded of directExpansion
      ) {
        terms.add(
          expanded
        );
      }
    }


    for (
      const [
        key,
        expansion
      ] of Object.entries(
        PROJECT_QUERY_EXPANSIONS
      )
    ) {
      if (
        term.startsWith(
          key
        ) &&
        key.length >=
        4
      ) {
        for (
          const expanded of expansion
        ) {
          terms.add(
            expanded
          );
        }
      }
    }
  }


  return Array.from(
    terms
  ).slice(
    0,
    20
  );
}


// ============================================================
// PROJECT SEARCH
// ============================================================

function countOccurrences(
  text,
  term
) {
  if (
    !text ||
    !term
  ) {
    return 0;
  }


  let count =
    0;


  let position =
    0;


  while (true) {
    const index =
      text.indexOf(
        term,
        position
      );


    if (
      index ===
      -1
    ) {
      break;
    }


    count++;


    if (
      count >=
      30
    ) {
      break;
    }


    position =
      index +
      term.length;
  }


  return count;
}


function cleanSnippet(
  value
) {
  return String(
    value ||
    ''
  )
    .replace(
      /\t/g,
      '  '
    )
    .trimEnd()
    .slice(
      0,
      260
    );
}


async function searchProject(
  query
) {
  const selectedRoot =
    loadProjectSelection();


  if (
    !selectedRoot
  ) {
    return {
      ok: false,
      error:
        'Kies eerst een projectmap.'
    };
  }


  const trimmedQuery =
    String(
      query ||
      ''
    ).trim();


  if (
    !trimmedQuery
  ) {
    return {
      ok: false,

      error:
        'Typ eerst wat je wilt zoeken.'
    };
  }


  let rootPath;


  try {
    rootPath =
      await fs.promises.realpath(
        selectedRoot
      );

  } catch {
    return {
      ok: false,

      error:
        'De projectmap bestaat niet meer.'
    };
  }


  const terms =
    buildProjectSearchTerms(
      trimmedQuery
    );


  if (
    terms.length ===
    0
  ) {
    return {
      ok: false,

      error:
        'Ik kon geen bruikbare zoekterm uit je vraag halen.'
    };
  }


  const collected =
    await collectProjectTextFiles(
      rootPath
    );


  const results =
    [];


  const phrase =
    normalizeSearchText(
      trimmedQuery
    );


  for (
    const file of collected.files
  ) {
    let content;


    try {
      content =
        await fs.promises.readFile(
          file.fullPath,
          'utf8'
        );

    } catch {
      continue;
    }


    const contentLower =
      normalizeSearchText(
        content
      );


    const pathLower =
      normalizeSearchText(
        file.relativePath
      );


    let score =
      0;


    const matchedTerms =
      [];


    for (
      const term of terms
    ) {
      let termScore =
        0;


      if (
        pathLower.includes(
          term
        )
      ) {
        termScore +=
          24;
      }


      const occurrences =
        countOccurrences(
          contentLower,
          term
        );


      if (
        occurrences >
        0
      ) {
        termScore +=
          Math.min(
            30,
            occurrences *
            3
          );
      }


      if (
        termScore >
        0
      ) {
        matchedTerms.push(
          term
        );


        score +=
          termScore;
      }
    }


    if (
      phrase.length >=
        5 &&
      contentLower.includes(
        phrase
      )
    ) {
      score +=
        40;
    }


    if (
      phrase.length >=
        5 &&
      pathLower.includes(
        phrase
      )
    ) {
      score +=
        60;
    }


    if (
      score <=
      0
    ) {
      continue;
    }


    const lines =
      content.split(
        /\r?\n/
      );


    const lineMatches =
      [];


    for (
      let index = 0;
      index <
      lines.length;
      index++
    ) {
      const line =
        lines[
          index
        ];


      const lineLower =
        normalizeSearchText(
          line
        );


      let lineScore =
        0;


      const lineTerms =
        [];


      for (
        const term of terms
      ) {
        if (
          lineLower.includes(
            term
          )
        ) {
          lineScore +=
            5;


          lineTerms.push(
            term
          );
        }
      }


      if (
        lineScore ===
        0
      ) {
        continue;
      }


      if (
        /\b(function|class|const|let|var|ipcMain|ipcRenderer|function\s+draw|async\s+function)\b/i.test(
          line
        )
      ) {
        lineScore +=
          2;
      }


      lineMatches.push({
        line:
          index +
          1,

        text:
          cleanSnippet(
            line
          ),

        score:
          lineScore,

        terms:
          lineTerms.slice(
            0,
            6
          )
      });
    }


    lineMatches.sort(
      (
        a,
        b
      ) =>
        b.score -
        a.score
    );


    results.push({
      file:
        file.relativePath,

      size:
        file.size,

      score,

      matchedTerms:
        Array.from(
          new Set(
            matchedTerms
          )
        ).slice(
          0,
          8
        ),

      matches:
        lineMatches.slice(
          0,
          3
        )
    });
  }


  results.sort(
    (
      a,
      b
    ) => {
      if (
        b.score !==
        a.score
      ) {
        return (
          b.score -
          a.score
        );
      }


      return a.file.localeCompare(
        b.file
      );
    }
  );


  return {
    ok: true,

    query:
      trimmedQuery,

    terms,

    searchedFiles:
      collected.files.length,

    truncated:
      collected.truncated,

    count:
      results.length,

    results:
      results.slice(
        0,
        8
      )
  };
}


// ============================================================
// PROJECT READ
// ============================================================

async function resolveProjectFile(
  relativeFile
) {
  const selectedRoot =
    loadProjectSelection();


  if (
    !selectedRoot
  ) {
    throw new Error(
      'Geen project geselecteerd.'
    );
  }


  const rootPath =
    await fs.promises.realpath(
      selectedRoot
    );


  const supplied =
    String(
      relativeFile ||
      ''
    );


  if (
    !supplied ||
    path.isAbsolute(
      supplied
    )
  ) {
    throw new Error(
      'Ongeldig bestand.'
    );
  }


  const candidate =
    path.resolve(
      rootPath,
      supplied
    );


  if (
    !pathIsInside(
      rootPath,
      candidate
    )
  ) {
    throw new Error(
      'Dit bestand ligt buiten het gekozen project.'
    );
  }


  let realFile;


  try {
    realFile =
      await fs.promises.realpath(
        candidate
      );

  } catch {
    throw new Error(
      'Bestand bestaat niet meer.'
    );
  }


  if (
    !pathIsInside(
      rootPath,
      realFile
    )
  ) {
    throw new Error(
      'Dit bestand ligt buiten het gekozen project.'
    );
  }


  const filename =
    path.basename(
      realFile
    );


  if (
    isSensitiveProjectFile(
      filename
    )
  ) {
    throw new Error(
      'Dit bestand is om veiligheidsredenen afgeschermd.'
    );
  }


  if (
    !isProjectTextFile(
      filename
    )
  ) {
    throw new Error(
      'Dit bestandstype kan niet als code worden geopend.'
    );
  }


  const stat =
    await fs.promises.stat(
      realFile
    );


  if (
    !stat.isFile()
  ) {
    throw new Error(
      'Dit is geen bestand.'
    );
  }


  if (
    stat.size >
    PROJECT_READ_MAX_BYTES
  ) {
    throw new Error(
      'Dit bestand is te groot om in Project Mode te bekijken.'
    );
  }


  return {
    rootPath,
    realFile,

    relativePath:
      path
        .relative(
          rootPath,
          realFile
        )
        .replace(
          /\\/g,
          '/'
        )
  };
}


async function readProjectFile(
  file,
  requestedLine = 1
) {
  let resolved;


  try {
    resolved =
      await resolveProjectFile(
        file
      );

  } catch (error) {
    return {
      ok: false,

      error:
        error.message
    };
  }


  let content;


  try {
    content =
      await fs.promises.readFile(
        resolved.realFile,
        'utf8'
      );

  } catch {
    return {
      ok: false,

      error:
        'Het bestand kon niet gelezen worden.'
    };
  }


  const sourceLines =
    content.split(
      /\r?\n/
    );


  const totalLines =
    sourceLines.length;


  const focusLine =
    clampNumber(
      Number(
        requestedLine
      ) ||
      1,

      1,
      Math.max(
        1,
        totalLines
      )
    );


  const radius =
    7;


  const startLine =
    Math.max(
      1,
      focusLine -
      radius
    );


  const endLine =
    Math.min(
      totalLines,
      focusLine +
      radius
    );


  const lines =
    [];


  for (
    let lineNumber =
      startLine;

    lineNumber <=
      endLine;

    lineNumber++
  ) {
    lines.push({
      number:
        lineNumber,

      text:
        sourceLines[
          lineNumber -
          1
        ] ||
        ''
    });
  }


  return {
    ok: true,

    file:
      resolved.relativePath,

    focusLine,

    startLine,
    endLine,
    totalLines,

    lines
  };
}


function clampNumber(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}


// ============================================================
// SPOTIFY
// ============================================================

const SPOTIFY_CLIENT_ID =
  '4cd26d1c69a14dffa0649606f75a4418';
function readSpotifyClientIdFromEnvFile() {
  try {
    const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    const entry = envFile.match(/^\s*TWOCODE_SPOTIFY_CLIENT_ID\s*=\s*(.*?)\s*$/m);
    if (!entry) return '';

    return entry[1].replace(/^(?:"(.*)"|'(.*)')$/, (_, doubleQuoted, singleQuoted) =>
      doubleQuoted ?? singleQuoted
    ).trim();
  } catch {
    return '';
  }
}

const configuredSpotifyClientId = String(
  process.env.TWOCODE_SPOTIFY_CLIENT_ID ||
  readSpotifyClientIdFromEnvFile()
).trim();
const ACTIVE_SPOTIFY_CLIENT_ID = /^[A-Za-z0-9]{20,80}$/.test(configuredSpotifyClientId)
  ? configuredSpotifyClientId
  : SPOTIFY_CLIENT_ID;


const SPOTIFY_REDIRECT_URI =
  'http://127.0.0.1:8888/callback';


const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state'
].join(' ');


const SPOTIFY_TOKEN_FILE = () =>
  path.join(
    app.getPath('userData'),
    'spotify-tokens.json'
  );


let spotifyAuthPromise = null;
let spotifyRefreshPromise = null;
let spotifyRateLimitedUntil = 0;


// ============================================================
// JSON
// ============================================================

function writeJson(
  filePath,
  data
) {
  fs.writeFileSync(
    filePath,
    JSON.stringify(
      data,
      null,
      2
    ),
    'utf8'
  );
}


function readJson(
  filePath
) {
  try {
    return JSON.parse(
      fs.readFileSync(
        filePath,
        'utf8'
      )
    );

  } catch {
    return null;
  }
}


// ============================================================
// SAFE STORAGE
// ============================================================

function encryptString(
  value
) {
  if (
    !safeStorage.isEncryptionAvailable()
  ) {
    throw new Error(
      'Veilige Windows-opslag is niet beschikbaar.'
    );
  }


  return safeStorage
    .encryptString(
      value
    )
    .toString(
      'base64'
    );
}


function decryptString(
  value
) {
  if (
    !value ||
    !safeStorage.isEncryptionAvailable()
  ) {
    return '';
  }


  try {
    return safeStorage.decryptString(
      Buffer.from(
        value,
        'base64'
      )
    );

  } catch {
    return '';
  }
}


// ============================================================
// TWOCODE CONNECTION
// ============================================================

function saveConnection(
  deviceToken,
  user
) {
  writeJson(
    CONNECTION_FILE(),
    {
      token:
        encryptString(
          deviceToken
        ),

      user:
        user ||
        null
    }
  );
}


function getConnection() {
  const saved =
    readJson(
      CONNECTION_FILE()
    );


  const token =
    saved?.token
      ?
        decryptString(
          saved.token
        )
      :
        '';


  return {
    connected:
      Boolean(
        token
      ),

    token,

    user:
      saved?.user ||
      null
  };
}


// ============================================================
// HTTP
// ============================================================

async function readResponse(
  response
) {
  const text =
    await response.text();


  if (!text) {
    return null;
  }


  try {
    return JSON.parse(
      text
    );

  } catch {
    return text;
  }
}


async function postJson(
  url,
  body,
  headers = {}
) {
  const response =
    await fetch(
      url,
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/json',

          ...headers
        },

        body:
          JSON.stringify(
            body ||
            {}
          )
      }
    );


  const data =
    await readResponse(
      response
    );


  if (
    !response.ok
  ) {
    throw new Error(
      data?.message ||
      data?.error ||
      `HTTP ${response.status}`
    );
  }


  return data;
}


// ============================================================
// TWOCODE PAIR
// ============================================================

async function connectToTwoCode() {
  const existing =
    getConnection();


  if (
    existing.connected
  ) {
    return {
      ok: true,
      connected: true,

      user:
        existing.user
    };
  }


  const startData =
    await postJson(
      `${API_BASE}/pair/start`,
      {
        device_name:
          `TwoCode Assistent - ${os.hostname()}`
      }
    );


  if (
    !startData?.pair_code
  ) {
    throw new Error(
      'TwoCode koppeling kon niet gestart worden.'
    );
  }


  if (
    startData.connect_url
  ) {
    await shell.openExternal(
      startData.connect_url
    );
  }


  const startedAt =
    Date.now();


  const timeout =
    Math.max(
      60000,

      Number(
        startData.expires_in ||
        300
      ) *
      1000
    );


  while (
    Date.now() -
    startedAt <
    timeout
  ) {
    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          1800
        )
    );


    const status =
      await postJson(
        `${API_BASE}/pair/status`,
        {
          pair_code:
            startData.pair_code
        }
      );


    const pairState =
      status?.state ||
      status?.status;


    if (
      pairState ===
        'approved' &&
      status?.device_token
    ) {
      saveConnection(
        status.device_token,
        status.user ||
        null
      );


      return {
        ok: true,
        connected: true,

        user:
          status.user ||
          null
      };
    }


    if (
      pairState ===
      'denied'
    ) {
      throw new Error(
        'Koppeling geweigerd.'
      );
    }


    if (
      pairState ===
      'expired'
    ) {
      throw new Error(
        'De koppeling is verlopen.'
      );
    }
  }


  throw new Error(
    'De koppeling duurde te lang.'
  );
}


// ============================================================
// TWOCODE STATE
// ============================================================

async function getTwoCodeState() {
  const connection =
    getConnection();


  if (
    !connection.connected
  ) {
    return {
      ok: false,
      connected: false
    };
  }


  const response =
    await fetch(
      `${API_BASE}/state`,
      {
        headers: {
          'X-TwoCode-Companion-Key':
            connection.token
        }
      }
    );


  const data =
    await readResponse(
      response
    );


  if (
    !response.ok
  ) {
    return {
      ok: false,
      connected: true,

      error:
        data?.message ||
        data?.error ||
        `HTTP ${response.status}`
    };
  }


  return {
    ...(data || {}),

    ok: true,
    connected: true
  };
}


// ============================================================
// URL
// ============================================================

function normalizeTwoCodeUrl(
  value
) {
  try {
    const url =
      value?.startsWith('/')
        ?
          new URL(
            value,
            'https://twocode.nl'
          )
        :
          new URL(
            value
          );


    if (
      url.protocol !==
        'https:' ||
      url.hostname !==
        'twocode.nl'
    ) {
      return '';
    }


    return url.toString();

  } catch {
    return '';
  }
}


function openTwoCodeUrl(
  value
) {
  const url =
    normalizeTwoCodeUrl(
      value
    );


  if (
    url
  ) {
    shell.openExternal(
      url
    );
  }
}


// ============================================================
// SPOTIFY STORAGE
// ============================================================

function base64Url(
  buffer
) {
  return buffer
    .toString(
      'base64'
    )
    .replace(
      /\+/g,
      '-'
    )
    .replace(
      /\//g,
      '_'
    )
    .replace(
      /=+$/g,
      ''
    );
}


function saveSpotifyTokens(
  tokens
) {
  writeJson(
    SPOTIFY_TOKEN_FILE(),
    {
      encrypted:
        encryptString(
          JSON.stringify(
            tokens
          )
        )
    }
  );
}


function loadSpotifyTokens() {
  const saved =
    readJson(
      SPOTIFY_TOKEN_FILE()
    );


  if (
    !saved?.encrypted
  ) {
    return null;
  }


  const raw =
    decryptString(
      saved.encrypted
    );


  if (!raw) {
    return null;
  }


  try {
    const tokens = JSON.parse(
      raw
    );

    // A Spotify refresh token belongs to the Client ID that issued it. Treat legacy tokens as
    // belonging to the bundled app, then ask the user to connect again after switching fork IDs.
    const tokenClientId = tokens.client_id || SPOTIFY_CLIENT_ID;
    if (tokenClientId !== ACTIVE_SPOTIFY_CLIENT_ID) {
      clearSpotifyTokens();
      return null;
    }
    return tokens;

  } catch {
    return null;
  }
}


function clearSpotifyTokens() {
  try {
    fs.unlinkSync(
      SPOTIFY_TOKEN_FILE()
    );

  } catch {}
}


// ============================================================
// SPOTIFY TOKEN
// ============================================================

async function exchangeSpotifyCode(
  code,
  verifier
) {
  const response =
    await fetch(
      'https://accounts.spotify.com/api/token',
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded'
        },

        body:
          new URLSearchParams({
            client_id:
              ACTIVE_SPOTIFY_CLIENT_ID,

            grant_type:
              'authorization_code',

            code,

            redirect_uri:
              SPOTIFY_REDIRECT_URI,

            code_verifier:
              verifier
          })
      }
    );


  const data =
    await readResponse(
      response
    );


  if (
    !response.ok
  ) {
    throw new Error(
      data?.error_description ||
      data?.error ||
      'Spotify koppelen mislukt.'
    );
  }


  const tokens = {
    client_id:
      ACTIVE_SPOTIFY_CLIENT_ID,

    access_token:
      data.access_token,

    refresh_token:
      data.refresh_token,

    expires_at:
      Date.now() +
      Number(
        data.expires_in ||
        3600
      ) *
      1000
  };


  saveSpotifyTokens(
    tokens
  );


  return tokens;
}


async function refreshSpotifyToken(
  current
) {
  if (
    !current?.refresh_token
  ) {
    clearSpotifyTokens();


    throw new Error(
      'Spotify moet opnieuw gekoppeld worden.'
    );
  }


  const response =
    await fetch(
      'https://accounts.spotify.com/api/token',
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded'
        },

        body:
          new URLSearchParams({
            client_id:
              ACTIVE_SPOTIFY_CLIENT_ID,

            grant_type:
              'refresh_token',

            refresh_token:
              current.refresh_token
          })
      }
    );


  const data =
    await readResponse(
      response
    );


  if (
    !response.ok
  ) {
    if (
      data?.error ===
      'invalid_grant'
    ) {
      clearSpotifyTokens();
    }


    throw new Error(
      data?.error_description ||
      data?.error ||
      'Spotify token vernieuwen mislukt.'
    );
  }


  const next = {
    ...current,

    access_token:
      data.access_token,

    refresh_token:
      data.refresh_token ||
      current.refresh_token,

    expires_at:
      Date.now() +
      Number(
        data.expires_in ||
        3600
      ) *
      1000
  };


  saveSpotifyTokens(
    next
  );


  return next;
}


async function spotifyToken(
  forceRefresh =
    false
) {
  let current =
    loadSpotifyTokens();


  if (!current) {
    return null;
  }


  if (
    forceRefresh ||
    !current.access_token ||
    Date.now() >=
      Number(
        current.expires_at ||
        0
      ) -
      60000
  ) {
    if (
      !spotifyRefreshPromise
    ) {
      spotifyRefreshPromise =
        refreshSpotifyToken(
          current
        );
    }


    try {
      current =
        await spotifyRefreshPromise;

    } finally {
      spotifyRefreshPromise =
        null;
    }
  }


  return (
    current?.access_token ||
    null
  );
}


// ============================================================
// SPOTIFY CONNECT
// ============================================================

async function spotifyConnect() {
  if (
    loadSpotifyTokens()
      ?.refresh_token
  ) {
    return {
      ok: true,
      connected: true
    };
  }


  if (
    spotifyAuthPromise
  ) {
    return spotifyAuthPromise;
  }


  spotifyAuthPromise =
    new Promise(
      (
        resolve,
        reject
      ) => {
        const verifier =
          base64Url(
            crypto.randomBytes(
              64
            )
          );


        const challenge =
          base64Url(
            crypto
              .createHash(
                'sha256'
              )
              .update(
                verifier
              )
              .digest()
          );


        const state =
          base64Url(
            crypto.randomBytes(
              24
            )
          );


        let finished =
          false;


        const finish = (
          fn,
          value
        ) => {
          if (
            finished
          ) {
            return;
          }


          finished =
            true;


          clearTimeout(
            timeout
          );


          try {
            server.close();
          } catch {}


          fn(
            value
          );
        };


        const server =
          http.createServer(
            async (
              req,
              res
            ) => {
              try {
                const url =
                  new URL(
                    req.url,
                    SPOTIFY_REDIRECT_URI
                  );


                if (
                  url.pathname !==
                  '/callback'
                ) {
                  res.writeHead(
                    404
                  );

                  res.end();

                  return;
                }


                if (
                  url.searchParams.get(
                    'state'
                  ) !==
                    state
                ) {
                  throw new Error(
                    'Ongeldige Spotify callback.'
                  );
                }


                const oauthError =
                  url.searchParams.get(
                    'error'
                  );


                if (
                  oauthError
                ) {
                  throw new Error(
                    'Spotify koppeling geannuleerd.'
                  );
                }


                const code =
                  url.searchParams.get(
                    'code'
                  );


                if (!code) {
                  throw new Error(
                    'Geen Spotify-code ontvangen.'
                  );
                }


                await exchangeSpotifyCode(
                  code,
                  verifier
                );


                res.writeHead(
                  200,
                  {
                    'Content-Type':
                      'text/html; charset=utf-8'
                  }
                );


                res.end(`
                  <!doctype html>
                  <html lang="nl">
                  <body style="
                    font-family:system-ui;
                    background:#0b0e0b;
                    color:white;
                    padding:50px;
                    text-align:center;
                  ">
                    <h2>Spotify gekoppeld ✓</h2>
                    <p>Je kunt dit tabblad sluiten.</p>
                  </body>
                  </html>
                `);


                finish(
                  resolve,
                  {
                    ok: true,
                    connected: true
                  }
                );

              } catch (error) {
                try {
                  res.writeHead(
                    400,
                    {
                      'Content-Type':
                        'text/plain; charset=utf-8'
                    }
                  );


                  res.end(
                    'Spotify koppeling mislukt.'
                  );

                } catch {}


                finish(
                  reject,
                  error
                );
              }
            }
          );


        const timeout =
          setTimeout(
            () => {
              finish(
                reject,

                new Error(
                  'Spotify koppeling verlopen.'
                )
              );
            },

            180000
          );


        server.on(
          'error',

          error => {
            finish(
              reject,
              error
            );
          }
        );


        server.listen(
          8888,
          '127.0.0.1',

          async () => {
            const url =
              new URL(
                'https://accounts.spotify.com/authorize'
              );


            url.search =
              new URLSearchParams({
                client_id:
                  ACTIVE_SPOTIFY_CLIENT_ID,

                response_type:
                  'code',

                redirect_uri:
                  SPOTIFY_REDIRECT_URI,

                scope:
                  SPOTIFY_SCOPES,

                code_challenge_method:
                  'S256',

                code_challenge:
                  challenge,

                state
              }).toString();


            try {
              await shell.openExternal(
                url.toString()
              );

            } catch (error) {
              finish(
                reject,
                error
              );
            }
          }
        );
      }
    );


  try {
    return await spotifyAuthPromise;

  } finally {
    spotifyAuthPromise =
      null;
  }
}


// ============================================================
// SPOTIFY API
// ============================================================

async function spotifyApi(
  route,
  options = {},
  retried = false
) {
  if (
    Date.now() <
    spotifyRateLimitedUntil
  ) {
    throw new Error(
      'Spotify vraagt even te wachten.'
    );
  }


  const token =
    await spotifyToken(
      retried
    );


  if (!token) {
    throw new Error(
      'Spotify is nog niet gekoppeld.'
    );
  }


  const response =
    await fetch(
      `https://api.spotify.com${route}`,
      {
        ...options,

        headers: {
          Authorization:
            `Bearer ${token}`,

          ...(
            options.headers ||
            {}
          )
        }
      }
    );


  if (
    response.status ===
      401 &&
    !retried
  ) {
    await spotifyToken(
      true
    );


    return spotifyApi(
      route,
      options,
      true
    );
  }


  if (
    response.status ===
    429
  ) {
    const seconds =
      Number(
        response.headers.get(
          'retry-after'
        ) ||
        2
      );


    spotifyRateLimitedUntil =
      Date.now() +
      seconds *
      1000;


    throw new Error(
      'Spotify vraagt even te wachten.'
    );
  }


  if (
    response.status ===
    204
  ) {
    return null;
  }


  const data =
    await readResponse(
      response
    );


  if (
    !response.ok
  ) {
    const detail = typeof data === 'string'
      ? data.slice(0, 240)
      : String(data?.error?.message || data?.message || '').slice(0, 240);
    const error = new Error(detail || `Spotify HTTP ${response.status}`);
    error.spotifyStatus = response.status;
    error.spotifyDetail = detail;
    throw error;
  }


  return data;
}


// ============================================================
// SPOTIFY STATE
// ============================================================

async function getSpotifyState() {
  if (
    !loadSpotifyTokens()
  ) {
    return {
      ok: true,
      connected: false,
      active: false
    };
  }


  try {
    const data =
      await spotifyApi(
        '/v1/me/player?additional_types=track,episode'
      );


    if (
      !data ||
      !data.item
    ) {
      return {
        ok: true,
        connected: true,
        active: false,

        is_playing:
          false,

        progress_ms:
          0,

        duration_ms:
          0,

        track:
          null
      };
    }


    const item =
      data.item;


    const images =
      item.album?.images ||
      item.images ||
      item.show?.images ||
      [];


    return {
      ok: true,
      connected: true,
      active: true,

      is_playing:
        Boolean(
          data.is_playing
        ),

      progress_ms:
        Number(
          data.progress_ms ||
          0
        ),

      duration_ms:
        Number(
          item.duration_ms ||
          0
        ),

      track: {
        id:
          item.id ||
          '',

        uri:
          item.uri ||
          '',

        name:
          item.name ||
          'Spotify',

        artist:
          item.artists
            ?.map(
              artist =>
                artist.name
            )
            .join(', ') ||
          item.show?.name ||
          '',

        image_url:
          images?.[0]?.url ||
          ''
      },

      // where it plays: this PC, your phone, the car… (the island only grows for music on this PC)
      device: spotifyDevice(
        data.device
      )
    };

  } catch (error) {
    return {
      ok: false,
      connected: true,
      active: false,

      status: Number(error.spotifyStatus) || 0,
      detail: error.spotifyDetail || '',
      error:
        error.message
    };
  }
}

// One Spotify Connect device, and whether it is this PC (the Spotify app here, or a web player here).
function spotifyDevice(device) {
  if (!device) return null;
  const name = String(device.name || ''), type = String(device.type || '');
  const here = type === 'Computer' && (name.toLowerCase() === os.hostname().toLowerCase() || /^web player/i.test(name));
  return { id: String(device.id || ''), name, type, active: Boolean(device.is_active), volume: Number.isFinite(device.volume_percent) ? device.volume_percent : null, here };
}

// Spotify Connect: your devices, and moving the music to another one (like the speaker button in Spotify).
async function spotifyDevices() {
  try {
    const data = await spotifyApi('/v1/me/player/devices');
    return { ok: true, devices: (data?.devices || []).filter(d => d.id && !d.is_restricted).map(spotifyDevice) };
  } catch (error) {
    return { ok: false, devices: [], status: Number(error.spotifyStatus) || 0, detail: error.spotifyDetail || '', error: error.message };
  }
}
async function spotifyTransfer(id) {
  if (typeof id !== 'string' || !/^[\w-]{6,80}$/.test(id)) return { ok: false, error: 'Onbekend apparaat.' };
  try {
    await spotifyApi('/v1/me/player', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ device_ids: [id], play: true }) });
    return { ok: true };
  } catch (error) {
    return { ok: false, status: Number(error.spotifyStatus) || 0, error: /premium/i.test(error.message) ? 'Wisselen van apparaat kan alleen met Spotify Premium.' : error.message };
  }
}


// ============================================================
// SPOTIFY CONTROL
// ============================================================

async function spotifyControl(
  action
) {
  if (
    action ===
    'open'
  ) {
    try {
      await shell.openExternal(
        'spotify:'
      );

    } catch {
      await shell.openExternal(
        'https://open.spotify.com/'
      );
    }


    return {
      ok: true
    };
  }


  const commands = {
    play: [
      '/v1/me/player/play',
      'PUT'
    ],

    pause: [
      '/v1/me/player/pause',
      'PUT'
    ],

    next: [
      '/v1/me/player/next',
      'POST'
    ],

    previous: [
      '/v1/me/player/previous',
      'POST'
    ]
  };


  const command =
    commands[
      action
    ];


  if (!command) {
    return {
      ok: false,

      error:
        'Onbekende Spotify-actie.'
    };
  }


  try {
    await spotifyApi(
      command[0],
      {
        method:
          command[1]
      }
    );


    return {
      ok: true
    };

  } catch (error) {
    return {
      ok: false,

      error:
        error.message
    };
  }
}


// ============================================================
// SPOTIFY SEEK
// ============================================================

async function spotifySeek(
  positionMs
) {
  const safePosition =
    Math.max(
      0,

      Math.round(
        Number(
          positionMs
        ) ||
        0
      )
    );


  try {
    await spotifyApi(
      `/v1/me/player/seek?position_ms=${safePosition}`,
      {
        method:
          'PUT'
      }
    );


    return {
      ok: true
    };

  } catch (error) {
    return {
      ok: false,

      error:
        error.message
    };
  }
}


// ============================================================
// WINDOW POSITION
// ============================================================

function positionMascot() {
  if (
    !mascotWindow ||
    mascotWindow.isDestroyed()
  ) {
    return;
  }


  const display =
    screen.getPrimaryDisplay();


  const x =
    Math.round(
      display.bounds.x +
      (
        display.bounds.width -
        PANEL_WIDTH
      ) /
      2
    );


  const y =
    display.bounds.y + ISLAND_FLOAT; // the island floats a little below the top edge, like the Dynamic Island


  mascotWindow.setPosition(
    x,
    y,
    false
  );
}


// ============================================================
// POINTER
// ============================================================

// Safety net: the island repeats its choice at least once a second. If it goes quiet while the window
// still catches the mouse (a frozen or throttled page), let go after 2 s, so clicks reach the apps below.
let interactiveHeardAt = 0;

let lastPointerKey = '';
let lastPointerAt = 0;

function sendPointer() {
  if (
    !mascotWindow ||
    mascotWindow.isDestroyed() ||
    !mascotWindow.isVisible()
  ) {
    return;
  }


  if (
    mascotInteractive &&
    Date.now() - interactiveHeardAt > 2000
  ) {
    setMascotInteractive(
      false
    );
  }


  const cursor =
    screen.getCursorScreenPoint();


  const bounds =
    mascotWindow.getBounds();


  // Only tell the island when the mouse moved (or the island moved): this runs 50 times a second,
  // and sending the same point over and over kept the PC busy for nothing. A refresh every second stays.
  const key = cursor.x + ',' + cursor.y + ',' + bounds.x + ',' + bounds.y;
  const stamp = Date.now();

  if (key === lastPointerKey && stamp - lastPointerAt < 1000) {
    return;
  }

  lastPointerKey = key;
  lastPointerAt = stamp;


  mascotWindow.webContents.send(
    'companion:pointer',
    {
      x:
        cursor.x -
        bounds.x,

      y:
        cursor.y -
        bounds.y,

      insideWindow:
        cursor.x >=
          bounds.x &&
        cursor.x <
          bounds.x +
          bounds.width &&
        cursor.y >=
          bounds.y &&
        cursor.y <
          bounds.y +
          bounds.height
    }
  );
}


// ============================================================
// INTERACTION
// ============================================================

function setMascotInteractive(
  interactive
) {
  if (
    !mascotWindow ||
    mascotWindow.isDestroyed()
  ) {
    return;
  }


  const next =
    Boolean(
      interactive
    );


  // Catching the mouse is only switched on when it changes. Letting clicks through is applied again every
  // time the island says so (about once a second): Windows could leave the invisible window catching clicks
  // after Claude finished, so the top of the screen stopped working until you clicked the island.
  if (
    next &&
    next ===
    mascotInteractive
  ) {
    return;
  }


  mascotInteractive =
    next;


  mascotWindow.setIgnoreMouseEvents(
    !next,
    {
      forward:
        true
    }
  );
}


// ============================================================
// CREATE WINDOW
// ============================================================

function createMascot() {
  mascotWindow =
    new BrowserWindow({
      icon: path.join(__dirname, 'assets', 'icon.ico'), // Robo under the island (Alt+Tab, Task Manager)
      width:
        PANEL_WIDTH,

      height:
        PANEL_HEIGHT,

      frame:
        false,

      transparent:
        true,

      backgroundColor:
        '#00000000',

      resizable:
        false,

      movable:
        false,

      minimizable:
        false,

      maximizable:
        false,

      fullscreenable:
        false,

      skipTaskbar:
        true,

      alwaysOnTop:
        true,

      // nodig om in Project Mode te kunnen typen
      focusable:
        true,

      hasShadow:
        false,

      show:
        false,

      webPreferences: {
        preload:
          path.join(
            __dirname,
            'preload.js'
          ),

        contextIsolation:
          true,

        nodeIntegration:
          false,

        autoplayPolicy:
          'no-user-gesture-required'
      }
    });


  mascotWindow.setAlwaysOnTop(
    true,
    'floating'
  );


  mascotWindow.setVisibleOnAllWorkspaces(
    true,
    {
      visibleOnFullScreen:
        true
    }
  );


  setMascotInteractive(
    false
  );


  positionMascot();


  mascotWindow.loadFile(
    'mascot.html'
  );


  // Always normal size: Chromium remembers a zoom level per page, and a zoomed island looks broken.
  // (Ctrl + scroll or Ctrl + plus can't zoom it either.)
  mascotWindow.webContents.on(
    'did-finish-load',
    () => {
      mascotWindow.webContents.setZoomFactor(1);
      mascotWindow.webContents.setVisualZoomLevelLimits(1, 1).catch(() => {});
    }
  );


  mascotWindow.webContents.on(
    'zoom-changed',
    () => mascotWindow.webContents.setZoomFactor(1)
  );


  mascotWindow.once(
    'ready-to-show',

    () => {
      mascotWindow.showInactive();
    }
  );


  mascotWindow.on(
    'closed',

    () => {
      mascotWindow =
        null;
    }
  );
}


// ============================================================
// TWOCODE IPC
// ============================================================

ipcMain.handle(
  'twocode:connect',

  async () =>
    connectToTwoCode()
);


ipcMain.handle(
  'twocode:get-connection',

  async () => {
    const connection =
      getConnection();


    return {
      connected:
        connection.connected,

      user:
        connection.user
    };
  }
);


ipcMain.handle(
  'twocode:get-state',

  async () =>
    getTwoCodeState()
);


// ============================================================
// PROJECT IPC
// ============================================================

ipcMain.handle(
  'project:get',

  async () =>
    getCurrentProject()
);


ipcMain.handle(
  'project:choose',

  async () =>
    chooseProject()
);


ipcMain.handle(
  'project:rescan',

  async () =>
    getCurrentProject()
);


ipcMain.handle(
  'project:search',

  async (
    _event,
    payload
  ) =>
    searchProject(
      payload?.query ||
      ''
    )
);


ipcMain.handle(
  'project:read',

  async (
    _event,
    payload
  ) =>
    readProjectFile(
      payload?.file ||
      '',

      payload?.line ||
      1
    )
);


// ============================================================
// SPOTIFY IPC
// ============================================================

ipcMain.handle(
  'spotify:connect',

  async () =>
    spotifyConnect()
);


ipcMain.handle(
  'spotify:get-state',

  async () =>
    getSpotifyState()
);


ipcMain.handle(
  'spotify:control',

  async (
    _event,
    action
  ) =>
    spotifyControl(
      action
    )
);


ipcMain.handle('spotify:devices', () => spotifyDevices()); // Spotify Connect: where it can play
ipcMain.handle('spotify:transfer', (_event, id) => spotifyTransfer(id));

ipcMain.handle(
  'spotify:seek',

  async (
    _event,
    positionMs
  ) =>
    spotifySeek(
      positionMs
    )
);


ipcMain.handle(
  'spotify:disconnect',

  async () => {
    clearSpotifyTokens();


    return {
      ok: true
    };
  }
);


// ============================================================
// OTHER IPC
// ============================================================

ipcMain.on(
  'twocode:open-url',

  (
    _event,
    value
  ) => {
    openTwoCodeUrl(
      value
    );
  }
);


ipcMain.on(
  'island:set-interactive',

  (
    _event,
    interactive
  ) => {
    interactiveHeardAt = Date.now();

    setMascotInteractive(
      interactive
    );
  }
);


ipcMain.on(
  'window:close',

  () => {
    app.quit();
  }
);


// Goodbye: before closing, TwoCode waves "Doei!" and the island
// closes smoothly (twocode-fun.js), then the app really quits.
let goodbyeShown = false;

app.on(
  'before-quit',

  event => {
    if (
      goodbyeShown ||
      !mascotWindow ||
      mascotWindow.isDestroyed() ||
      !mascotWindow.isVisible()
    ) {
      return;
    }

    goodbyeShown = true;
    event.preventDefault();
    mascotWindow.webContents.send('twocode:goodbye');
    setTimeout(() => app.quit(), 1000); // right after the goodbye (twocode-fun.js: eyes close, the island slips into the edge)
  }
);


ipcMain.on(
  'twocode:notify',
  () => {}
);


ipcMain.on(
  'island:set-state',
  () => {}
);


ipcMain.on(
  'window:set-mode',
  () => {}
);


// ============================================================
// APP
// ============================================================

app.whenReady().then(
  () => {
    createMascot();


    pointerTimer =
      setInterval(
        sendPointer,
        20
      );


    screen.on(
      'display-metrics-changed',
      positionMascot
    );


    screen.on(
      'display-added',
      positionMascot
    );


    screen.on(
      'display-removed',
      positionMascot
    );
  }
);


app.on(
  'activate',

  () => {
    if (
      !mascotWindow
    ) {
      createMascot();
    }
  }
);


app.on(
  'before-quit',

  () => {
    if (
      pointerTimer
    ) {
      clearInterval(
        pointerTimer
      );


      pointerTimer =
        null;
    }
  }
);


app.on(
  'window-all-closed',

  () => {
    if (
      process.platform !==
      'darwin'
    ) {
      app.quit();
    }
  }
);
