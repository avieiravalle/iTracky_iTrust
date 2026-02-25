import fs from 'fs/promises';
import path from 'path';

const DB_FILE = 'inventory.db';
const BACKUP_DIR = 'backups';

const rootDir = process.cwd();
const dbPath = path.join(rootDir, DB_FILE);
const backupDir = path.join(rootDir, BACKUP_DIR);

async function cleanupOldBackups() {
  try {
    const files = (await fs.readdir(backupDir))
      .filter(f => f.startsWith('inventory-') && f.endsWith('.db'))
      .map(async f => {
        const stats = await fs.stat(path.join(backupDir, f));
        return { name: f, time: stats.mtime.getTime() };
      });
    
    const sortedFiles = (await Promise.all(files)).sort((a, b) => b.time - a.time);

    if (sortedFiles.length > 10) {
      const filesToDelete = sortedFiles.slice(10);
      for (const file of filesToDelete) {
        await fs.unlink(path.join(backupDir, file.name));
        console.log(`[Backup] Backup antigo removido: ${file.name}`);
      }
    }
  } catch (error) {
    console.error('[Backup] Erro ao limpar backups antigos:', error);
  }
}

async function runBackup() {
  try {
    // Verifica se o banco de dados existe
    await fs.access(dbPath);
  } catch {
    console.log(`[Backup] Banco de dados não encontrado em ${dbPath}. Ignorando backup.`);
    return;
  }

  try {
    await fs.mkdir(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `inventory-${timestamp}.db`);

    await fs.copyFile(dbPath, backupFile);
    console.log(`[Backup] Backup realizado com sucesso: ${backupFile}`);

    await cleanupOldBackups();
  } catch (error) {
    console.error('[Backup] Falha ao realizar o backup:', error);
  }
}

runBackup();