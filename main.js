const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

// ---------- Persistência de dados em arquivo JSON ----------
function getDataPath() {
  return path.join(app.getPath('userData'), 'entregas.json');
}

function lerDados() {
  try {
    const raw = fs.readFileSync(getDataPath(), 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function salvarDados(dados) {
  try {
    fs.writeFileSync(getDataPath(), JSON.stringify(dados, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Falha ao salvar:', err);
    return false;
  }
}

// ---------- Janela ----------
function criarJanela() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'Controle de Entregas',
    backgroundColor: '#f4f7fb',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => mainWindow.show());

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// ---------- Menu ----------
function criarMenu() {
  const template = [
    {
      label: 'Arquivo',
      submenu: [
        {
          label: 'Exportar dados (JSON)...',
          accelerator: 'CmdOrCtrl+E',
          click: async () => {
            const dados = lerDados();
            const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
              title: 'Exportar entregas',
              defaultPath: `entregas-${new Date().toISOString().slice(0, 10)}.json`,
              filters: [{ name: 'JSON', extensions: ['json'] }]
            });
            if (!canceled && filePath) {
              fs.writeFileSync(filePath, JSON.stringify(dados, null, 2), 'utf-8');
              shell.showItemInFolder(filePath);
            }
          }
        },
        {
          label: 'Importar dados (JSON)...',
          accelerator: 'CmdOrCtrl+I',
          click: async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
              title: 'Importar entregas',
              filters: [{ name: 'JSON', extensions: ['json'] }],
              properties: ['openFile']
            });
            if (!canceled && filePaths[0]) {
              try {
                const raw = fs.readFileSync(filePaths[0], 'utf-8');
                const dados = JSON.parse(raw);
                if (Array.isArray(dados)) {
                  salvarDados(dados);
                  mainWindow.webContents.send('dados-importados', dados);
                }
              } catch (e) {
                dialog.showErrorBox('Erro ao importar', 'O arquivo não é um JSON válido.');
              }
            }
          }
        },
        { type: 'separator' },
        { role: 'quit', label: 'Sair' }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Desfazer' },
        { role: 'redo', label: 'Refazer' },
        { type: 'separator' },
        { role: 'cut', label: 'Recortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Colar' }
      ]
    },
    {
      label: 'Visualizar',
      submenu: [
        { role: 'reload', label: 'Recarregar' },
        { role: 'forceReload', label: 'Forçar recarga' },
        { role: 'toggleDevTools', label: 'Ferramentas de desenvolvedor' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom normal' },
        { role: 'zoomIn', label: 'Aumentar zoom' },
        { role: 'zoomOut', label: 'Diminuir zoom' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tela cheia' }
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Sobre',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Sobre',
              message: 'Controle de Entregas',
              detail: `Versão ${app.getVersion()}\nSistema de controle de entregas por cliente.\n\nPasta de dados:\n${getDataPath()}`
            });
          }
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------- IPC: dados ----------
ipcMain.handle('dados:ler', () => lerDados());
ipcMain.handle('dados:salvar', (_evt, dados) => salvarDados(dados));
ipcMain.handle('dados:caminho', () => getDataPath());

// ---------- Ciclo de vida ----------
app.whenReady().then(() => {
  criarJanela();
  criarMenu();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanela();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
