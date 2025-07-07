# Generador de Planes de Lectura para MyBible

Esta aplicación permite crear planes de lectura bíblica personalizados compatibles con la aplicación MyBible.

## Características

- Crear planes de lectura personalizados
- Interfaz intuitiva y fácil de usar
- Validación automática de capítulos y versículos
- Exportar planes en formato JSON
- Importar planes desde archivos JSON
- Generar módulos compatibles con MyBible
- Soporte para modo oscuro
- Interfaz responsiva

## Uso

### 1. Crear un nuevo plan

1. Completa la información del plan:
   - Título del plan: Nombre que aparecerá en MyBible
   - Autor: Tu nombre o el nombre del creador del plan
   - Idioma: Idioma del plan (español por defecto)
   - Información detallada: Descripción que aparecerá en MyBible

2. Agrega entradas al plan:
   - Día: Número del día del plan
   - Libro: Selecciona el libro bíblico
   - Capítulo inicio/fin: Rango de capítulos a leer
   - Versículo inicio/fin: Rango de versículos a leer

3. Haz clic en "Generar Plan MyBible" para crear el archivo compatible.

### 2. Importar y exportar JSON

- Exportar JSON: Guarda el plan actual en formato JSON
- Importar JSON: Carga un plan desde un archivo JSON

### 3. Instalar en MyBible

1. Descarga el archivo `.zip` generado
2. Copia el archivo a tu dispositivo Android
3. En MyBible, ve a la sección de módulos y selecciona "Descargar módulos"
4. Selecciona el archivo `.zip` descargado
5. El plan aparecerá en la sección de planes de lectura

## Formato MyBible

Los planes generados siguen el formato oficial de MyBible:

- Archivo: `[nombre].plan.SQLite3`
- Tabla info: Metadatos del módulo
- Tabla reading_plan: Entradas del plan de lectura

### Estructura de la base de datos

```sql
-- Tabla de información del módulo
CREATE TABLE info (name TEXT, value TEXT);

-- Tabla del plan de lectura
CREATE TABLE reading_plan (
  day NUMERIC,           -- Día del plan
  evening NUMERIC,       -- 0=mañana, 1=tarde
  item NUMERIC,          -- Número de orden
  book_number NUMERIC,   -- Número del libro bíblico
  start_chapter NUMERIC, -- Capítulo inicial
  start_verse NUMERIC,   -- Versículo inicial
  end_chapter NUMERIC,   -- Capítulo final
  end_verse NUMERIC      -- Versículo final
);
```

## Tecnologías utilizadas

- React 18 con TypeScript
- Material-UI para componentes
- Tailwind CSS para estilos
- SQL.js para generar bases de datos SQLite
- JSZip para crear archivos ZIP

## Desarrollo

### Instalar dependencias

```bash
npm install
```

### Ejecutar en desarrollo

```bash
npm start
```

### Construir para producción

```bash
npm run build
```

## Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT. 