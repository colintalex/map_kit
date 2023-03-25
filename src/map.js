const L = require("leaflet");
const fs = require("fs");
let layer_control;

module.exports.buildMap = function (div_id) {
  let map = L.map(div_id).setView([38.505, -98.09], 4);
  layerControl = L.control.layers().addTo(map);
  
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    minZoom: 2,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  return map;
}

module.exports.addJSONToMap = function(path, map) {
  fs.readFile(path, "utf8", (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    let layername = path.replace(/^.*[\\\/]/, "");

    let json = JSON.parse(data);
    let layer = L.geoJSON(json, {
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
    layerControl.addOverlay(layer, layername);
    map.fitBounds(layer.getBounds());
  });
}