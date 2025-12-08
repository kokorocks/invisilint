const vscode = require('vscode');

let activeDecoration = null;
let popupShownForDoc = new WeakSet();
let statusBarItem = null;

// =========================
// INVISIBLE DEFINITIONS
// =========================
const knownInvisibles = new Set([
  0x00AD, 0x034F, 0x061C, 0x115F, 0x1160,
  0x17B4, 0x17B5, 0x180E,
  0x200B, 0x200C, 0x200D, 0x200E, 0x200F,
  0x2028, 0x2029,
  0x2060, 0x2061, 0x2062, 0x2063, 0x2064,
  0x2066, 0x2067, 0x2068, 0x2069,
  0xFEFF
]);

const invisibleRanges = [
  [0xFE00, 0xFE0F],
  [0xE0100, 0xE01EF],
  [0xE000, 0xF8FF],
  [0xF0000, 0x10FFFD]
];

// =========================
// HELPER FUNCTIONS
// =========================
function isInvisible(cp) {
  if (cp === 0x20 || cp === 0x09 || cp === 0x0A || cp === 0x0D) return false;
  if (knownInvisibles.has(cp)) return true;
  return invisibleRanges.some(([a, b]) => cp >= a && cp <= b);
}

function detectInvisibleCharacters(text) {
  const invisibles = [];
  for (let i = 0; i < text.length;) {
    const cp = text.codePointAt(i);
    const ch = String.fromCodePoint(cp);
    if (isInvisible(cp)) invisibles.push({ index: i, cp, length: ch.length });
    i += ch.length;
  }
  return invisibles;
}

function formatHex(cp, useByteHex) {
  if (!useByteHex) return `U+${cp.toString(16).toUpperCase().padStart(4, '0')} `;
  const byte = cp & 0xFF;
  return byte.toString(16).toUpperCase().padStart(2, '0') + ' ';
}

// =========================
// DECORATIONS
// =========================
function applyDecorations(editor) {
  if (!editor) return;

  const config = vscode.workspace.getConfiguration('InvisiLint');
  if (!config.get('enabled')) {
    if (activeDecoration) activeDecoration.dispose();
    return;
  }

  const excluded = config.get('excludedFiles') || [];
  const filename = editor.document.fileName;
  if (excluded.some(ext => filename.endsWith(ext))) return;

  const useByteHex = config.get('useByteHex');
  const text = editor.document.getText();
  const invisibles = detectInvisibleCharacters(text);

  if (activeDecoration) activeDecoration.dispose();
  if (!invisibles.length) return;

  const decorations = invisibles.map(item => {
    const start = editor.document.positionAt(item.index);
    const end = editor.document.positionAt(item.index + item.length);
    return {
      range: new vscode.Range(start, end),
      renderOptions: {
        after: {
          contentText: formatHex(item.cp, useByteHex),
          color: 'rgba(255,0,0,0.75)',
          margin: '0 0 0 4px'
        }
      }
    };
  });

  activeDecoration = vscode.window.createTextEditorDecorationType({
    border: '1px solid red'
  });

  editor.setDecorations(activeDecoration, decorations);
}

// =========================
// CLEAN COMMAND
// =========================
async function cleanInvisibleAscii() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const config = vscode.workspace.getConfiguration('InvisiLint');
  const useByteHex = config.get('useByteHex');

  const text = editor.document.getText();
  const invisibles = detectInvisibleCharacters(text);
  if (!invisibles.length) return;

  let newText = text;
  const sorted = invisibles.sort((a, b) => b.index - a.index);

  for (const item of sorted) {
    const replacement = formatHex(item.cp, useByteHex);
    newText =
      newText.slice(0, item.index) +
      replacement +
      newText.slice(item.index + item.length);
  }

  const fullRange = new vscode.Range(
    editor.document.positionAt(0),
    editor.document.positionAt(text.length)
  );

  await editor.edit(edit => edit.replace(fullRange, newText));
}

