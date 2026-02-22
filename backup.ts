import fs from 'fs';
import path from 'path';

const DB_FILE = 'inventory.db';
const BACKUP_DIR = 'backups';

const rootDir = process.cwd();
const dbPath = path.join(rootDir, DB_FILE);
const backupDir = path.join(rootDir, BACKUP_DIR);

async function runBackup() {
  // Verifica se o banco de dados existe
  if (!fs.existsSync(dbPath)) {
    console.log(`[Backup] Banco de dados não encontrado em ${dbPath}. Ignorando backup inicial.`);
    return;
  }

  // Cria a pasta de backups se não existir
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Gera nome do arquivo com timestamp (ex: inventory-2023-10-25T10-00-00-000Z.db)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `inventory-${timestamp}.db`);

  try {
    fs.copyFileSync(dbPath, backupFile);
    console.log(`[Backup] Backup realizado com sucesso: ${backupFile}`);

    // Limpeza: Manter apenas os 10 últimos backups para economizar espaço
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('inventory-') && f.endsWith('.db'))
      .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time); // Ordena do mais novo para o mais antigo

    if (files.length > 10) {
      files.slice(10).forEach(file => {
        fs.unlinkSync(path.join(backupDir, file.name));
        console.log(`[Backup] Backup antigo removido: ${file.name}`);
      });
    }
  } catch (error) {
    console.error('[Backup] Erro ao realizar backup:', error);
  }
}

runBackup();