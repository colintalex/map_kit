const L = require("leaflet");
require('leaflet.markercluster');
let geojsonvt = require("geojson-vt");
require("leaflet-geojson-vt");
const fs = require("fs");
const Pick = require("stream-json/filters/Pick");
const { streamArray } = require("stream-json/streamers/StreamArray");
const { chain } = require("stream-chain");
const mapboxgl = require('mapbox-gl');


const path = require("path");
let layer_control;

module.exports.buildMap = function (div_id) {
  mapboxgl.accessToken =
    "pk.eyJ1IjoiY29saW50YWxleCIsImEiOiJjbGZydTY5NDYwYngwM3ptYmc5dmZ1ZGFuIn0.cXRnKZ76mMQg1vS_xHD-8w";
  const map = new mapboxgl.Map({
    container: div_id, // container ID
    projection: 'mercator',
    style: "mapbox://styles/mapbox/streets-v12", // style URL
    center: [-74.5, 40], // starting position [lng, lat]
    zoom: 9, // starting zoom
  });
  // let map = L.map(div_id).setView([38.505, -98.09], 4);
  // layerControl = L.control.layers().addTo(map);
  
  // L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  //   maxZoom: 19,
  //   minZoom: 3,
  //   attribution:
  //     '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  // }).addTo(map);

  return map;
}

async function loadJSON(url) {
  const res = await fetch(url);
  return await res.json();
}

module.exports.addJSONToMap = function(arg, map) {
  let file_path = arg.wgs84_path;
  let geojson = arg.geojson.data;
  let feature_count = geojson.features.length;

  if (feature_count > 1_000_000){
    func2(geojson, arg, map);
  }else{
    func1(geojson, arg, map);
  }
}

function func1(geojson, arg, map) {
  let short = geojson.features.slice(0, 30_000);
  geojson.features = short;
  
  var options = {
    maxZoom: 19,
    tolerance: 3,
    debug: 0,
    style: {
      fillColor: "#1EB300",
      color: "#F2FF00",
    },
  };
  // Add a data source containing GeoJSON data.
  map.addSource(arg.name, {
    type: "geojson",
    data: geojson
  });

  // Add a new layer to visualize the polygon.
  map.addLayer({
    id: arg.name,
    type: "fill",
    source: arg.name, // reference the data source
    layout: {},
    paint: {
      "fill-color": "#0080ff", // blue color fill
      "fill-opacity": 0.5,
    },
  });
  // Add a black outline around the polygon.
  map.addLayer({
    id: `${arg.name}_outline`,
    type: "line",
    source: arg.name,
    layout: {},
    paint: {
      "line-color": "#000",
      "line-width": 3,
    },
  });

  // let featuregroup = L.featureGroup().addTo(map);
  // L.geoJson.vt(geojson, options).addTo(featuregroup);
  // let bounds = L.geoJSON(geojson.features[0]).getBounds();
  // map.fitBounds(bounds).setZoom(12);
}

function func2(geojson, arg, map) {
  let layer = L.geoJSON(geojson, {
    onEachFeature: function (feature, layer) {
      let props = Object.entries(feature.properties);
      layer.bindPopup(
        `${props
          .map(function (x) {
            return `<h4>${x[0]}: ${x[1]}</h4>`;
          })
          .join("\n")}`
      );
    },
  }).addTo(map);
  map.fitBounds(layer.getBounds());

}