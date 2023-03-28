const $ = window.$ = window.jQuery = require('jquery');
window.Bootstrap = require("bootstrap");
window.Popper = require('@popperjs/core');
let ShortUniqueId = require('short-unique-id');
const { ipcRenderer } = require("electron");
const Path = require("path");
const epsg = require("epsg");
const MapUtils = require('./map');
const readAndUpload = require('./read_and_upload');
require("@fortawesome/fontawesome-free/js/all");
const crypto = require('crypto');

let map = MapUtils.buildMap('map');

ipcRenderer.on("shp-to-geojson-reply", (event, arg) => {
  updateLayersList(arg);
  MapUtils.addJSONToMap(arg, map);
});

$(".layers-list").on("click", ".download", function (e) {
  let export_crs = $(".export_crs").text();
  if (export_crs == undefined){
    alert('Uh-oh! No Projection Selected for Export');
    return false;
  }

  let out_crs = $(".export_crs").text();
  let data = {
    json_path: e.target.dataset['wgs84'],
    type: e.target.value,
    crs: out_crs
  };

  ipcRenderer.send("save_outbound", data);
});

$(".layers-list").on("click", ".dropbtn", function (e) {
  myFunction();
});

$(".layers-list").on("click", "input[type=radio]", function (e) {
  $(".export_crs").text(this.value);
  $(".export_crs").data('value', this.value);
});

$(".layers-list").on("click", "a", function (e) {
  $(".export_crs").text(this.text);
  $(".export_crs").data('value', this.text);
  document.getElementById("crsDropdown").classList.remove('show')
});

$(".layers-list").on("keyup", "#myInput", function (e) {
  filterFunction();
});

$(".layers-list").on("click", "a", function (e) {
  $('#crsDropdown').removeClass('show');
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

document.addEventListener('DOMContentLoaded', () => {
  const titleBar = document.createElement('div');
  titleBar.classList.add('title-bar');
  titleBar.innerHTML = `
    <div class="title-bar-draggable">
      <span class="title-bar-title">My App</span>
    </div>
  `;
  document.body.appendChild(titleBar);
});

// ========================================================================
// ========================================================================
// ========================================================================


function generateKey(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';
  for (let i = 0; i < length; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

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
  const uid = generateKey(10);
  let div_id = uid;
  div.innerHTML = `
    <div alt="${f.name}">
    <div>
      <span class="layer_name">
        ${shortenFilename(f.name, 40)}
      </span>
      <span class="layer_actions macro">
        <a data-bs-toggle="collapse" href="#${div_id}" role="button" aria-expanded="false" aria-controls="${div_id}">
        <i class="fas fa-plus"></i>
        </a>
      </span>
    </div>

    <div class="collapse" id="${div_id}">
      <div class="layer_info">
        <div><span class="label">Original CRS:</span><span class="label_value">${
          f.geojson?.crs?.init
        }</span></div>
        <div><span class="label">Current CRS:</span><span class="label_value current">${
          f.geojson?.crs?.proj
        }</span></div>
      </div>
      <hr>
      <p class="export_projection">Export as: <span class='export_crs'>select an EPSG code to export</span></p>
      <hr>
      <div class="crs_options">
        <div class="dropdown float-start m-auto">
          <button class="dropbtn btn btn-secondary epsg_code_btn">Search</button>
          <div id="crsDropdown" class="dropdown-content">
            <div class="crs_list">
              ${list.join("")}
            </div>
            <input type="text" placeholder="Search.." id="myInput">
          </div>
        </div>
        <div class="crs_form_wrapper text-center">
          <form class="crs_presets m-auto">
          <label class="radio-inline">
            <input type="radio" name="optradio" value="EPSG:4326">
            4326
          </label>
          <label class="radio-inline">
            <input type="radio" name="optradio" value="EPSG:3857">
            3857
          </label>
          <label class="radio-inline">
            <input type="radio" name="optradio" value="urn:ogc:def:crs:EPSG::4326">
            urn:4326
          </label>
          <label class="radio-inline">
            <input type="radio" name="optradio" value="urn:ogc:def:crs:EPSG::3857">
            urn:3857
          </label>
          </form>
        </div>
      </div>

      <hr>
      <div class="export_buttons">
        <i class="fa-solid fa-download float-start"></i>
        <button class='btn btn-secondary download shp_download' id='${
          f.name
        }' value='shp' data-original='${f.original_path}' data-wgs84='${
    f.wgs84_path
  }'>SHP </button>
        <button class='btn btn-secondary download geojson_download' id='${
          f.name
        }' value='geojson' data-original='${f.original_path}' data-wgs84='${
    f.wgs84_path
  }'>GeoJSON </button>
        <button class='btn btn-secondary download kml_download' id='${
          f.name
        }' value='kml' data-original='${f.original_path}' data-wgs84='${
    f.wgs84_path
  }'>KML (4326) </button>
      </div>
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

function shortenFilename(filename, maxLength) {
  const extension = filename.slice(filename.lastIndexOf('.'));
  const ellipsis = '...';
  if (filename.length <= maxLength) {
    return filename;
  }
  const prefixLength = Math.ceil((maxLength - ellipsis.length - extension.length) / 2);
  const suffixLength = Math.floor((maxLength - ellipsis.length - extension.length) / 2);
  const prefix = filename.slice(0, prefixLength);
  const suffix = filename.slice(-suffixLength);
  return `${prefix}${ellipsis}${suffix}${extension}`;
}