import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  PanResponder,
  StyleSheet,
} from "react-native";
import AppHeader from "../components/AppHeader";
import LocationInput from "../components/LocationInput";
import SuggestionsOverlay from "../components/SuggestionsOverlay";
import MapPreview from "../components/MapPreview";
import PickupMapAdjuster from "../components/PickupMapAdjuster";
import PrimaryButton from "../components/PrimaryButton";
import LoadingOverlay from "../components/LoadingOverlay";
import ErrorState from "../components/ErrorState";
import mockLocations, { ENABLE_MOCK_LOCATION_FALLBACK } from "../constants/mockLocations";
import { compareFares, createSavedRoute, getProviderStatus } from "../services/api";
import { fetchNearbyDrivers } from "../services/nearbyDrivers";
const { nearbyRequestStore } = require("../utils/comparisonResults.cjs");
import { autocompletePlaces, autocompleteDestination, getPlaceDetails, reverseGeocode, computeRoute } from "../services/maps.service";
import { getCurrentLocation } from "../services/location.service";
import { canCompareFares, hasValidCoordinates, isSameLocation } from "../utils/validators";
import { debounce } from "../utils/debounce";
import { createSessionToken } from "../utils/sessionToken";
import { getLocationDisplayText, getLocationSecondaryText } from "../utils/locationDisplay";
import colors, { radius, shadow, spacing } from "../constants/colors";
import { normalizeCompareAgainRoute } from "../utils/routePayload.cjs";
import { formatReverseGeocode, normalizeSearchText, rankLocationSuggestions, filterRelevantSuggestions } from "../utils/locationFormatting.cjs";
import { normalizeRouteCoordinates, extractRouteData, isValidLocation, routeGeometryDiagnostics } from "../utils/routeGeometry.cjs";
import { assessLocationFix } from "../utils/locationAccuracy.cjs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { collectWebLayoutDiagnostics } from "../utils/webLayoutDiagnostics.cjs";
import { isCanceledError } from "../services/apiErrors.cjs";
import * as SecureStore from "expo-secure-store";
import ConfirmBottomSheet from "../components/ConfirmBottomSheet";
import AppToast from "../components/AppToast";

const MIN_AUTOCOMPLETE_LENGTH = 3;
const AUTOCOMPLETE_DEBOUNCE_MS = 350;
const DEFAULT_PRICING_VEHICLE_TYPE = "car";
const IS_DEVELOPMENT = typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production";
const SEARCH_HISTORY_KEY = "fairfare.location-search-history.v1";
const MAX_SEARCH_HISTORY = 8;

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
    id: prediction.placeId || prediction.description || prediction.mainText,
    placeId: prediction.placeId,
    name: prediction.mainText || prediction.name || prediction.description,
    address: prediction.address || prediction.description || prediction.secondaryText,
    lat: prediction.lat,
    lng: prediction.lng,
    secondaryAddress: prediction.address || prediction.description || prediction.secondaryText,
    city: prediction.city || prediction.town || prediction.municipality || "",
    locality: prediction.locality || prediction.suburb || prediction.district || "",
    source: prediction.source || "geoapify",
  };
}

// LocationInput always displays one canonical human-readable location label.
function displayNameFor(location) {
  const primary = getLocationDisplayText(location);
  const secondary = location?.secondaryAddress || (location?.address && location.address !== primary ? location.address : "");
  return [primary, secondary].filter(Boolean).join(", ");
}

function inputNameFor(location) {
  return getLocationDisplayText(location);
}

