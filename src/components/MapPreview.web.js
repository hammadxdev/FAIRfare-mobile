import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import colors, { radius, shadow, spacing } from "../constants/colors";
import { DEFAULT_REGION, getRegionForPoints } from "../utils/mapRegion";
import { getLocationDisplayText } from "../utils/locationDisplay";
import { isValidLocation } from "../utils/routeGeometry.cjs";

const TILE_SIZE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 19;
const SELECTING_MODES = ["pickup", "destination"];

function clampLatitude(value) { return Math.max(-85.0511, Math.min(85.0511, value)); }
function worldSize(zoom) { return TILE_SIZE * 2 ** zoom; }
function project(latitude, longitude, zoom) {
  const size = worldSize(zoom);
  const lat = clampLatitude(latitude) * Math.PI / 180;
  return { x: (longitude + 180) / 360 * size, y: (0.5 - Math.log((1 + Math.sin(lat)) / (1 - Math.sin(lat))) / (4 * Math.PI)) * size };
}
function unproject(x, y, zoom) {
  const size = worldSize(zoom);
  const longitude = x / size * 360 - 180;
  const n = Math.PI - 2 * Math.PI * y / size;
  return { lat: 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))), lng: longitude };
}
function pointFor(location) {
  return isValidLocation(location) ? { lat: Number(location.lat ?? location.latitude), lng: Number(location.lng ?? location.longitude) } : null;
}
function pointFromCoordinate(point) {
  const latitude = Number(point?.latitude ?? point?.lat);
  const longitude = Number(point?.longitude ?? point?.lng);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { lat: latitude, lng: longitude } : null;
}
function zoomForBounds(minLat, maxLat, minLng, maxLng, width, height) {
  const latitudeDelta = Math.max((maxLat - minLat) * 1.35, 0.02);
  const longitudeDelta = Math.max((maxLng - minLng) * 1.35, 0.02);
  const zoomX = Math.log2((width || 640) * 360 / (TILE_SIZE * longitudeDelta));
  const zoomY = Math.log2((height || 640) * 170 / (TILE_SIZE * latitudeDelta));
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.floor(Math.min(zoomX, zoomY))));
}
function tileX(value, count) { return ((value % count) + count) % count; }
function eventPoint(event, target) {
  const native = event?.nativeEvent || event || {};
  const rect = target?.current?.getBoundingClientRect?.();
  const x = Number.isFinite(native.locationX) ? native.locationX : Number(native.clientX) - (rect?.left || 0);
  const y = Number.isFinite(native.locationY) ? native.locationY : Number(native.clientY) - (rect?.top || 0);
  return { x, y };
}

function RouteSegment({ from, to, color, dashed = false }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (!Number.isFinite(length) || length < 2) return null;
  return <View pointerEvents="none" style={[styles.routeSegment, { left: (from.x + to.x) / 2 - length / 2, top: (from.y + to.y) / 2 - 2, width: length, backgroundColor: color, transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }] }, dashed && styles.routeSegmentDashed]} />;
}

