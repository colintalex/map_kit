const jQuery = require('jquery');
const L = require('leaflet');
const { ipcRenderer } = require("electron");
const Path = require("path");
const fs = require("fs");

g_temp_dir = './tmp'

jQuery(".layers-list").on("click", ".shp_download", function (e) {
  let data = {
    json_path: e.target.value,
    type: 'shp'
  };

  ipcRenderer.send("save_outbound", data);
});
jQuery(".layers-list").on("click", ".geojson_download", function (e) {
  let data = {
    json_path: e.target.value,
    type: 'geojson'
  };
  ipcRenderer.send("save_outbound", data);
});

var map = L.map("map").setView([38.505, -98.09], 4);
const layerControl = L.control.layers().addTo(map);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);



const layerList = document.querySelector(".layers-list");

function readAndUploadJson(path){
    let data = {
      path: path,
      type: "geojson",
    };
  
    // send to temp for conversion
    ipcRenderer.send("save_inbound", data);
}

function addJSONToMap(path){
  fs.readFile(path, "utf8", (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    let layername = path.replace(/^.*[\\\/]/, '')

    let json = JSON.parse(data);
    let layer = L.geoJSON(json).addTo(map);
    layerControl.addOverlay(layer, layername);
    map.fitBounds(layer.getBounds());
  });
}

function updateLayersList(f){
  const div = document.createElement("div");
  div.classList.add("layer");
  div.innerHTML = `
          <div alt="${f.name}">
          <p>${f.name}</p>
          <button class='shp_download' id='${f.name}' type='shp' value='${f.path}'>SHP</button>
          <button class='geojson_download' id='${f.name}' type='geojson' value='${f.path}'>GeoJSON</button>
          </div>
      `;
  layerList.appendChild(div);
}

function readAndUploadShp(path){
  let data = {
    path: path,
    type: "shp",
  };

  // send to temp for conversion
  ipcRenderer.send("save_inbound", data);
}

function readAndUploadTxt(path) {
  let data = {
    path: path,
    type: "txt",
  };

  // send to temp for conversion
  ipcRenderer.send("save_inbound", data);
}

ipcRenderer.on("shp-to-geojson-reply", (event, arg) => {
  addJSONToMap(arg.path);
});



document.addEventListener("drop", (event) => {
  event.preventDefault();
  event.stopPropagation();

  for (const f of event.dataTransfer.files) {
    console.log("File Path of dragged files: ", f.path);
    let file_extension = /\w+$/.exec(f.path)[0];
    // check_file extensions
    // [geojson, shp, kml] first. then=> gml(?), lidar(?)
    switch (file_extension) {
      case "geojson":
        readAndUploadJson(f.path);
        break;
      case "kml":
        break;
      case "shp":
        readAndUploadShp(f.path);
        break;
      case "txt":
        readAndUploadTxt(f.path);
        break;
    }
    updateLayersList(f);
  }
});

document.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.stopPropagation();
});

document.addEventListener("dragenter", (event) => {
  console.log("File is in the Drop Space");
});

document.addEventListener("dragleave", (event) => {
  console.log("File has left the Drop Space");
});
