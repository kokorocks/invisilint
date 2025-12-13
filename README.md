# InvisiLint

**InvisiLint** is a VS Code extension that detects and highlights invisible or hidden characters in your code. It helps you spot zero-width characters, stray control codes, and other sneaky Unicode characters that can break your code or introduce subtle bugs.

---

## Features

- Detects all common invisible Unicode characters (zero-width, control, and private-use ranges).  
- Highlights them inline with **U+XXXX** or **byte hex** format.  
- **Toggle button** in the status bar to enable/disable highlights instantly.  
- Clean invisible characters and replace them with hexadecimal markers.  
- Easily configurable via settings: enable/disable, exclude certain file types, and choose display format.

---

## Installation

1. Download the latest `.vsix` file from the [Releases](#) page.  
2. Open VS Code.  
3. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) → **Extensions: Install from VSIX**.  
4. Select the `.vsix` file.  
5. Reload VS Code.

---

## Usage

- Open any code file. Invisible characters will automatically be highlighted if the extension is enabled.  
- Click the **eye icon** in the status bar to toggle highlights on or off.  
- To remove invisible characters, use the command:  
  `Ctrl+Shift+P` → **GhostCode: Clean Invisible ASCII**.

---

## Settings

Open VS Code Settings (`Ctrl+,`) and search for **InvisiLint** or access via the command:  
`Ctrl+Shift+P` → **InvisiLint Settings**.

Settings include:

- `invisilint.enabled` – Enable or disable highlighting.  
- `invisilint.useByteHex` – Show byte hex (`FF`) instead of U+XXXX.  
- `invisilint.excludedFiles` – Array of file extensions to exclude (e.g., `[ ".md", ".txt" ]`).

---

## Demo Video

<video width="320" height="240" controls>
  <source src="./media/invisalint-example.mp4" type="video/mp4" >
</video>
