// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  startDrag: (fileName) => {
    ipcRenderer.send("ondragstart", path.join(process.cwd(), fileName));
  },
});