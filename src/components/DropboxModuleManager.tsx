import React, { useState, useEffect } from 'react';
import { Button, Box, TextField, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, CircularProgress, Snackbar, Checkbox, useTheme } from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, ContentCopy as ContentCopyIcon } from '@mui/icons-material';
import { uploadFileToDropbox, listFilesInDropbox, downloadJsonFile, getOrCreateSharedLink, deleteDropboxFile } from '../utils/dropboxUtil';

interface ModuleEntry {
  download_url: string;
  file_name: string;
  language_code?: string;
  description: string;
  update_date: string;
  update_info?: string;
}

interface Registry {
  url: string;
  file_name: string;
  description: string;
  modules: ModuleEntry[];
}

const DropboxModuleManager = ({ dropboxToken }: { dropboxToken: string }) => {
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [loading, setLoading] = useState(false);
  
  
  const [uploading, setUploading] = useState(false);
  const [showCreateRegistry, setShowCreateRegistry] = useState(false);
  const [newRegistry, setNewRegistry] = useState({
    name: '', // Nombre del registro (sin .registry.json)
    description: '',
  });
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [zipFiles, setZipFiles] = useState<any[]>([]); // Archivos .zip en Dropbox
  const [selectedZips, setSelectedZips] = useState<string[]>([]); // ids de los zips seleccionados
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState<any[]>([]); // [{zipId, language_code, description, file_name, zip_name}]
  const [addLoading, setAddLoading] = useState(false);
  const [selectedRegistry, setSelectedRegistry] = useState<string[]>([]); // file_names seleccionados para quitar
  const [removeLoading, setRemoveLoading] = useState(false);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [editModuleIdx, setEditModuleIdx] = useState<number | null>(null);
  const [editModuleData, setEditModuleData] = useState<{ language_code: string; description: string } | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [zipToDelete, setZipToDelete] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const LANGUAGES = [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'pt', label: 'Português' },
  ];

  const theme = useTheme();
  const darkText = '#d1d5db';

  useEffect(() => {
    console.log('Registry:', registry);
    if (registry && registry.url) {
      console.log('URL del registro actual:', registry.url);
    }
  }, [registry]);

  useEffect(() => {
    if (!dropboxToken) return;
    setLoading(true);
    setRegistryLoading(true);
    (async () => {
      const files = await listFilesInDropbox(dropboxToken, '.registry.json');
      if (files.length > 0) {
        // Carga el primer registro encontrado
        const regData = await downloadJsonFile(dropboxToken, files[0].path_display);
        if (regData) {
          setRegistry(regData);
          setShowCreateRegistry(false);
        } else {
          setShowCreateRegistry(true);
        }
        setLoading(false);
        setRegistryLoading(false);
      } else {
        setShowCreateRegistry(true);
        setLoading(false);
        setRegistryLoading(false);
      }
    })();
  }, [dropboxToken]);

  // Listar archivos .zip en Dropbox cuando se carga el registro
  useEffect(() => {
    if (!dropboxToken || !registry) return;
    (async () => {
      const zips = await listFilesInDropbox(dropboxToken, '.zip');
      setZipFiles(zips);
    })();
  }, [dropboxToken, registry]);

  // Filtrar archivos .zip que no están en el registro
  const registryFileNames = registry?.modules?.map(m => m.file_name) || [];
  const zipFilesNotInRegistry = zipFiles.filter(z => {
    const sqliteName = z.name.replace(/\.zip$/i, '.sqlite3');
    return !registryFileNames.includes(sqliteName);
  });

  // Quitar módulos seleccionados del registro
  const handleRemoveFromRegistry = async () => {
    if (!registry || selectedRegistry.length === 0) return;
    setRemoveLoading(true);
    setRegistryLoading(true);
    const newModules = registry.modules.filter(m => !selectedRegistry.includes(m.file_name));
    const newReg = { ...registry, modules: newModules };
    const blob = new Blob([JSON.stringify(newReg, null, 2)], { type: 'application/json' });
    await uploadFileToDropbox({ accessToken: dropboxToken }, `/${registry.file_name}`, blob);
    setRegistry(newReg);
    setSelectedRegistry([]);
    setRemoveLoading(false);
    setRegistryLoading(false);
  };




  // Crear registro inicial
  const handleCreateRegistry = async () => {
    setUploading(true);
    const fileName = `${newRegistry.name}.registry.json`;
    let newReg: Registry = {
      url: '',
      file_name: fileName,
      description: newRegistry.description,
      modules: []
    };
    const blob = new Blob([JSON.stringify(newReg, null, 2)], { type: 'application/json' });
    // Subir el archivo inicialmente
    await uploadFileToDropbox({ accessToken: dropboxToken }, `/${fileName}`, blob);
    // Consultar la URL de Dropbox (compartida)
    const url = await getOrCreateSharedLink(dropboxToken, `/${fileName}`);
    // Actualizar el registro con la URL
    newReg = { ...newReg, url };
    const blobWithUrl = new Blob([JSON.stringify(newReg, null, 2)], { type: 'application/json' });
    await uploadFileToDropbox({ accessToken: dropboxToken }, `/${fileName}`, blobWithUrl);
    setRegistry(newReg);
    setCreatedUrl(url || null);
    if (url) {
      console.log('URL del registro creada:', url);
    }
    setShowCreateRegistry(false);
    setUploading(false);
    alert('Registro creado exitosamente');
  };

  const handleCopyUrl = () => {
    if (registry && registry.url) {
      navigator.clipboard.writeText(registry.url);
      setSnackbar({ open: true, message: 'URL copiada al portapapeles' });
    }
  };

  // Al hacer clic en agregar, abrir el formulario
  const handleOpenAddDialog = () => {
    // Prepara el estado para cada zip seleccionado
    const formData = selectedZips.map(zipId => {
      const zip = zipFiles.find(z => z.id === zipId);
      return {
        zipId,
        zip_name: zip?.name || '',
        language_code: '',
        description: '',
        file_name: zip?.name ? zip.name.replace(/\.zip$/i, '.sqlite3') : ''
      };
    });
    setAddForm(formData);
    setAddDialogOpen(true);
  };

  // Cambios en el formulario de agregar
  const handleAddFormChange = (idx: number, field: string, value: string) => {
    setAddForm(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  // Confirmar agregar módulos
  const handleConfirmAdd = async () => {
    if (!registry) return;
    setAddLoading(true);
    setRegistryLoading(true);
    let newModules = [...registry.modules];
    for (const item of addForm) {
      const zip = zipFiles.find(z => z.id === item.zipId);
      if (!zip) continue;
      const url = await getOrCreateSharedLink(dropboxToken, zip.path_display);
      const newModule = {
        download_url: url,
        file_name: item.file_name,
        language_code: item.language_code,
        description: item.description,
        update_date: new Date().toISOString().slice(0, 10),
        update_info: ''
      };
      newModules.push(newModule);
    }
    const newReg = { ...registry, modules: newModules };
    const blob = new Blob([JSON.stringify(newReg, null, 2)], { type: 'application/json' });
    await uploadFileToDropbox({ accessToken: dropboxToken }, `/${registry.file_name}`, blob);
    setRegistry(newReg);
    setSelectedZips([]);
    setAddDialogOpen(false);
    setAddLoading(false);
    setRegistryLoading(false);
  };

  // Abrir diálogo de edición
  const handleOpenEditModule = (idx: number) => {
    const mod = registry?.modules[idx];
    if (!mod) return;
    setEditModuleIdx(idx);
    setEditModuleData({
      language_code: mod.language_code || '',
      description: mod.description || ''
    });
  };

  // Guardar cambios de edición
  const handleSaveEditModule = async () => {
    if (editModuleIdx === null || !registry || !editModuleData) return;
    setEditLoading(true);
    const newModules = registry.modules.map((m, i) =>
      i === editModuleIdx ? { ...m, language_code: editModuleData.language_code, description: editModuleData.description } : m
    );
    const newReg = { ...registry, modules: newModules };
    const blob = new Blob([JSON.stringify(newReg, null, 2)], { type: 'application/json' });
    await uploadFileToDropbox({ accessToken: dropboxToken }, `/${registry.file_name}`, blob);
    setRegistry(newReg);
    setEditModuleIdx(null);
    setEditModuleData(null);
    setEditLoading(false);
  };

  // Eliminar archivo .zip de Dropbox con diálogo
  const handleDeleteZip = (zip: any) => {
    setZipToDelete(zip);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteZip = async () => {
    if (!zipToDelete) return;
    setDeleteLoading(true);
    try {
      await deleteDropboxFile(dropboxToken, zipToDelete.path_display);
      setZipFiles(prev => prev.filter(z => z.id !== zipToDelete.id));
      setSelectedZips(prev => prev.filter(id => id !== zipToDelete.id));
      setSnackbar({ open: true, message: `Archivo ${zipToDelete.name} eliminado correctamente.` });
    } catch (e) {
      setSnackbar({ open: true, message: `Error al eliminar el archivo.` });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteLoading(false);
      setZipToDelete(null);
    }
  };
  
  return (
    <Box className="card" sx={{ mt: 4 }}>
      <h2>Gestor de Módulos MyBible (Dropbox)</h2>
      {registry && registry.url && (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          background: theme.palette.mode === 'dark' ? '#222' : '#f5f5f5',
          borderRadius: 2,
          p: 2,
          mb: 2,
          color: theme.palette.mode === 'dark' ? darkText : '#222',
          wordBreak: 'break-all',
          border: `1.5px solid ${theme.palette.mode === 'dark' ? '#444' : '#bbb'}`
        }}>
          <span style={{ flex: 1 }}>{registry.url}</span>
          <Button
            variant="outlined"
            color="info"
            size="small"
            startIcon={<ContentCopyIcon />}
            onClick={handleCopyUrl}
            sx={{ ml: 2 }}
          >
            Copiar
          </Button>
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 4, mt: 2, position: 'relative' }}>
        {registryLoading && (
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 30, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress color="info" />
          </Box>
        )}
        {removeLoading && (
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress color="error" />
          </Box>
        )}
        {loading ? (
          <CircularProgress />
        ) : showCreateRegistry ? (
          <Box sx={{ maxWidth: 400, mx: 'auto', mt: 3 }}>
            <h3>Crear registro de módulos</h3>
            <TextField
              label="Nombre del Registro"
              value={newRegistry.name}
              onChange={e => setNewRegistry({ ...newRegistry, name: e.target.value })}
              fullWidth
              margin="dense"
              placeholder="Ejemplo: nombre1"
              InputLabelProps={{ style: { color: '#fff' } }}
              sx={{
                input: { color: '#fff' },
                label: { color: '#fff' },
              }}
            />
            <TextField
              label="Descripción"
              value={newRegistry.description}
              onChange={e => setNewRegistry({ ...newRegistry, description: e.target.value })}
              fullWidth
              margin="dense"
              InputLabelProps={{ style: { color: '#fff' } }}
              sx={{
                input: { color: '#fff' },
                label: { color: '#fff' },
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleCreateRegistry}
              disabled={uploading || !newRegistry.name || !newRegistry.description}
              sx={{ mt: 2 }}
            >
              {uploading ? 'Creando...' : 'Crear registro de módulos'}
            </Button>
            {createdUrl && (
              <Box sx={{ mt: 2, color: '#fff', wordBreak: 'break-all' }}>
                <strong>URL del registro:</strong><br />
                <a href={createdUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#90caf9' }}>{createdUrl}</a>
              </Box>
            )}
          </Box>
        ) : (
          <>
          </>
        )}
        {/* Columna izquierda: archivos .zip no en el registro */}
        <Box sx={{
          flex: 1,
          background: theme.palette.mode === 'dark' ? '#222' : '#f5f5f5',
          color: theme.palette.mode === 'dark' ? darkText : '#222',
          border: `2px solid ${theme.palette.mode === 'dark' ? '#888' : '#bbb'}`,
          borderRadius: 2,
          p: 2,
          minHeight: 200
        }}>
            <strong>Archivos .zip en Dropbox (no en registro):</strong>
            <List>
              {zipFilesNotInRegistry.length > 0 ? zipFilesNotInRegistry.map(zip => (
                <ListItem
                  key={zip.id}
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: selectedZips.includes(zip.id)
                      ? (theme.palette.mode === 'dark' ? '#444' : '#e3f2fd')
                      : undefined,
                    border: '2px solid',
                    borderColor: selectedZips.includes(zip.id)
                      ? (theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2')
                      : (theme.palette.mode === 'dark' ? '#555' : '#bbb'),
                    borderRadius: 1,
                    mb: 1,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Checkbox
                    edge="start"
                    checked={selectedZips.includes(zip.id)}
                    tabIndex={-1}
                    disableRipple
                    sx={{ color: theme.palette.mode === 'dark' ? darkText : '#1976d2' }}
                    inputProps={{ 'aria-labelledby': `checkbox-list-label-${zip.id}` }}
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedZips(prev => prev.includes(zip.id)
                        ? prev.filter(id => id !== zip.id)
                        : [...prev, zip.id]);
                    }}
                  />
                  <ListItemText primary={zip.name} onClick={() => {
                    setSelectedZips(prev => prev.includes(zip.id)
                      ? prev.filter(id => id !== zip.id)
                      : [...prev, zip.id]);
                  }} />
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    sx={{ ml: 1, borderRadius: 2, border: '1.5px solid #dc3545', padding: '2px 10px', display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}
                    onClick={e => { e.stopPropagation(); handleDeleteZip(zip); }}
                  >
                    <span style={{ fontWeight: 500, fontSize: 15, color: '#dc3545', marginRight: 4 }}>Eliminar</span>
                    <DeleteIcon sx={{ fontSize: 20, color: '#dc3545' }} />
                  </Button>
                </ListItem>
              )) : <ListItem><ListItemText primary="No hay archivos .zip disponibles" /></ListItem>}
            </List>
        </Box>
        {/* Botón intermedio para agregar/quitar */}
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            disabled={selectedZips.length === 0}
            onClick={handleOpenAddDialog}
          >
            Agregar →
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={selectedRegistry.length === 0}
            onClick={handleRemoveFromRegistry}
            sx={{ mt: 2 }}
          >
            ← Quitar
          </Button>
        </Box>
        {/* Columna derecha: módulos en el registro */}
        <Box sx={{
          flex: 1,
          background: theme.palette.mode === 'dark' ? '#222' : '#f5f5f5',
          color: theme.palette.mode === 'dark' ? darkText : '#222',
          border: `2px solid ${theme.palette.mode === 'dark' ? '#888' : '#bbb'}`,
          borderRadius: 2,
          p: 2,
          minHeight: 200,
          opacity: removeLoading ? 0.5 : 1
        }}>
          <strong>Módulos en el registro:</strong>
          <List>
            {registry?.modules.map((mod, idx) => (
              <ListItem
                key={mod.file_name}
                sx={{
                  cursor: 'pointer',
                  backgroundColor: selectedRegistry.includes(mod.file_name)
                    ? (theme.palette.mode === 'dark' ? '#444' : '#ffebee')
                    : undefined,
                  border: '2px solid',
                  borderColor: selectedRegistry.includes(mod.file_name)
                    ? (theme.palette.mode === 'dark' ? '#f44336' : '#d32f2f')
                    : (theme.palette.mode === 'dark' ? '#555' : '#bbb'),
                  borderRadius: 1,
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
                onClick={e => {
                  // Evita seleccionar si se hace click en el botón de editar
                  if ((e.target as HTMLElement).closest('.edit-btn')) return;
                  setSelectedRegistry(prev => prev.includes(mod.file_name)
                    ? prev.filter(f => f !== mod.file_name)
                    : [...prev, mod.file_name]);
                }}
              >
                <Checkbox
                  edge="start"
                  checked={selectedRegistry.includes(mod.file_name)}
                  tabIndex={-1}
                  disableRipple
                  sx={{ color: theme.palette.mode === 'dark' ? darkText : '#d32f2f' }}
                  inputProps={{ 'aria-labelledby': `checkbox-list-label-${mod.file_name}` }}
                />
                <ListItemText primary={mod.file_name} />
                <Button
                  className="edit-btn"
                  variant="outlined"
                  color="info"
                  size="small"
                  sx={{ ml: 2, borderRadius: 2, border: '1.5px solid #1976d2', padding: '2px 10px', display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}
                  onClick={e => { e.stopPropagation(); handleOpenEditModule(idx); }}
                >
                  <span style={{ fontWeight: 500, fontSize: 15, color: '#1976d2', marginRight: 4 }}>Editar</span>
                  <EditIcon sx={{ fontSize: 20, color: '#1976d2' }} />
                </Button>
              </ListItem>
            ))}
            {registry?.modules.length === 0 && <ListItem><ListItemText primary="No hay módulos en el registro" /></ListItem>}
          </List>
        </Box>
      </Box>
      {/* Dialog para agregar módulos seleccionados */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Agregar módulos seleccionados</DialogTitle>
        <DialogContent>
          {addLoading && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress color="info" />
            </Box>
          )}
          {addForm.map((item, idx) => (
            <Box key={item.zipId} sx={{ mb: 3, p: 2, border: '1px solid #ccc', borderRadius: 2, background: '#222', color: '#fff' }}>
              <strong>Archivo:</strong> {item.zip_name}
              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <TextField
                  select
                  label="Idioma"
                  value={item.language_code}
                  onChange={e => handleAddFormChange(idx, 'language_code', e.target.value)}
                  SelectProps={{ native: true }}
                  sx={{ minWidth: 120, background: '#333', color: darkText, '& .MuiInputBase-input': { color: darkText }, '& .MuiInputLabel-root': { color: darkText } }}
                  InputLabelProps={{ style: { color: darkText } }}
                >
                  <option value=""></option>
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.label}</option>
                  ))}
                </TextField>
                <TextField
                  label="Descripción"
                  value={item.description}
                  onChange={e => handleAddFormChange(idx, 'description', e.target.value)}
                  sx={{ flex: 1, background: '#333', color: darkText, '& .MuiInputBase-input': { color: darkText }, '& .MuiInputLabel-root': { color: darkText } }}
                  InputLabelProps={{ style: { color: darkText } }}
                />
                <TextField
                  label="file_name"
                  value={item.file_name}
                  InputProps={{ readOnly: true }}
                  sx={{ minWidth: 200, background: '#333', color: darkText, '& .MuiInputBase-input': { color: darkText }, '& .MuiInputLabel-root': { color: darkText } }}
                  InputLabelProps={{ style: { color: darkText } }}
                />
              </Box>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)} disabled={addLoading}>Cancelar</Button>
          <Button onClick={handleConfirmAdd} variant="contained" color="primary" disabled={addLoading}>Agregar al registro</Button>
        </DialogActions>
      </Dialog>
      {/* Dialog para editar módulo */}
      <Dialog open={editModuleIdx !== null} onClose={() => { setEditModuleIdx(null); setEditModuleData(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>Editar módulo</DialogTitle>
        <DialogContent>
          {editLoading && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress color="info" />
            </Box>
          )}
          <Box sx={{ p: 2, background: '#222', color: darkText, borderRadius: 2 }}>
            <TextField
              select
              label="Idioma"
              value={editModuleData?.language_code || ''}
              onChange={e => setEditModuleData(d => d ? { ...d, language_code: e.target.value } : d)}
              SelectProps={{ native: true }}
              sx={{ minWidth: 120, background: '#333', color: darkText, '& .MuiInputBase-input': { color: darkText }, '& .MuiInputLabel-root': { color: darkText } }}
              InputLabelProps={{ style: { color: darkText } }}
            >
              <option value=""></option>
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </TextField>
            <TextField
              label="Descripción"
              value={editModuleData?.description || ''}
              onChange={e => setEditModuleData(d => d ? { ...d, description: e.target.value } : d)}
              sx={{ ml: 2, flex: 1, background: '#333', color: darkText, '& .MuiInputBase-input': { color: darkText }, '& .MuiInputLabel-root': { color: darkText } }}
              InputLabelProps={{ style: { color: darkText } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditModuleIdx(null); setEditModuleData(null); }} disabled={editLoading}>Cancelar</Button>
          <Button onClick={handleSaveEditModule} variant="contained" color="primary" disabled={editLoading}>Guardar</Button>
        </DialogActions>
      </Dialog>
      {/* Diálogo de confirmación para eliminar */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          ¿Seguro que deseas eliminar el archivo <b>{zipToDelete?.name}</b>? Esta acción no se puede deshacer.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>Cancelar</Button>
          <Button onClick={confirmDeleteZip} color="error" variant="contained" disabled={deleteLoading}>
            {deleteLoading ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar({ open: false, message: '' })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default DropboxModuleManager; 