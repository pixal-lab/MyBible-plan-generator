import { Dropbox } from 'dropbox';

const DROPBOX_API = 'https://api.dropboxapi.com/2';
const DROPBOX_CONTENT = 'https://content.dropboxapi.com/2';

export interface DropboxAuth {
  accessToken: string;
}

export interface DropboxPKCE {
  dbx: Dropbox;
  codeChallenge: string;
  codeVerifier: string;
}

/**
 * Crea una instancia de Dropbox con PKCE para autenticación segura
 * @param clientId ID de la app de Dropbox
 */
// Función auxiliar para convertir Uint8Array a string
function uint8ArrayToString(array: Uint8Array): string {
  return String.fromCharCode.apply(null, Array.from(array));
}

export async function createDropboxPKCE(clientId: string): Promise<DropboxPKCE> {
  const dbx = new Dropbox({ clientId });
  
  // Generar code_verifier y code_challenge manualmente si el SDK no los genera
  let codeVerifier = (dbx as any).auth.codeVerifier;
  let codeChallenge = (dbx as any).auth.codeChallenge;
  
  if (!codeVerifier || !codeChallenge) {
    // Generar un code_verifier aleatorio (43-128 caracteres)
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    codeVerifier = btoa(uint8ArrayToString(array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
      .substring(0, 43);
    
    // Generar code_challenge usando SHA256
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    codeChallenge = btoa(uint8ArrayToString(new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    // Actualizar el objeto dbx
    (dbx as any).auth.codeVerifier = codeVerifier;
    (dbx as any).auth.codeChallenge = codeChallenge;
  }
  
  return {
    dbx,
    codeChallenge: codeChallenge || '',
    codeVerifier: codeVerifier || '',
  };
}

/**
 * Obtiene la URL de autenticación usando PKCE
 * @param dbxPKCE Instancia de Dropbox con PKCE
 * @param redirectUri URI de redirección
 */
export async function getDropboxAuthUrlPKCE(dbxPKCE: DropboxPKCE, redirectUri: string): Promise<string> {
  return (dbxPKCE.dbx as any).auth.getAuthenticationUrl(
    redirectUri,
    '',
    'code',
    'offline',
    [
      'account_info.read',
      'files.content.write',
      'files.content.read',
    ],
    'user',
    true
  );
}

/**
 * Sube un archivo a Dropbox
 * @param auth Objeto con accessToken
 * @param path Ruta destino en Dropbox (ej: /miarchivo.txt)
 * @param contents Contenido del archivo (Blob, ArrayBuffer, string...)
 */
export async function uploadFileToDropbox(auth: DropboxAuth, path: string, contents: Blob | ArrayBuffer | string) {
  const url = `${DROPBOX_CONTENT}/files/upload`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${auth.accessToken}`,
      'Dropbox-API-Arg': JSON.stringify({
        path,
        mode: 'add',
        autorename: true,
        mute: false,
        strict_conflict: false
      }),
      'Content-Type': 'application/octet-stream',
    },
    body: contents instanceof Blob ? await contents.arrayBuffer() : contents,
  });
  if (!res.ok) {
    throw new Error(`Error subiendo archivo a Dropbox: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Obtiene información de la cuenta de Dropbox
 */
export async function getDropboxAccountInfo(auth: DropboxAuth) {
  const res = await fetch(`${DROPBOX_API}/users/get_current_account`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${auth.accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error('No se pudo obtener la información de la cuenta de Dropbox');
  }
  return res.json();
}

export function getDropboxInstance(accessToken: string) {
  return new Dropbox({ accessToken, fetch });
}

// Crear o subir archivo
export async function uploadFile(dbx: Dropbox, path: string, contents: Blob | ArrayBuffer | string) {
  const fileContents = contents instanceof Blob ? await contents.arrayBuffer() : contents;
  return dbx.filesUpload({
    path,
    contents: fileContents,
    mode: { '.tag': 'add' }, // Cambia a 'overwrite' para sobrescribir
    autorename: false,
    mute: false,
    strict_conflict: false,
  });
}

// Buscar archivos/carpetas
export async function searchFiles(dbx: Dropbox, query: string, path = '') {
  const res = await dbx.filesSearchV2({
    query,
    options: { path, max_results: 20 }
  });
  return res.result.matches;
}

// Modificar archivo (sobrescribir)
export async function updateFile(dbx: Dropbox, path: string, newContents: Blob | ArrayBuffer | string) {
  const fileContents = newContents instanceof Blob ? await newContents.arrayBuffer() : newContents;
  return dbx.filesUpload({
    path,
    contents: fileContents,
    mode: { '.tag': 'overwrite' },
    autorename: false,
    mute: false,
    strict_conflict: false,
  });
}

// Eliminar archivo o carpeta
export async function deleteFileOrFolder(dbx: Dropbox, path: string) {
  return dbx.filesDeleteV2({ path });
}

// Descargar archivo
export async function downloadFile(dbx: Dropbox, path: string) {
  const res = await dbx.filesDownload({ path });
  return res.result;
} 