// =========================
// STATUS BAR TOGGLE
// =========================
function createStatusBarItem() {
  if (statusBarItem) return;

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'InvisiLint.toggleHighlights';
  updateStatusBarText();
  statusBarItem.show();
}

function updateStatusBarText() {
  const enabled = vscode.workspace.getConfiguration('InvisiLint').get('enabled');
  statusBarItem.text = enabled ? '$(eye) Ghost Highlights On' : '$(eye-closed) Ghost Highlights Off';
}

// =========================
// TOGGLE HIGHLIGHTS
// =========================
function toggleHighlights() {
  const config = vscode.workspace.getConfiguration('InvisiLint');
  const enabled = config.get('enabled');
  config.update('enabled', !enabled, true);
  updateStatusBarText();
  if (enabled && vscode.window.activeTextEditor) {
    applyDecorations(vscode.window.activeTextEditor);
  } else if (activeDecoration) {
    activeDecoration.dispose();
  }
}

// =========================
// OPEN SETTINGS
// =========================
function openSettings() {
  vscode.commands.executeCommand('workbench.action.openSettings', '@ext:InvisiLint');
}

// =========================
// ACTIVATE EXTENSION
// =========================
function activate(context) {
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(applyDecorations),
    vscode.workspace.onDidChangeTextDocument(e => {
      if (vscode.window.activeTextEditor?.document === e.document) {
        applyDecorations(vscode.window.activeTextEditor);
      }
    }),
    vscode.commands.registerCommand('InvisiLint.cleanInvisibleAscii', cleanInvisibleAscii),
    vscode.commands.registerCommand('InvisiLint.openSettings', openSettings),
    vscode.commands.registerCommand('InvisiLint.toggleHighlights', toggleHighlights)
  );

  createStatusBarItem();
}

// =========================
// DEACTIVATE
// =========================
function deactivate() {
  if (activeDecoration) activeDecoration.dispose();
  if (statusBarItem) statusBarItem.dispose();
}

module.exports = { activate, deactivate };




