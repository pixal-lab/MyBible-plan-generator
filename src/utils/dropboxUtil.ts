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
        mode: 'overwrite',
        autorename: false,
        mute: false
      }),
      'Content-Type': 'application/octet-stream',
    },
    body: contents instanceof Blob ? await contents.arrayBuffer() : (contents instanceof ArrayBuffer ? contents : new TextEncoder().encode(contents)),
  });
  if (!res.ok) {
    throw new Error(`Error subiendo archivo a Dropbox: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// Lista archivos en Dropbox según el formato especificado
export async function listFilesInDropbox(accessToken: string, fileExtension: string): Promise<any[]> {
  const res = await fetch(`${DROPBOX_API}/files/list_folder`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path: '', recursive: true })
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.entries || []).filter((entry: any) => entry.name.endsWith(fileExtension));
}

// Descarga un archivo JSON desde Dropbox
export async function downloadJsonFile(accessToken: string, path: string): Promise<any | null> {
  const res = await fetch(`${DROPBOX_CONTENT}/files/download`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Dropbox-API-Arg': JSON.stringify({ path }),
    },
  });
  if (!res.ok) return null;
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Obtiene o crea un enlace compartido directo de Dropbox
export async function getOrCreateSharedLink(accessToken: string, path: string): Promise<string> {
  // Intenta crear el enlace
  let url = '';
  try {
    const bodyData = {
      path
    };
    const res = await fetch(`${DROPBOX_API}/sharing/create_shared_link_with_settings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyData)
    });
    if (res.ok) {
      const data = await res.json();
      url = data.url.replace('www.dropbox.com', 'dl.dropbox.com').replace('?dl=0', '');
    } else {
      // Si falla, busca el enlace existente
      const res2 = await fetch(`${DROPBOX_API}/sharing/list_shared_links`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path})
      });
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2.links && data2.links.length > 0) {
          url = data2.links[0].url.replace('www.dropbox.com', 'dl.dropbox.com').replace('?dl=0', '');
        }
      }
    }
  } catch (e) {
    // Si falla, deja url vacío
  }
  return url;
} 

// Elimina un archivo en Dropbox
export async function deleteDropboxFile(accessToken: string, path: string): Promise<void> {
  const res = await fetch(`${DROPBOX_API}/files/delete_v2`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path })
  });
  if (!res.ok) throw new Error('No se pudo eliminar el archivo en Dropbox');
} 