const app = (function () {
  const XML_MIMETYPE = "text/xml";
  const ARC_SECONDS = 3600;
  const ROME_LAT_LNG = [41.902782, 12.496366];
  const CONTINENT_ZOOM = 3;
  const COLOR_RED = "#FF0000";
  const ROUTE_TYPE_ALT = "ALT";
  const ROUTE_TYPE_MAIN = "MAIN";

  class Route {
    constructor(index, coordinates, color) {
      this.index = index;
      this.coordinates = coordinates;
      this.color = color;
    }
  }

  let _routes = [];
  let _routeLines = [];
  let _map;

  function _clearData() {
    _routes = [];
    for (routeLine of _routeLines) {
      routeLine.remove();
    }
    _routeLines = [];
    $("#route_controls").empty();
  }

  function _generateColor(routeType = ROUTE_TYPE_ALT) {
    if (routeType === ROUTE_TYPE_MAIN) {
      return COLOR_RED;
    }

    return "#" + Math.floor(Math.random() * 16777215).toString(16);
  }

  function _createRouteControls() {
    for (let route of _routes) {
      $("#route_controls").append(
        `<label class="checkbox-inline" style="color:${
          route.color
        }"><input type="checkbox" ${route.index ? "" : "checked"} id="route_${
          route.index
        }" value="${route.index}">${
          route.index ? "Alt_" + route.index : "Main"
        }</label>`
      );
    }
    $("#route_controls").append(
      '<button id="clear_routes" type="button">Clear</button>'
    );
  }

  function _drawRoute(routeIndex = 0) {
    if (!_map) {
      console.log("Map is not initialized yet!");
      return;
    }

    let routeLine = _routeLines[routeIndex];
    if (!routeLine) {
      const route = _routes[routeIndex];
      routeLine = L.polyline(route.coordinates, {
        color: route.color,
      });
      _routeLines[routeIndex] = routeLine;
    }

    routeLine.addTo(_map);
    _map.fitBounds(routeLine.getBounds());
  }

  function _extractRoutes(fileInput) {
    const xmlParser = new DOMParser();

    const doc = xmlParser.parseFromString(fileInput, XML_MIMETYPE);
    const routeWaypoints = doc.getElementsByTagName("Waypoints");
    const routes = [];
    for (let i = 0; i < routeWaypoints.length; i++) {
      const coordinates = [];
      for (let j = 0; j < routeWaypoints[i].childNodes.length; j++) {
        if (1 == routeWaypoints[i].childNodes[j].nodeType) {
          let waypoint = routeWaypoints[i].childNodes[j];
          let coordinatesElem = waypoint.firstElementChild;
          let longitude =
            coordinatesElem.getAttribute("longitude") / ARC_SECONDS;
          let latitude = coordinatesElem.getAttribute("latitude") / ARC_SECONDS;
          coordinates.push([latitude, longitude]);
        }
      }
      const routeColor = _generateColor(
        i === 0 ? ROUTE_TYPE_MAIN : ROUTE_TYPE_ALT
      );
      routes.push(new Route(i, coordinates, routeColor));
    }

    return routes;
  }

  function _onFileLoadSuccess(event) {
    _clearData();
    _routes = _extractRoutes(event.target.result);
    _drawRoute();
    _createRouteControls();
  }

  const initMap = (id = "map") => {
    _map = L.map(id).setView(ROME_LAT_LNG, CONTINENT_ZOOM);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(_map);
  };

  const handleProcessClick = (event) => {
    event.preventDefault();
    const uploadedFile = document.getElementById("flight_plan_input").files[0];
    if (!uploadedFile) {
      alert("Please upload flight plan first!");
      return;
    }
    if (uploadedFile.type !== XML_MIMETYPE) {
      alert("Please upload XML flight plan!");
      return;
    }
    const reader = new FileReader();
    reader.onload = _onFileLoadSuccess;
    reader.readAsText(uploadedFile);
  };

  const handleClearClick = (event) => {
    for (routeLine of _routeLines) {
      routeLine.remove();
    }

    $("[id^='route_']").each(function () {
      $(this).prop("checked", false);
    });
  };

  const handleCheckboxChange = (e) => {
    const routeIndex = $(e.target).val();
    if ($(e.target).is(":checked")) {
      _drawRoute(routeIndex);
    } else {
      _routeLines[routeIndex].remove();
    }
  };

  return {
    initMap,
    handleProcessClick,
    handleClearClick,
    handleCheckboxChange,
  };
})();

app.initMap();
$(document).on("click", "#process_plan", app.handleProcessClick);
$(document).on("click", "#clear_routes", app.handleClearClick);
$(document).on("change", ":checkbox", app.handleCheckboxChange);
