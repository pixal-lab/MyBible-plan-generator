import React, { useState, useEffect, useCallback } from 'react';
import { MyBibleReadingPlanTable, MyBibleInfoTable } from '../types/plan';
import { 
  getBookName, 
  getChaptersForBook, 
  getVersesForChapter,
  BIBLE_BOOKS 
} from '../constants/bible';
import { 
  TextField, 
  Autocomplete,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Box
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';

// Interfaz auxiliar para la UI
interface UIEntry {
  id: string;
  day: string;
  item: string;
  book: string; // Cambiado a string para compatibilidad con Material UI
  chapterStart: string;
  verseStart: string;
  chapterEnd: string;
  verseEnd: string;
}

interface PlanListProps {
  entries: MyBibleReadingPlanTable[];
  onEntriesChange: (entries: MyBibleReadingPlanTable[]) => void;
  planInfo?: MyBibleInfoTable[];
  onPlanInfoChange?: (planInfo: MyBibleInfoTable[]) => void;
}

const PlanList: React.FC<PlanListProps> = ({ entries, onEntriesChange, planInfo, onPlanInfoChange }) => {
  const [uiEntries, setUIEntries] = useState<UIEntry[]>([]);

  // Convertir entradas UI a formato oficial
  const convertToOfficialEntries = (uiEntries: UIEntry[]): MyBibleReadingPlanTable[] => {
    return uiEntries.map((uiEntry) => ({
      day: parseInt(uiEntry.day) || 1,
      evening: 0,
      item: uiEntry.item ? parseInt(uiEntry.item) : 0,
      book_number: parseInt(uiEntry.book) || 10,
      start_chapter: parseInt(uiEntry.chapterStart) || 1,
      start_verse: parseInt(uiEntry.verseStart) || 1,
      end_chapter: parseInt(uiEntry.chapterEnd) || 1,
      end_verse: parseInt(uiEntry.verseEnd) || 1,
    }));
  };

  // Sincronizar entradas UI con entradas oficiales
  useEffect(() => {
    // Si no hay entradas UI pero sí hay entradas oficiales, crear entradas UI
    if (uiEntries.length === 0 && entries.length > 0) {
      const newUIEntries = entries.map((entry, index) => ({
        id: `entry-${index}`,
        day: entry.day.toString(),
        item: entry.item ? entry.item.toString() : '',
        book: entry.book_number.toString(),
        chapterStart: entry.start_chapter.toString(),
        verseStart: entry.start_verse.toString(),
        chapterEnd: entry.end_chapter.toString(),
        verseEnd: entry.end_verse.toString(),
      }));
      setUIEntries(newUIEntries);
    }
    // Si hay entradas UI pero las entradas oficiales han cambiado completamente (importación)
    else if (uiEntries.length > 0 && entries.length > 0) {
      // Verificar si las entradas han cambiado completamente
      const hasChanged = uiEntries.length !== entries.length || 
        entries.some((entry, index) => {
          const uiEntry = uiEntries[index];
          if (!uiEntry) return true;
          return entry.day !== parseInt(uiEntry.day) ||
                 entry.book_number !== parseInt(uiEntry.book) ||
                 entry.start_chapter !== parseInt(uiEntry.chapterStart) ||
                 entry.start_verse !== parseInt(uiEntry.verseStart) ||
                 entry.end_chapter !== parseInt(uiEntry.chapterEnd) ||
                 entry.end_verse !== parseInt(uiEntry.verseEnd);
        });
      
      if (hasChanged) {
        const newUIEntries = entries.map((entry, index) => ({
          id: `entry-${index}`,
          day: entry.day.toString(),
          item: entry.item ? entry.item.toString() : '',
          book: entry.book_number.toString(),
          chapterStart: entry.start_chapter.toString(),
          verseStart: entry.start_verse.toString(),
          chapterEnd: entry.end_chapter.toString(),
          verseEnd: entry.end_verse.toString(),
        }));
        setUIEntries(newUIEntries);
      }
    }
    // Si no hay entradas oficiales, limpiar entradas UI
    else if (entries.length === 0 && uiEntries.length > 0) {
      setUIEntries([]);
    }
  }, [entries, uiEntries]);

  const addEntry = () => {
    const lastEntry = uiEntries[uiEntries.length - 1];
    const newDay = lastEntry ? (parseInt(lastEntry.day) + 1).toString() : '1';
    const newBook = lastEntry ? lastEntry.book : '10'; // Génesis como valor por defecto
    
    const newEntry: UIEntry = {
      id: `entry-${Date.now()}`,
      day: newDay,
      item: '',
      book: newBook,
      chapterStart: '1',
      verseStart: '1',
      chapterEnd: '1',
      verseEnd: '1',
    };
    
    const newUIEntries = [...uiEntries, newEntry];
    setUIEntries(newUIEntries);
    // Sincronizar con entradas oficiales
    onEntriesChange(convertToOfficialEntries(newUIEntries));
  };

  // Crear entrada inicial por defecto
  const createDefaultEntry = (): UIEntry => {
    return {
      id: `entry-${Date.now()}`,
      day: '1',
      item: '',
      book: '10', // Génesis
      chapterStart: '1',
      verseStart: '1',
      chapterEnd: '1',
      verseEnd: '1',
    };
  };

  const removeEntry = (id: string) => {
    // No permitir eliminar si solo hay una entrada
    if (uiEntries.length <= 1) {
      return;
    }
    
    const newUIEntries = uiEntries.filter(entry => entry.id !== id);
    setUIEntries(newUIEntries);
    onEntriesChange(convertToOfficialEntries(newUIEntries));
  };

  const updateEntry = useCallback((id: string, field: keyof UIEntry, value: string | number) => {
    setUIEntries(prevEntries => {
      const newUIEntries = prevEntries.map(entry => {
        if (entry.id === id) {
          const updatedEntry = { ...entry, [field]: value };
          
          // Sincronizar capítulos si son iguales
          if (field === 'chapterStart' && updatedEntry.chapterStart === updatedEntry.chapterEnd) {
            updatedEntry.verseEnd = updatedEntry.verseStart;
          }
          if (field === 'chapterEnd' && updatedEntry.chapterStart === updatedEntry.chapterEnd) {
            updatedEntry.verseEnd = updatedEntry.verseStart;
          }
          
          // Validar versículos cuando capítulos son iguales
          if (updatedEntry.chapterStart === updatedEntry.chapterEnd) {
            const verseStart = parseInt(updatedEntry.verseStart) || 1;
            const verseEnd = parseInt(updatedEntry.verseEnd) || 1;
            if (verseEnd < verseStart) {
              updatedEntry.verseEnd = updatedEntry.verseStart;
            }
          }
          
          return updatedEntry;
        }
        return entry;
      });
      
      return newUIEntries;
    });
    // No llamar onEntriesChange aquí para evitar interferencias
  }, []);

  // Verificar si hay días duplicados para mostrar campo item
  const getDuplicateDays = () => {
    const dayCounts: { [key: string]: number } = {};
    uiEntries.forEach(entry => {
      dayCounts[entry.day] = (dayCounts[entry.day] || 0) + 1;
    });
    return dayCounts;
  };

  const duplicateDays = getDuplicateDays();

  // Sincronizar entradas oficiales cuando cambien las entradas UI
  useEffect(() => {
    if (uiEntries.length > 0) {
      onEntriesChange(convertToOfficialEntries(uiEntries));
    }
  }, [uiEntries, onEntriesChange]);

  const validateChapter = (bookNumber: number, chapter: number): number => {
    const bookName = getBookName(bookNumber);
    const maxChapters = getChaptersForBook(bookName);
    return Math.min(Math.max(chapter, 1), maxChapters);
  };

  const validateVerse = (bookNumber: number, chapter: number, verse: number): number => {
    const bookName = getBookName(bookNumber);
    const maxVerses = getVersesForChapter(bookName, chapter);
    return Math.min(Math.max(verse, 1), maxVerses);
  };

  const handleBookChange = (id: string, newBookNumber: string) => {
    const entry = uiEntries.find(e => e.id === id);
    if (entry) {
      const newBook = newBookNumber || '10'; // Génesis como valor por defecto
      const currentChapterStart = parseInt(entry.chapterStart) || 1;
      const currentChapterEnd = parseInt(entry.chapterEnd) || 1;
      
      const validatedChapterStart = validateChapter(parseInt(newBook), currentChapterStart);
      const validatedChapterEnd = validateChapter(parseInt(newBook), currentChapterEnd);
      
      updateEntry(id, 'book', newBook);
      updateEntry(id, 'chapterStart', validatedChapterStart.toString());
      updateEntry(id, 'chapterEnd', validatedChapterEnd.toString());
    }
  };

  const handleChapterChange = (id: string, field: 'chapterStart' | 'chapterEnd', value: string) => {
    const entry = uiEntries.find(e => e.id === id);
    if (entry) {
      const chapter = parseInt(value) || 1;
      const validatedChapter = validateChapter(parseInt(entry.book), chapter);
      
      // Validar que chapterEnd no sea menor que chapterStart
      if (field === 'chapterEnd') {
        const chapterStart = parseInt(entry.chapterStart) || 1;
        if (validatedChapter < chapterStart) {
          // Si chapterEnd es menor que chapterStart, ajustar chapterEnd al valor de chapterStart
          updateEntry(id, field, chapterStart.toString());
          return;
        }
      }
      
      updateEntry(id, field, validatedChapter.toString());
      
      // Si es chapterStart y los capítulos son iguales, sincronizar chapterEnd
      if (field === 'chapterStart' && entry.chapterStart === entry.chapterEnd) {
        updateEntry(id, 'chapterEnd', validatedChapter.toString());
      }
    }
  };

  const handleVerseChange = (id: string, field: 'verseStart' | 'verseEnd', value: string) => {
    const entry = uiEntries.find(e => e.id === id);
    if (entry) {
      const verse = parseInt(value) || 1;
      const validatedVerse = validateVerse(parseInt(entry.book), parseInt(entry.chapterStart) || 1, verse);
      
      updateEntry(id, field, validatedVerse.toString());
      
      // Si los capítulos son iguales, validar que verseEnd >= verseStart
      if (entry.chapterStart === entry.chapterEnd) {
        const verseStart = parseInt(entry.verseStart) || 1;
        const verseEnd = parseInt(entry.verseEnd) || 1;
        if (verseEnd < verseStart) {
          updateEntry(id, 'verseEnd', entry.verseStart);
        }
      }
    }
  };

  // Inicializar con una entrada por defecto si no hay ninguna
  useEffect(() => {
    if (uiEntries.length === 0 && entries.length === 0) {
      const defaultEntry = createDefaultEntry();
      setUIEntries([defaultEntry]);
      onEntriesChange(convertToOfficialEntries([defaultEntry]));
    }
  }, [entries, uiEntries, onEntriesChange]);

  // Si no hay entradas, mostrar botón para agregar la primera
  if (uiEntries.length === 0) {
    return (
      <div>
        <button onClick={addEntry} className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded transition-colors duration-200">
          Agregar primera entrada
        </button>
      </div>
    );
  }

  return (
    <Box>
      <TableContainer 
        component={Paper} 
        sx={{ 
          mt: 2, 
          borderRadius: 2, 
          boxShadow: 3,
          backgroundColor: 'var(--bg-secondary)',
          '& .MuiTable-root': {
            backgroundColor: 'transparent'
          },
          '& .MuiTableHead-root .MuiTableCell-root': {
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            borderBottom: '2px solid var(--border-color)'
          },
          '& .MuiTableBody-root .MuiTableRow-root': {
            backgroundColor: 'transparent',
            '&:hover': {
              backgroundColor: 'var(--bg-primary)'
            }
          },
          '& .MuiTableBody-root .MuiTableCell-root': {
            backgroundColor: 'transparent',
            color: 'var(--text-primary)',
            borderBottom: '1px solid var(--border-color)'
          },
          '& .MuiTextField-root .MuiInputBase-root': {
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-primary)',
            borderColor: 'var(--input-border)'
          },
          '& .MuiTextField-root .MuiInputBase-root:hover': {
            borderColor: 'var(--btn-primary)'
          },
          '& .MuiTextField-root .MuiInputBase-root.Mui-focused': {
            borderColor: 'var(--btn-primary)'
          },
          '& .MuiAutocomplete-root .MuiInputBase-root': {
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-primary)',
            borderColor: 'var(--input-border)'
          },
          '& .MuiAutocomplete-root .MuiInputBase-root:hover': {
            borderColor: 'var(--btn-primary)'
          },
          '& .MuiAutocomplete-root .MuiInputBase-root.Mui-focused': {
            borderColor: 'var(--btn-primary)'
          },
          '& .MuiPaper-root': {
            backgroundColor: 'var(--bg-secondary)'
          }
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">Día</TableCell>
              <TableCell align="center">Libro</TableCell>
              <TableCell align="center">Cap. Inicio</TableCell>
              <TableCell align="center">Vers. Inicio</TableCell>
              <TableCell align="center">Cap. Fin</TableCell>
              <TableCell align="center">Vers. Fin</TableCell>
              <TableCell align="center">Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {uiEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell align="center" sx={{ width: 128 }}>
                  <Box display="flex" justifyContent="center" alignItems="center" gap={1}>
                    <TextField
                      type="number"
                      value={entry.day}
                      onChange={(e) => {
                        // No permitir valores menores a 1
                        const value = Math.max(1, parseInt(e.target.value) || 1);
                        updateEntry(entry.id, 'day', value.toString());
                      }}
                      size="small"
                      inputProps={{ min: 1 }}
                      sx={{ 
                        '& .MuiInputBase-input': { 
                          textAlign: 'center', 
                          width: 56 
                        },
                        '& input[type="number"]::-webkit-outer-spin-button, & input[type="number"]::-webkit-inner-spin-button': {
                          '-webkit-appearance': 'none',
                          margin: 0
                        },
                        '& input[type="number"]': {
                          '-moz-appearance': 'textfield'
                        }
                      }}
                    />
                    {duplicateDays[entry.day] > 1 ? (
                      <TextField
                        type="number"
                        value={entry.item}
                        onChange={(e) => updateEntry(entry.id, 'item', e.target.value)}
                        size="small"
                        placeholder="Orden"
                        sx={{ 
                          '& .MuiInputBase-input': { 
                            textAlign: 'center', 
                            width: 56 
                          },
                          '& input[type="number"]::-webkit-outer-spin-button, & input[type="number"]::-webkit-inner-spin-button': {
                            '-webkit-appearance': 'none',
                            margin: 0
                          },
                          '& input[type="number"]': {
                            '-moz-appearance': 'textfield'
                          }
                        }}
                      />
                    ) : (
                      <Box sx={{ width: 56 }} />
                    )}
                  </Box>
                </TableCell>
                <TableCell align="center" sx={{ width: 192 }}>
                  <Autocomplete
                    options={BIBLE_BOOKS.filter(book => book.type !== 'separator') as Array<{name: string; number: number}>}
                    getOptionLabel={(option) => option.name}
                    value={BIBLE_BOOKS.find(book => book.number?.toString() === entry.book) as {name: string; number: number} | undefined}
                    onChange={(event, newValue) => {
                      if (newValue && newValue.number) {
                        handleBookChange(entry.id, newValue.number.toString());
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        placeholder="Seleccionar libro"
                        sx={{ minWidth: 150 }}
                      />
                    )}
                    isOptionEqualToValue={(option, value) => 
                      option.number?.toString() === value.number?.toString()
                    }
                    key={`autocomplete-${entry.id}-${entry.book}`}
                    disableClearable
                    autoHighlight
                    openOnFocus
                    blurOnSelect
                  />
                </TableCell>
                <TableCell align="center" sx={{ width: 80 }}>
                  <TextField
                    type="number"
                    value={entry.chapterStart}
                    onChange={(e) => handleChapterChange(entry.id, 'chapterStart', e.target.value)}
                    size="small"
                    sx={{ 
                      '& .MuiInputBase-input': { 
                        textAlign: 'center' 
                      },
                      '& input[type="number"]::-webkit-outer-spin-button, & input[type="number"]::-webkit-inner-spin-button': {
                        '-webkit-appearance': 'none',
                        margin: 0
                      },
                      '& input[type="number"]': {
                        '-moz-appearance': 'textfield'
                      }
                    }}
                  />
                </TableCell>
                <TableCell align="center" sx={{ width: 80 }}>
                  <TextField
                    type="number"
                    value={entry.verseStart}
                    onChange={(e) => handleVerseChange(entry.id, 'verseStart', e.target.value)}
                    size="small"
                    sx={{ 
                      '& .MuiInputBase-input': { 
                        textAlign: 'center' 
                      },
                      '& input[type="number"]::-webkit-outer-spin-button, & input[type="number"]::-webkit-inner-spin-button': {
                        '-webkit-appearance': 'none',
                        margin: 0
                      },
                      '& input[type="number"]': {
                        '-moz-appearance': 'textfield'
                      }
                    }}
                  />
                </TableCell>
                <TableCell align="center" sx={{ width: 80 }}>
                  <TextField
                    type="number"
                    value={entry.chapterEnd}
                    onChange={(e) => handleChapterChange(entry.id, 'chapterEnd', e.target.value)}
                    size="small"
                    sx={{ 
                      '& .MuiInputBase-input': { 
                        textAlign: 'center' 
                      },
                      '& input[type="number"]::-webkit-outer-spin-button, & input[type="number"]::-webkit-inner-spin-button': {
                        '-webkit-appearance': 'none',
                        margin: 0
                      },
                      '& input[type="number"]': {
                        '-moz-appearance': 'textfield'
                      }
                    }}
                  />
                </TableCell>
                <TableCell align="center" sx={{ width: 80 }}>
                  <TextField
                    type="number"
                    value={entry.verseEnd}
                    onChange={(e) => handleVerseChange(entry.id, 'verseEnd', e.target.value)}
                    size="small"
                    sx={{ 
                      '& .MuiInputBase-input': { 
                        textAlign: 'center' 
                      },
                      '& input[type="number"]::-webkit-outer-spin-button, & input[type="number"]::-webkit-inner-spin-button': {
                        '-webkit-appearance': 'none',
                        margin: 0
                      },
                      '& input[type="number"]': {
                        '-moz-appearance': 'textfield'
                      }
                    }}
                  />
                </TableCell>
                <TableCell align="center" sx={{ width: 64 }}>
                  {uiEntries.length > 1 && (
                    <IconButton color="error" onClick={() => removeEntry(entry.id)} size="small">
                      <DeleteIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box display="flex" justifyContent="flex-end" mt={2}>
        <Button
          variant="contained"
          color="success"
          startIcon={<AddIcon />}
          onClick={addEntry}
        >
          Agregar entrada
        </Button>
      </Box>
      

    </Box>
  );
};

export default PlanList; 