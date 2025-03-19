/**
 * Script para probar la migración de un archivo específico
 * Uso: node test-migration-node.mjs [ruta-al-archivo]
 * Ejemplo: node test-migration-node.mjs src/components/modules/users/UsersTable.vue
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener la ruta del directorio actual en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directorios
const SRC_DIR = path.join(__dirname, 'src');
const ASSETS_DIR = path.join(SRC_DIR, 'assets');

/**
 * Obtiene la ruta relativa desde un archivo origen a un destino
 */
function getRelativePath(sourceFile, destinationFile) {
  const sourceDirname = path.dirname(sourceFile);
  return path.relative(sourceDirname, destinationFile).replace(/\\/g, '/');
}

/**
 * Actualiza los imports de SCSS que usan alias @/ por rutas relativas
 */
function updateScssImports(content, filePath) {
  const scssRegex = /@use\s+['"]@\/assets\/([^'"]+)['"]\s+as\s+([^;]+);/g;
  
  return {
    content: content.replace(scssRegex, (match, importPath, alias) => {
      const assetPath = path.join(ASSETS_DIR, importPath);
      const relativePath = getRelativePath(filePath, assetPath);
      return `@use '${relativePath}' as ${alias};`;
    }),
    modifiedScss: content.match(scssRegex)
  };
}

/**
 * Actualiza los imports de JS/TS que usan alias @/ por rutas relativas
 */
function updateJsImports(content, filePath) {
  const jsRegex = /from\s+['"]@\/([^'"]+)['"]/g;
  
  return {
    content: content.replace(jsRegex, (match, importPath) => {
      const importFullPath = path.join(SRC_DIR, importPath);
      const relativePath = getRelativePath(filePath, importFullPath);
      return `from '${relativePath}'`;
    }),
    modifiedJs: content.match(jsRegex)
  };
}

/**
 * Prueba la migración en un archivo específico
 */
async function testMigration(targetFile) {
  try {
    // Validar que el archivo existe
    const fileFullPath = path.join(__dirname, targetFile);
    
    try {
      await fs.access(fileFullPath);
    } catch (error) {
      console.error(`El archivo ${targetFile} no existe.`);
      process.exit(1);
    }
    
    // Leer el contenido del archivo
    const content = await fs.readFile(fileFullPath, 'utf8');
    
    // Aplicar las transformaciones
    const { content: contentWithScssUpdated, modifiedScss } = updateScssImports(content, fileFullPath);
    const { content: updatedContent, modifiedJs } = updateJsImports(contentWithScssUpdated, fileFullPath);
    
    // Mostrar cambios
    console.log(`\nArchivo analizado: ${targetFile}`);
    
    if (modifiedScss && modifiedScss.length > 0) {
      console.log('\nImports SCSS encontrados:');
      modifiedScss.forEach(imp => console.log(`  ${imp}`));
    } else {
      console.log('\nNo se encontraron imports SCSS con alias @/');
    }
    
    if (modifiedJs && modifiedJs.length > 0) {
      console.log('\nImports JS/TS encontrados:');
      modifiedJs.forEach(imp => console.log(`  ${imp}`));
    } else {
      console.log('\nNo se encontraron imports JS/TS con alias @/');
    }
    
    // Verificar si el contenido ha cambiado
    if (content !== updatedContent) {
      console.log('\nContenido actualizado (vista previa de cambios):');
      
      // Encontrar diferencias
      const contentLines = content.split('\n');
      const updatedLines = updatedContent.split('\n');
      
      for (let i = 0; i < Math.max(contentLines.length, updatedLines.length); i++) {
        if (contentLines[i] !== updatedLines[i]) {
          console.log(`  [ANTES] Línea ${i+1}: ${contentLines[i] || ''}`);
          console.log(`  [DESPUÉS] Línea ${i+1}: ${updatedLines[i] || ''}`);
          console.log();
        }
      }
      
      console.log('\nNo se ha modificado ningún archivo. Esta es solo una simulación.');
    } else {
      console.log('\nNo se requieren cambios en este archivo.');
    }
    
  } catch (error) {
    console.error('Error al procesar el archivo:', error);
  }
}

// Verificar argumentos
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Por favor, especifica la ruta al archivo que deseas probar.');
  console.log('Uso: node test-migration-node.mjs [ruta-al-archivo]');
  process.exit(1);
}

// Ejecutar la prueba de migración
testMigration(args[0]); 