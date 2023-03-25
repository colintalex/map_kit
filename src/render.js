const jQuery = require('jquery');
const { ipcRenderer } = require("electron");
const Path = require("path");
const epsg = require("epsg");
const Map = require('./map');
const readAndUpload = require('./read_and_upload');

let map = Map.buildMap('map');

ipcRenderer.on("shp-to-geojson-reply", (event, arg) => {
  updateLayersList(arg);
  Map.addJSONToMap(arg.wgs84_path, map);
});

jQuery(".layers-list").on("click", ".download", function (e) {
  let crrrs = jQuery(".export_crs").data('value');
  alert('Uh-oh! No Projection Selected for Export')
  return false;

  let out_crs = jQuery(".export_crs").text();
  let data = {
    json_path: e.target.dataset['wgs84'],
    type: e.target.value,
    crs: out_crs
  };
  ipcRenderer.send("save_outbound", data);
});

jQuery(".layers-list").on("click", ".dropbtn", function (e) {
  myFunction();
});

jQuery(".layers-list").on("click", "input[type=radio]", function (e) {
  jQuery(".export_crs").text(this.value);
  jQuery(".export_crs").dataset.value(this.value);
});

jQuery(".layers-list").on("click", "a", function (e) {
  jQuery(".export_crs").text(this.text);
  jQuery(".export_crs").dataset.value(this.text);
  document.getElementById("crsDropdown").classList.remove('show')
});

jQuery(".layers-list").on("keyup", "#myInput", function (e) {
  filterFunction();
});

jQuery(".layers-list").on("click", "a", function (e) {
  jQuery('#crsDropdown').removeClass('show');
  var dropdowns = document.getElementsByClassName("dropdown-content");
  var i;
  for (i = 0; i < dropdowns.length; i++) {
    var openDropdown = dropdowns[i];
    if (openDropdown.classList.contains("show")) {
      openDropdown.classList.remove("show");
    }
  }
});

// ========================================================================
// ========================================================================
// ========================================================================

document.addEventListener("drop", (event) => {
  event.preventDefault();
  event.stopPropagation();

  for (const f of event.dataTransfer.files) {
    console.log("File Path of dragged files: ", f.path);
    readAndUpload.detectAndUpload(f);
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

// ========================================================================
// ========================================================================
// ========================================================================


function filterFunction() {
  var input, filter, ul, li, a, i;
  var input, filter, ul, li, a, i;
  input = document.getElementById("myInput");
  filter = input.value.toUpperCase();
  div = document.getElementById("crsDropdown");
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
  const layerList = document.querySelector(".layers-list");

  let list = [];
  for (let i = 0;i< keys.length; i++){
    list.push(`<a class="hide" href="#">${keys[i]}</a>`);
  }

  div.innerHTML = `
    <div alt="${f.name}">
    <div class="layer_info">
      <div>${f.name}</div>
      <div><span class="label">Original CRS:</span><span class="label_value">${
        f.geojson.crs.init
      }</span></div>
      <div><span class="label">Current CRS:</span><span class="label_value">${
        f.geojson.crs.proj
      }</span></div>
    </div>
    <hr>
    <h5 class="export_projection">Export as: <span class='export_crs'>select an EPSG code to export</span></h5>
    <div class="dropdown">
      <button class="dropbtn">EPSG Code</button>
      <div id="crsDropdown" class="dropdown-content">
        <div class="crs_list">
          ${list.join("")}
        </div>
        <input type="text" placeholder="Search.." id="myInput">
      </div>
    </div>
    <form class="crs_presets">
    <label class="radio-inline">
      <input type="radio" name="optradio" value="EPSG:4326">4326
    </label>
    <label class="radio-inline">
      <input type="radio" name="optradio" value="EPSG:3857">3857
    </label>
    <label class="radio-inline">
      <input type="radio" name="optradio" value="urn:ogc:def:crs:EPSG::4326">urn:4326
    </label>
    <label class="radio-inline">
      <input type="radio" name="optradio" value="urn:ogc:def:crs:EPSG::3857">urn:3857
    </label>
    </form>

    <hr>
    <div class="export_buttons">
      <button class='download shp_download' id='${
        f.name
      }' value='shp' data-original='${f.original_path}' data-wgs84='${
    f.wgs84_path
  }'>SHP</button>
      <button class='download geojson_download' id='${
        f.name
      }' value='geojson' data-original='${f.original_path}' data-wgs84='${
    f.wgs84_path
  }'>GeoJSON</button>
      <button class='download kml_download' id='${
        f.name
      }' value='kml' data-original='${f.original_path}' data-wgs84='${
    f.wgs84_path
  }'>KML (4326)</button>
    </div>
    </div>
      `;
  layerList.appendChild(div);
}

/* When the user clicks on the button,
toggle between hiding and showing the dropdown content */
function myFunction() {
  document.getElementById("crsDropdown").classList.toggle("show");
}