// Tipos para la base de datos SQLite de MyBible (formato oficial)
export interface MyBibleInfoTable {
  name: string;        // Nombre del parámetro
  value: string;       // Valor del parámetro
}

export interface MyBibleReadingPlanTable {
  day: number;         // Día del plan (1, 2, 3, etc.)
  evening: number;     // 0 = mañana, 1 = tarde (histórico)
  item: number;        // Número de item para el día
  book_number: number; // Número del libro bíblico
  start_chapter: number; // Capítulo inicial
  start_verse: number;   // Versículo inicial
  end_chapter: number;   // Capítulo final
  end_verse: number;     // Versículo final
} 