const { app, BrowserWindow, screen } = require("electron");
const path = require("path");
const { ipcMain } = require("electron");
const { dialog, autoUpdater } = require("electron");
const { convert } = require("geojson2shp");
const fs = require('fs');
const shapefileToGeojson = require("shapefile-to-geojson");
const reproject = require("reproject");
const epsg = require("epsg");
const prj2epsg = require("prj2epsg");
const fsPromises = require("fs").promises;
const tokml =  require('geojson-to-kml');
const tj = require("@tmcw/togeojson");
require("dotenv").config();
const request = require("request");


const DOMParser = require("xmldom").DOMParser;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}
const GH_TOKEN = process.env.GH_ACC_TOK;
const createWindow = () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    x: 0,
    y: height - 800,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));


  // mainWindow.webContents.openDevTools();
};

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // TODO: clear temp dir
    // clearTempDir();
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("ready", () => {
  // Fetch latest release from GitHub API
  request(
    {
      url: "https://api.github.com/repos/colintalex/map_kit/releases",
      headers: {
        "User-Agent": "electron-app",
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${GH_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28"
      }
    },
    (err, res, body) => {
      if (err) {
        console.error(err);
        return;
      }

      const release = JSON.parse(body)[0];
      const currentVersion = app.getVersion();
      // Compare latest release version with current app version
      if (release.tag_name !== `v${currentVersion}`) {
        // Prompt user to download latest release
        dialog.showMessageBox(
          {
            type: "info",
            message: `A new version (${release.tag_name}) is available. Do you want to download it now?`,
            buttons: ["Yes", "No"],
          },
          (response) => {
            if (response === 0) {
              // Download latest release
              autoUpdater.setFeedURL({
                url: `https://github.com/:owner/:repo/releases/download/${release.tag_name}/app-${release.tag_name}.dmg`,
              });
              autoUpdater.checkForUpdates();
            }
          }
        );
      }
    }
  );
});

// Handle update events
autoUpdater.on("update-available", () => {
  // Notify user that update is available
  dialog.showMessageBox({
    type: "info",
    message: "A new version of the app is available. Downloading now...",
  });
});

autoUpdater.on("update-downloaded", () => {
  // Prompt user to install update
  dialog.showMessageBox(
    {
      type: "info",
      message:
        "The new version of the app has been downloaded. Do you want to install it now?",
      buttons: ["Yes", "No"],
    },
    (response) => {
      if (response === 0) {
        // Install update and restart app
        autoUpdater.quitAndInstall();
      }
    }
  );
});

autoUpdater.on("error", (err) => {
  console.error(err);
});

const temp_layer_path = app.getPath("temp");
// =======================================================
// =======================================================
// =======================================================

function clearTempDir(){
  let directory = temp_layer_path;
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
  let tmp_path = path.resolve(`${temp_layer_path}/${basename}`);

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
      saveInboundJson(src_path, tmp_path, event);
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
        let tempjson_path = tmp_path.replace("kml", "geojson");
        let json_crs = makeJsonCrs('EPSG:4326');
        let full_json = Object.assign(json_crs, converted);
        fs.writeFile(tempjson_path, JSON.stringify(full_json, null, 2), (err) => {
          if (err) {
            console.error(err);
          }
          // file written successfully
          let payload = {  
            wgs84_path: tempjson_path,
            name: path.basename(src_path),
            geojson: {
              crs: {
                proj: 'EPSG:4326', 
                init: 'EPSG:4326' 
              },
              data: full_json
            }
          };
          event.sender.send("shp-to-geojson-reply", payload);
        });
      });
      break;
  }
})

