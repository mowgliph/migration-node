/**
 * Script para migrar las rutas con alias @/ a rutas relativas
 * Uso: node migrate-paths-node.mjs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener la ruta del directorio actual en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directorios principales
const SRC_DIR = path.join(__dirname, 'src');
const ASSETS_DIR = path.join(SRC_DIR, 'assets');
const CONFIG_FILES = [
  path.join(__dirname, 'vite.config.ts'),
  path.join(__dirname, 'tsconfig.json')
];

// Extensiones de archivos a procesar
const FILE_EXTENSIONS = ['.vue', '.js', '.ts', '.scss'];

/**
 * Recorre recursivamente los directorios y devuelve todos los archivos con las extensiones especificadas
 */
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
    } else if (FILE_EXTENSIONS.includes(path.extname(file))) {
      // Es un archivo con la extensión que buscamos
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

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
  
  let modifiedContent = content;
  const modifications = [];
  
  modifiedContent = modifiedContent.replace(scssRegex, (match, importPath, alias) => {
    const assetPath = path.join(ASSETS_DIR, importPath);
    const relativePath = getRelativePath(filePath, assetPath);
    const newImport = `@use '${relativePath}' as ${alias};`;
    
    modifications.push({
      original: match,
      updated: newImport
    });
    
    return newImport;
  });
  
  return { content: modifiedContent, modifications };
}

/**
 * Actualiza los imports de JS/TS que usan alias @/ por rutas relativas
 */
function updateJsImports(content, filePath) {
  const jsRegex = /from\s+['"]@\/([^'"]+)['"]/g;
  
  let modifiedContent = content;
  const modifications = [];
  
  modifiedContent = modifiedContent.replace(jsRegex, (match, importPath) => {
    const importFullPath = path.join(SRC_DIR, importPath);
    const relativePath = getRelativePath(filePath, importFullPath);
    const newImport = `from '${relativePath}'`;
    
    modifications.push({
      original: match,
      updated: newImport
    });
    
    return newImport;
  });
  
  return { content: modifiedContent, modifications };
}

/**
 * Actualiza el config de Vite para eliminar (o comentar) el alias @/
 */
async function updateViteConfig(configPath) {
  try {
    const content = await fs.readFile(configPath, 'utf8');
    
    // Busca la configuración de alias
    const aliasRegex = /resolve:\s*{\s*alias:\s*{\s*['"]@['"]:\s*fileURLToPath\(new URL\(['"]\.\/src['"],\s*import\.meta\.url\)\)/;
    
    if (aliasRegex.test(content)) {
      // Comentamos la configuración de alias
      const updatedContent = content.replace(
        aliasRegex,
        `resolve: {
  /* Alias @/ comentado para usar rutas relativas
  alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url))
  } */`
      );
      
      // Guardar los cambios
      await fs.writeFile(configPath, updatedContent, 'utf8');
      
      console.log(`✅ Actualizado ${path.basename(configPath)} - alias @/ comentado`);
      return true;
    } else {
      console.log(`ℹ️ No se encontró alias @/ en ${path.basename(configPath)}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error al actualizar ${path.basename(configPath)}:`, error);
    return false;
  }
}

/**
 * Actualiza tsconfig.json para eliminar (o comentar) el path mapping para @/
 */
async function updateTsConfig(configPath) {
  try {
    const content = await fs.readFile(configPath, 'utf8');
    
    // Parsear el JSON
    const tsConfig = JSON.parse(content);
    
    // Verificar si existe el path mapping para @/
    if (tsConfig.compilerOptions && 
        tsConfig.compilerOptions.paths && 
        tsConfig.compilerOptions.paths['@/*']) {
      
      // Eliminamos el path mapping
      delete tsConfig.compilerOptions.paths['@/*'];
      
      // Si no quedan más paths, eliminamos el objeto paths
      if (Object.keys(tsConfig.compilerOptions.paths).length === 0) {
        delete tsConfig.compilerOptions.paths;
      }
      
      // Convertimos de vuelta a JSON
      const updatedContent = JSON.stringify(tsConfig, null, 2);
      
      // Guardar los cambios
      await fs.writeFile(configPath, updatedContent, 'utf8');
      
      console.log(`✅ Actualizado ${path.basename(configPath)} - eliminado path mapping para @/`);
      return true;
    } else {
      console.log(`ℹ️ No se encontró path mapping para @/ en ${path.basename(configPath)}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error al actualizar ${path.basename(configPath)}:`, error);
    return false;
  }
}

/**
 * Función principal para migrar todas las rutas con alias a rutas relativas
 */
async function migrateAliasToRelative() {
  console.log('🚀 Iniciando migración de rutas con alias @/ a rutas relativas...\n');
  
  try {
    // Obtener todos los archivos a procesar
    console.log('🔍 Buscando archivos...');
    const files = await walkDir(SRC_DIR);
    console.log(`✅ Encontrados ${files.length} archivos para procesar\n`);
    
    let totalModifiedFiles = 0;
    let totalScssModifications = 0;
    let totalJsModifications = 0;
    
    // Procesar cada archivo
    for (const filePath of files) {
      try {
        const relativePath = path.relative(__dirname, filePath);
        const content = await fs.readFile(filePath, 'utf8');
        
        // Aplicar transformaciones
        const { content: contentWithScssUpdated, modifications: scssModifications } = updateScssImports(content, filePath);
        const { content: finalContent, modifications: jsModifications } = updateJsImports(contentWithScssUpdated, filePath);
        
        // Si hay cambios, guardamos el archivo
        if (content !== finalContent) {
          await fs.writeFile(filePath, finalContent, 'utf8');
          
          totalScssModifications += scssModifications.length;
          totalJsModifications += jsModifications.length;
          totalModifiedFiles++;
          
          console.log(`✅ Actualizado: ${relativePath}`);
          
          // Mostrar modificaciones
          if (scssModifications.length > 0) {
            console.log(`   SCSS imports: ${scssModifications.length}`);
            scssModifications.forEach(mod => console.log(`     - ${mod.original} → ${mod.updated}`));
          }
          
          if (jsModifications.length > 0) {
            console.log(`   JS/TS imports: ${jsModifications.length}`);
            jsModifications.forEach(mod => console.log(`     - ${mod.original} → ${mod.updated}`));
          }
          
          console.log('');
        }
      } catch (error) {
        console.error(`❌ Error al procesar ${filePath}:`, error);
      }
    }
    
    // Actualizar archivos de configuración
    console.log('\n📝 Actualizando archivos de configuración...');
    for (const configFile of CONFIG_FILES) {
      if (path.basename(configFile) === 'vite.config.ts') {
        await updateViteConfig(configFile);
      } else if (path.basename(configFile) === 'tsconfig.json') {
        await updateTsConfig(configFile);
      }
    }
    
    // Mostrar resumen
    console.log('\n📊 Resumen de la migración:');
    console.log(`✅ Archivos procesados: ${files.length}`);
    console.log(`✅ Archivos modificados: ${totalModifiedFiles}`);
    console.log(`✅ Imports SCSS actualizados: ${totalScssModifications}`);
    console.log(`✅ Imports JS/TS actualizados: ${totalJsModifications}`);
    console.log('\n🎉 Migración completada con éxito!');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  }
}

// Ejecutar la migración
migrateAliasToRelative(); 