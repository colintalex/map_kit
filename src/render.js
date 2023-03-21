const jQuery = require('jquery');
const L = require('leaflet');
const { ipcRenderer } = require("electron");
const Path = require("path");
const fs = require("fs");
const epsg = require("epsg");


g_temp_dir = './tmp'


function myFunction() {
  document.getElementById("myDropdown").classList.toggle("show");
}

// Close the dropdown menu if the user clicks outside of it
window.onclick = function (event) {
  
};

jQuery(".layers-list").on("click", ".shp_download", function (e) {
  let data = {
    json_path: e.target.value,
    type: 'shp'
  };

  ipcRenderer.send("save_outbound", data);
});
jQuery(".layers-list").on("click", ".geojson_download", function (e) {
  let out_crs = jQuery(".export_crs").text();
  let data = {
    json_path: e.target.value,
    type: 'geojson',
    crs: out_crs
  };
  ipcRenderer.send("save_outbound", data);
});
jQuery(".layers-list").on("click", ".kml_download", function (e) {
  let data = {
    json_path: e.target.value,
    type: 'kml'
  };
  ipcRenderer.send("save_outbound", data);
});
jQuery(".layers-list").on("click", ".dropbtn", function (e) {
  myFunction();
});
jQuery(".layers-list").on("click", "a", function (e) {
  jQuery(".export_crs").text(this.text);
  document.getElementById("myDropdown").classList.remove('show')
});
jQuery(".layers-list").on("keyup", "#myInput", function (e) {
  filterFunction();
});
jQuery(".layers-list").on("click", "a", function (e) {
  jQuery('#myDropdown').removeClass('show');
  var dropdowns = document.getElementsByClassName("dropdown-content");
  var i;
  for (i = 0; i < dropdowns.length; i++) {
    var openDropdown = dropdowns[i];
    if (openDropdown.classList.contains("show")) {
      openDropdown.classList.remove("show");
    }
  }
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

function readAndUploadKML(path){
    let data = {
      path: path,
      type: "kml",
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
    let layer = L.geoJSON(json, {
      onEachFeature: function (feature, layer) {
        let props = Object.entries(feature.properties);
        layer.bindPopup(
          `${props.map(function(x) {
            return `<h4>${x[0]}: ${x[1]}</h4>`
          }).join("\n")}`
        );
      }
    }).addTo(map);
    layerControl.addOverlay(layer, layername);
    map.fitBounds(layer.getBounds());
  });
}

function filterFunction() {
  var input, filter, ul, li, a, i;
  input = document.getElementById("myInput");
  filter = input.value.toUpperCase();
  div = document.getElementById("myDropdown");
  a = div.getElementsByTagName("a");
  for (i = 0; i < a.length; i++) {
    txtValue = a[i].textContent || a[i].innerText;
    if (txtValue.toUpperCase().indexOf(filter) > -1) {
      a[i].style.display = "";
    } else {
      a[i].style.display = "none";
    }
  }
}

function updateLayersList(f){
  const div = document.createElement("div");
  div.classList.add("layer");
  let keys = Object.keys(epsg);

  let list = [];
  for (let i = 0;i< keys.length; i++){
    list.push(`<a href="#">${keys[i]}</a>`);
  }
  div.innerHTML = `
          <div alt="${f.name}">
          <p>${f.name}</p>
          <p>Original CRS: ${f.geojson.crs.init}</p>
          <p>Current CRS: ${f.geojson.crs.proj}</p>
          <hr>
          <h5>Export as: <span class='export_crs'></span></h5>
          <div class="dropdown">
            <button class="dropbtn">EPSG:____</button>
            <div id="myDropdown" class="dropdown-content">
              <input type="text" placeholder="Search.." id="myInput">
              ${list.join('')}
            </div>
          </div>
          <button class='shp_download' id='${f.name}' type='shp' value='${f.path}'>SHP</button>
          <button class='geojson_download' id='${f.name}' type='geojson' value='${f.path}'>GeoJSON</button>
          <button class='kml_download' id='${f.name}' type='kml' value='${f.path}'>KML</button>
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
  // arg = {
  //   geojson: {
  //     data: reproj_data,
  //     crs: [original_crs, reprojected_crs],
  //   },
  //   path: filename,
  //   name: path.basename(src_path),
  // };
  updateLayersList(arg);
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
        readAndUploadKML(f.path);
        break;
      case "shp":
        readAndUploadShp(f.path);
        break;
      case "txt":
        readAndUploadTxt(f.path);
        break;
    }
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
