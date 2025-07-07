import React, { useState, useEffect } from 'react';
import PlanForm from './components/PlanForm';
import PlanList from './components/PlanList';
import { MyBibleInfoTable, MyBibleReadingPlanTable } from './types/plan';
import { ZipGenerator } from './utils/zipGenerator';
import Switch from '@mui/material/Switch';
import { styled } from '@mui/material/styles';
import { Button, Box, Snackbar, Alert } from '@mui/material';
import { Download as DownloadIcon, Upload as UploadIcon } from '@mui/icons-material';
import { createDropboxPKCE, getDropboxAuthUrlPKCE, uploadFileToDropbox, DropboxPKCE } from './utils/dropboxUtil';

// Componente del switch personalizado
const MaterialUISwitch = styled(Switch)(({ theme }) => ({
  width: 62,
  height: 34,
  padding: 7,
  '& .MuiSwitch-switchBase': {
    margin: 1,
    padding: 0,
    transform: 'translateX(6px)',
    '&.Mui-checked': {
      color: '#fff',
      transform: 'translateX(22px)',
      '& .MuiSwitch-thumb:before': {
        backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
          '#fff',
        )}" d="M4.2 2.5l-.7 1.8-1.8.7 1.8.7.7 1.8.6-1.8L6.7 5l-1.9-.7-.6-1.8zm15 8.3a6.7 6.7 0 11-6.6-6.6 5.8 5.8 0 006.6 6.6z"/></svg>')`,
      },
      '& + .MuiSwitch-track': {
        opacity: 1,
        backgroundColor: '#aab4be',
        ...(theme.palette.mode === 'dark' && {
          backgroundColor: '#8796A5',
        }),
      },
    },
  },
  '& .MuiSwitch-thumb': {
    backgroundColor: '#001e3c',
    width: 32,
    height: 32,
    '&::before': {
      content: "''",
      position: 'absolute',
      width: '100%',
      height: '100%',
      left: 0,
      top: 0,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
        '#fff',
      )}" d="M9.305 1.667V3.75h1.389V1.667h-1.39zm-4.707 1.95l-.982.982L5.09 6.072l.982-.982-1.473-1.473zm10.802 0L13.927 5.09l.982.982 1.473-1.473-.982-.982zM10 5.139a4.872 4.872 0 00-4.862 4.86A4.872 4.872 0 0010 14.862 4.872 4.872 0 0014.86 10 4.872 4.872 0 0010 5.139zm0 1.389A3.462 3.462 0 0113.471 10a3.462 3.462 0 01-3.473 3.472A3.462 3.462 0 016.527 10 3.462 3.462 0 0110 6.528zM1.665 9.305v1.39h2.083v-1.39H1.666zm14.583 0v1.39h2.084v-1.39h-2.084zM5.09 13.928L3.616 15.4l.982.982 1.473-1.473-.982-.982zm9.82 0l-.982.982 1.473 1.473.982-.982-1.473-1.473zM9.305 16.25v2.083h1.389V16.25h-1.39z"/></svg>')`,
    },
    ...(theme.palette.mode === 'dark' && {
      backgroundColor: '#003892',
    }),
  },
  '& .MuiSwitch-track': {
    opacity: 1,
    backgroundColor: '#aab4be',
    borderRadius: 20 / 2,
    ...(theme.palette.mode === 'dark' && {
      backgroundColor: '#8796A5',
    }),
  },
}));

// Hook personalizado para manejar el modo oscuro
const useDarkMode = () => {
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = document.cookie.split('; ').find(row => row.startsWith('darkMode='));
    return savedMode ? savedMode.split('=')[1] === 'true' : false;
  });


  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const newValue = !prev;
      document.body.classList.toggle('dark', newValue);
      document.cookie = `darkMode=${newValue}; max-age=31536000; path=/`;
      return newValue;
    });
  };

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return { darkMode, toggleDarkMode };
};

// Estado inicial del plan
const INITIAL_PLAN_INFO: MyBibleInfoTable[] = [
  { name: 'origin', value: '' },
  { name: 'history_of_changes', value: '' },
  { name: 'language', value: 'es' },
  { name: 'description', value: '' },
  { name: 'detailed_info', value: '' },
  { name: 'russian_numbering', value: 'false' },
  { name: 'author', value: '' }
];

const DROPBOX_APP_KEY = process.env.REACT_APP_DROPBOX_APP_KEY || '';
const DROPBOX_REDIRECT_URI = `${window.location.origin}${process.env.PUBLIC_URL || ''}/callback`;

