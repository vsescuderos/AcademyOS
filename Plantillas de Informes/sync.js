/**
 * Copia las plantillas editadas a public/plantillas/ para que la app las sirva.
 * Ejecutar tras editar cualquier plantilla: node "Plantillas de Informes/sync.js"
 */

const fs = require("fs");
const path = require("path");

const SRC = __dirname;
const DST = path.join(__dirname, "..", "public", "plantillas");

fs.mkdirSync(DST, { recursive: true });

const files = [
  ["Informe de Asistencia.xlsx", "informe-asistencia.xlsx"],
];

for (const [src, dst] of files) {
  const srcPath = path.join(SRC, src);
  const dstPath = path.join(DST, dst);
  if (!fs.existsSync(srcPath)) {
    console.warn(`⚠ No encontrado: ${srcPath}`);
    continue;
  }
  fs.copyFileSync(srcPath, dstPath);
  console.log(`✓ ${src} → public/plantillas/${dst}`);
}
