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
  let directory = path.resolve('./tmp/vector_files');
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
  let tmp_path = path.resolve(`./tmp/vector_files/${basename}`);

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
      let out_path = path.resolve("~/Desktop/test.geojson")
      if (crs != "EPSG:4326") json_path = generate4326GeoJson(json_path, crs);
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
  let original_crs = geojson.crs.properties.name;
  let crs_code = /\d+/.exec(original_crs)[0];
  let basename = path.basename(src_path).replace('.shp', `_${crs_code}.geojson`);
  let filename = path.resolve(`./tmp/vector_files/${basename}`);
  fs.writeFile(filename, data, function (err) {
    if (err) {
      console.log(err);
    }
    console.log("The file was saved!");
  });

  if (crs_code == "4326"){
    return {
      geojson: {
        data: geojson,
        crs: {init: original_crs}
      },
      original_path: filename,
      wgs84_path: filename,
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
  let reproj_path = path.resolve(`./tmp/vector_files/${reproj_basename}`);

  fs.writeFile(reproj_path, reproj_data, function (err) {
    if (err) {
      console.log(err);
    }
    console.log("The file was saved!");
  });
  
  let out = {
    geojson: {
      data: reprojected_json,
      crs: { init: original_crs, proj: reprojected_crs },
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
    let crs_is_4326 =
      orig_crs && !orig_crs.includes("4326") && !orig_crs.includes("CRS84");

    if (crs_is_4326){ 
      reprojected = true;
      console.log('convert')
      new_json = generate4326GeoJson(geojson);
    } else {
      console.log('nope');
      let out_crs = 'undefined';
      let json_crs = makeJsonCrs(out_crs);
      new_json = Object.assign(json_crs, geojson);
    }



    let crs = new_json.crs.properties.name;
    let reproj_basename = path
      .basename(to_path)
      .replace(/_\d+\.geojson/, `_${crs.replace("EPSG:", "")}.geojson`);
    to_path = path.resolve(`./tmp/vector_files/${reproj_basename}`);

    fs.writeFile(to_path, Buffer.from(JSON.stringify(new_json)), function (err) {
      if (err) {
        console.log(err);
      }
      console.log("The file was saved!");
    });
  

    event.sender.send("shp-to-geojson-reply", {
      geojson: {
        crs: { init: crs, proj: "EPSG:4326" },
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