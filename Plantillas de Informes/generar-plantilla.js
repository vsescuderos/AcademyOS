/**
 * Script para generar la plantilla de referencia del Informe de Asistencia.
 * Ejecutar desde la raíz del proyecto:  node "Plantillas de Informes/generar-plantilla.js"
 *
 * La plantilla muestra la estructura exacta que genera el informe real,
 * con datos de ejemplo para facilitar la revisión del formato.
 */

const XLSX = require("xlsx");
const path = require("path");

const wb = XLSX.utils.book_new();

// ── Hoja 1: Inicio — resumen por grupo ────────────────────────────────────────
const inicio = [
  ["Grupo", "Sesiones totales", "% Asistencia"],
  ["Grupo Ejemplo A", 10, "85%"],
  ["Grupo Ejemplo B", 8, "100%"],
  ["Grupo Ejemplo C", 12, "72%"],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(inicio), "Inicio");

// ── Hoja por grupo — alumno + columna por sesión + % final ───────────────────
//    Estructura: [ Alumno | fecha_1 | fecha_2 | … | % Asistencia ]
//    Valores de asistencia: "Presente" | "Ausente" | "Tarde" | "—" (sin registro)

const grupoA = [
  ["Alumno", "2024-01-08", "2024-01-15", "2024-01-22", "2024-01-29", "% Asistencia"],
  ["García Pérez, Ana",   "Presente", "Presente", "Ausente",  "Presente", "75%"],
  ["López Ruiz, Carlos",  "Tarde",    "Presente", "Presente", "Presente", "100%"],
  ["Martínez Gil, María", "Presente", "Ausente",  "Presente", "Tarde",    "75%"],
  ["Sánchez Mora, Luis",  "Ausente",  "Ausente",  "Presente", "Presente", "50%"],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(grupoA), "Grupo Ejemplo A");

const grupoB = [
  ["Alumno", "2024-01-10", "2024-01-17", "2024-01-24", "% Asistencia"],
  ["Fernández Cruz, Elena", "Presente", "Presente", "Presente", "100%"],
  ["Romero Díaz, Pablo",    "Tarde",    "Presente", "Ausente",  "67%"],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(grupoB), "Grupo Ejemplo B");

// ── Escritura ─────────────────────────────────────────────────────────────────
const out = path.join(__dirname, "Informe de Asistencia.xlsx");
XLSX.writeFile(wb, out);
console.log("✓ Plantilla generada:", out);
