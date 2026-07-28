import path from 'path';

export function modeMenuMarkdownPath(modeName: string, root = process.cwd()): string {
  return path.join(root, 'menus', `${modeName}.md`);
}

export function modeJsonPath(modeName: string, root = process.cwd()): string {
  return path.join(root, 'src', 'data', 'modes', `${modeName}.json`);
}

export function modeJsonImportKey(modeName: string): string {
  return modeName;
}
