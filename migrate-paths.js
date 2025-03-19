/**
 * Script para migrar de rutas con alias @/ a rutas relativas
 * Este script recorre los archivos del proyecto y actualiza las importaciones
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener la ruta del directorio actual en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, 'src');
const ASSETS_DIR = path.join(SRC_DIR, 'assets');
const CONFIG_FILES = [
  path.join(__dirname, 'vite.config.ts'),
  path.join(__dirname, 'tsconfig.json')
];

// Función recursiva para recorrer directorios
async function walkDir(dir, fileList = []) {
  const files = await fs.readdir(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);
    
    if (stat.isDirectory()) {
      // Es un directorio, entramos recursivamente
      if (file !== 'node_modules' && file !== 'dist') {
        fileList = await walkDir(filePath, fileList);
      }
    } else if (path.extname(file) === '.vue' || path.extname(file) === '.ts' || path.extname(file) === '.js') {
      // Es un archivo con la extensión que buscamos
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

// Función para calcular la ruta relativa desde un archivo fuente a un destino
function getRelativePath(sourcePath, destPath) {
  // Calculamos cuántos directorios tenemos que subir
  const sourceDir = path.dirname(sourcePath);
  const relPath = path.relative(sourceDir, destPath);
  
  // Aseguramos que la ruta relativa comienza con ./ o ../
  if (!relPath.startsWith('.')) {
    return './' + relPath;
  }
  return relPath;
}

// Función para actualizar las importaciones SCSS en un archivo
async function updateScssImports(filePath, content) {
  const ASSET_DIR = path.join(SRC_DIR, 'assets');
  
  // Patrones para encontrar importaciones con alias
  const scssAliasPattern = /@use\s+['"]@\/assets\/styles\/([^'"]+)['"]\s+as\s+([a-z])/g;
  
  // Reemplazamos los imports SCSS
  return content.replace(scssAliasPattern, (match, importPath, alias) => {
    const relativePath = getRelativePath(filePath, path.join(ASSET_DIR, 'styles'));
    
    // Limpiamos la ruta de importación (eliminamos _prefijo y .scss si existen)
    let cleanImportPath = importPath;
    if (cleanImportPath.startsWith('_')) {
      cleanImportPath = cleanImportPath.substring(1);
    }
    if (cleanImportPath.endsWith('.scss')) {
      cleanImportPath = cleanImportPath.substring(0, cleanImportPath.length - 5);
    }
    
    return `@use '${relativePath}/${cleanImportPath}' as ${alias}`;
  });
}

// Función para actualizar las importaciones JS/TS en un archivo
async function updateJsImports(filePath, content) {
  const jsAliasPattern = /import\s+(?:{[^}]*}|\w+|\*\s+as\s+\w+)\s+from\s+['"]@\/([^'"]+)['"]/g;
  
  return content.replace(jsAliasPattern, (match, importPath) => {
    const fullImportPath = path.join(SRC_DIR, importPath);
    const relativePath = getRelativePath(filePath, path.dirname(fullImportPath));
    const importFile = path.basename(fullImportPath);
    
    return match.replace(`'@/${importPath}'`, `'${relativePath}/${importFile}'`)
              .replace(`"@/${importPath}"`, `"${relativePath}/${importFile}"`);
  });
}

// Función para actualizar el archivo vite.config.ts
async function updateViteConfig(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    
    // Actualizar la sección additionalData
    content = content.replace(
      /@use '@\/assets\/styles\/([^']+)' as \*/g,
      (match, importPath) => {
        return `@use './src/assets/styles/${importPath}' as *`;
      }
    );
    
    // Eliminar la configuración de alias
    content = content.replace(
      /resolve:\s*{\s*alias:\s*{\s*'@':[^}]+}\s*},/g,
      ''
    );
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log(`✅ Actualizado: ${filePath}`);
  } catch (err) {
    console.error(`❌ Error al actualizar ${filePath}:`, err);
  }
}

// Función para actualizar tsconfig.json
async function updateTsConfig(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    
    // Eliminar la configuración de paths (pero mantener baseUrl)
    content = content.replace(
      /"paths"\s*:\s*{\s*"@\/\*"\s*:\s*\[\s*"\.\S+\s*\*"\s*\]\s*},/g, 
      ''
    );
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log(`✅ Actualizado: ${filePath}`);
  } catch (err) {
    console.error(`❌ Error al actualizar ${filePath}:`, err);
  }
}

// Función principal
async function migrateAliasToRelative() {
  console.log('🔄 Iniciando migración de rutas con alias a rutas relativas...');
  
  try {
    // Recorrer todos los archivos en el directorio src
    const files = await walkDir(SRC_DIR);
    
    for (const file of files) {
      try {
        let content = await fs.readFile(file, 'utf8');
        let originalContent = content;
        
        // Actualizar importaciones SCSS
        content = await updateScssImports(file, content);
        
        // Actualizar importaciones JS/TS
        content = await updateJsImports(file, content);
        
        // Guardar si ha habido cambios
        if (content !== originalContent) {
          await fs.writeFile(file, content, 'utf8');
          console.log(`✅ Actualizado: ${file}`);
        }
      } catch (err) {
        console.error(`❌ Error al procesar ${file}:`, err);
      }
    }
    
    // Actualizar archivos de configuración
    await updateViteConfig(CONFIG_FILES[0]);
    await updateTsConfig(CONFIG_FILES[1]);
    
    console.log('✅ Migración completada con éxito!');
  } catch (err) {
    console.error('❌ Error durante la migración:', err);
  }
}

// Ejecutar el script
migrateAliasToRelative(); 