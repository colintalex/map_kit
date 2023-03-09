const { app, BrowserWindow } = require("electron");
const path = require("path");
const { ipcMain } = require("electron");
const { dialog } = require("electron");
const { convert } = require("geojson2shp");
const fs = require('fs');
const shapefileToGeojson = require("shapefile-to-geojson");
const decompress = require("decompress");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  mainWindow.webContents.openDevTools();
};

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // TODO: clear temp dir
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// =======================================================
// =======================================================
// =======================================================

ipcMain.on("save_inbound", (event, arg) => {
  let src_path = arg.path;
  let type = arg.type;
  switch (type) {
    case "shp":
      convertShapeToGeoJson(src_path)
        .then(function (data) {
          event.sender.send("shp-to-geojson-reply", data);
          console.log('Converted shape to temporary GeoJSON')
        })
        .catch(function (error) {
          console.log('error',error)
        });
      break;
    case "geojson":
      break;
  }
})

ipcMain.on("save_outbound", (event, arg) => {
  let json_path = arg.json_path;
  let type = arg.type;

  dialog.showSaveDialog({
    properties: ["createDirectory"],
    options: {
      defaultPath: 'test.zip'
    },
  })
  .then(function (data) {
    convertGeoJsonToShp(json_path, data.filePath)
  })
  .then(function (data) {
    debugger
    // removeTempFile(json_path);
  })
  .catch(function(data){
    debugger
    console.log(data)
  });
});

ipcMain.handle("some-name", async (event, path) => {
  return result;
});

// ==========================================
// ==========================================
// ==========================================

function removeTempFile(temp_path) {
  temp_json = temp_path.replace(/(\.[\w\d_-]+)$/i, "_temp$1");

  if (fs.existsSync(path)) {
    fs.unlink(temp_json, (err) => {
      if (err) {
        console.error("errrrr");
        console.error(err);
        return;
      }
      //file removed
      console.log("Temp file removed");
    });
  } else {
    console.log("file not found!");
  }
}

// ==========================================
// ==========================================

async function convertShapeToGeoJson(src_path) {
  let src_dbf_path = src_path.replace('.shp','.dbf')
  const geojson = await shapefileToGeojson.parseFiles(src_path, src_dbf_path)

  let data = JSON.stringify(geojson, null, 2);
  let basename = path.basename(src_path).replace('shp', 'geojson');
  let filename = path.resolve(`./tmp/${basename}`)

  fs.writeFile(filename, data, function (err) {
    if (err) {
      console.log(err);
    }
    console.log("The file was saved!");
  });
  console.log(filename)
  
  return { geojson: geojson, path: filename }
}

async function convertGeoJsonToShp(json_path, shape_path){
  const options = {
    layer: "my-layer",
  };
  temp_json = json_path.replace(/(\.[\w\d_-]+)$/i, "_temp$1");
  fs.copyFile(json_path, temp_json, (err) => {
    if (err) throw err;
    console.log('Temp file created for safety.');
  });

  debugger
  let data = await convert(temp_json, shape_path, options);

}