import JSZip from 'jszip';
import { MyBibleInfoTable, MyBibleReadingPlanTable } from '../types/plan';
import { SQLiteGenerator } from './sqliteGenerator';

export class ZipGenerator {
  private sqliteGenerator: SQLiteGenerator;

  constructor() {
    this.sqliteGenerator = new SQLiteGenerator();
  }

  async generatePlanZip(planInfo: MyBibleInfoTable[], entries: MyBibleReadingPlanTable[]): Promise<Blob> {
    try {
      // Generar la base de datos SQLite
      const dbData = await this.sqliteGenerator.generateDatabase(planInfo, entries);
      
      // Crear el archivo ZIP
      const zip = new JSZip();
      
      // Obtener el nombre del plan para el archivo
      const planName = planInfo.find(info => info.name === 'description')?.value || 'plan';
      const safePlanName = planName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      // Agregar la base de datos SQLite al ZIP con el formato correcto de MyBible
      // Según la documentación: <module abbreviation><.module type suffix>.SQLite3
      // Para planes de lectura: <abbreviation>.plan.SQLite3
      zip.file(`${safePlanName}.plan.SQLite3`, dbData);
      
      // Generar el ZIP como Blob
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      return zipBlob;
    } catch (error) {
      console.error('Error generando el ZIP:', error);
      throw new Error('Error al generar el archivo ZIP');
    }
  }

  downloadZip(blob: Blob, filename: string) {
    // Crear un enlace temporal para descargar el archivo
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Simular clic en el enlace
    document.body.appendChild(link);
    link.click();
    
    // Limpiar
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
} 