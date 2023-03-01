const jQuery = require('jquery');
const L = require('leaflet');
const { ipcRenderer } = require("electron");


jQuery(".layers-list").on("click", ".shp_download", function (e) {
  let data = {
    json_path: e.target.value,
  };
  ipcRenderer.send("save_outbound", data);
});

var map = L.map("map").setView([51.505, -0.09], 13);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const layerList = document.querySelector(".layers-list");

document.addEventListener("drop", (event) => {
  event.preventDefault();
  event.stopPropagation();

  for (const f of event.dataTransfer.files) {
    console.log("File Path of dragged files: ", f.path);
    let file_extension = /\w+$/.exec(f.path)[0];
    // check_file extensions
    // [geojson, shp, kml] first. then=> gml(?), lidar(?)
    switch(file_extension){
      case 'geojson'||'json':
        readAndUploadJson(f);
        break;
      case 'kml':
        break;
      case 'shp':
        break;
    }
  }
});

function readAndUploadJson(f){
  // read_file
  readTextFile(f.path, function (text) {
    var data = JSON.parse(text);
    let layer = L.geoJSON(data).addTo(map);
    map.fitBounds(layer.getBounds());
  });
  const div = document.createElement("div");
  div.classList.add("layer");
  div.innerHTML = `
          <div alt="${f.name}">
          <p>${f.name}</p>
          <button class='shp_download' id='${f.name}' value='${f.path}'>SHP</button>
          </div>
      `;
  layerList.appendChild(div);
}

function readTextFile(file, callback) {
  var rawFile = new XMLHttpRequest();
  rawFile.overrideMimeType("application/json");
  rawFile.open("GET", file, true);
  rawFile.onreadystatechange = function () {
    if (rawFile.readyState === 4 && rawFile.status == "200") {
      callback(rawFile.responseText);
    }
  };
  rawFile.send(null);
}

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
