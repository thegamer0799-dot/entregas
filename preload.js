const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  lerDados: () => ipcRenderer.invoke('dados:ler'),
  salvarDados: (dados) => ipcRenderer.invoke('dados:salvar', dados),
  caminhoDados: () => ipcRenderer.invoke('dados:caminho'),
  aoImportar: (callback) => {
    ipcRenderer.on('dados-importados', (_evt, dados) => callback(dados));
  }
});
