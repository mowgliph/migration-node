# Migración de Rutas de Alias a Rutas Relativas

Este conjunto de scripts ayuda a migrar las importaciones con alias `@/` a rutas relativas en todo el proyecto. La migración mejora la funcionalidad del editor al permitir que reconozca y navegue correctamente por las rutas de los archivos.

## Archivos Incluidos

- `migrate-paths-node.mjs`: Script principal que migra automáticamente todas las rutas con alias `@/` a rutas relativas en su proyecto.
- `test-migration-node.mjs`: Script de prueba que muestra cómo se transformaría un archivo específico sin realizar cambios reales.

## Requisitos

- Node.js instalado en su sistema
- Proyecto Vue con alias `@/` configurado

## Instrucciones

### 1. Probar la migración en un archivo específico

Para probar cómo funcionaría la migración en un archivo específico sin realizar cambios reales:

```bash
node test-migration-node.mjs src/components/modules/users/UsersTable.vue
```

Este comando analizará el archivo y mostrará qué cambios se aplicarían sin modificar realmente el archivo. Recomendamos probar primero con algunos archivos clave para verificar que el patrón de reemplazo sea correcto.

### 2. Hacer una copia de seguridad

Antes de ejecutar la migración completa, es altamente recomendable hacer una copia de seguridad del proyecto:

**En Linux/Mac:**
```bash
cp -r frontend frontend_backup
```

**En Windows (PowerShell):**
```powershell
Copy-Item -Path "." -Destination "..\frontend_backup" -Recurse
```

**En Windows (CMD):**
```cmd
xcopy /E /I /H . ..\frontend_backup
```

### 3. Ejecutar la migración completa

Para migrar automáticamente todos los archivos del proyecto:

```bash
node migrate-paths-node.mjs
```

Este script hará lo siguiente:
- Encontrar todos los archivos relevantes en su proyecto (Vue, JS, TS, SCSS)
- Reemplazar todas las importaciones con alias `@/` por rutas relativas
- Actualizar/comentar las configuraciones de alias en los archivos de configuración

### 4. Verificar los cambios

Después de la migración, verifique que todo funcione correctamente ejecutando:

```bash
npm run dev
```

## Patrones de Migración

Las rutas se transformarán según estos patrones:

### SCSS Imports
De:
```scss
@use '@/assets/styles/variables' as v;
```

A:
```scss
@use '../../assets/styles/variables' as v;
```

### JS/TS Imports
De:
```js
import Component from '@/components/Component.vue';
```

A:
```js
import Component from '../../components/Component.vue';
```

## Solución de problemas

Si encuentra problemas después de la migración:

1. Verifique los archivos de configuración (`vite.config.ts` y `tsconfig.json`) para asegurarse de que se hayan actualizado correctamente.
2. Si hay rutas que no se migraron correctamente, puede ejecutar nuevamente el script de prueba en estos archivos para depurarlos.
3. Si es necesario, restaure desde su copia de seguridad y resuelva los problemas manualmente.

**Nota**: Si alguna importación presenta problemas después de la migración, puede ser necesario ajustar manualmente la ruta relativa. Los escenarios complejos, como importaciones en archivos indexados o estructuras de directorios anidadas, pueden requerir atención adicional. 