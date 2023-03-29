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
    projection: "mercator",
    style: "mapbox://styles/mapbox/streets-v12", // style URL
    center: [-105.0423, 38.8409], // starting position [lng, lat]
    zoom: 11.5, // starting zoom
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

module.exports.addJSONToMap = function(arg, map) {
  let file_path = arg.wgs84_path;
  let geojson = arg.geojson.data;
  let feature_count = geojson.features.length;
  let short = geojson.features.slice(0, 30_000);
  geojson.features = short;
  let feature_type = geojson.features[0].geometry.type;

  const popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: true,
  });


  switch(feature_type){
    case 'Polygon':
      addPolygon(geojson, arg, map)
      break;
    case 'MultiPolygon':
      addPolygon(geojson, arg, map)
      break;
    case 'LineString':
      addPolygon(geojson, arg, map);
      break;
    case 'MultiLineString':
      addPolygon(geojson, arg, map);
      break;
    case 'Point':
      addPoint(geojson, arg, map)
      break;
  }
  // Add a data source containing GeoJSON data
  var bounds = new mapboxgl.LngLatBounds();
  geojson.features.forEach(function (feature) {
    switch(feature.geometry.type){
      case 'Polygon':
        bounds.extend(feature.geometry.coordinates[0])
        map.fitBounds(bounds, {padding: 100});
        break;
      case 'LineString':
          bounds.extend(feature.geometry.coordinates[0].slice(0,2));
          map.fitBounds(bounds, {padding: 100});
        break;
      case 'MultiLineString':
          bounds.extend(feature.geometry.coordinates[0].slice(0,2));
          map.fitBounds(bounds, {padding: 100});
        break;
      case 'Point':
        // map.setCenter(feature.geometry.coordinates);
        let coords = feature.geometry.coordinates;
        const lat = coords[1];
        const lng = coords[0];

        // Create a new LngLat object for the point
        const point = new mapboxgl.LngLat(lng, lat);

        // Define the buffer distance in meters
        const bufferDistance = 500;

        // Calculate the bounding box based on the point and buffer distance
        bounds.extend(
          point.toBounds(bufferDistance).getSouthWest(),
          point.toBounds(bufferDistance).getNorthEast()
        );
        // Set the map's bounds to the custom bounds
        map.fitBounds(bounds, {padding: 100});
      break;
    }

      map.on("click", function (e) {
        // use queryRenderedFeatures to get features at the clicked point
        var features = map.queryRenderedFeatures(e.point, {
          layers: [`${arg.name}`],
        });

        // if there are features at the clicked point, do something
        if (features.length) {
          // get the first feature
          var feature = features[0];

          // do something with the feature (e.g. show a popup)
            popup
              .setLngLat(e.lngLat)
              .setHTML(createListFromObject(feature.properties))
              .addTo(map);
        }
      });
  });

  // let featuregroup = L.featureGroup().addTo(map);
  // L.geoJson.vt(geojson, options).addTo(featuregroup);
  // let bounds = L.geoJSON(geojson.features[0]).getBounds();
  // map.fitBounds(bounds).setZoom(12);
}

function addPolygon(geojson, arg, map) {
  console.log(arg.name);
  map.addSource(arg.name, {
    type: "geojson",
    data: geojson,
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
}

function createListFromObject(obj) {
  let htmlString = "<ul>";
  for (const [key, value] of Object.entries(obj)) {
    htmlString += `<li>${key}: ${value}</li>`;
  }
  htmlString += "</ul>";
  return htmlString;
}
function addPoint(geojson, arg, map) {
  console.log(arg.name)
  map.addSource(arg.name, {
    type: "geojson",
    data: geojson,
  });

  // Add a new layer to visualize the polygon.
  map.addLayer({
    id: arg.name,
    type: "circle",
    source: arg.name, // reference the data source
    layout: {},
    paint: {
      "circle-color": "#ff0000", // set the circle color to red
      "circle-radius": 8, // set the circle radius to 8 pixels
    },
  });
  // Add a black outline around the polygon.
  // map.addLayer({
  //   id: `${arg.name}_outline`,
  //   type: "line",
  //   source: arg.name,
  //   layout: {},
  //   paint: {
  //     "line-color": "#000",
  //     "line-width": 3,
  //   },
  // });
}