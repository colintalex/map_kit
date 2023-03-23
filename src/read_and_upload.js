
module.exports.detectAndUpload = function (f) {
  let file_extension = /\w+$/.exec(f.path)[0];
  // check_file extensions
  // [geojson, shp, kml] first. then=> gml(?), lidar(?)
  switch (file_extension) {
    case "geojson":
      Json(f.path);
      break;
    case "kml":
      KML(f.path);
      break;
    case "shp":
      Shp(f.path);
      break;
    case "txt":
      Txt(f.path);
      break;
  }
};

function Shp(path) {
  let data = {
    path: path,
    type: "shp",
  };
  ipcRenderer.send("save_inbound", data);
}

function Json(path) {
  let data = {
    path: path,
    type: "geojson",
  };

  // send to temp for conversion
  ipcRenderer.send("save_inbound", data);
}

function Kml(path) {
  let data = {
    path: path,
    type: "kml",
  };

  // send to temp for conversion
  ipcRenderer.send("save_inbound", data);
}

function Txt(path) {
  let data = {
    path: path,
    type: "txt",
  };
  ipcRenderer.send("save_inbound", data);
}