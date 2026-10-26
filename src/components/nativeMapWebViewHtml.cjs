const MAP_PROTOCOL_VERSION = 1;
const LEAFLET_VERSION = "1.9.4";
const MAP_TILE_URL = "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png";
const MAP_ATTRIBUTION = "© OpenStreetMap contributors © CARTO";
const DEFAULT_MAP_REGION = Object.freeze({
  latitude: 32.4945,
  longitude: 74.5229,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
});
const DEFAULT_MAP_ZOOM = Math.max(1, Math.min(19, Math.floor(Math.log2(360 / DEFAULT_MAP_REGION.longitudeDelta))));

function buildCartoRasterTileUrl(apiKey) {
  const normalizedKey = String(apiKey || "").trim();
  return normalizedKey ? `${MAP_TILE_URL}?key=${encodeURIComponent(normalizedKey)}` : null;
}

function buildNativeMapHtml({ diagnosticStage = "F", tileUrl = MAP_TILE_URL, attribution = MAP_ATTRIBUTION } = {}) {
  const leafletCss = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
  const leafletJs = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;
  const leafletTags = diagnosticStage === "A"
    ? ""
    : `<link id="leaflet-css" rel="stylesheet" href="${leafletCss}" onload="window.__fareRideLeafletCss='loaded'" onerror="window.__fareRideLeafletCss='failed'" />`;
  return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
${leafletTags}
<style>
html,body,#map{width:100%;height:100%;margin:0;padding:0;background:#e8f0e8;overflow:hidden}
.leaflet-container{font-family:system-ui,-apple-system,sans-serif;background:#e8f0e8}
.leaflet-control-attribution{font-size:9px;background:rgba(255,255,255,.86)!important;color:#334155!important}
.leaflet-control-attribution a{color:#334155!important}
.fare-marker{display:flex;flex-direction:column;align-items:center;transform:translateY(-10px);white-space:nowrap}
.fare-marker-dot{width:22px;height:22px;border:4px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(15,23,42,.35)}
.fare-marker-label{margin-top:3px;padding:3px 6px;border-radius:999px;background:rgba(255,255,255,.94);color:#0f172a;font-size:11px;font-weight:800;box-shadow:0 1px 4px rgba(15,23,42,.18)}
.leaflet-marker-icon{background:transparent;border:0}
${diagnosticStage === "A" ? "html,body,#map{background:#ffeb3b!important}#map{box-sizing:border-box;border:6px solid #ff00ff}" : ""}
${diagnosticStage === "C" ? "#map{box-sizing:border-box;outline:4px solid #ff00ff;outline-offset:-4px}" : ""}
</style></head><body><div id="map" aria-label="FareRide map"></div>
${diagnosticStage === "A" ? "" : `<script id="leaflet-js" src="${leafletJs}" onload="window.__fareRideLeafletJs='loaded'" onerror="window.__fareRideLeafletJs='failed'"></script>`}
<script>
(function(){
  "use strict";
  var PROTOCOL=${MAP_PROTOCOL_VERSION};
  var STAGE=${JSON.stringify(diagnosticStage)};
  var TILE_URL=${JSON.stringify(tileUrl)};
  var ATTRIBUTION=${JSON.stringify(attribution)};
  var DEFAULT_VIEW=${JSON.stringify([DEFAULT_MAP_REGION.latitude, DEFAULT_MAP_REGION.longitude])};
  var DEFAULT_ZOOM=${DEFAULT_MAP_ZOOM};
  var map=null, pickupMarker=null, dropoffMarker=null, routeLine=null, previewLine=null;
  var diagnosticSent={};
  var lastFitKey=null, lastTripKey=null, manualCameraDirty=false, programmaticCameraChange=false;
  var pendingState=null, lastRevision=-1;
  var diagnostics={webViewLoaded:false,leafletJs:"pending",leafletCss:"pending",containerWidth:0,containerHeight:0,documentWidth:0,documentHeight:0,bodyWidth:0,bodyHeight:0,mapWidth:0,mapHeight:0,leafletWidth:0,leafletHeight:0,mapCenterValid:false,mapZoom:null,tilePaneLeft:0,tilePaneTop:0,tilePaneWidth:0,tilePaneHeight:0,firstTileLeft:0,firstTileTop:0,firstTileWidth:0,firstTileHeight:0,firstTileDisplay:"pending",firstTileVisibility:"pending",firstTileOpacity:"pending",mapInitialized:false,bridgeReady:false,tilesLoaded:0,tilesFailed:0,firstTileRendered:false,lastErrorCode:"none",stage:STAGE};
  function send(type,payload){
    if(window.ReactNativeWebView&&typeof window.ReactNativeWebView.postMessage==="function"){
      window.ReactNativeWebView.postMessage(JSON.stringify({v:PROTOCOL,type:type,payload:payload||{}}));
    }
  }
  function sendDiagnostic(stage,payload){
    if(diagnosticSent[stage])return;
    diagnosticSent[stage]=true;
    send("diagnostic",Object.assign({stage:stage},payload||{}));
  }
  function sendRuntime(payload){send("runtime",payload||{})}
  function sendSnapshot(){send("diagnosticSnapshot",Object.assign({},diagnostics));}
  function bounded(value,max){var number=Number(value);return Number.isFinite(number)?Math.max(0,Math.min(max||100000,Math.round(number))):0;}
  function rect(element){if(!element||typeof element.getBoundingClientRect!=="function")return {left:0,top:0,width:0,height:0};var value=element.getBoundingClientRect();return {left:bounded(value.left),top:bounded(value.top),width:bounded(value.width),height:bounded(value.height)};}
  function dimensions(){
    var element=document.getElementById("map");
    var value={width:bounded(element&&element.clientWidth),height:bounded(element&&element.clientHeight)};
    diagnostics.containerWidth=value.width;diagnostics.containerHeight=value.height;return value;
  }
  function measureSnapshot(){
    var element=document.getElementById("map"),doc=document.documentElement,body=document.body;
    var mapRect=rect(element),tilePane=element&&element.querySelector?element.querySelector(".leaflet-tile-pane"):null,firstTile=tilePane&&tilePane.querySelector?tilePane.querySelector("img.leaflet-tile"):null;
    var tileRect=rect(tilePane),firstRect=rect(firstTile),style=firstTile?window.getComputedStyle(firstTile):null,size=map&&typeof map.getSize==="function"?map.getSize():null,center=map&&typeof map.getCenter==="function"?map.getCenter():null,zoom=map&&typeof map.getZoom==="function"?map.getZoom():null;
    diagnostics.documentWidth=bounded(doc&&doc.clientWidth);diagnostics.documentHeight=bounded(doc&&doc.clientHeight);
    diagnostics.bodyWidth=bounded(body&&body.clientWidth);diagnostics.bodyHeight=bounded(body&&body.clientHeight);
    diagnostics.mapWidth=mapRect.width;diagnostics.mapHeight=mapRect.height;
    diagnostics.leafletWidth=bounded(size&&size.x);diagnostics.leafletHeight=bounded(size&&size.y);
    diagnostics.mapCenterValid=Boolean(center&&Number.isFinite(Number(center.lat))&&Number.isFinite(Number(center.lng)));
    diagnostics.mapZoom=Number.isFinite(Number(zoom))?Math.max(0,Math.min(22,Number(zoom))):null;
    diagnostics.tilePaneLeft=tileRect.left;diagnostics.tilePaneTop=tileRect.top;diagnostics.tilePaneWidth=tileRect.width;diagnostics.tilePaneHeight=tileRect.height;
    diagnostics.firstTileLeft=firstRect.left;diagnostics.firstTileTop=firstRect.top;diagnostics.firstTileWidth=firstRect.width;diagnostics.firstTileHeight=firstRect.height;
    diagnostics.firstTileDisplay=style?String(style.display):"none";diagnostics.firstTileVisibility=style?String(style.visibility):"hidden";diagnostics.firstTileOpacity=style?String(style.opacity):"0";
    sendSnapshot();
  }
  window.__fareRideMeasureNow=measureSnapshot;
  window.__fareRideInvalidateSize=function(){if(map&&typeof map.invalidateSize==="function")map.invalidateSize({pan:false,animate:false});measureSnapshot();};
  function fail(code){diagnostics.lastErrorCode=code;sendSnapshot();}
  window.addEventListener("error",function(){sendDiagnostic("javascript-error",{message:"runtime-error"});fail("javascript-error")});
  window.addEventListener("unhandledrejection",function(){sendDiagnostic("javascript-error",{message:"unhandled-rejection"});fail("unhandled-rejection")});
  function point(value){
    var lat=Number(value&&value.lat),lng=Number(value&&value.lng);
    return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180?[lat,lng]:null;
  }
  function points(values){return Array.isArray(values)?values.map(point).filter(Boolean):[];}
  function markerIcon(color,label){
    return L.divIcon({className:"",iconSize:[120,54],iconAnchor:[60,48],html:'<div class="fare-marker"><span class="fare-marker-dot" style="background:'+color+'"></span><span class="fare-marker-label">'+String(label).replace(/[&<>"']/g,function(c){return ({"&":"&amp;","<":"&lt;",">":"&gt;","\\\"":"&quot;","'":"&#39;"})[c]})+'</span></div>'});
  }
  function setMarker(current, value, color, label){
    if(current) map.removeLayer(current);
    var p=point(value); return p?L.marker(p,{icon:markerIcon(color,label),keyboard:false}).addTo(map):null;
  }
  function cameraBoundsValid(){
    if(!map||typeof map.getBounds!=="function")return false;
    var bounds=map.getBounds(),northWest=bounds&&bounds.getNorthWest?bounds.getNorthWest():null,southEast=bounds&&bounds.getSouthEast?bounds.getSouthEast():null;
    return Boolean(northWest&&southEast&&Number.isFinite(Number(northWest.lat))&&Number.isFinite(Number(northWest.lng))&&Number.isFinite(Number(southEast.lat))&&Number.isFinite(Number(southEast.lng)));
  }
  function sendMapRuntime(reason, fitPoints, includesDropoff){
    sendRuntime({
      event:"leaflet-state",
      pickupMarkerCount:pickupMarker?1:0,
      dropoffMarkerCount:dropoffMarker?1:0,
      routeLayerCount:routeLine?1:0,
      activeCameraFitReason:reason||"none",
      cameraBoundsValid:cameraBoundsValid(),
      currentZoom:map&&typeof map.getZoom==="function"?map.getZoom():null,
      cameraFitPointCount:Array.isArray(fitPoints)?fitPoints.length:0,
      cameraFitIncludesDropoff:Boolean(includesDropoff),
    });
  }
  function coordinateSignature(point){return point?String(point[0])+","+String(point[1]):"none";}
  function stateTripKey(state, route, preview, pickup, dropoff){
    var points=(state.routeAvailable&&route.length>1?route:preview).filter(Boolean);
    var middle=points.length?points[Math.floor(points.length/2)]:null;
    var end=points.length?points[points.length-1]:null;
    return [coordinateSignature(pickup),coordinateSignature(dropoff),points.length,coordinateSignature(middle),coordinateSignature(end),state.routeAvailable?"road":"preview"].join("|");
  }
  function fit(state, force, reason){
    var route=points(state.route), preview=points(state.preview), pickup=point(state.pickup),dropoff=point(state.dropoff);
    var fitPoints=(state.routeAvailable&&route.length>1)?[pickup,dropoff].concat(route).filter(Boolean):(preview.length>1?preview:[pickup,dropoff].filter(Boolean));
    if(!fitPoints.length){sendMapRuntime("none",[],false);return;}
    var tripKey=stateTripKey(state,route,preview,pickup,dropoff);
    var fitKey=tripKey+"|overlay:"+String(Math.round((Number(state.overlayRatio)||.6)*1000));
    if(!force&&manualCameraDirty&&lastTripKey===tripKey)return;
    if(!force&&lastFitKey===fitKey)return;
    lastTripKey=tripKey;
    lastFitKey=fitKey;
    manualCameraDirty=false;
    programmaticCameraChange=true;
    var includesDropoff=Boolean(dropoff&&fitPoints.some(function(item){return item[0]===dropoff[0]&&item[1]===dropoff[1]}));
    if(fitPoints.length===1){map.setView(fitPoints[0],14,{animate:true});sendMapRuntime(reason,fitPoints,includesDropoff);return;}
    var bounds=L.latLngBounds(fitPoints);
    var ratio=Math.max(0,Math.min(.82,Number(state.overlayRatio)||.6));
    var size=map.getSize();
    map.fitBounds(bounds,{paddingTopLeft:[24,112],paddingBottomRight:[24,Math.max(32,Math.round(size.y*ratio+24))],maxZoom:16,animate:true});
    sendMapRuntime(reason,fitPoints,includesDropoff);
  }
  function render(state, reason){
    if(!map||!state||STAGE<"D")return;
    var pickup=point(state.pickup),dropoff=point(state.dropoff),route=points(state.route),preview=points(state.preview);
    pickupMarker=setMarker(pickupMarker,state.pickup,"#16a34a","Pickup");
    dropoffMarker=setMarker(dropoffMarker,state.dropoff,"#0f172a","Drop-off");
    if(pickupMarker||dropoffMarker)sendDiagnostic("markers-created",{});
    if(routeLine){map.removeLayer(routeLine);routeLine=null}
    if(previewLine){map.removeLayer(previewLine);previewLine=null}
    if(STAGE>="E"&&(state.routeAvailable&&route.length>1)){routeLine=L.polyline(route,{color:"#16a34a",weight:5,opacity:.95,lineJoin:"round"}).addTo(map);sendDiagnostic("route-layer-created",{});}
    else if(STAGE>="E"&&preview.length>1) previewLine=L.polyline(preview,{color:"#64748b",weight:4,opacity:.7,dashArray:"8 8",lineJoin:"round"}).addTo(map);
    fit(state,false,reason||"state");
  }
  function validMessage(message){
    if(!message||message.v!==PROTOCOL||message.type!=="state"||!message.payload||!Number.isInteger(message.payload.revision))return false;
    return message.payload.revision>=lastRevision;
  }
  function receive(event){
    var message;try{message=JSON.parse(String(event&&event.data||""))}catch(_){return}
    if(message&&message.v===PROTOCOL&&message.type==="recenter"){
      manualCameraDirty=false;lastFitKey=null;if(pendingState&&map)render(pendingState,"recenter");return;
    }
    if(message&&message.v===PROTOCOL&&message.type==="state"&&message.payload&&Number.isInteger(message.payload.revision)&&message.payload.revision<lastRevision){
      sendRuntime({event:"dropped-stale-state",incomingRevision:message.payload.revision,acceptedRevision:lastRevision});
      return;
    }
    if(!validMessage(message))return;
    lastRevision=message.payload.revision;pendingState=message.payload;
    sendRuntime({event:"accepted-state",acceptedRevision:lastRevision,pickupValid:Boolean(point(pendingState.pickup)),dropoffValid:Boolean(point(pendingState.dropoff)),markerPayloadValid:Boolean(point(pendingState.pickup)||point(pendingState.dropoff))});
    if(map)render(pendingState,"state");
  }
  function init(){
    sendDiagnostic("document-loaded",dimensions());
    diagnostics.webViewLoaded=true;
    if(STAGE==="A"){var label=document.createElement("div");label.textContent="FareRide WebView Stage A";label.style.cssText="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#000;font:900 28px system-ui";document.getElementById("map").appendChild(label);measureSnapshot();send("ready",{protocol:PROTOCOL,diagnostics:true,stage:STAGE});diagnostics.bridgeReady=true;sendSnapshot();return;}
    diagnostics.leafletJs=window.__fareRideLeafletJs==="loaded"||!!window.L?"loaded":"failed";
    diagnostics.leafletCss=window.__fareRideLeafletCss==="loaded"?"loaded":"failed";
    sendDiagnostic("leaflet-javascript",{status:diagnostics.leafletJs});
    sendDiagnostic("leaflet-css",{status:diagnostics.leafletCss});
    if(diagnostics.leafletJs==="failed"){sendDiagnostic("leaflet-unavailable",{});fail("leaflet-js-failed");return;}
    map=L.map("map",{zoomControl:true,attributionControl:true,preferCanvas:true,fadeAnimation:false,zoomAnimation:true}).setView(DEFAULT_VIEW,DEFAULT_ZOOM);
    diagnostics.mapInitialized=true;sendDiagnostic("map-initialized",dimensions());measureSnapshot();
    if(STAGE>="C"){
      if(!TILE_URL){sendDiagnostic("map-config-missing",{code:"carto-api-key-missing"});fail("carto-api-key-missing");}
      else {var tiles=L.tileLayer(TILE_URL,{maxZoom:19,attribution:ATTRIBUTION,detectRetina:true});
      tiles.on("tileloadstart",function(){sendDiagnostic("tile-request-started",{})});
      tiles.on("tileload",function(){diagnostics.tilesLoaded+=1;diagnostics.firstTileRendered=true;sendDiagnostic("first-tile-loaded",{});measureSnapshot()});
      tiles.on("tileerror",function(){diagnostics.tilesFailed+=1;sendDiagnostic("tile-load-failed",{});fail("tile-load-failed")});
      tiles.addTo(map);
      }
    }
    map.on("click",function(event){send("mapTap",{lat:event.latlng.lat,lng:event.latlng.lng})});
    map.on("dragstart zoomstart",function(){if(!programmaticCameraChange)manualCameraDirty=true});
    map.on("moveend zoomend",function(){programmaticCameraChange=false});
    send("ready",{protocol:PROTOCOL,diagnostics:true});
    diagnostics.bridgeReady=true;sendDiagnostic("bridge-ready",{});sendSnapshot();
    setTimeout(measureSnapshot,250);
    if(pendingState)render(pendingState,"state");
  }
  window.addEventListener("message",function(event){
    var message;try{message=JSON.parse(String(event&&event.data||""))}catch(_){return}
    if(message&&message.v===PROTOCOL&&(message.type==="state"||message.type==="recenter")){receive(event);return;}
  });document.addEventListener("message",function(event){
    var message;try{message=JSON.parse(String(event&&event.data||""))}catch(_){return}
    if(message&&message.v===PROTOCOL&&(message.type==="state"||message.type==="recenter"))receive(event);
  });
  document.addEventListener("DOMContentLoaded",init);
}());
</script></body></html>`;
}

module.exports = {
  MAP_PROTOCOL_VERSION,
  LEAFLET_VERSION,
  MAP_TILE_URL,
  MAP_ATTRIBUTION,
  buildCartoRasterTileUrl,
  DEFAULT_MAP_REGION,
  DEFAULT_MAP_ZOOM,
  buildNativeMapHtml,
};
