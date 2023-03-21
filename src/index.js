const { app, BrowserWindow } = require("electron");
const path = require("path");
const { ipcMain } = require("electron");
const { dialog } = require("electron");
const { convert } = require("geojson2shp");
const fs = require('fs');
const shapefileToGeojson = require("shapefile-to-geojson");
const decompress = require("decompress");
const reproject = require("reproject");
const epsg = require("epsg");
const prj2epsg = require("prj2epsg");
const fsPromises = require("fs").promises;
const tokml =  require('geojson-to-kml');
const kmlToJson = require("kml-to-json");
const tj = require("@tmcw/togeojson");

const DOMParser = require("xmldom").DOMParser;

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
  mainWindow.on("closed", () => clearTempDir());


  mainWindow.loadFile(path.join(__dirname, "index.html"));

  mainWindow.webContents.openDevTools();
};

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // TODO: clear temp dir
    clearTempDir();
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

function clearTempDir(){
  let directory = './tmp';
  console.count()
  fs.readdir(directory, (err, files) => {
    if (err) throw err;

    for (const file of files) {
      fs.unlink(path.join(directory, file), (err) => {
        if (err) throw err;
      });
    }
  });
}

ipcMain.on("save_inbound", (event, arg) => {
  let src_path = arg.path;
  let type = arg.type;
  let basename = path.basename(src_path);
  let tmp_path = path.resolve(`./tmp/${basename}`);
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
      fsPromises.copyFile(src_path, tmp_path)
      .then(function(data){
        event.sender.send("shp-to-geojson-reply", {
          path: tmp_path,
          name: path.basename(src_path),
        });
      });
      break;
    case "txt":
      fsPromises.copyFile(src_path, tmp_path)
      .then(function(data){
        event.sender.send("shp-to-geojson-reply", {
          path: tmp_path,
          name: path.basename(src_path),
        });
      });
      break;
    case 'kml':
      fsPromises.copyFile(src_path, tmp_path)
      .then(function (data) {
        const kml = new DOMParser().parseFromString(
          fs.readFileSync(tmp_path, "utf8")
        );
        let converted = tj.kml(kml);
        console.log(converted);
        let tempjson_path = tmp_path.replace("kml", "geojson");
        fs.writeFile(tempjson_path, JSON.stringify(converted, null, 2), (err) => {
          if (err) {
            console.error(err);
          }
          // file written successfully
          let payload = {  path: tempjson_path, name: path.basename(src_path) };
          event.sender.send("shp-to-geojson-reply", payload);
        });
      });
      break;
  }
})

ipcMain.on("save_outbound", (event, arg) => {
  let json_path = arg.json_path;
  let type = arg.type;
  let crs = arg.crs;
  switch(type){
    case 'shp':
      dialog.showSaveDialog({
        properties: ["createDirectory"],
        options: {
          defaultPath: path.resolve('~/Downloads/test.zip')
        },
      })
      .then(function (data) {
        convertGeoJsonToShp(json_path, data.filePath)
      })
      .catch(function(data){
        console.log(data)
      });
      break;
    case 'geojson':
      let path = path.resolve("~/Desktop/test.geojson")
      if (crs != 'EPSG:4326'){
        // used converted or convert
        // TODO:
        const reprojected_crs = crs;
        const reprojected_json = reproject.toWgs84(
          geojson,
          geojson.crs.properties.name,
          epsg
        );
        reprojected_json.crs.properties.name = reprojected_crs;

        let reproj_data = JSON.stringify(reprojected_json, null, 2);
        let reproj_basename = path
          .basename(src_path)
          .replace(".shp", `_4326.geojson`);
        let reproj_filename = path.resolve(`./tmp/${reproj_basename}`);
      }
      dialog
        .showSaveDialog({
          properties: ["createDirectory"],
          options: {
            defaultPath: path,
          },
        })
        .then(function (data) {
          let new_path = data.filePath;
          console.log(json_path);
          fs.copyFile(json_path, new_path, (err) => {
            console.log(err);
          });
        });
        break;
      case 'kml':
        dialog
          .showSaveDialog({
            properties: ["createDirectory"],
            options: {
              defaultPath: path.resolve("~/Desktop/test.geojson"),
            },
          })
          .then(function (data) {
            let new_path = data.filePath;
            const raw = fs.readFileSync(json_path, {
              encoding: "utf8",
              flag: "r",
            });
            console.log(raw);
            // let raw = fs.readFile(json_path, "utf-8");
            let json = JSON.parse(raw);
            console.log(json);
            const kml_stuff = tokml(json);
            fs.writeFile(new_path, kml_stuff, (err) => {
              if (err) {
                console.error(err);
              }
            console.log('Done');
              // file written successfully
            });
          });
      break;
  }
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
  let src_dbf_path = src_path.replace('.shp','.dbf');
  let src_prj_path = src_path.replace('.shp','.prj');
  const geojson = await shapefileToGeojson.parseFiles(src_path, src_dbf_path, src_prj_path);


  let data = JSON.stringify(geojson, null, 2);
  let basename = path.basename(src_path).replace('.shp', `.geojson`);
  let filename = path.resolve(`./tmp/${basename}`);
  let original_crs = geojson.crs.properties.name;
  fs.writeFile(filename, data, function (err) {
    if (err) {
      console.log(err);
    }
    console.log("The file was saved!");
  });

  if (original_crs.includes("4326")){
    return {
      geojson: {
        data: data,
        crs: {init: original_crs}
      },
      path: filename,
      name: path.basename(src_path)
    };
  }

  // save a copy original file
  // create a copy of wgs84 transformed file
  const reprojected_crs = "urn:ogc:def:crs:EPSG::4326";
  const reprojected_json = reproject.toWgs84(
    geojson,
    geojson.crs.properties.name,
    epsg
  );
  reprojected_json.crs.properties.name = reprojected_crs;
  
  let reproj_data = JSON.stringify(reprojected_json, null, 2);
  let reproj_basename = path.basename(src_path).replace('.shp', `_4326.geojson`);
  let reproj_filename = path.resolve(`./tmp/${reproj_basename}`);

  fs.writeFile(reproj_filename, reproj_data, function (err) {
    if (err) {
      console.log(err);
    }
    console.log("The file was saved!");
  });
  
  let out = {
    geojson: {
      data: reproj_data,
      crs: { init: original_crs, proj: reprojected_crs}
    },
    path: filename,
    name: path.basename(src_path)
  }
  return out
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

  let data = await convert(temp_json, shape_path, options);
  return data;
}