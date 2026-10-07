const { withAndroidManifest } = require("expo/config-plugins");

const PROVIDER_PACKAGES = [
  "sinet.startup.inDriver",
  "com.yandex.yango",
  "com.bykea.pk",
];

const PROVIDER_INTENTS = [
  { scheme: "indrive" },
  { scheme: "bykea" },
  { scheme: "https", host: "yango.go.link" },
];

module.exports = function withProviderQueries(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;
    const queries = manifest.queries || [];

    const packageQuery = queries.find((query) => query.package);
    if (packageQuery) {
      packageQuery.package = packageQuery.package || [];
      for (const name of PROVIDER_PACKAGES) {
        if (!packageQuery.package.some((entry) => entry.$?.["android:name"] === name)) {
          packageQuery.package.push({ $: { "android:name": name } });
        }
      }
    } else {
      queries.push({ package: PROVIDER_PACKAGES.map((name) => ({ $: { "android:name": name } })) });
    }

    const intentQuery = queries.find((query) => query.intent);
    const intents = intentQuery?.intent || [];
    for (const data of PROVIDER_INTENTS) {
      const alreadyPresent = intents.some((intent) => {
        const item = intent.data?.[0]?.$ || {};
        return item["android:scheme"] === data.scheme && item["android:host"] === data.host;
      });
      if (!alreadyPresent) {
        intents.push({
          action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
          category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
          data: [{ $: Object.fromEntries(Object.entries(data).map(([key, value]) => [`android:${key}`, value])) }],
        });
      }
    }
    if (intentQuery) intentQuery.intent = intents;
    else queries.push({ intent: intents });

    manifest.queries = queries;
    return modConfig;
  });
};