/*const vscode = require('vscode');

// All known invisible / zero-width / PUA Unicode ranges
const invisibleRanges = [
    { start: 0x0000, end: 0x001F },
    { start: 0x007F, end: 0x009F },
    { start: 0xE000, end: 0xF8FF },
    { start: 0xF0000, end: 0xFFFFD },
    { start: 0x100000, end: 0x10FFFD },
    { start: 0xFE00, end: 0xFE0F },
    { start: 0xE0100, end: 0xE01EF }
];

const knownInvisibles = [
    0x00AD, 0x034F, 0x061C, 0x115F, 0x1160, 0x17B4, 0x17B5, 0x180E,
    0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007,
    0x2008, 0x2009, 0x200A, 0x200B, 0x200C, 0x200D, 0x200E, 0x200F,
    0x2028, 0x2029, 0x202A, 0x202B, 0x202C, 0x202D, 0x202E, 0x2060,
    0x2061, 0x2062, 0x2063, 0x2064, 0x2066, 0x2067, 0x2068, 0x2069,
    0xFEFF, 0xE0000, 0xE0001
];

// Check if a code point is invisible
function isInvisible(cp) {
    // Ignore normal whitespace and line breaks
    if (cp === 0x20 || cp === 0x09 || cp === 0x0A || cp === 0x0D) return false;

    if (knownInvisibles.includes(cp)) return true;

    if (invisibleRanges.some(r => cp >= r.start && cp <= r.end)) return true;

    return false;
}

// Detect invisible characters in string
function detectInvisibleCharacters(str) {
    const invisibles = [];
    for (let i = 0; i < str.length;) {
        const cp = str.codePointAt(i);
        if (cp === undefined) break;

        const char = String.fromCodePoint(cp);
        if (isInvisible(cp)) {
            invisibles.push({
                index: i,
                ch: char,
                cp,
                length: char.length
            });
        }

        i += char.length;
    }
    return invisibles;
}

// Get character name
function getCharacterName(cp) {
    const names = {
        0x200B: 'Zero Width Space',
        0x200C: 'Zero Width Non-Joiner',
        0x200D: 'Zero Width Joiner',
        0xFEFF: 'Zero Width No-Break Space',
        0x061C: 'Arabic Letter Mark',
        0x180E: 'Mongolian Vowel Separator'
    };
    return names[cp] || `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
}

// Create visual decorations
function createDecorations(editor, invisibles) {
    if (invisibles.length === 0) return null;

    const decorationOptions = invisibles.map(item => {
        const startPos = editor.document.positionAt(item.index);
        const endPos = editor.document.positionAt(item.index + item.length);

        return {
            range: new vscode.Range(startPos, endPos),
            hoverMessage: `Invisible Character: ${getCharacterName(item.cp)}`,
            renderOptions: {
                after: {
                    contentText: ` U+${item.cp.toString(16).toUpperCase().padStart(4,'0')}`,
                    color: 'rgba(255,0,0,0.6)',
                    margin: '0 0 0 2px'
                }
            }
        };
    });

    const decorationType = vscode.window.createTextEditorDecorationType({
        border: '1px solid red',
        borderRadius: '2px',
        isWholeLine: false
    });

    editor.setDecorations(decorationType, decorationOptions);
    return decorationType;
}

// Update editor decorations
function updateVisualIndicators(editor) {
    if (!editor) return;

    const text = editor.document.getText();
    const invisibles = detectInvisibleCharacters(text);

    if (invisibles.length > 0) {
        createDecorations(editor, invisibles);
    }
}

// Extension activate
function activate(context) {
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    // Auto-detect on file open
    const openFileDisposable = vscode.workspace.onDidOpenTextDocument(() => {
        const editor = vscode.window.activeTextEditor;
        updateVisualIndicators(editor);
    });

    // Auto-detect on active editor change
    const changeEditorDisposable = vscode.window.onDidChangeActiveTextEditor(editor => {
        updateVisualIndicators(editor);
    });

    // Auto-detect on text change
    const changeTextDisposable = vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document) {
            updateVisualIndicators(editor);
        }
    });

    // Command: Clean invisible characters
    const cleanCommandDisposable = vscode.commands.registerCommand('security.cleanInvisibleAscii', async function () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage("No active editor found.");
            return;
        }

        const text = editor.document.getText();
        const invisibles = detectInvisibleCharacters(text);

        if (invisibles.length === 0) {
            vscode.window.showInformationMessage("No invisible characters detected.");
            return;
        }

        const choice = await vscode.window.showWarningMessage(
            `Detected ${invisibles.length} invisible characters.`,
            "Replace with U+XXXX",
            "Delete completely",
            "Dismiss"
        );

        if (!choice || choice === "Dismiss") return;

        let newText = text;
        const sortedInvisibles = [...invisibles].sort((a,b) => b.index - a.index);

        for (const item of sortedInvisibles) {
            if (choice === "Replace with U+XXXX") {
                newText = newText.slice(0, item.index) +
                          `U+${item.cp.toString(16).toUpperCase().padStart(4,'0')}` +
                          newText.slice(item.index + item.length);
            } else if (choice === "Delete completely") {
                newText = newText.slice(0, item.index) + newText.slice(item.index + item.length);
            }
        }

        const fullRange = new vscode.Range(
            editor.document.positionAt(0),
            editor.document.positionAt(text.length)
        );

        await editor.edit(editBuilder => {
            editBuilder.replace(fullRange, newText);
        });

        vscode.window.showInformationMessage(`Processed ${invisibles.length} invisible characters: ${choice}`);
    });

    context.subscriptions.push(
        openFileDisposable,
        changeEditorDisposable,
        changeTextDisposable,
        cleanCommandDisposable
    );
}

// Extension deactivate
function deactivate() {}

module.exports = {
    activate,
    deactivate
};
*/