import React, { useCallback } from 'react';
import { MyBibleInfoTable } from '../types/plan';

interface PlanFormProps {
  planInfo: MyBibleInfoTable[];
  setPlanInfo: (info: MyBibleInfoTable[]) => void;
}

const PlanForm: React.FC<PlanFormProps> = ({ planInfo, setPlanInfo }) => {
  const handleChange = useCallback((name: string, value: string) => {
    setPlanInfo(planInfo.map(info => 
      info.name === name ? { ...info, value } : info
    ));
  }, [planInfo, setPlanInfo]);

  const getValue = useCallback((name: string): string => {
    return planInfo.find(info => info.name === name)?.value || '';
  }, [planInfo]);

  const getCurrentDate = (): string => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const updateOrigin = useCallback((author: string) => {
    const date = getCurrentDate();
    const origin = `${date}. Creado por ${author}, mediante MyBible Plan Generator [link pendiente]`;
    handleChange('origin', origin);
  }, [handleChange]);

  const updateHistoryOfChanges = useCallback(() => {
    const date = getCurrentDate();
    const history = `${date} Creacion`;
    handleChange('history_of_changes', history);
  }, [handleChange]);

  const handleAuthorChange = (author: string) => {
    handleChange('author', author);
  };

  const handleTitleChange = (title: string) => {
    handleChange('description', title);
  };

  const handleLanguageChange = (language: string) => {
    handleChange('language', language);
  };

  const handleDetailedInfoChange = (detailedInfo: string) => {
    handleChange('detailed_info', detailedInfo);
  };

  // Inicializar valores cuando el componente se monta
  React.useEffect(() => {
    // Solo inicializar valores que no existen
    if (!getValue('history_of_changes')) {
      updateHistoryOfChanges();
    }
    if (!getValue('russian_numbering')) {
      handleChange('russian_numbering', 'false');
    }
  }, [getValue, handleChange, updateHistoryOfChanges]);

  // Actualizar origen cuando cambia el autor
  React.useEffect(() => {
    const author = getValue('author');
    if (author) {
      updateOrigin(author);
    }
  }, [getValue, updateOrigin]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
        <div>
          <label htmlFor="title" className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            Título del plan:
          </label>
          <input
            type="text"
            id="title"
            value={getValue('description')}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Ingrese el título del plan"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
          />
        </div>
        <div>
          <label htmlFor="author" className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            Autor:
          </label>
          <input
            type="text"
            id="author"
            value={getValue('author')}
            onChange={(e) => handleAuthorChange(e.target.value)}
            placeholder="Ingrese el autor"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
          />
        </div>
        <div>
          <label htmlFor="language" className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            Idioma:
          </label>
          <select
            id="language"
            value={getValue('language')}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="es">Español</option>
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="pt">Português</option>
          </select>
        </div>
      </div>
      
      <div>
        <label htmlFor="detailed_info" className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
          Información detallada:
        </label>
        <textarea
          id="detailed_info"
          value={getValue('detailed_info')}
          onChange={(e) => handleDetailedInfoChange(e.target.value)}
          placeholder="Descripción detallada del plan de lectura"
          rows={3}
          className="w-full"
        />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Esta información aparecerá en la descripción del módulo en MyBible.
        </p>
      </div>
    </div>
  );
};

export default PlanForm; 