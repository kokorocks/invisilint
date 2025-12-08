const vscode = require('vscode');

let activeDecoration = null;
let statusBarItem = null;
let globalEnabled = true;

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
// HELPERS
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
  return (cp & 0xFF).toString(16).toUpperCase().padStart(2, '0') + ' ';
}

// =========================
// DECORATIONS (FIXED)
// =========================
function applyDecorations(editor) {
  if (!editor) return;

  if (!globalEnabled) {
    if (activeDecoration) activeDecoration.dispose();
    return;
  }

  const config = vscode.workspace.getConfiguration('InvisiLint');
  const excluded = config.get('excludedFiles') || [];
  const filename = editor.document.fileName;

  if (excluded.some(ext => filename.endsWith(ext))) return;

  const useByteHex = config.get('useByteHex');
  const showHex = config.get('showHexAfter');
  const color = config.get('highlightColor');

  const text = editor.document.getText();
  const invisibles = detectInvisibleCharacters(text);

  if (activeDecoration) activeDecoration.dispose();
  if (!invisibles.length) return;

  const decorations = invisibles.map(item => {
    const start = editor.document.positionAt(item.index);
    const end = editor.document.positionAt(item.index + item.length);

    return {
      range: new vscode.Range(start, end),
      renderOptions: showHex
        ? {
            after: {
              contentText: formatHex(item.cp, useByteHex),
              color: color,
              margin: '0 0 0 6px',
              fontStyle: 'italic'
            }
          }
        : {}
    };
  });

  activeDecoration = vscode.window.createTextEditorDecorationType({
    border: `1px solid ${color}`
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
  invisibles.sort((a, b) => b.index - a.index).forEach(item => {
    newText =
      newText.slice(0, item.index) +
      formatHex(item.cp, useByteHex) +
      newText.slice(item.index + item.length);
  });

  const fullRange = new vscode.Range(
    editor.document.positionAt(0),
    editor.document.positionAt(text.length)
  );

  await editor.edit(edit => edit.replace(fullRange, newText));
}

// =========================
// STATUS BAR
// =========================
function createStatusBarItem() {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'InvisiLint.toggleHighlights';
  updateStatusBar();
  statusBarItem.show();
}

function updateStatusBar() {
  statusBarItem.text = globalEnabled
    ? '$(eye) InvisiLint: ON'
    : '$(eye-closed) InvisiLint: OFF';
}

// =========================
// TOGGLE (GLOBAL)
// =========================
function toggleHighlights() {
  globalEnabled = !globalEnabled;
  saveState();
  updateStatusBar();
  applyDecorations(vscode.window.activeTextEditor);
}

// =========================
// PERSISTENCE (FIXED)
// =========================
function saveState(context) {
  if (context) context.globalState.update('InvisiLint.enabled', globalEnabled);
}

function loadState(context) {
  globalEnabled = context.globalState.get('InvisiLint.enabled', true);
}

// =========================
// ACTIVATE (FIXED STARTUP APPLY)
// =========================
function activate(context) {
  loadState(context);

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(applyDecorations),
    vscode.workspace.onDidChangeTextDocument(e => {
      if (vscode.window.activeTextEditor?.document === e.document) {
        applyDecorations(vscode.window.activeTextEditor);
      }
    }),
    vscode.commands.registerCommand('InvisiLint.cleanInvisibleAscii', cleanInvisibleAscii),
    vscode.commands.registerCommand('InvisiLint.toggleHighlights', toggleHighlights)
  );

  createStatusBarItem();

  // ✅ APPLY IMMEDIATELY ON STARTUP
  if (vscode.window.activeTextEditor) {
    applyDecorations(vscode.window.activeTextEditor);
  }
}

// =========================
// DEACTIVATE
// =========================
function deactivate() {
  if (activeDecoration) activeDecoration.dispose();
  if (statusBarItem) statusBarItem.dispose();
}

module.exports = { activate, deactivate };