function locationHistoryKey(location) {
  const lat = Number(location?.lat ?? location?.latitude);
  const lng = Number(location?.lng ?? location?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return `${lat.toFixed(6)}|${lng.toFixed(6)}`;
  return normalizeSearchText(`${location?.name || ""}|${location?.address || location?.description || ""}`);
}

function hasFullNameTokenMatch(item, query) {
  const queryTokens = normalizeSearchText(query).split(" ").filter(Boolean);
  const nameTokens = normalizeSearchText(item?.name).split(" ").filter(Boolean);
  return queryTokens.length > 0 && queryTokens.every((queryToken) => nameTokens.some((nameToken) => nameToken === queryToken || nameToken.startsWith(queryToken)));
}

export default function HomeScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [webKeyboardInset, setWebKeyboardInset] = useState(0);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const sheetBeforeKeyboardRef = useRef(false);
  const keyboardWasOpenRef = useRef(false);
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || !window.visualViewport) return undefined;
    const updateKeyboardInset = () => setWebKeyboardInset(Math.max(0, window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop));
    updateKeyboardInset();
    window.visualViewport.addEventListener("resize", updateKeyboardInset);
    window.visualViewport.addEventListener("scroll", updateKeyboardInset);
    return () => {
      window.visualViewport.removeEventListener("resize", updateKeyboardInset);
      window.visualViewport.removeEventListener("scroll", updateKeyboardInset);
    };
  }, []);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (webKeyboardInset > 0) keyboardWasOpenRef.current = true;
    else if (keyboardWasOpenRef.current) {
      setSheetExpanded(sheetBeforeKeyboardRef.current);
      keyboardWasOpenRef.current = false;
    }
  }, [webKeyboardInset]);
  useEffect(() => {
    if (Platform.OS !== "web" || !IS_DEVELOPMENT) return undefined;
    const timer = setTimeout(() => console.info("[layout] FairRide web dimensions", collectWebLayoutDiagnostics()), 0);
    return () => clearTimeout(timer);
  }, [webKeyboardInset, sheetExpanded]);
  const sheetHandleResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy < -18) setSheetExpanded(true);
      if (gesture.dy > 18) setSheetExpanded(false);
    },
  }), []);
  useEffect(() => {
    getProviderStatus().catch((err) => { if (IS_DEVELOPMENT) console.warn("[providers] status unavailable", err?.message || err); });
  }, []);
  const [pickupQuery, setPickupQuery] = useState("");
  const [pickup, setPickup] = useState(null);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [pickupStatus, setPickupStatus] = useState(null);
  const [pickupStatusType, setPickupStatusType] = useState("empty");
  const [pickupAccuracyNotice, setPickupAccuracyNotice] = useState(null);

  const [dropoffQuery, setDropoffQuery] = useState("");
  const [dropoff, setDropoff] = useState(null);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const [dropoffLoading, setDropoffLoading] = useState(false);
  const [dropoffStatus, setDropoffStatus] = useState(null);
  const [dropoffStatusType, setDropoffStatusType] = useState("empty");
  const [searchHistory, setSearchHistory] = useState([]);
  const [clearHistoryVisible, setClearHistoryVisible] = useState(false);
  const [historyToast, setHistoryToast] = useState(null);

  const vehicleType = DEFAULT_PRICING_VEHICLE_TYPE;
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const locatingRef = useRef(false);
  const deviceLocationRef = useRef(null);
  const pickupRef = useRef(null);
  const dropoffRef = useRef(null);
  const pickupManuallySelectedRef = useRef(false);
  const initialPickupLocationRequestedRef = useRef(false);
  const programmaticPickupQueryRef = useRef(null);
  const programmaticDropoffQueryRef = useRef(null);
  const routeCacheRef = useRef(new Map());
  const routeRequestIdRef = useRef(0);
  const compareRequestIdRef = useRef(0);
  const compareAbortRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [autoCompareRequested, setAutoCompareRequested] = useState(false);

  const [selectingMode, setSelectingMode] = useState("pickup");
  const [adjustMode, setAdjustMode] = useState("pickup");
  const [adjustPickupVisible, setAdjustPickupVisible] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [savedRouteKey, setSavedRouteKey] = useState(null);
  const [saveRouteError, setSaveRouteError] = useState(null);
  const [saveName, setSaveName] = useState("");
  const [saveNameVisible, setSaveNameVisible] = useState(false);
  const compareAgainHandledRef = useRef(null);
  const savedRouteHandledRef = useRef(null);
  const navigationRestoreSourceRef = useRef("none");
  const homeDiagnosticSequenceRef = useRef(0);

  function restoreRoute(normalized, source) {
    if (!normalized) return;
    navigationRestoreSourceRef.current = source === "saved-route" ? "savedRoute" : source === "compare-again" ? "compareAgain" : "none";
    pickupRef.current = null;
    dropoffRef.current = null;
    setPickup(null);
    setDropoff(null);
    setRouteCoordinates([]);
    setRouteInfo(null);
    applyPickup({ ...normalized.pickup, source });
    applyDropoff({ ...normalized.dropoff, source });
    if (source === "compare-again" || source === "saved-route") setAutoCompareRequested(true);
  }

  useEffect(() => {
    const compareAgain = route?.params?.compareAgain;
    if (!compareAgain) { compareAgainHandledRef.current = null; return; }
    if (compareAgainHandledRef.current === compareAgain) return;
    compareAgainHandledRef.current = compareAgain;
    const normalized = normalizeCompareAgainRoute(compareAgain);
    if (!normalized) {
      if (__DEV__) console.warn("[navigation] ignored malformed compareAgain route");
      navigation.setParams({ compareAgain: undefined });
      return;
    }
    restoreRoute(normalized, "compare-again");
    navigation.setParams({ compareAgain: undefined });
  }, [navigation, route?.params?.compareAgain]);

  useEffect(() => {
    const saved = route?.params?.savedRoute;
    if (!saved) { savedRouteHandledRef.current = null; return; }
    if (savedRouteHandledRef.current === saved) return;
    savedRouteHandledRef.current = saved;
    const normalized = normalizeCompareAgainRoute(saved);
    if (!normalized) {
      if (__DEV__) console.warn("[navigation] ignored malformed saved route");
      navigation.setParams({ savedRoute: undefined });
      return;
    }
    restoreRoute(normalized, "saved-route");
    navigation.setParams({ savedRoute: undefined });
  }, [navigation, route?.params?.savedRoute]);

  // Preserve the required backend session-token contract per field; reset it
  // after selection so the next search starts a fresh session.
  const pickupSessionTokenRef = useRef(null);
  const dropoffSessionTokenRef = useRef(null);

  // Only one field owns the inline suggestion surface at a time. The inputs
  // themselves stay mounted with stable identity while this surface updates.
  const [activeField, setActiveField] = useState(null);

  useEffect(() => {
    let cancelled = false;
    SecureStore.getItemAsync(SEARCH_HISTORY_KEY).then((value) => {
      if (cancelled || !value) return;
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          const seen = new Set();
          setSearchHistory(parsed.filter((item) => {
            if (!isValidLocation(item)) return false;
            const key = locationHistoryKey(item);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }).slice(0, MAX_SEARCH_HISTORY));
        }
      } catch (_) { /* ignore a corrupted local history */ }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const rememberLocation = useCallback((location) => {
    if (!isValidLocation(location) || location.source === "gps") return;
    setSearchHistory((current) => {
      const identity = locationHistoryKey(location);
      const next = [location, ...current.filter((item) => locationHistoryKey(item) !== identity)].slice(0, MAX_SEARCH_HISTORY);
      SecureStore.setItemAsync(SEARCH_HISTORY_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const removeSearchHistoryItem = useCallback((location) => {
    const identity = locationHistoryKey(location);
    setSearchHistory((current) => {
      const next = current.filter((item) => locationHistoryKey(item) !== identity);
      SecureStore.setItemAsync(SEARCH_HISTORY_KEY, JSON.stringify(next)).catch(() => {});
      setHistoryToast({ type: "success", message: "Recent location deleted" });
      return next;
    });
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    SecureStore.deleteItemAsync(SEARCH_HISTORY_KEY).catch(() => {});
    setHistoryToast({ type: "success", message: "Recent locations cleared" });
  }, []);

  const requestClearSearchHistory = useCallback(() => {
    if (searchHistory.length) setClearHistoryVisible(true);
  }, [searchHistory.length]);

  // Bumped on every keystroke that starts a new search and on every field
  // switch/clear, so a slow, now-superseded autocomplete response can never
  // overwrite newer results (or flip loading back off) after the fact.
  const pickupRequestIdRef = useRef(0);
  const dropoffRequestIdRef = useRef(0);
  const pickupAbortRef = useRef(null);
  const dropoffAbortRef = useRef(null);
  const mapRequestIdRef = useRef(0);
  const pickupSelectionRef = useRef(0);
  const dropoffSelectionRef = useRef(0);
  const autocompleteCacheRef = useRef(new Map());

  function handleFocusField(field) {
    sheetBeforeKeyboardRef.current = sheetExpanded;
    setSheetExpanded(true);
    setActiveField(field);
    setSelectingMode(field === "dropoff" ? "destination" : "pickup");
  }

  function handleSwapLocations() {
    const nextPickup = dropoff;
    const nextDropoff = pickup;
    setPickup(nextPickup);
    setDropoff(nextDropoff);
    pickupRef.current = nextPickup;
    dropoffRef.current = nextDropoff;
    setPickupQuery(nextPickup ? inputNameFor(nextPickup) : "");
    setDropoffQuery(nextDropoff ? inputNameFor(nextDropoff) : "");
    setPickupSuggestions([]);
    setDropoffSuggestions([]);
    setActiveField(null);
    setErrorMessage(null);
  }

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
  function createSearchRunner({ field, sessionTokenRef, setSuggestions, setLoading, setStatus, setStatusType, requestIdRef, abortRef }) {
    return debounce(async (query) => {
      const requestId = ++requestIdRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const token = nextSessionToken(sessionTokenRef);
        const selectedLocation = field === "pickup" ? pickupRef.current : dropoffRef.current;
        const coordinates = deviceLocationRef.current || selectedLocation || (field === "dropoff" ? pickupRef.current : null);
        const normalizedQuery = normalizeSearchText(query);
        const locationKey = Number.isFinite(coordinates?.lat) && Number.isFinite(coordinates?.lng)
          ? `${coordinates.lat.toFixed(3)},${coordinates.lng.toFixed(3)}`
          : "none";
        const cacheKey = `${field}|${normalizedQuery}|${locationKey}`;
        const cached = autocompleteCacheRef.current.get(cacheKey);
        let res = cached && cached.expiresAt > Date.now()
          ? { data: cached.data }
          : field === "dropoff" && Number.isFinite(coordinates?.lat) && Number.isFinite(coordinates?.lng)
            ? await autocompleteDestination(query.trim(), coordinates, controller.signal).catch((error) => {
              if (error?.code === "PROVIDER_AUTH_REQUIRED") throw error;
              return autocompletePlaces(query.trim(), token, coordinates, controller.signal);
            })
            : await autocompletePlaces(query.trim(), token, coordinates, controller.signal);
        if (!cached || cached.expiresAt <= Date.now()) {
          autocompleteCacheRef.current.set(cacheKey, { data: res.data || [], expiresAt: Date.now() + 120000 });
          if (autocompleteCacheRef.current.size > 40) autocompleteCacheRef.current.delete(autocompleteCacheRef.current.keys().next().value);
        }
        if (requestIdRef.current !== requestId || controller.signal.aborted) return; // superseded by a newer request
        const results = rankLocationSuggestions((res.data || []).map(toSuggestion), coordinates, query);
        setSuggestions(results);
        setStatusType("empty");
        setStatus(
          results.length === 0
            ? "No locations found"
            : results.some((item) => hasFullNameTokenMatch(item, query))
            ? null
            : "No exact match; showing closest locations"
        );
      } catch (err) {
        if (requestIdRef.current !== requestId || controller.signal.aborted) return; // superseded by a newer request
        if (IS_DEVELOPMENT) console.error(
          "[maps] autocomplete failed:",
          err?.response?.data?.message || err?.message || err
        );
        if (err?.code === "PROVIDER_AUTH_REQUIRED" || err?.response?.status === 401) {
          setSuggestions([]);
          setStatusType("error");
          setStatus("Your FareRide session cannot load live location suggestions. Please sign in again.");
        } else if (ENABLE_MOCK_LOCATION_FALLBACK) {
          const results = filterMockLocations(query);
          setSuggestions(results);
          setStatusType("empty");
          setStatus(results.length === 0 ? "No locations found" : "No exact match; showing closest locations");
        } else {
          setStatusType("error");
          setStatus("Unable to load location suggestions. Check your connection and try again.");
        }
      } finally {
        if (requestIdRef.current === requestId) setLoading(false);
        if (abortRef.current === controller) abortRef.current = null;
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
        abortRef: pickupAbortRef,
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
        abortRef: dropoffAbortRef,
      }),
    []
  );

  useEffect(() => () => {
    runPickupSearch.cancel();
    runDropoffSearch.cancel();
    pickupAbortRef.current?.abort();
    dropoffAbortRef.current?.abort();
  }, [runPickupSearch, runDropoffSearch]);

  const handlePickupChange = (text) => {
    if (programmaticPickupQueryRef.current === text) {
      programmaticPickupQueryRef.current = null;
      return;
    }
    // Selecting a suggestion closes the overlay. If the user edits the same
    // still-focused field afterwards, onFocus may not fire again, so restore
    // ownership here before starting the next search.
    setActiveField("pickup");
    pickupRequestIdRef.current += 1;
    pickupAbortRef.current?.abort();
    pickupSelectionRef.current += 1;
    pickupManuallySelectedRef.current = true;
    setPickupQuery((current) => current === text ? current : text);
    setErrorMessage(null);
    if (pickup && text !== displayNameFor(pickup)) {
      pickupManuallySelectedRef.current = true;
      pickupRef.current = null;
      setPickup(null);
    }

    if (text.trim().length < MIN_AUTOCOMPLETE_LENGTH) {
      runPickupSearch.cancel();
      pickupRequestIdRef.current += 1; // invalidate any in-flight/pending request
      setPickupSuggestions([]);
      setPickupLoading(false);
      setPickupStatus(null);
      return;
    }
    // Do not present results for the previous query while this one is
    // debouncing or loading. The stable panel remains visible and explains
    // the transition with its loading state.
    setPickupSuggestions((current) => filterRelevantSuggestions(current, text));
    setPickupStatus(null);
    // Turn loading on immediately (not inside the debounced callback) so the
    // dropdown opens right away and stays open/steady for the whole debounce
    // + network round trip, instead of flashing closed in between.
    setPickupLoading(true);
    runPickupSearch(text);
  };

  const handleDropoffChange = (text) => {
    if (programmaticDropoffQueryRef.current === text) {
      programmaticDropoffQueryRef.current = null;
      return;
    }
    setActiveField("dropoff");
    dropoffRequestIdRef.current += 1;
    dropoffAbortRef.current?.abort();
    dropoffSelectionRef.current += 1;
    setDropoffQuery((current) => current === text ? current : text);
    setErrorMessage(null);
    if (dropoff && text !== displayNameFor(dropoff)) {
      dropoffRef.current = null;
      setDropoff(null);
    }

    if (text.trim().length < MIN_AUTOCOMPLETE_LENGTH) {
      runDropoffSearch.cancel();
      dropoffRequestIdRef.current += 1; // invalidate any in-flight/pending request
      setDropoffSuggestions([]);
      setDropoffLoading(false);
      setDropoffStatus(null);
      return;
    }
    setDropoffSuggestions((current) => filterRelevantSuggestions(current, text));
    setDropoffStatus(null);
    setDropoffLoading(true);
    runDropoffSearch(text);
  };

  function applyPickup(location, { preserveAccuracy = false } = {}) {
    if (!isValidLocation(location)) return;
    runPickupSearch.cancel();
    pickupAbortRef.current?.abort();
    pickupSelectionRef.current += 1;
    pickupRequestIdRef.current += 1; // a still-in-flight response must not overwrite this selection
    const nextLabel = inputNameFor(location);
    const sameLocation = pickupRef.current && pickupRef.current.lat === location.lat && pickupRef.current.lng === location.lng && pickupRef.current.name === location.name;
    if (!sameLocation) setPickup(location);
    pickupRef.current = location;
    if (location.source !== "gps") pickupManuallySelectedRef.current = true;
    rememberLocation(location);
    programmaticPickupQueryRef.current = nextLabel;
    setPickupQuery((current) => current === nextLabel ? current : nextLabel);
    setPickupSuggestions([]);
    setPickupLoading(false);
    setPickupStatus(null);
    if (!preserveAccuracy) setPickupAccuracyNotice(null);
    setErrorMessage(null);
    pickupSessionTokenRef.current = null;
  }

  function applyDropoff(location) {
    if (!isValidLocation(location)) return;
    runDropoffSearch.cancel();
    dropoffAbortRef.current?.abort();
    dropoffSelectionRef.current += 1;
    dropoffRequestIdRef.current += 1; // a still-in-flight response must not overwrite this selection
    const nextLabel = inputNameFor(location);
    const sameLocation = dropoffRef.current && dropoffRef.current.lat === location.lat && dropoffRef.current.lng === location.lng && dropoffRef.current.name === location.name;
    if (!sameLocation) setDropoff(location);
    dropoffRef.current = location;
    rememberLocation(location);
    programmaticDropoffQueryRef.current = nextLabel;
    setDropoffQuery((current) => current === nextLabel ? current : nextLabel);
    setDropoffSuggestions([]);
    setDropoffLoading(false);
    setDropoffStatus(null);
    setErrorMessage(null);
    dropoffSessionTokenRef.current = null;
  }

  // Geoapify autocomplete already returns canonical coordinates. Use them
  // directly and retain the details endpoint only for legacy/incomplete
  // suggestions that do not contain coordinates.
  function createSelectHandler({ sessionTokenRef, apply, selectionRef }) {
    return async (item) => {
      const selectionId = ++selectionRef.current;
      if (!item.placeId || (Number.isFinite(item.lat) && Number.isFinite(item.lng))) {
        apply(item);
        return;
      }
      try {
        const token = sessionTokenRef.current || nextSessionToken(sessionTokenRef);
        const res = await getPlaceDetails(item.placeId, token);
        if (selectionRef.current !== selectionId) return;
        const place = res.data;
        apply({ name: place.name || item.name, address: place.address, lat: place.lat, lng: place.lng });
      } catch (err) {
        if (selectionRef.current !== selectionId) return;
        if (IS_DEVELOPMENT) console.error("[maps] place-details failed:", err?.response?.data?.message || err?.message || err);
        sessionTokenRef.current = null;
        setErrorMessage("Unable to load location details. Please try again.");
      }
    };
  }

  const handleSelectPickup = createSelectHandler({ sessionTokenRef: pickupSessionTokenRef, apply: applyPickup, selectionRef: pickupSelectionRef });
  const handleSelectDropoff = createSelectHandler({ sessionTokenRef: dropoffSessionTokenRef, apply: applyDropoff, selectionRef: dropoffSelectionRef });

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

  function retryActiveSearch() {
    if (activeField === "pickup" && pickupQuery.trim().length >= MIN_AUTOCOMPLETE_LENGTH) {
      setPickupLoading(true);
      runPickupSearch.cancel();
      runPickupSearch(pickupQuery);
    } else if (activeField === "dropoff" && dropoffQuery.trim().length >= MIN_AUTOCOMPLETE_LENGTH) {
      setDropoffLoading(true);
      runDropoffSearch.cancel();
      runDropoffSearch(dropoffQuery);
    }
  }

  const activeQuery = activeField === "pickup" ? pickupQuery : activeField === "dropoff" ? dropoffQuery : "";
  const historySuggestions = useMemo(() => {
    const query = normalizeSearchText(activeQuery);
    return searchHistory
      .filter((item) => !query || normalizeSearchText(`${item.name || ""} ${item.address || ""}`).includes(query))
      .map((item) => ({ ...item, isHistory: true, matchStrength: "history" }));
  }, [activeQuery, searchHistory]);
  const activeSuggestions = [
    ...historySuggestions,
    ...(activeField === "pickup" ? pickupSuggestions : activeField === "dropoff" ? dropoffSuggestions : [])
      .filter((item) => !searchHistory.some((saved) => locationHistoryKey(saved) === locationHistoryKey(item))),
  ].filter((item, index, items) => items.findIndex((candidate) => locationHistoryKey(candidate) === locationHistoryKey(item)) === index);
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
  const shouldShowSuggestions = Boolean(activeField) && (activeQuery.trim().length >= MIN_AUTOCOMPLETE_LENGTH || historySuggestions.length > 0);

  const handleUseCurrentLocation = useCallback(async (field = "pickup") => {
    if (locatingRef.current) return;
    if (field === "pickup") pickupManuallySelectedRef.current = false;
    locatingRef.current = true;
    setLocating(true);
    setErrorMessage(null);
    // A failed request must not leave an old device fix looking current.
    deviceLocationRef.current = null;
    try {
      const location = await getCurrentLocation();
      const fix = assessLocationFix(location);
      deviceLocationRef.current = { lat: location.lat, lng: location.lng, accuracy: location.accuracy, timestamp: location.timestamp };
      setPickupAccuracyNotice(fix.warning || (fix.accuracyMeters !== null ? "GPS accuracy +/-" + Math.round(fix.accuracyMeters) + " m" : "GPS accuracy unavailable"));
      try {
        const res = await reverseGeocode(location.lat, location.lng);
        const formatted = formatReverseGeocode(res.data);
        if (!formatted.name && !formatted.address) throw new Error("The server returned no readable address.");
        if (field === "pickup" && pickupManuallySelectedRef.current) return;
        (field === "destination" ? applyDropoff : applyPickup)({
          ...formatted,
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy,
          timestamp: location.timestamp,
          source: "gps",
        }, { preserveAccuracy: true });
        setPickupAccuracyNotice(fix.warning || (fix.accuracyMeters !== null ? `GPS accuracy ±${Math.round(fix.accuracyMeters)} m` : "GPS accuracy unavailable"));
      } catch (err) {
        // Don't block the user on a failed reverse geocode — fall back to a
        // clearly-labeled placeholder instead of a silent bare "Current Location".
        if (IS_DEVELOPMENT) console.error("[maps] reverse-geocode failed for current location:", err?.response?.data?.message || err?.message || err);
        if (field === "pickup" && pickupManuallySelectedRef.current) return;
        (field === "destination" ? applyDropoff : applyPickup)({
          name: "Current GPS location",
          address: "Address unavailable",
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy,
          timestamp: location.timestamp,
          source: "gps",
        }, { preserveAccuracy: true });
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

  // Request a foreground fix when Home first opens. Restored routes and any
  // user-edited/selected pickup take precedence over the asynchronous GPS fix.
  useEffect(() => {
    if (initialPickupLocationRequestedRef.current) return;
    if (route?.params?.savedRoute || route?.params?.compareAgain) return;
    initialPickupLocationRequestedRef.current = true;
    if (pickupRef.current || pickupManuallySelectedRef.current) return;
    void handleUseCurrentLocation("pickup");
  }, [handleUseCurrentLocation, route?.params?.compareAgain, route?.params?.savedRoute]);

  // Tapping the map fills whichever field is active in the Pickup/Destination
  // toggle, using reverse geocoding to turn the tapped coordinate into a
  // readable address.
  const handleMapPress = useCallback(
    async ({ lat, lng }) => {
      Keyboard.dismiss();
      setActiveField(null);
      setSheetExpanded(false);
      const requestId = ++mapRequestIdRef.current;
      setErrorMessage(null);
      try {
        const res = await reverseGeocode(lat, lng);
        if (mapRequestIdRef.current !== requestId) return;
        const location = { ...formatReverseGeocode(res.data), lat, lng, source: "map" };
        if (selectingMode === "destination") {
          applyDropoff(location);
        } else {
          applyPickup(location);
        }
      } catch (err) {
        if (mapRequestIdRef.current !== requestId) return;
        if (IS_DEVELOPMENT) console.error("[maps] reverse-geocode failed for map tap:", err?.response?.data?.message || err?.message || err);
        setErrorMessage("Unable to load address for that location. Please try again.");
      }
    },
    [selectingMode]
  );

  const handleConfirmAdjustedLocation = useCallback((location) => {
    if (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)) return;
    if (adjustMode === "destination") applyDropoff(location);
    else applyPickup(location);
    setAdjustPickupVisible(false);
  }, [adjustMode]);
  const handleConfirmAdjustedPickup = handleConfirmAdjustedLocation;

  const sameLocationError =
    pickup && dropoff && isSameLocation(pickup, dropoff)
      ? "Pickup and drop-off cannot be the same location"
      : null;

  const hasConfirmedRoadRoute = Boolean(
    routeInfo?.geometryAvailable && Number.isFinite(routeInfo.distanceKm) && Number.isFinite(routeInfo.durationMin)
  );
  const pickupValid = hasValidCoordinates(pickup);
  const dropoffValid = hasValidCoordinates(dropoff);
  const routeReady = hasConfirmedRoadRoute && routeInfo?.compareFaresEligible !== false;
  const compareFaresEligible = routeInfo?.compareFaresEligible === true;
  const canCompare = canCompareFares({ pickup, dropoff, vehicleType }) && routeReady;
  const routeGeometryValid = routeInfo?.geometryAvailable === true && routeCoordinates.length > 1;

  useEffect(() => {
    if (!IS_DEVELOPMENT) return;
    homeDiagnosticSequenceRef.current += 1;
    console.info("[home-map-state]", {
      eventSequence: homeDiagnosticSequenceRef.current,
      pickupValid,
      dropoffValid,
      pickupFieldHasSelection: Boolean(pickup && pickupQuery.trim()),
      dropoffFieldHasSelection: Boolean(dropoff && dropoffQuery.trim()),
      navigationRestoreActive: Boolean(route?.params?.savedRoute || route?.params?.compareAgain),
      navigationRestoreSource: navigationRestoreSourceRef.current,
      routeGeometryValid,
    });
  }, [pickup, dropoff, pickupQuery, dropoffQuery, pickupValid, dropoffValid, routeGeometryValid, route?.params?.savedRoute, route?.params?.compareAgain]);

  const compareButtonDisabled = !canCompare || loading;
  const compareDisableReason = loading
    ? "loading"
    : !pickupValid
      ? "pickup_invalid"
      : !dropoffValid
        ? "dropoff_invalid"
        : !vehicleType
          ? "vehicle_type_missing"
          : isRouteLoading
            ? "route_loading"
            : !routeReady
              ? "route_not_ready"
              : null;

  useEffect(() => {
    if (!IS_DEVELOPMENT) return;
    console.info("[fare] compare button diagnostics", {
      compareButtonDisabled,
      compareFaresEligible,
      pickupValid,
      dropoffValid,
      routeReady,
      loading,
      vehicleType,
      disableReason: compareDisableReason,
    });
  }, [compareButtonDisabled, compareFaresEligible, pickupValid, dropoffValid, routeReady, loading, vehicleType, compareDisableReason]);
  const currentRouteKey = pickup && dropoff && routeInfo?.requestId
    ? `${pickup.lat},${pickup.lng}|${dropoff.lat},${dropoff.lng}|${routeInfo.requestId}`
    : null;
  const canSaveRoute = canCompare && Boolean(currentRouteKey) && !saveLoading;
  const previewCoordinates = pickup && dropoff && isValidLocation(pickup) && isValidLocation(dropoff) && !isSameLocation(pickup, dropoff)
    ? [
        { latitude: Number(pickup.lat), longitude: Number(pickup.lng) },
        { latitude: Number(dropoff.lat), longitude: Number(dropoff.lng) },
      ]
    : [];

  // One default driving route is requested for each pickup/drop-off pair.
  useEffect(() => {
    const requestId = ++routeRequestIdRef.current;
    compareRequestIdRef.current += 1;
    let cancelled = false;
    const routingProfile = "drive";
    const routeKey = pickup && dropoff
      ? `${pickup.lat},${pickup.lng}|${dropoff.lat},${dropoff.lng}|${routingProfile}`
      : null;
    const requestStartedAt = Date.now();
    setSavedRouteKey(null);
    setSaveRouteError(null);

    if (IS_DEVELOPMENT && pickup && dropoff) {
      console.info("[maps] route request started", {
        requestId,
        mode: routingProfile,
        type: "short",
        vehicleType: DEFAULT_PRICING_VEHICLE_TYPE,
        origin: { lat: pickup.lat, lng: pickup.lng },
        destination: { lat: dropoff.lat, lng: dropoff.lng },
      });
    }

    async function loadRoute() {
      if (!pickup || !dropoff || isSameLocation(pickup, dropoff)) {
        setRouteCoordinates([]);
        setRouteInfo(null);
        setIsRouteLoading(false);
        return;
      }
      const cached = routeCacheRef.current.get(routeKey);
      if (cached) {
        setRouteCoordinates(cached.coordinates);
        const info = { ...cached.info, requestId };
        setRouteInfo({ ...info, compareFaresEligible: true });
        setIsRouteLoading(false);
        return;
      }

      setIsRouteLoading(true);
      setRouteCoordinates([]);
        setRouteInfo({ requestId, isPreview: true, geometryAvailable: false, compareFaresEligible: false });
      try {
        const res = await computeRoute(
          { lat: pickup.lat, lng: pickup.lng },
          { lat: dropoff.lat, lng: dropoff.lng },
          DEFAULT_PRICING_VEHICLE_TYPE
        );
        if (cancelled || routeRequestIdRef.current !== requestId) return;
        const route = extractRouteData(res);
        const coordinates = normalizeRouteCoordinates(route);
        const geometryDiagnostics = routeGeometryDiagnostics(coordinates, pickup, dropoff);
        if (IS_DEVELOPMENT) {
          const rawGeometry = route.geometry || route.route?.geometry || route.feature?.geometry;
          const rawPoints = Array.isArray(route.polylineCoordinates)
            ? route.polylineCoordinates.length
            : rawGeometry?.type === "LineString"
              ? rawGeometry.coordinates?.length || 0
              : rawGeometry?.type === "MultiLineString"
                ? rawGeometry.coordinates?.flat?.().length || 0
                : route.encodedPolyline
                  ? "encoded-polyline"
                  : 0;
          console.info("[maps] route response diagnostics", {
            requestId,
            elapsedMs: Date.now() - requestStartedAt,
            httpStatus: res?.__httpStatus || res?.status || null,
            success: res?.success === true,
            responseKeys: Object.keys(res || {}),
            dataKeys: Object.keys(route || {}),
            geometryRepresentation: rawGeometry?.type || (Array.isArray(route.polylineCoordinates) ? "polylineCoordinates" : route.encodedPolyline ? "encodedPolyline" : "none"),
            rawPointCount: rawPoints,
            normalizedPointCount: coordinates.length,
            distanceKm: Number(route.distanceKm),
            distanceKmValid: Number.isFinite(Number(route.distanceKm)) && Number(route.distanceKm) > 0,
            durationMin: Number(route.durationMin),
            durationMinValid: Number.isFinite(Number(route.durationMin)) && Number(route.durationMin) > 0,
            endpointSnapping: geometryDiagnostics,
          });
        }
        if (!geometryDiagnostics.valid || !Number.isFinite(Number(route.distanceKm)) || !Number.isFinite(Number(route.durationMin))) {
          const reason = !geometryDiagnostics.valid
            ? geometryDiagnostics.reason
            : "missing-or-invalid-distance-duration";
          const error = new Error(`Route validation failed: ${reason}`);
          error.routeDiagnostics = { ...geometryDiagnostics, reason };
          throw error;
        }
        const info = { requestId, distanceKm: Number(route.distanceKm), durationMin: Number(route.durationMin), geometryAvailable: true, isPreview: false };
        info.compareFaresEligible = true;
        routeCacheRef.current.set(routeKey, { coordinates, info });
        setRouteCoordinates(coordinates);
        setRouteInfo(info);
        if (IS_DEVELOPMENT) {
          console.info("[maps] route state committed", {
            requestId,
            geometryAvailable: true,
            compareFaresEligible: info.compareFaresEligible,
            blockingReason: info.compareFaresEligible ? null : info.eligibilityReason,
          });
        }
      } catch (err) {
        const stale = cancelled || routeRequestIdRef.current !== requestId;
        if (IS_DEVELOPMENT) {
          console.info("[maps] route request completed with failure", {
            requestId,
            elapsedMs: Date.now() - requestStartedAt,
            stale,
            cancelled,
            httpStatus: err?.response?.status || null,
            reason: err?.routeDiagnostics?.reason || "provider-or-client-error",
          });
        }
        if (stale) return;
        if (IS_DEVELOPMENT) console.error("[maps] route computation failed", {
          status: err?.response?.status || null,
          providerCode: err?.response?.data?.providerCode || err?.response?.data?.code || err?.response?.data?.errorCode || null,
          mode: routingProfile,
          type: "short",
          origin: pickup ? { lat: pickup.lat, lng: pickup.lng } : null,
          destination: dropoff ? { lat: dropoff.lat, lng: dropoff.lng } : null,
          geometryValidation: err?.routeDiagnostics || { valid: false, reason: "provider-or-client-error" },
          message: err?.response?.data?.message || err?.message || "unknown route error",
        });
        setRouteCoordinates([]);
        const providerMessage = String(err?.response?.data?.message || "");
        const routeFailureKind = err?.code === "ECONNABORTED" || err?.code === "ETIMEDOUT" || err?.response?.status === 408 || err?.response?.status === 504
          ? "timeout"
          : err?.routeDiagnostics || /invalid road geometry|invalid road duration/i.test(providerMessage)
            ? "malformed_geometry"
            : err?.response?.status === 404
              ? "no_route"
              : "unavailable";
        setRouteInfo({ requestId, isPreview: true, geometryAvailable: false, roadRouteUnavailable: true, routeFailureKind, compareFaresEligible: false });
        if (IS_DEVELOPMENT) {
          console.info("[maps] route state committed", {
            requestId,
            geometryAvailable: false,
            compareFaresEligible: false,
            blockingReason: err?.routeDiagnostics?.reason || "provider-or-client-error",
          });
        }
      } finally {
        if (!cancelled && routeRequestIdRef.current === requestId) setIsRouteLoading(false);
      }
    }

    loadRoute();
    return () => { cancelled = true; };
  }, [pickup, dropoff]);

  const showRouteFallbackNotice =
    Boolean(pickup && dropoff && !isSameLocation(pickup, dropoff)) && !isRouteLoading && routeInfo?.roadRouteUnavailable;
  const handleCompare = async () => {
    // Guard against double-submit (rapid double-tap) in addition to the
    // button's own disabled-while-loading state.
    if (!canCompare || loading) return;

    setLoading(true);
    setErrorMessage(null);
    const compareRequestId = ++compareRequestIdRef.current;
    const routeRequestId = routeInfo.requestId;
    compareAbortRef.current?.abort();
    const abortController = new AbortController();
    compareAbortRef.current = abortController;

    const payload = {
      pickup: { name: displayNameFor(pickup), address: pickup.address, city: pickup.city, placeId: pickup.placeId || pickup.id, lat: pickup.lat, lng: pickup.lng },
      dropoff: { name: displayNameFor(dropoff), address: dropoff.address, city: dropoff.city, placeId: dropoff.placeId || dropoff.id, lat: dropoff.lat, lng: dropoff.lng },
      vehicleType,
      route: { distanceKm: routeInfo.distanceKm, durationMin: routeInfo.durationMin, requestId: routeInfo.requestId, compareFaresEligible: routeInfo.compareFaresEligible },
    };
    if (IS_DEVELOPMENT) {
      console.info("[fare] compare request diagnostics", {
        distanceMeters: Math.round(payload.route.distanceKm * 1000),
        durationSeconds: Math.round(payload.route.durationMin * 60),
        routeRequestId: payload.route.requestId,
      });
    }

    const nearbyRequestKey = `${compareRequestId}:${Date.now()}`;
    nearbyRequestStore.begin(nearbyRequestKey, { latitude: pickup.lat, longitude: pickup.lng });
    void fetchNearbyDrivers(pickup, { signal: abortController.signal, onProviderResult: (providerId, records) => nearbyRequestStore.settle(nearbyRequestKey, providerId, records) })
      .then((snapshot) => nearbyRequestStore.finish(nearbyRequestKey, snapshot))
      .catch(() => nearbyRequestStore.finish(nearbyRequestKey, { pickup: { latitude: pickup.lat, longitude: pickup.lng } }));
    try {
      // The comparison request has its own bounded timeout; provider failures
      // are returned in the normalized response instead of fabricated here.
      const response = await compareFares(payload, { signal: abortController.signal });
      if (compareRequestIdRef.current !== compareRequestId || routeRequestIdRef.current !== routeRequestId) return;
      if (IS_DEVELOPMENT) {
        const quoteDiagnostics = (response.data?.results || []).flatMap((item) => (item.quotes || []).map((quote) => ({
          categoryId: quote.categoryId,
          recommendedPrice: quote.fareRecommended ?? quote.fare,
          displayedPrice: quote.fare,
          currency: quote.currency,
          quoteTimestamp: Date.now(),
          ttlSeconds: quote.metadata?.providerTtlSeconds ?? null,
        })));
        console.info("[fare] compare response diagnostics", {
          distanceMeters: Math.round(payload.route.distanceKm * 1000),
          durationSeconds: Math.round(payload.route.durationMin * 60),
          quotes: quoteDiagnostics,
        });
      }
      navigation.navigate("Results", { result: { ...response.data, quoteReceivedAt: Date.now(), nearbyDrivers: nearbyRequestStore.get(nearbyRequestKey), nearbyRequestKey } });
    } catch (err) {
      abortController.abort();
      if (compareRequestIdRef.current !== compareRequestId || routeRequestIdRef.current !== routeRequestId) return;
      if (isCanceledError(err)) return;
      if (IS_DEVELOPMENT) console.error("compareFares failed:", err?.message || err);

      setErrorMessage(
        err?.fareRideError?.kind === "timeout"
          ? "Fare comparison timed out. Please try again."
          : "Unable to compare fares. Please try again."
      );
    } finally {
      if (compareRequestIdRef.current === compareRequestId) {
        compareAbortRef.current = null;
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!autoCompareRequested || !canCompare || loading) return;
    setAutoCompareRequested(false);
    handleCompare();
  }, [autoCompareRequested, canCompare, loading]);

  useEffect(() => () => {
    compareRequestIdRef.current += 1;
    compareAbortRef.current?.abort();
  }, []);

  const handleSaveRoute = () => {
    if (!canSaveRoute || savedRouteKey === currentRouteKey) return;
    setSaveName(`${displayNameFor(pickup)} to ${displayNameFor(dropoff)}`.slice(0, 100));
    setSaveRouteError(null);
    setSaveNameVisible(true);
  };

  const submitSaveRoute = async () => {
    if (!canSaveRoute || savedRouteKey === currentRouteKey) return;
    const trimmedName = saveName.trim();
    if (!trimmedName) { setSaveRouteError("Give this trip a name before saving."); return; }
    setSaveLoading(true);
    setSaveRouteError(null);
    setSaveNameVisible(false);
    try {
      await createSavedRoute({
        name: trimmedName.slice(0, 100),
        labelType: "FAVORITE",
        pickup: { name: displayNameFor(pickup), address: pickup.address, latitude: pickup.lat, longitude: pickup.lng },
        destination: { name: displayNameFor(dropoff), address: dropoff.address, latitude: dropoff.lat, longitude: dropoff.lng },
        route: { distanceKm: routeInfo.distanceKm, durationMin: routeInfo.durationMin },
      });
      setSavedRouteKey(currentRouteKey);
    } catch (error) {
      const errorCode = error?.response?.data?.errorCode || error?.response?.data?.code;
      if (errorCode === "ALREADY_SAVED" || error?.response?.status === 409) {
        setSavedRouteKey(currentRouteKey);
        setSaveRouteError("This route is already saved. Choose a different route to save it.");
        setSaveNameVisible(true);
      } else if (error?.code === "SESSION_EXPIRED") {
        setSaveRouteError("Your session expired. Please sign in again.");
      } else {
        setSaveRouteError("Unable to save this route. Please try again.");
      }
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined}
    >
      <View nativeID="home-screen-canvas" style={styles.homeCanvas}>
        <MapPreview
          fullScreen
          pickup={pickup}
          dropoff={dropoff}
          routeCoordinates={routeCoordinates}
          previewCoordinates={previewCoordinates}
          routeInfo={routeInfo}
          selectingMode={selectingMode}
          onSelectingModeChange={setSelectingMode}
          onMapPress={handleMapPress}
          onAdjustLocation={(mode) => { setAdjustMode(mode); setAdjustPickupVisible(true); }}
          isRouteLoading={isRouteLoading}
          mapBottomOverlayRatio={sheetExpanded ? 0.82 : 0.60}
        />

        <View style={styles.headerOverlay} pointerEvents="box-none">
          <AppHeader subtitle="Live fares for your trip" compact />
        </View>

        <View nativeID="home-booking-sheet" style={[styles.bottomPanel, { maxHeight: sheetExpanded ? "82%" : "60%" }, Platform.OS === "web" && webKeyboardInset > 0 ? { bottom: webKeyboardInset, height: Math.max(280, Math.min(580, windowHeight - webKeyboardInset - insets.top - 12)), maxHeight: Math.max(280, windowHeight - webKeyboardInset - insets.top - 12) } : null]}>
          <View style={[styles.panelContent, { paddingBottom: spacing.sm + Math.max(insets.bottom, spacing.xs) }]}>
            <View {...sheetHandleResponder.panHandlers} style={styles.panelHandle} accessibilityRole="adjustable" accessibilityLabel="Booking sheet handle" />
            <Text style={styles.greeting}>Where are you going?</Text>

            <View style={styles.searchCard}>
            <LocationInput
              label="Pickup"
              placeholder="Choose pickup location"
              value={pickupQuery}
              secondaryValue={pickup ? getLocationSecondaryText(pickup) : ""}
              onChangeText={handlePickupChange}
              onFocus={() => handleFocusField("pickup")}
              loading={pickupLoading}
              compact
              dotColor={colors.accent}
              trailing={<TouchableOpacity accessibilityRole="button" accessibilityLabel="Use current location for pickup" style={styles.gpsButton} onPress={() => handleUseCurrentLocation("pickup")} disabled={locating}><Text style={styles.gpsIcon}>{locating ? "…" : "⌖"}</Text></TouchableOpacity>}
            />
            <SuggestionsOverlay
              visible={activeField === "pickup" && shouldShowSuggestions}
              loading={activeField === "pickup" && activeLoading}
              suggestions={activeField === "pickup" ? activeSuggestions : []}
              statusMessage={activeField === "pickup" ? activeStatus : null}
              statusType={activeField === "pickup" ? activeStatusType : "empty"}
              onSelect={handleOverlaySelect}
              onRemoveHistory={removeSearchHistoryItem}
              onClearHistory={requestClearSearchHistory}
              onRetry={retryActiveSearch}
              historyVisible={activeField === "pickup" && activeQuery.trim().length < MIN_AUTOCOMPLETE_LENGTH}
            />
            {pickupAccuracyNotice && <Text style={styles.accuracyNotice}>{pickupAccuracyNotice}</Text>}

            <LocationInput
              label="Drop-off"
              placeholder="Where to?"
              value={dropoffQuery}
              secondaryValue={dropoff ? getLocationSecondaryText(dropoff) : ""}
              onChangeText={handleDropoffChange}
              onFocus={() => handleFocusField("dropoff")}
              loading={dropoffLoading}
              compact
              dotColor={colors.navy}
              trailing={<TouchableOpacity accessibilityRole="button" accessibilityLabel="Use current location for destination" style={styles.gpsButton} onPress={() => handleUseCurrentLocation("destination")} disabled={locating}><Text style={styles.gpsIcon}>{locating ? "…" : "⌖"}</Text></TouchableOpacity>}
            />
            <TouchableOpacity style={styles.swapButton} onPress={handleSwapLocations} disabled={!pickup && !dropoff} accessibilityRole="button" accessibilityLabel="Swap pickup and drop-off locations">
              <Text style={styles.swapIcon}>⇅</Text><Text style={styles.swapText}>Swap locations</Text>
            </TouchableOpacity>
            <SuggestionsOverlay
              visible={activeField === "dropoff" && shouldShowSuggestions}
              loading={activeField === "dropoff" && activeLoading}
              suggestions={activeField === "dropoff" ? activeSuggestions : []}
              statusMessage={activeField === "dropoff" ? activeStatus : null}
              statusType={activeField === "dropoff" ? activeStatusType : "empty"}
              onSelect={handleOverlaySelect}
              onRemoveHistory={removeSearchHistoryItem}
              onClearHistory={requestClearSearchHistory}
              onRetry={retryActiveSearch}
              historyVisible={activeField === "dropoff" && activeQuery.trim().length < MIN_AUTOCOMPLETE_LENGTH}
            />

            {sameLocationError && <Text style={styles.inlineError}>{sameLocationError}</Text>}
            </View>
            {routeInfo?.geometryAvailable && !isRouteLoading ? (
              <View style={styles.routeSummary}>
                <View style={styles.routeSummaryCopy}>
                  <Text style={styles.routeSummaryLabel}>YOUR ROUTE</Text>
                  <Text style={styles.routeSummaryValue}>{routeInfo.distanceKm} km <Text style={styles.routeSummaryDivider}>•</Text> {routeInfo.durationMin} min</Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={savedRouteKey === currentRouteKey ? "Route saved" : "Save route"}
                  onPress={handleSaveRoute}
                  disabled={!canSaveRoute || savedRouteKey === currentRouteKey}
                  style={[styles.saveRouteButton, savedRouteKey === currentRouteKey && styles.saveRouteButtonSaved]}
                >
                  {saveLoading ? <ActivityIndicator size="small" color={colors.forest} /> : <Text style={styles.saveRouteIcon}>{savedRouteKey === currentRouteKey ? "✓" : "🔖"}</Text>}
                  <Text style={[styles.saveRouteText, savedRouteKey === currentRouteKey && styles.saveRouteTextSaved]}>{savedRouteKey === currentRouteKey ? "Saved" : "Save"}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {saveRouteError ? <Text style={styles.saveRouteError}>{saveRouteError}</Text> : null}
          {showRouteFallbackNotice && (
            <Text style={styles.routeNotice}>Road route unavailable. Fare comparison is disabled until a valid road route is loaded.</Text>
          )}
          {errorMessage ? (
            <ErrorState message={errorMessage} onRetry={handleCompare} retryLabel="Try Again" />
          ) : null}

          <PrimaryButton
            title="Compare Fares"
            onPress={handleCompare}
            disabled={compareButtonDisabled}
            loading={loading}
            style={styles.compareButton}
          />
            <Text style={styles.compareHint}>{canCompare ? "Prices are fetched only when you tap Compare Fares." : "Select both locations to compare live fares."}</Text>
          </View>
        </View>

        <PickupMapAdjuster
          mode={adjustMode}
          visible={adjustPickupVisible && Boolean(adjustMode === "destination" ? dropoff : pickup)}
          initialLocation={adjustMode === "destination" ? dropoff : pickup}
          onReverseGeocode={(lat, lng) => reverseGeocode(lat, lng).then((response) => response.data)}
          onCancel={() => setAdjustPickupVisible(false)}
          onConfirm={handleConfirmAdjustedPickup}
        />
        <LoadingOverlay visible={loading} />
        <Modal transparent visible={saveNameVisible} animationType="slide" onRequestClose={() => !saveLoading && setSaveNameVisible(false)}>
          <View style={styles.saveNameBackdrop}><View style={styles.saveNameSheet}><View style={styles.sheetHandle} /><Text style={styles.saveNameTitle}>Name this saved trip</Text><Text style={styles.saveNameSubtitle}>Use a memorable name so you can find it quickly later.</Text><View style={styles.saveNameInputRow}><TextInput autoFocus value={saveName} onChangeText={setSaveName} maxLength={100} placeholder="e.g. Home to Office" placeholderTextColor={colors.muted} style={styles.saveNameInput} accessibilityLabel="Saved trip name" />{saveName ? <TouchableOpacity onPress={() => setSaveName("")} style={styles.clearSaveName} accessibilityRole="button" accessibilityLabel="Clear saved trip name"><Text style={styles.clearSaveNameText}>×</Text></TouchableOpacity> : null}</View><Text style={styles.saveNameRequired}>Name is required</Text><TouchableOpacity disabled={saveLoading || !saveName.trim()} onPress={submitSaveRoute} style={[styles.saveNameButton, (!saveName.trim() || saveLoading) && styles.saveNameButtonDisabled]}><Text style={styles.saveNameButtonText}>{saveLoading ? "Saving…" : "Save trip"}</Text></TouchableOpacity><TouchableOpacity disabled={saveLoading} onPress={() => setSaveNameVisible(false)} style={styles.saveNameCancel}><Text style={styles.saveNameCancelText}>Cancel</Text></TouchableOpacity></View></View>
        </Modal>
        <ConfirmBottomSheet
          visible={clearHistoryVisible}
          title="Clear recent locations?"
          message="This removes your locally saved recent locations from this device. Saved trips and comparison history will not be affected."
          confirmLabel="Clear recents"
          destructive
          onCancel={() => setClearHistoryVisible(false)}
          onConfirm={() => { clearSearchHistory(); setClearHistoryVisible(false); }}
        />
        <AppToast visible={Boolean(historyToast)} message={historyToast?.message} type={historyToast?.type} onHide={() => setHistoryToast(null)} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  homeCanvas: { flex: 1, minHeight: 0, width: "100%", height: "100%", backgroundColor: colors.background, position: "relative", overflow: "hidden" },
  headerOverlay: { position: "absolute", top: 0, left: spacing.md, right: spacing.md, zIndex: 30, backgroundColor: "rgba(255,255,255,.90)", borderRadius: radius.lg, ...shadow },
  bottomPanel: { position: "absolute", left: spacing.sm, right: spacing.sm, bottom: spacing.sm, zIndex: 20, maxHeight: "60%", backgroundColor: "rgba(255,255,255,.96)", borderRadius: radius.lg, borderWidth: 1, borderColor: "rgba(226,232,240,.9)", ...shadow },
  panelContent: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md },
  panelHandle: { alignSelf: "center", width: 36, height: 4, borderRadius: 4, backgroundColor: colors.outline, marginBottom: spacing.sm },
  greeting: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  searchCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.sm,
  },
  swapButton: { alignSelf: "flex-end", flexDirection: "row", alignItems: "center", minHeight: 36, paddingHorizontal: spacing.sm, marginTop: -spacing.xs, marginBottom: spacing.xs, borderRadius: radius.full, backgroundColor: colors.primarySoft },
  swapIcon: { color: colors.forest, fontSize: 20, fontWeight: "800", marginRight: 5 },
  swapText: { color: colors.forest, fontSize: 12, fontWeight: "800" },
  gpsButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  gpsIcon: { color: "#15803D", fontSize: 24, fontWeight: "700" },
  accuracyNotice: { color: colors.warning, fontSize: 12, fontWeight: "600", marginTop: -spacing.sm, marginBottom: spacing.sm },
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
  routeSummary: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.softGreen, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.md },
  routeSummaryCopy: { flex: 1, minWidth: 0 },
  routeSummaryLabel: { color: colors.forest, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  routeSummaryValue: { color: colors.primary, fontSize: 15, fontWeight: "800" },
  routeSummaryDivider: { color: colors.muted, fontWeight: "500" },
  saveRouteButton: { minHeight: 36, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.forest, backgroundColor: colors.card, marginLeft: spacing.sm },
  saveRouteButtonSaved: { backgroundColor: colors.paleGreen, borderColor: colors.accent },
  saveRouteIcon: { fontSize: 14, marginRight: 4, color: colors.forest },
  saveRouteText: { color: colors.forest, fontSize: 12, fontWeight: "800" },
  saveRouteTextSaved: { color: colors.success },
  saveRouteError: { color: colors.danger, fontSize: 12, fontWeight: "600", marginTop: spacing.sm },
  saveNameBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,.48)", justifyContent: "flex-end" },
  saveNameSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: spacing.xl },
  sheetHandle: { alignSelf: "center", width: 38, height: 4, borderRadius: 2, backgroundColor: colors.outlineVariant, marginBottom: spacing.lg },
  saveNameTitle: { color: colors.primary, fontSize: 20, fontWeight: "900" },
  saveNameSubtitle: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  saveNameInput: { flex: 1, minHeight: 54, borderWidth: 1, borderColor: colors.forest, borderRadius: radius.md, backgroundColor: colors.card, color: colors.primary, fontSize: 15, fontWeight: "700", paddingHorizontal: spacing.md },
  saveNameInputRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.lg },
  clearSaveName: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", marginLeft: -50, zIndex: 2, backgroundColor: colors.surfaceContainer },
  clearSaveNameText: { color: colors.muted, fontSize: 24, lineHeight: 25 },
  saveNameRequired: { color: colors.muted, fontSize: 11, marginTop: spacing.xs },
  saveNameButton: { minHeight: 52, borderRadius: radius.md, backgroundColor: colors.forest, alignItems: "center", justifyContent: "center", marginTop: spacing.lg },
  saveNameButtonDisabled: { opacity: .45 },
  saveNameButtonText: { color: colors.white, fontSize: 15, fontWeight: "900" },
  saveNameCancel: { minHeight: 46, alignItems: "center", justifyContent: "center" },
  saveNameCancelText: { color: colors.textSecondary, fontSize: 14, fontWeight: "800" },
  compareButton: { marginTop: spacing.sm, minHeight: 48, borderRadius: radius.full },
  compareHint: { color: colors.muted, fontSize: 11, textAlign: "center", marginTop: spacing.xs },
});