export default function MapPreview({ pickup, dropoff, routeCoordinates = [], previewCoordinates = [], routeInfo = null, selectingMode = "pickup", onSelectingModeChange, onMapPress, isRouteLoading = false, fullScreen = false, mapBottomOverlayRatio = 0.6 }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState({ latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude, zoom: 12 });
  const mapRef = useRef(null);
  const viewRef = useRef(view);
  const gestureRef = useRef(null);
  const pointerRef = useRef(new Map());
  const fitKeyRef = useRef(null);
  viewRef.current = view;

  const region = useMemo(() => getRegionForPoints(pickup, dropoff), [pickup, dropoff]);
  const validPickup = useMemo(() => pointFor(pickup), [pickup]);
  const validDropoff = useMemo(() => pointFor(dropoff), [dropoff]);
  const routePoints = useMemo(() => routeCoordinates.map(pointFromCoordinate).filter(Boolean), [routeCoordinates]);
  const previewPoints = useMemo(() => previewCoordinates.map(pointFromCoordinate).filter(Boolean), [previewCoordinates]);
  const hasRoute = Boolean(routeInfo?.geometryAvailable && routePoints.length > 1);
  const hasPreview = !hasRoute && previewPoints.length > 1;
  const routeSignature = hasRoute
    ? `${routePoints.length}:${routePoints[0].lat},${routePoints[0].lng}:${routePoints[Math.floor(routePoints.length / 2)].lat},${routePoints[Math.floor(routePoints.length / 2)].lng}:${routePoints[routePoints.length - 1].lat},${routePoints[routePoints.length - 1].lng}`
    : `${validPickup?.lat || ""},${validPickup?.lng || ""}:${validDropoff?.lat || ""},${validDropoff?.lng || ""}`;

  useEffect(() => {
    if (!size.width || !size.height) return;
    const points = (hasRoute ? [validPickup, validDropoff, ...routePoints] : hasPreview ? previewPoints : [validPickup, validDropoff]).filter(Boolean);
    if (!points.length) {
      setView({ latitude: region.latitude, longitude: region.longitude, zoom: 12 });
      return;
    }
    const minLat = Math.min(...points.map((point) => point.lat));
    const maxLat = Math.max(...points.map((point) => point.lat));
    const minLng = Math.min(...points.map((point) => point.lng));
    const maxLng = Math.max(...points.map((point) => point.lng));
    const availableHeight = Math.max(220, size.height * (1 - Math.max(0, Math.min(0.82, mapBottomOverlayRatio))) - 112);
    const zoom = zoomForBounds(minLat, maxLat, minLng, maxLng, size.width - 48, availableHeight);
    const boundsCenter = project((minLat + maxLat) / 2, (minLng + maxLng) / 2, zoom);
    const desiredScreenY = 112 + availableHeight / 2;
    const nextCenter = unproject(boundsCenter.x, boundsCenter.y + size.height / 2 - desiredScreenY, zoom);
    const nextView = { latitude: nextCenter.lat, longitude: nextCenter.lng, zoom };
    const fitKey = `${routeSignature}|${size.width}x${size.height}|${mapBottomOverlayRatio}`;
    if (fitKeyRef.current === fitKey) return;
    fitKeyRef.current = fitKey;
    setView(nextView);
  }, [hasRoute, hasPreview, routeSignature, region, size.width, size.height, mapBottomOverlayRatio, validPickup?.lat, validPickup?.lng, validDropoff?.lat, validDropoff?.lng, routePoints, previewPoints]);

  const centerWorld = project(view.latitude, view.longitude, view.zoom);
  const toScreen = (point) => {
    const world = project(point.lat, point.lng, view.zoom);
    const mapSize = worldSize(view.zoom);
    let x = world.x - centerWorld.x;
    if (x > mapSize / 2) x -= mapSize;
    if (x < -mapSize / 2) x += mapSize;
    return { x: x + size.width / 2, y: world.y - centerWorld.y + size.height / 2 };
  };
  const screenToCoordinate = (x, y, currentView = viewRef.current) => {
    const currentCenter = project(currentView.latitude, currentView.longitude, currentView.zoom);
    return unproject(currentCenter.x + x - size.width / 2, currentCenter.y + y - size.height / 2, currentView.zoom);
  };
  const tileCount = 2 ** view.zoom;
  const centerTileX = Math.floor(centerWorld.x / TILE_SIZE);
  const centerTileY = Math.floor(centerWorld.y / TILE_SIZE);
  const tiles = [];
  for (let x = centerTileX - 2; x <= centerTileX + 2; x += 1) {
    for (let y = centerTileY - 2; y <= centerTileY + 2; y += 1) {
      if (y >= 0 && y < tileCount) tiles.push({ x, y, wrappedX: tileX(x, tileCount) });
    }
  }

  function zoomBy(delta) {
    setView((current) => ({ ...current, zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.zoom + delta)) }));
  }
  function handlePointerDown(event) {
    const id = event?.nativeEvent?.pointerId ?? "mouse";
    const point = eventPoint(event, mapRef);
    pointerRef.current.set(id, point);
    if (pointerRef.current.size === 1) gestureRef.current = { start: point, moved: false, startView: viewRef.current };
    if (pointerRef.current.size === 2) {
      const points = [...pointerRef.current.values()];
      gestureRef.current = { ...gestureRef.current, moved: true, pinchDistance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y), pinchZoom: viewRef.current.zoom };
    }
    event.currentTarget?.setPointerCapture?.(id);
  }
  function handlePointerMove(event) {
    const id = event?.nativeEvent?.pointerId ?? "mouse";
    if (!pointerRef.current.has(id) || !gestureRef.current) return;
    const point = eventPoint(event, mapRef);
    pointerRef.current.set(id, point);
    const points = [...pointerRef.current.values()];
    if (points.length >= 2 && gestureRef.current.pinchDistance) {
      const distance = Math.max(1, Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y));
      const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, gestureRef.current.pinchZoom + Math.round(Math.log2(distance / gestureRef.current.pinchDistance))));
      setView((current) => ({ ...current, zoom: nextZoom }));
      return;
    }
    const dx = point.x - gestureRef.current.start.x;
    const dy = point.y - gestureRef.current.start.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) gestureRef.current.moved = true;
    const startWorld = project(gestureRef.current.startView.latitude, gestureRef.current.startView.longitude, gestureRef.current.startView.zoom);
    const nextCenter = unproject(startWorld.x - dx, startWorld.y - dy, gestureRef.current.startView.zoom);
    setView((current) => ({ ...current, latitude: nextCenter.lat, longitude: nextCenter.lng }));
  }
  function handlePointerUp(event) {
    const id = event?.nativeEvent?.pointerId ?? "mouse";
    const point = eventPoint(event, mapRef);
    const gesture = gestureRef.current;
    pointerRef.current.delete(id);
    if (pointerRef.current.size === 0) {
      gestureRef.current = null;
      if (gesture && !gesture.moved && onMapPress && size.width && size.height) onMapPress(screenToCoordinate(point.x, point.y));
    }
  }
  function handleWheel(event) {
    event.preventDefault?.();
    zoomBy(event?.nativeEvent?.deltaY < 0 || event?.deltaY < 0 ? 1 : -1);
  }

  const routeScreenPoints = routePoints.map(toScreen);
  const marker = (point, location, color, label, nativeID) => {
    if (!point) return null;
    const screen = toScreen(point);
    return <View nativeID={nativeID} pointerEvents="none" style={[styles.marker, { left: screen.x - 13, top: screen.y - 28 }]}><View style={[styles.markerDot, { backgroundColor: color }]} /><Text style={styles.markerLabel} numberOfLines={1}>{label || getLocationDisplayText(location)}</Text></View>;
  };

  return <View nativeID="home-map-wrapper" style={[styles.wrapper, fullScreen && styles.fullScreenWrapper]} onLayout={(event) => setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}>
    <View nativeID="home-map-surface" ref={mapRef} style={styles.mapSurface} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onWheel={handleWheel}>
      {tiles.map((tile) => <Image key={`${tile.x}:${tile.y}`} source={{ uri: `https://tile.openstreetmap.org/${view.zoom}/${tile.wrappedX}/${tile.y}.png` }} style={[styles.tile, { left: tile.x * TILE_SIZE - centerWorld.x + size.width / 2, top: tile.y * TILE_SIZE - centerWorld.y + size.height / 2 }]} />)}
      {hasRoute && routeScreenPoints.slice(1).map((point, index) => <RouteSegment key={`route-${index}`} from={routeScreenPoints[index]} to={point} color={colors.accent} />)}
      {marker(validPickup, pickup, colors.accent, "Pickup", "home-pickup-marker")}
      {marker(validDropoff, dropoff, colors.navy, "Drop-off", "home-dropoff-marker")}
    </View>
    <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
      <View style={styles.mapTopControls} pointerEvents="box-none">
        {onSelectingModeChange && <View style={styles.modeToggle}>{SELECTING_MODES.map((mode) => <TouchableOpacity key={mode} style={[styles.modeButton, selectingMode === mode && styles.modeButtonActive]} onPress={() => onSelectingModeChange(mode)}><Text style={[styles.modeButtonText, selectingMode === mode && styles.modeButtonTextActive]}>{mode === "pickup" ? "Pickup" : "Destination"}</Text></TouchableOpacity>)}</View>}
        <View style={styles.zoomControls}><TouchableOpacity onPress={() => zoomBy(1)} style={styles.zoomButton}><Text style={styles.zoomText}>+</Text></TouchableOpacity><TouchableOpacity onPress={() => zoomBy(-1)} style={styles.zoomButton}><Text style={styles.zoomText}>−</Text></TouchableOpacity></View>
      </View>
      {!validPickup && !validDropoff && <View style={styles.emptyStatePill}><Text style={styles.emptyStateText}>Tap the map or search above to set pickup and destination</Text></View>}
      {isRouteLoading && <View style={styles.statusPill}><ActivityIndicator size="small" color={colors.white} /><Text style={styles.statusText}>Calculating road route…</Text></View>}
      {!isRouteLoading && routeInfo?.geometryAvailable && <View style={[styles.statusPill, styles.routePill]}><Text style={styles.statusText}>{routeInfo.distanceKm} km • {routeInfo.durationMin} min</Text></View>}
      {!isRouteLoading && validPickup && validDropoff && !routeInfo?.geometryAvailable && <View style={styles.statusPill}><Text style={styles.statusText}>Road route unavailable</Text></View>}
      <Text style={styles.attribution}>© OpenStreetMap contributors</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { height: 300, marginTop: spacing.lg, marginHorizontal: spacing.lg, borderRadius: radius.lg, overflow: "hidden", backgroundColor: "#E8F0E8", position: "relative" },
  // The shared wrapper keeps a 300px preview height. Explicitly reset it for
  // the absolute full-screen variant; otherwise CSS keeps height: 300px and
  // the bottom edge cannot stretch the map behind the booking sheet.
  fullScreenWrapper: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "100%", height: "auto", minHeight: 0, marginTop: 0, marginHorizontal: 0, borderRadius: 0 },
  mapSurface: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "100%", minHeight: 0, overflow: "hidden", backgroundColor: "#E8F0E8", touchAction: "none", userSelect: "none", cursor: "grab" },
  tile: { position: "absolute", width: TILE_SIZE, height: TILE_SIZE, pointerEvents: "none" },
  routeSegment: { position: "absolute", height: 5, borderRadius: 5, transformOrigin: "center", pointerEvents: "none" },
  routeSegmentDashed: { opacity: 0.7 },
  marker: { position: "absolute", width: 120, alignItems: "center", zIndex: 20 },
  markerDot: { width: 25, height: 25, borderRadius: 14, borderWidth: 4, borderColor: colors.white, ...shadow },
  markerLabel: { marginTop: 4, maxWidth: 112, paddingHorizontal: 5, paddingVertical: 3, borderRadius: radius.full, backgroundColor: "rgba(255,255,255,.92)", color: colors.primary, fontSize: 11, fontWeight: "800", textAlign: "center" },
  mapTopControls: { position: "absolute", top: 96, left: spacing.md, right: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  modeToggle: { flexDirection: "row", backgroundColor: "rgba(15,23,42,.88)", borderRadius: radius.full, padding: 4 },
  modeButton: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.full },
  modeButtonActive: { backgroundColor: colors.accent },
  modeButtonText: { color: "#E2E8F0", fontSize: 12, fontWeight: "800" },
  modeButtonTextActive: { color: colors.white },
  zoomControls: { backgroundColor: colors.card, borderRadius: radius.md, overflow: "hidden", ...shadow },
  zoomButton: { width: 38, height: 36, alignItems: "center", justifyContent: "center", borderBottomWidth: 1, borderBottomColor: colors.border },
  zoomText: { color: colors.primary, fontSize: 22, lineHeight: 24, fontWeight: "600" },
  emptyStatePill: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: 110, alignItems: "center", backgroundColor: "rgba(15,23,42,.86)", borderRadius: radius.md, padding: spacing.sm },
  emptyStateText: { color: colors.white, fontSize: 12, fontWeight: "700", textAlign: "center" },
  statusPill: { position: "absolute", bottom: spacing.lg, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: "rgba(15,23,42,.9)", borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  routePill: { backgroundColor: colors.accent },
  statusText: { color: colors.white, fontSize: 12, fontWeight: "800" },
  attribution: { position: "absolute", right: 4, bottom: 2, backgroundColor: "rgba(255,255,255,.82)", color: "#334155", fontSize: 9, paddingHorizontal: 3, paddingVertical: 1 },
});
