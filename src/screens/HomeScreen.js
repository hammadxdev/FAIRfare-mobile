import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  TextInput,
  StyleSheet,
} from "react-native";
import AppHeader from "../components/AppHeader";
import LocationInput from "../components/LocationInput";
import SuggestionsOverlay from "../components/SuggestionsOverlay";
import MapPreview from "../components/MapPreview";
import VehicleSelector from "../components/VehicleSelector";
import PrimaryButton from "../components/PrimaryButton";
import LoadingOverlay from "../components/LoadingOverlay";
import ErrorState from "../components/ErrorState";
import mockLocations, { ENABLE_MOCK_LOCATION_FALLBACK } from "../constants/mockLocations";
import mockCompareFaresResponse, { ENABLE_MOCK_FALLBACK } from "../constants/mockProviders";
import { compareFares, createSavedRoute, getProviderStatus, getSavedRoutes } from "../services/api";
import { autocompletePlaces, getPlaceDetails, reverseGeocode, computeRoute } from "../services/maps.service";
import { getCurrentLocation } from "../services/location.service";
import { canCompareFares, isSameLocation } from "../utils/validators";
import { debounce } from "../utils/debounce";
import { createSessionToken } from "../utils/sessionToken";
import { getLocationDisplayText } from "../utils/locationDisplay";
import colors, { radius, shadow, spacing } from "../constants/colors";
import SavedRoutesSkeleton from "../components/skeleton/SavedRoutesSkeleton";

const MIN_AUTOCOMPLETE_LENGTH = 3;
const AUTOCOMPLETE_DEBOUNCE_MS = 350;
const MIN_COMPARE_LOADING_MS = 5000;
const MAX_COMPARE_LOADING_MS = 10000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A fresh random delay per Compare Fares tap — makes the loading overlay
// feel like real work is happening instead of an instant, identical blip.
const getRandomLoadingDelay = () =>
  Math.floor(Math.random() * (MAX_COMPARE_LOADING_MS - MIN_COMPARE_LOADING_MS + 1)) + MIN_COMPARE_LOADING_MS;

// Mock-only fallback path, used only if ENABLE_MOCK_LOCATION_FALLBACK is
// flipped on (e.g. offline demo) and the real backend call fails.
function filterMockLocations(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return mockLocations
    .filter((loc) => loc.name.toLowerCase().includes(q) || loc.address.toLowerCase().includes(q))
    .map((loc) => ({ id: loc.id, name: loc.name, address: loc.address, lat: loc.lat, lng: loc.lng }));
}

function toSuggestion(prediction) {
  return {
    id: prediction.placeId,
    placeId: prediction.placeId,
    name: prediction.mainText,
    address: prediction.secondaryText,
  };
}

// LocationInput always displays one canonical human-readable location label.
function displayNameFor(location) {
  return getLocationDisplayText(location);
}

function toCanonicalLocation(location) {
  if (!location) return null;
  const latitude = location.lat ?? location.latitude;
  const longitude = location.lng ?? location.longitude;
  return {
    name: location.name,
    address: location.address,
    lat: typeof latitude === "string" && latitude.trim() !== "" ? Number(latitude) : latitude,
    lng: typeof longitude === "string" && longitude.trim() !== "" ? Number(longitude) : longitude,
  };
}

