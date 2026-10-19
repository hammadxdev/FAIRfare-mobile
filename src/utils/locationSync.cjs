function programmaticQueryUpdate(current, next, marker) {
  const value = String(next || "");
  marker.current = value;
  return current === value ? current : value;
}
function userQueryUpdate(next, marker) {
  const value = String(next || "");
  if (marker.current === value) { marker.current = null; return { ignored: true, value }; }
  return { ignored: false, value };
}
module.exports = { programmaticQueryUpdate, userQueryUpdate };