ipcMain.on("save_outbound", (event, arg) => {
  let json_path = arg.json_path;
  let type = arg.type;
  let out_crs = arg.crs;

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
      let out_path = path.resolve("~/Desktop/test.geojson")
      let data = fs.readFileSync(json_path, 'utf8');
      let json_data = JSON.parse(data);
      let original_crs = json_data.crs.properties.name;
      const reprojected_json = reproject.reproject(json_data, original_crs, out_crs, epsg);
      reprojected_json.crs.properties.name =  out_crs;

      dialog
        .showSaveDialog({
          properties: ["createDirectory"],
          options: {
            defaultPath: out_path,
          },
        })
        .then(function (data) {
          if (data.canceled) return false;

          let new_path = data.filePath;
          let str = JSON.stringify(reprojected_json, null, 2);
          fs.writeFile(new_path, str, (err) => {
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
            let json = JSON.parse(raw);
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

async function convertShapeToGeoJson(src_path) {
  let src_dbf_path = src_path.replace('.shp','.dbf');
  let src_prj_path = src_path.replace('.shp','.prj');
  let geojson = await shapefileToGeojson.parseFiles(src_path, src_dbf_path, src_prj_path);

  let prj_data = fs.readFileSync(src_prj_path, 'ascii');
  let data = JSON.stringify(geojson, null, 2);
  let prj_code = prj2epsg.fromPRJ(prj_data) || 4326;
  let prj_code_str = `EPSG:${prj_code}`
  
  if(geojson.crs == undefined){
    let crs_obj = makeJsonCrs(prj_code);
    geojson = Object.assign(crs_obj, geojson)
  }

  let basename = path.basename(src_path).replace('.shp', `_${prj_code}.geojson`);
  let filename = path.resolve(`${temp_layer_path}/${basename}`);
  fs.writeFile(filename, data, function (err) {
    if (err) {
      console.log(err);
    }
    console.log("The file was saved!");
  });

  if (prj_code == 4326){
    return {
      geojson: {
        data: geojson,
        crs: {init: prj_code_str}
      },
      original_path: filename,
      wgs84_path: filename,
      name: path.basename(src_path)
    };
  }

  // save a copy original file
  // create a copy of wgs84 transformed file
  const reprojected_crs = "EPSG:4326";
  const reprojected_json = reproject.toWgs84(
    geojson,
    prj_code_str,
    epsg
  );
  reprojected_json.crs.properties.name = reprojected_crs;
  
  let reproj_data = JSON.stringify(reprojected_json, null, 2);
  let reproj_basename = path.basename(src_path).replace('.shp', `_4326.geojson`);
  let reproj_path = path.resolve(`${temp_layer_path}/${reproj_basename}`);

  fs.writeFile(reproj_path, reproj_data, function (err) {
    if (err) {
      console.log(err);
    }
    console.log("The file was saved!");
  });
  
  let out = {
    geojson: {
      data: reprojected_json,
      crs: { init: prj_code_str, proj: reprojected_crs },
    },
    original_path: filename,
    wgs84_path: reproj_path,
    name: path.basename(src_path),
  };
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
function isJson(str){
  let data;
  try {
    data = JSON.parse(str);
  } catch (e) {
    return str;
  }

  return data;
};

function generate4326GeoJson(json_data){
  let original_json     = isJson(json_data);
  const original_crs    = original_json.crs?.properties?.name;
  const reprojected_crs = 'EPSG:4326';

  console.log("------------------");
  console.log(`Converting from ${original_crs || 'ESPG:4326'} to ${reprojected_crs}`);
  console.log("------------------");
  const reprojected_json = reproject.reproject(original_json, original_crs, reprojected_crs, epsg);
  reprojected_json.crs.properties.name = reprojected_crs;

  return reprojected_json;
}

function makeJsonCrs(code_str){
  let crs_data = {
    crs: {
      type: "name",
      properties: {
        name: code_str,
      }
    },
  }
  
  return crs_data
}


async function saveInboundJson(from_path, to_path, event) {
  try {
    let data = await fsPromises.readFile(from_path, "utf8");
    let geojson = JSON.parse(data);
    let orig_crs = geojson.crs?.properties?.name;
    let new_json;
    let reprojected = false;
    let crs = 'EPSG:4326';

    if (orig_crs != undefined){
      if (!orig_crs.includes("4326")){
        reprojected = true;
        console.log('convert')
        new_json = generate4326GeoJson(geojson);
        geojson = new_json;
        crs = geojson.crs.properties.name;
      }
    }else{
      geojson.crs = {
        type: '',
        properties: {
          name: crs
        }
      }
    }

    let reproj_basename = path
      .basename(to_path)
      .replace(/_\d+\.geojson/, `_${crs.replace("EPSG:", "")}.geojson`);
    to_path = path.resolve(`${temp_layer_path}/${reproj_basename}`);

    fs.writeFile(to_path, JSON.stringify(geojson), function (err) {
      if (err) {
        console.log(err);
      }
      console.log("The file was saved!");
    });
  

    event.sender.send("shp-to-geojson-reply", {
      geojson: {
        crs: { init: orig_crs, proj: crs },
        data: geojson,
      },
      wgs84_path: to_path,
      name: path.basename(from_path),
    });
  }
  catch (err) {
    console.error(err);
  }
}