export default function HomeScreen({ navigation, route }) {
  useEffect(() => {
    getProviderStatus().catch((err) => console.warn("[providers] status unavailable", err?.message || err));
  }, []);
  const [pickupQuery, setPickupQuery] = useState("");
  const [pickup, setPickup] = useState(null);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [pickupStatus, setPickupStatus] = useState(null);
  const [pickupStatusType, setPickupStatusType] = useState("empty");

  const [dropoffQuery, setDropoffQuery] = useState("");
  const [dropoff, setDropoff] = useState(null);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const [dropoffLoading, setDropoffLoading] = useState(false);
  const [dropoffStatus, setDropoffStatus] = useState(null);
  const [dropoffStatusType, setDropoffStatusType] = useState("empty");

  const [vehicleType, setVehicleType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const locatingRef = useRef(false);
  const deviceLocationRef = useRef(null);
  const pickupRef = useRef(null);
  const dropoffRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const [selectingMode, setSelectingMode] = useState("pickup");
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [savedRoutesLoading, setSavedRoutesLoading] = useState(true);
  const [savedRoutesError, setSavedRoutesError] = useState(null);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveLabelType, setSaveLabelType] = useState("FAVORITE");
  const [saveLoading, setSaveLoading] = useState(false);

  const labelOptions = [
    ["HOME", "Home"], ["WORK", "Work"], ["UNIVERSITY", "University"], ["FAVORITE", "Favorite"], ["CUSTOM", "Custom"],
  ];

  const loadSavedRoutes = useCallback(async () => {
    setSavedRoutesLoading(true);
    try { setSavedRoutes((await getSavedRoutes()).data || []); setSavedRoutesError(null); } catch (error) { console.warn("[saved-routes] unavailable", error?.message || error); setSavedRoutesError("Saved trips are unavailable."); } finally { setSavedRoutesLoading(false); }
  }, []);

  useEffect(() => { loadSavedRoutes(); }, [loadSavedRoutes]);

  useEffect(() => {
    const compareAgain = route?.params?.compareAgain;
    if (!compareAgain) return;
    const nextPickup = {
      name: compareAgain.pickup.label,
      address: compareAgain.pickup.label,
      lat: compareAgain.pickup.latitude,
      lng: compareAgain.pickup.longitude,
    };
    const nextDropoff = {
      name: compareAgain.dropoff.label,
      address: compareAgain.dropoff.label,
      lat: compareAgain.dropoff.latitude,
      lng: compareAgain.dropoff.longitude,
    };
    applyPickup(nextPickup);
    applyDropoff(nextDropoff);
    navigation.setParams({ compareAgain: undefined });
  }, [route?.params?.compareAgain]);

  useEffect(() => {
    const saved = route?.params?.savedRoute;
    if (!saved) return;
    applyPickup(toCanonicalLocation(saved.pickup));
    applyDropoff(toCanonicalLocation(saved.destination));
    navigation.setParams({ savedRoute: undefined });
  }, [route?.params?.savedRoute]);

  // One Google Places session token per search session (per field); reset to
  // null after a place is selected so the next search starts a fresh one.
  const pickupSessionTokenRef = useRef(null);
  const dropoffSessionTokenRef = useRef(null);

  // Centralized suggestions dropdown: only one of "pickup"/"dropoff"/null is
  // ever active, and its on-screen anchor position is measured on focus so
  // SuggestionsOverlay (a Modal) can render itself right below whichever
  // input is focused — see SuggestionsOverlay.js for why this needs to be a
  // single Modal-based overlay rather than one dropdown per input.
  const [activeField, setActiveField] = useState(null);
  const [anchorRect, setAnchorRect] = useState(null);
  const pickupInputRef = useRef(null);
  const dropoffInputRef = useRef(null);

  // Bumped on every keystroke that starts a new search and on every field
  // switch/clear, so a slow, now-superseded autocomplete response can never
  // overwrite newer results (or flip loading back off) after the fact.
  const pickupRequestIdRef = useRef(0);
  const dropoffRequestIdRef = useRef(0);

  function handleFocusField(field, ref) {
    const node = ref.current;
    if (node && typeof node.measureInWindow === "function") {
      node.measureInWindow((x, y, width, height) => {
        setAnchorRect({ x, y, width, height });
        setActiveField(field);
      });
    } else {
      setActiveField(field);
    }
  }

  // Deliberately no onBlur-triggered close: a Modal mounting on top of a
  // focused TextInput can itself trigger a spurious native blur, which used
  // to close the dropdown out from under an actively-typing user (the main
  // cause of the reported flicker). Every legitimate close case is already
  // covered without it: selecting a suggestion, tapping the overlay's own
  // backdrop, clearing the input below the minimum length, or focusing the
  // other field (which just reassigns activeField).

  function nextSessionToken(ref) {
    if (!ref.current) ref.current = createSessionToken();
    return ref.current;
  }

  // Pickup and drop-off both search the same way (backend autocomplete, mock
  // fallback, loading/status state) — build one debounced runner per field
  // from a shared factory instead of duplicating the search body twice.
  // Note: `loading` is turned on by the caller (see handlePickupChange/
  // handleDropoffChange) the instant the query crosses the minimum length,
  // not in here — waiting for the debounce to fire before showing any
  // feedback is exactly what produced the open/close flicker.
  function createSearchRunner({ field, sessionTokenRef, setSuggestions, setLoading, setStatus, setStatusType, requestIdRef }) {
    return debounce(async (query) => {
      const requestId = ++requestIdRef.current;
      try {
        const token = nextSessionToken(sessionTokenRef);
        const selectedLocation = field === "pickup" ? dropoffRef.current : pickupRef.current;
        const coordinates = deviceLocationRef.current || selectedLocation;
        const res = await autocompletePlaces(query.trim(), token, coordinates);
        if (requestIdRef.current !== requestId) return; // superseded by a newer request
        const results = (res.data || []).map(toSuggestion);
        setSuggestions(results);
        setStatusType("empty");
        setStatus(results.length === 0 ? "No locations found" : null);
      } catch (err) {
        if (requestIdRef.current !== requestId) return; // superseded by a newer request
        console.error(
          "[maps] autocomplete failed:",
          err?.response?.data?.message || err?.message || err
        );
        if (ENABLE_MOCK_LOCATION_FALLBACK) {
          const results = filterMockLocations(query);
          setSuggestions(results);
          setStatusType("empty");
          setStatus(results.length === 0 ? "No locations found" : null);
        } else {
          setSuggestions([]);
          setStatusType("error");
          setStatus("Unable to load suggestions. Check Google Places API setup.");
        }
      } finally {
        if (requestIdRef.current === requestId) setLoading(false);
      }
    }, AUTOCOMPLETE_DEBOUNCE_MS);
  }

  const runPickupSearch = useMemo(
    () =>
      createSearchRunner({
        field: "pickup",
        sessionTokenRef: pickupSessionTokenRef,
        setSuggestions: setPickupSuggestions,
        setLoading: setPickupLoading,
        setStatus: setPickupStatus,
        setStatusType: setPickupStatusType,
        requestIdRef: pickupRequestIdRef,
      }),
    []
  );

  const runDropoffSearch = useMemo(
    () =>
      createSearchRunner({
        field: "dropoff",
        sessionTokenRef: dropoffSessionTokenRef,
        setSuggestions: setDropoffSuggestions,
        setLoading: setDropoffLoading,
        setStatus: setDropoffStatus,
        setStatusType: setDropoffStatusType,
        requestIdRef: dropoffRequestIdRef,
      }),
    []
  );

  const handlePickupChange = (text) => {
    setPickupQuery(text);
    setErrorMessage(null);
    if (pickup && text !== displayNameFor(pickup)) setPickup(null);

    if (text.trim().length < MIN_AUTOCOMPLETE_LENGTH) {
      runPickupSearch.cancel();
      pickupRequestIdRef.current += 1; // invalidate any in-flight/pending request
      setPickupSuggestions([]);
      setPickupLoading(false);
      setPickupStatus(null);
      return;
    }
    // Turn loading on immediately (not inside the debounced callback) so the
    // dropdown opens right away and stays open/steady for the whole debounce
    // + network round trip, instead of flashing closed in between.
    setPickupLoading(true);
    runPickupSearch(text);
  };

  const handleDropoffChange = (text) => {
    setDropoffQuery(text);
    setErrorMessage(null);
    if (dropoff && text !== displayNameFor(dropoff)) setDropoff(null);

    if (text.trim().length < MIN_AUTOCOMPLETE_LENGTH) {
      runDropoffSearch.cancel();
      dropoffRequestIdRef.current += 1; // invalidate any in-flight/pending request
      setDropoffSuggestions([]);
      setDropoffLoading(false);
      setDropoffStatus(null);
      return;
    }
    setDropoffLoading(true);
    runDropoffSearch(text);
  };

  function applyPickup(location) {
    runPickupSearch.cancel();
    pickupRequestIdRef.current += 1; // a still-in-flight response must not overwrite this selection
    setPickup(location);
    pickupRef.current = location;
    setPickupQuery(displayNameFor(location));
    setPickupSuggestions([]);
    setPickupLoading(false);
    setPickupStatus(null);
    setErrorMessage(null);
    pickupSessionTokenRef.current = null;
  }

  function applyDropoff(location) {
    runDropoffSearch.cancel();
    dropoffRequestIdRef.current += 1; // a still-in-flight response must not overwrite this selection
    setDropoff(location);
    dropoffRef.current = location;
    setDropoffQuery(displayNameFor(location));
    setDropoffSuggestions([]);
    setDropoffLoading(false);
    setDropoffStatus(null);
    setErrorMessage(null);
    dropoffSessionTokenRef.current = null;
  }

  // Selecting a pickup/drop-off suggestion looks up place details with the
  // same session token used for autocomplete, then resets it. Shared here
  // since both fields do exactly this, just against different state.
  function createSelectHandler({ sessionTokenRef, apply }) {
    return async (item) => {
      if (!item.placeId) {
        // Mock-fallback item already has lat/lng, no place-details call needed.
        apply(item);
        return;
      }
      try {
        const token = sessionTokenRef.current || nextSessionToken(sessionTokenRef);
        const res = await getPlaceDetails(item.placeId, token);
        const place = res.data;
        apply({ name: place.name || item.name, address: place.address, lat: place.lat, lng: place.lng });
      } catch (err) {
        console.error("[maps] place-details failed:", err?.response?.data?.message || err?.message || err);
        sessionTokenRef.current = null;
        setErrorMessage("Unable to load location details. Please try again.");
      }
    };
  }

  const handleSelectPickup = createSelectHandler({ sessionTokenRef: pickupSessionTokenRef, apply: applyPickup });
  const handleSelectDropoff = createSelectHandler({ sessionTokenRef: dropoffSessionTokenRef, apply: applyDropoff });

  // Closes the overlay immediately (don't wait on the place-details lookup)
  // then routes the selection to whichever field was actually active.
  function handleOverlaySelect(item) {
    const field = activeField;
    setActiveField(null);
    if (field === "dropoff") {
      handleSelectDropoff(item);
    } else {
      handleSelectPickup(item);
    }
  }

  const activeQuery = activeField === "pickup" ? pickupQuery : activeField === "dropoff" ? dropoffQuery : "";
  const activeSuggestions =
    activeField === "pickup" ? pickupSuggestions : activeField === "dropoff" ? dropoffSuggestions : [];
  const activeLoading = activeField === "pickup" ? pickupLoading : activeField === "dropoff" ? dropoffLoading : false;
  const activeStatus = activeField === "pickup" ? pickupStatus : activeField === "dropoff" ? dropoffStatus : null;
  const activeStatusType =
    activeField === "pickup" ? pickupStatusType : activeField === "dropoff" ? dropoffStatusType : "empty";

  // Visibility depends ONLY on "is a field focused with enough text" — never
  // on loading/suggestions/status. Those only decide what's shown *inside*
  // the dropdown once it's open. Tying visibility to them was the root
  // cause of the flicker: there's a real gap between crossing the minimum
  // length and the debounced fetch actually settling, during which none of
  // loading/suggestions/status were true, so the dropdown flashed shut.
  const shouldShowSuggestions = Boolean(activeField) && activeQuery.trim().length >= MIN_AUTOCOMPLETE_LENGTH;

  const handleSelectVehicle = (type) => {
    setVehicleType(type);
    setErrorMessage(null);
  };

  const handleUseCurrentLocation = useCallback(async () => {
    if (locatingRef.current) return;
    locatingRef.current = true;
    setLocating(true);
    setErrorMessage(null);
    try {
      const location = await getCurrentLocation();
      deviceLocationRef.current = { lat: location.lat, lng: location.lng };
      try {
        const res = await reverseGeocode(location.lat, location.lng);
        if (!getLocationDisplayText(res.data)) throw new Error("The server returned no readable address.");
        applyPickup({
          name: res.data.name,
          address: res.data.address,
          formattedAddress: res.data.formattedAddress || res.data.formatted_address,
          lat: location.lat,
          lng: location.lng,
        });
      } catch (err) {
        // Don't block the user on a failed reverse geocode — fall back to a
        // clearly-labeled placeholder instead of a silent bare "Current Location".
        console.error("[maps] reverse-geocode failed for current location:", err?.response?.data?.message || err?.message || err);
        setErrorMessage("Unable to resolve your current location. Please try again.");
      }
    } catch (err) {
      const message = err.message || "Could not access your current location.";
      setErrorMessage(message);
      Alert.alert("Location Unavailable", message);
    } finally {
      locatingRef.current = false;
      setLocating(false);
    }
  }, []);

  // Tapping the map fills whichever field is active in the Pickup/Destination
  // toggle, using reverse geocoding to turn the tapped coordinate into a
  // readable address.
  const handleMapPress = useCallback(
    async ({ lat, lng }) => {
      setErrorMessage(null);
      try {
        const res = await reverseGeocode(lat, lng);
        const location = { name: res.data.name, address: res.data.address, lat, lng };
        if (selectingMode === "dropoff") {
          applyDropoff(location);
        } else {
          applyPickup(location);
        }
      } catch (err) {
        console.error("[maps] reverse-geocode failed for map tap:", err?.response?.data?.message || err?.message || err);
        setErrorMessage("Unable to load address for that location. Please try again.");
      }
    },
    [selectingMode]
  );

  const sameLocationError =
    pickup && dropoff && isSameLocation(pickup, dropoff)
      ? "Pickup and drop-off cannot be the same location"
      : null;

  const canCompare = canCompareFares({ pickup, dropoff, vehicleType });

  // Recompute the real route whenever pickup, dropoff, or vehicle type
  // changes — this is the only trigger, so switching vehicles recalculates
  // distance/duration/polyline for the new travel mode.
  useEffect(() => {
    let cancelled = false;

    async function loadRoute() {
      if (!pickup || !dropoff || !vehicleType || isSameLocation(pickup, dropoff)) {
        setRouteCoordinates([]);
        setRouteInfo(null);
        return;
      }

      setIsRouteLoading(true);
      try {
        const res = await computeRoute(
          { lat: pickup.lat, lng: pickup.lng },
          { lat: dropoff.lat, lng: dropoff.lng },
          vehicleType
        );
        if (cancelled) return;
        setRouteCoordinates(res.data.polylineCoordinates || []);
        setRouteInfo({ distanceKm: res.data.distanceKm, durationMin: res.data.durationMin });
      } catch (err) {
        if (cancelled) return;
        console.error("[maps] route computation failed:", err?.response?.data?.message || err?.message || err);
        setRouteCoordinates([]);
        setRouteInfo(null);
      } finally {
        if (!cancelled) setIsRouteLoading(false);
      }
    }

    loadRoute();
    return () => {
      cancelled = true;
    };
  }, [pickup, dropoff, vehicleType]);

  const showRouteFallbackNotice =
    Boolean(pickup && dropoff && !isSameLocation(pickup, dropoff)) && !isRouteLoading && !routeInfo;

  const handleCompare = async () => {
    // Guard against double-submit (rapid double-tap) in addition to the
    // button's own disabled-while-loading state.
    if (!canCompare || loading) return;

    setLoading(true);
    setErrorMessage(null);

    const payload = {
      pickup: { name: pickup.name, lat: pickup.lat, lng: pickup.lng },
      dropoff: { name: dropoff.name, lat: dropoff.lat, lng: dropoff.lng },
      vehicleType,
      ...(routeInfo ? { route: { distanceKm: routeInfo.distanceKm, durationMin: routeInfo.durationMin } } : {}),
    };

    try {
      // Every tap gets its own fresh random delay so the loading overlay
      // never feels instant or identically-timed twice in a row. Promise.all
      // rejects as soon as compareFares() fails, so a fast backend error
      // still surfaces immediately instead of waiting out the delay.
      const [response] = await Promise.all([compareFares(payload), delay(getRandomLoadingDelay())]);
      navigation.navigate("Results", { result: response.data });
    } catch (err) {
      console.error("compareFares failed:", err?.message || err);

      if (ENABLE_MOCK_FALLBACK) {
        navigation.navigate("Results", { result: { ...mockCompareFaresResponse, pickup: payload.pickup, dropoff: payload.dropoff, vehicleType } });
      } else {
        setErrorMessage(
          "Unable to compare fares.\nPlease make sure the backend is running and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const openSaveModal = () => {
    setSaveName(`${pickup.name} to ${dropoff.name}`.slice(0, 100));
    setSaveLabelType("FAVORITE");
    setSaveModalVisible(true);
  };

  const handleSaveRoute = async () => {
    if (!pickup?.lat || !pickup?.lng || !dropoff?.lat || !dropoff?.lng || !saveName.trim()) return;
    setSaveLoading(true);
    try {
      await createSavedRoute({ name: saveName.trim(), labelType: saveLabelType, pickup: { name: pickup.name, address: pickup.address, latitude: pickup.lat, longitude: pickup.lng }, destination: { name: dropoff.name, address: dropoff.address, latitude: dropoff.lat, longitude: dropoff.lng } });
      setSaveModalVisible(false); await loadSavedRoutes(); setErrorMessage("Route saved. You can compare this trip again from Saved Trips.");
    } catch (error) { if (error?.code !== "SESSION_EXPIRED") setErrorMessage(error?.response?.data?.message || "Unable to save route. Please try again."); }
    finally { setSaveLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <AppHeader />

        <View style={styles.section}>
          <Text style={styles.greeting}>Where do you want to go?</Text>

          <View style={styles.searchCard}>
            <LocationInput
              ref={pickupInputRef}
              label="Pickup"
              placeholder="Choose pickup location"
              value={pickupQuery}
              onChangeText={handlePickupChange}
              onFocus={() => handleFocusField("pickup", pickupInputRef)}
              loading={pickupLoading}
              dotColor={colors.accent}
            />

            <TouchableOpacity
              style={styles.currentLocationButton}
              activeOpacity={0.8}
              onPress={handleUseCurrentLocation}
              disabled={locating}
            >
              <Text style={styles.currentLocationText}>
                {locating ? "Locating..." : "📍 Use my current location"}
              </Text>
            </TouchableOpacity>

            <LocationInput
              ref={dropoffInputRef}
              label="Drop-off"
              placeholder="Where to?"
              value={dropoffQuery}
              onChangeText={handleDropoffChange}
              onFocus={() => handleFocusField("dropoff", dropoffInputRef)}
              loading={dropoffLoading}
              dotColor={colors.navy}
            />

            {sameLocationError && <Text style={styles.inlineError}>{sameLocationError}</Text>}
          </View>
        </View>

        <MapPreview
          pickup={pickup}
          dropoff={dropoff}
          routeCoordinates={routeCoordinates}
          routeInfo={routeInfo}
          selectingMode={selectingMode}
          onSelectingModeChange={setSelectingMode}
          onMapPress={handleMapPress}
          isRouteLoading={isRouteLoading}
        />

        <View style={styles.vehicleCard}>
          <VehicleSelector selectedVehicle={vehicleType} onSelectVehicle={handleSelectVehicle} />
        </View>

        <View style={styles.section}>
          {showRouteFallbackNotice && (
            <Text style={styles.routeNotice}>Route not loaded yet. Using approximate estimate.</Text>
          )}

          {errorMessage ? (
            <ErrorState message={errorMessage} onRetry={handleCompare} retryLabel="Try Again" />
          ) : null}

          <PrimaryButton
            title="Compare Fares"
            onPress={handleCompare}
            disabled={!canCompare}
            loading={loading}
            style={styles.compareButton}
          />
          {pickup && dropoff && pickup.lat != null && pickup.lng != null && dropoff.lat != null && dropoff.lng != null && !sameLocationError ? (
            <TouchableOpacity style={styles.saveRouteButton} onPress={openSaveModal}>
              <Text style={styles.saveRouteText}>☆ Save Route</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.savedSection}>
          <View style={styles.savedHeader}><Text style={styles.savedTitle}>Saved Trips</Text>{savedRoutes.length > 0 && <TouchableOpacity onPress={() => navigation.getParent()?.navigate("SavedRoutes")}><Text style={styles.viewAll}>See all</Text></TouchableOpacity>}</View>
          {savedRoutesLoading && !savedRoutes.length ? <SavedRoutesSkeleton count={1} /> : null}
          {!savedRoutesLoading && savedRoutesError ? <TouchableOpacity onPress={loadSavedRoutes}><Text style={styles.savedHint}>{savedRoutesError} Tap to retry.</Text></TouchableOpacity> : null}
          {savedRoutes.slice(0, 3).map((item) => <TouchableOpacity key={item.id} style={styles.savedRow} onPress={() => { applyPickup(toCanonicalLocation(item.pickup)); applyDropoff(toCanonicalLocation(item.destination)); }}><Text style={styles.savedRouteName}>{item.name}</Text><Text style={styles.savedRoutePath}>{getLocationDisplayText(item.pickup)} → {getLocationDisplayText(item.destination)}</Text></TouchableOpacity>)}
          {!savedRoutesLoading && !savedRoutesError && !savedRoutes.length ? <Text style={styles.savedHint}>Save routes you travel often for quicker fare comparisons.</Text> : null}
          <TouchableOpacity style={styles.savedLink} onPress={() => navigation.getParent()?.navigate("SavedRoutes")}><Text style={styles.savedLinkText}>{savedRoutes.length ? "Manage Saved Trips" : "View Saved Trips"}</Text></TouchableOpacity>
        </View>
      </ScrollView>

      <SuggestionsOverlay
        visible={shouldShowSuggestions}
        anchor={anchorRect}
        loading={activeLoading}
        suggestions={activeSuggestions}
        statusMessage={activeStatus}
        statusType={activeStatusType}
        onSelect={handleOverlaySelect}
        onClose={() => setActiveField(null)}
      />

      <LoadingOverlay visible={loading} />
      <Modal transparent animationType="slide" visible={saveModalVisible} onRequestClose={() => setSaveModalVisible(false)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalTitle}>Save Route</Text><Text style={styles.modalLabel}>Name</Text><TextInput value={saveName} onChangeText={setSaveName} maxLength={100} style={styles.modalInput} placeholder="Home to University" /><Text style={styles.modalLabel}>Label</Text><View style={styles.labelRow}>{labelOptions.map(([value, label]) => <TouchableOpacity key={value} onPress={() => setSaveLabelType(value)} style={[styles.labelChip, saveLabelType === value && styles.labelChipActive]}><Text style={[styles.labelChipText, saveLabelType === value && styles.labelChipTextActive]}>{label}</Text></TouchableOpacity>)}</View><PrimaryButton title="Save" onPress={handleSaveRoute} loading={saveLoading} disabled={!saveName.trim()} /><TouchableOpacity onPress={() => setSaveModalVisible(false)} style={styles.modalCancel}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity></View></View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xl * 2,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  greeting: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: spacing.md,
  },
  searchCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadow,
  },
  vehicleCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    ...shadow,
  },
  currentLocationButton: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginBottom: spacing.md,
  },
  currentLocationText: {
    color: "#15803D",
    fontWeight: "700",
    fontSize: 13,
  },
  inlineError: {
    color: colors.danger,
    fontSize: 12,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  routeNotice: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  compareButton: {
    marginTop: spacing.lg,
  },
  saveRouteButton: { alignItems: "center", paddingVertical: spacing.md },
  saveRouteText: { color: colors.navy, fontWeight: "800" },
  savedSection: { marginHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.xl },
  savedHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  savedTitle: { color: colors.primary, fontSize: 17, fontWeight: "800" },
  viewAll: { color: colors.navy, fontWeight: "800", fontSize: 12 },
  savedRow: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border },
  savedRouteName: { color: colors.primary, fontWeight: "800" },
  savedRoutePath: { color: colors.muted, fontSize: 12, marginTop: 4 },
  savedHint: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: spacing.sm },
  savedLink: { alignItems: "center", paddingVertical: spacing.md },
  savedLinkText: { color: colors.navy, fontWeight: "800" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,.45)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  modalTitle: { color: colors.primary, fontSize: 20, fontWeight: "800", marginBottom: spacing.lg },
  modalLabel: { color: colors.muted, fontSize: 12, fontWeight: "700", marginBottom: spacing.sm },
  modalInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, color: colors.primary, marginBottom: spacing.lg },
  labelRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.lg },
  labelChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  labelChipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  labelChipText: { color: colors.muted, fontWeight: "700", fontSize: 12 },
  labelChipTextActive: { color: colors.white },
  modalCancel: { alignItems: "center", padding: spacing.md },
  modalCancelText: { color: colors.muted, fontWeight: "700" },
});