function App() {
  const [planInfo, setPlanInfo] = useState<MyBibleInfoTable[]>(INITIAL_PLAN_INFO);
  const [planEntries, setPlanEntries] = useState<MyBibleReadingPlanTable[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { darkMode, toggleDarkMode } = useDarkMode();

  // Estado para notificaciones
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Estado para Dropbox
  const [dropboxToken, setDropboxToken] = useState<string | null>(null);
  const [dropboxUser, setDropboxUser] = useState<string | null>(null);
  const [dropboxPKCE, setDropboxPKCE] = useState<DropboxPKCE | null>(null);

  // Al iniciar, revisa si hay token en localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dropbox_token');
    if (saved) setDropboxToken(saved);
  }, []);

  // Función para leer cookie
  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  // Función para eliminar cookie
  const deleteCookie = (name: string) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  };

  // Verificar si hay código de autenticación en cookie
  useEffect(() => {
    const checkAuthCode = () => {
      const authCode = getCookie('dropbox_auth_code');
      if (authCode && dropboxPKCE) {
        console.log('Código encontrado en cookie:', authCode);
        
        // Eliminar la cookie inmediatamente
        deleteCookie('dropbox_auth_code');
        
        // Obtener token con el código
        (async () => {
          try {
            console.log('Intentando obtener token con código:', authCode);
            const { result } = await (dropboxPKCE.dbx as any).auth.getAccessTokenFromCode(
              DROPBOX_REDIRECT_URI,
              authCode
            );
            console.log('Token obtenido:', result);
            setDropboxToken(result.access_token);
            localStorage.setItem('dropbox_token', result.access_token);
            showNotification('¡Conectado a Dropbox exitosamente!', 'success');
          } catch (error: any) {
            console.error('Error al obtener token:', error);
            showNotification('Error al obtener el token: ' + (error?.message || error), 'error');
          }
        })();
      }
    };

    // Verificar inmediatamente
    checkAuthCode();
    
    // Verificar cada segundo
    const interval = setInterval(checkAuthCode, 1000);
    
    return () => clearInterval(interval);
  }, [dropboxPKCE]);

  // Obtener info de usuario Dropbox (opcional, para mostrar conectado)
  useEffect(() => {
    async function fetchUser() {
      if (dropboxToken) {
        try {
          const res = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${dropboxToken}`,
              'Content-Type': 'application/json',
            },
          });
          if (res.ok) {
            const data = await res.json();
            setDropboxUser(data.name?.display_name || data.email || '');
          } else {
            setDropboxUser(null);
          }
        } catch {
          setDropboxUser(null);
        }
      } else {
        setDropboxUser(null);
      }
    }
    fetchUser();
  }, [dropboxToken]);

  // Funciones auxiliares para validación
  const getPlanValue = (name: string): string => {
    return planInfo.find(info => info.name === name)?.value || '';
  };

  const isFormValid = (): boolean => {
    const description = getPlanValue('description');
    const author = getPlanValue('author');
    return !!(description && author && planEntries.length > 0);
  };

  // Funciones para manejar notificaciones
  const showNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  // Generar nombre de archivo seguro
  const generateFilename = (description: string): string => {
    const safeName = description.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    return `${safeName}.plan.zip`;
  };

  // Descargar el archivo ZIP
  const downloadPlan = async (zipBlob: Blob, filename: string) => {
    const zipGenerator = new ZipGenerator();
    zipGenerator.downloadZip(zipBlob, filename);
  };

  const [isLoading, setIsLoading] = useState(false);

  const exportToJSON = () => {
    const getFormValue = (name: string): string => {
      return planInfo.find(info => info.name === name)?.value || '';
    };

    const planData = {
      planName: getFormValue('description') || 'Plan de Lectura Bíblica',
      author: getFormValue('author') || '',
      language: getFormValue('language') || 'es',
      origin: getFormValue('origin') || '',
      historyOfChanges: getFormValue('history_of_changes') || '',
      createdAt: new Date().toISOString(),
      entries: planEntries
    };
    
    const jsonString = JSON.stringify(planData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `plan-lectura-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importFromJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsLoading(true);
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target?.result as string);
          
          // Actualizar entradas del plan - reemplazar completamente con las del JSON
          if (jsonData.entries && Array.isArray(jsonData.entries)) {
            // Reemplazar todas las entradas existentes con las del JSON
            setPlanEntries(jsonData.entries);
            
            // Mostrar información sobre el número de entradas importadas
            const entryCount = jsonData.entries.length;
            showNotification(`Plan importado exitosamente. ${entryCount} entrada${entryCount !== 1 ? 's' : ''} cargada${entryCount !== 1 ? 's' : ''}.`, 'success');
          } else {
            // Si no hay entradas en el JSON, limpiar las existentes
            setPlanEntries([]);
            showNotification('Plan importado exitosamente. No se encontraron entradas en el archivo.', 'warning');
          }

          // Actualizar información del formulario
          const updatedPlanInfo = planInfo.map(info => {
            switch (info.name) {
              case 'description':
                return { ...info, value: jsonData.planName || '' };
              case 'author':
                return { ...info, value: jsonData.author || '' };
              case 'language':
                return { ...info, value: jsonData.language || 'es' };
              case 'origin':
                return { ...info, value: jsonData.origin || '' };
              case 'history_of_changes':
                return { ...info, value: jsonData.historyOfChanges || '' };
              default:
                return info;
            }
          });
          setPlanInfo(updatedPlanInfo);

        } catch (error) {
          console.error('Error al importar el archivo:', error);
          showNotification('Error al importar el archivo. Asegúrate de que sea un archivo JSON válido.', 'error');
        } finally {
          setIsLoading(false);
        }
      };
      
      reader.onerror = () => {
        showNotification('Error al leer el archivo.', 'error');
        setIsLoading(false);
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  };

  const handleGeneratePlan = async () => {
    if (!isFormValid()) {
      showNotification('Por favor completa la información del plan (título y autor) y agrega al menos una entrada.', 'warning');
      return;
    }

    setIsGenerating(true);
    
    try {
      const zipGenerator = new ZipGenerator();
      const zipBlob = await zipGenerator.generatePlanZip(planInfo, planEntries);
      const filename = generateFilename(getPlanValue('description'));
      
      await downloadPlan(zipBlob, filename);
      showNotification('¡Plan MyBible generado exitosamente!', 'success');
    } catch (error) {
      console.error('Error generando el plan:', error);
      showNotification('Error al generar el plan de lectura. Por favor intenta de nuevo.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDropboxLogin = async () => {
    try {
      console.log('Iniciando autenticación Dropbox...');
      
      // Crear instancia PKCE
      const pkce = await createDropboxPKCE(DROPBOX_APP_KEY);
      console.log('PKCE creado:', pkce);
      setDropboxPKCE(pkce);
      
      // Obtener URL de autenticación
      const authUrl = await getDropboxAuthUrlPKCE(pkce, DROPBOX_REDIRECT_URI);
      console.log('URL de autenticación:', authUrl);
      
      // Abrir popup
      const authWindow = window.open(authUrl, 'authwin', 'width=700,height=800');
      console.log('Popup abierto:', authWindow);
      
      showNotification('Se abrió la ventana de autenticación de Dropbox. Completa el proceso allí.', 'info');
      
      // Cerrar popup después de 5 minutos si no se usa
      setTimeout(() => {
        if (authWindow && !authWindow.closed) {
          authWindow.close();
        }
      }, 300000); // 5 minutos
    } catch (error: any) {
      console.error('Error en handleDropboxLogin:', error);
      showNotification('Error al iniciar autenticación: ' + (error?.message || error), 'error');
    }
  };

  const handleDropboxLogout = () => {
    setDropboxToken(null);
    setDropboxUser(null);
    localStorage.removeItem('dropbox_token');
    showNotification('Sesión de Dropbox cerrada.', 'info');
  };

  const handleSaveToDropbox = async () => {
    if (!dropboxToken) {
      handleDropboxLogin();
      return;
    }
    if (!isFormValid()) {
      showNotification('Completa el formulario antes de exportar a Dropbox.', 'warning');
      return;
    }
    setIsGenerating(true);
    try {
      const zipGenerator = new ZipGenerator();
      const zipBlob = await zipGenerator.generatePlanZip(planInfo, planEntries);
      const filename = generateFilename(getPlanValue('description'));
      await uploadFileToDropbox({ accessToken: dropboxToken }, `/${filename}`, zipBlob);
      showNotification('¡Archivo subido a Dropbox exitosamente!', 'success');
    } catch (error: any) {
      showNotification('Error al subir a Dropbox: ' + (error?.message || error), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Detectar si estamos en la ruta de callback
  const isCallback = window.location.pathname.endsWith('/callback.html');

  useEffect(() => {
    if (isCallback) {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        localStorage.setItem('dropbox_auth_code', code);
      }
    }
  }, [isCallback]);

  useEffect(() => {
    if (isCallback) return;
    const checkAuthCode = () => {
      const authCode = localStorage.getItem('dropbox_auth_code');
      if (authCode && dropboxPKCE) {
        localStorage.removeItem('dropbox_auth_code');
        (async () => {
          try {
            const { result } = await (dropboxPKCE.dbx as any).auth.getAccessTokenFromCode(
              DROPBOX_REDIRECT_URI,
              authCode
            );
            setDropboxToken(result.access_token);
            localStorage.setItem('dropbox_token', result.access_token);
            showNotification('¡Conectado a Dropbox exitosamente!', 'success');
          } catch (error: any) {
            showNotification('Error al obtener el token: ' + (error?.message || error), 'error');
          }
        })();
      }
    };
    const interval = setInterval(checkAuthCode, 1000);
    return () => clearInterval(interval);
  }, [dropboxPKCE, isCallback]);

  if (isCallback) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
        <h2>¡Autenticación completada!</h2>
        <p>Ya puedes cerrar esta ventana y volver a la aplicación principal.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="card flex flex-col md:flex-row md:items-center md:justify-between gap-4 dark:bg-gray-800 dark:text-white">
        <div>
          <h1>Generador de Planes de Lectura para MyBible</h1>
          <p>Crea planes de lectura personalizados para la aplicación MyBible</p>
        </div>
        <MaterialUISwitch
          checked={darkMode}
          onChange={toggleDarkMode}
        />
      </header>

      <div className="card">
        <PlanForm 
          planInfo={planInfo}
          setPlanInfo={setPlanInfo}
        />
      </div>

      <div className="card">
        <PlanList 
          entries={planEntries}
          onEntriesChange={setPlanEntries}
          planInfo={planInfo}
          onPlanInfoChange={setPlanInfo}
        />
      </div>

      <div className="card">
        <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
          <Button
            variant="outlined"
            color="primary"
            startIcon={<UploadIcon />}
            onClick={importFromJSON}
          >
            Importar JSON
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={exportToJSON}
            disabled={planEntries.length === 0}
          >
            Exportar JSON
          </Button>
          <button
            className="btn"
            onClick={handleGeneratePlan}
            disabled={!isFormValid() || isGenerating}
          >
            {isGenerating ? 'Generando...' : 'Generar Plan MyBible'}
          </button>
          <Button
            variant="contained"
            color="success"
            onClick={handleSaveToDropbox}
            disabled={!isFormValid() || isGenerating}
          >
            Guardar en Dropbox
          </Button>
          {dropboxToken && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleDropboxLogout}
            >
              Cerrar sesión Dropbox{dropboxUser ? ` (${dropboxUser})` : ''}
            </Button>
          )}
        </Box>
      </div>
      
      {/* Overlay de carga */}
      {isLoading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <Box
            sx={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 2,
              padding: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              boxShadow: 3,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                border: '4px solid var(--border-color)',
                borderTop: '4px solid var(--btn-primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
                },
              }}
            />
            <Box sx={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 500 }}>
              Cargando JSON...
            </Box>
          </Box>
        </Box>
      )}
      
      {/* Notificaciones */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          '& .MuiSnackbar-root': {
            zIndex: 9999
          }
        }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ 
            width: '100%',
            minWidth: '300px',
            maxWidth: '500px',
            fontSize: '1rem',
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            '& .MuiAlert-icon': {
              fontSize: '1.5rem'
            },
            '& .MuiAlert-message': {
              padding: '4px 0'
            },
            '&.MuiAlert-standardSuccess': {
              backgroundColor: '#d4edda',
              color: '#155724',
              border: '1px solid #c3e6cb',
              '& .MuiAlert-icon': {
                color: '#28a745'
              }
            },
            '&.MuiAlert-standardError': {
              backgroundColor: '#f8d7da',
              color: '#721c24',
              border: '1px solid #f5c6cb',
              '& .MuiAlert-icon': {
                color: '#dc3545'
              }
            },
            '&.MuiAlert-standardWarning': {
              backgroundColor: '#fff3cd',
              color: '#856404',
              border: '1px solid #ffeaa7',
              '& .MuiAlert-icon': {
                color: '#ffc107'
              }
            },
            '&.MuiAlert-standardInfo': {
              backgroundColor: '#d1ecf1',
              color: '#0c5460',
              border: '1px solid #bee5eb',
              '& .MuiAlert-icon': {
                color: '#17a2b8'
              }
            },
            // Estilos para modo oscuro
            ...(darkMode && {
              '&.MuiAlert-standardSuccess': {
                backgroundColor: '#1e4a2e',
                color: '#d4edda',
                border: '1px solid #28a745',
                '& .MuiAlert-icon': {
                  color: '#28a745'
                }
              },
              '&.MuiAlert-standardError': {
                backgroundColor: '#4a1e1e',
                color: '#f8d7da',
                border: '1px solid #dc3545',
                '& .MuiAlert-icon': {
                  color: '#dc3545'
                }
              },
              '&.MuiAlert-standardWarning': {
                backgroundColor: '#4a3e1e',
                color: '#fff3cd',
                border: '1px solid #ffc107',
                '& .MuiAlert-icon': {
                  color: '#ffc107'
                }
              },
              '&.MuiAlert-standardInfo': {
                backgroundColor: '#1e3a4a',
                color: '#d1ecf1',
                border: '1px solid #17a2b8',
                '& .MuiAlert-icon': {
                  color: '#17a2b8'
                }
              }
            })
          }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default App; 