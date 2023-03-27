const L = require("leaflet");
require('leaflet.markercluster');
let geojsonvt = require("geojson-vt");
require("leaflet-geojson-vt");
const fs = require("fs");
const Pick = require("stream-json/filters/Pick");
const { streamArray } = require("stream-json/streamers/StreamArray");
const { chain } = require("stream-chain");


const path = require("path");
let layer_control;

module.exports.buildMap = function (div_id) {
  let map = L.map(div_id).setView([38.505, -98.09], 4);
  layerControl = L.control.layers().addTo(map);
  
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    minZoom: 3,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  return map;
}

async function loadJSON(url) {
  const res = await fetch(url);
  return await res.json();
}

module.exports.addJSONToMap = function(arg, map) {
  let file_path = arg.wgs84_path;
  let geojson = JSON.parse(arg.geojson.data);

  geojson.features = geojson.features.slice(0, 30_000);

  var options = {
    maxZoom: 19,
    tolerance: 3,
    debug: 0,
    style: {
      fillColor: "#1EB300",
      color: "#F2FF00",
    },
  };
  let featuregroup = L.featureGroup().addTo(map);
  var vtLayer = L.geoJson.vt(geojson, options).addTo(featuregroup);
  let bounds = L.geoJSON(geojson.features[0]).getBounds();
  map.fitBounds(bounds).setZoom(12);

  // pipeline.on("data", (data) => {
  //   debugger
  //   L.geoJSON(data.value, {
  //     onEachFeature: function (feature, layer) {
  //       let props = Object.entries(feature.properties);
  //       layer.bindPopup(
  //         `${props
  //           .map(function (x) {
  //             return `<h4>${x[0]}: ${x[1]}</h4>`;
  //           })
  //           .join("\n")}`
  //       );
  //     },
  //   }).addTo(layer_group);
  // });
  // fs.readFileSync(path, "utf8", (err, data) => {
  //   if (err) {
  //     console.error(err);
  //     return;
  //   }
    // layerControl.addOverlay(layer, layername);
  // });
}