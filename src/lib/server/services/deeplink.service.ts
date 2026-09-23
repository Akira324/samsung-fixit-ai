/**
 * Deeplink mapping layer.
 *
 * Only verified Android Settings intent actions live here. Anything the LLM or
 * the knowledge base asks for that is not in this map resolves to "unresolved"
 * and is rendered as a manual step in the UI. Samsung-specific deeplinks can be
 * appended to APPROVED_DEEPLINKS later without touching any other layer.
 */

export const APPROVED_DEEPLINKS: Record<string, { label: string; verified: true }> = {
  // ---- Standard AOSP Settings intents (verified) ----
  "android.settings.SETTINGS": { label: "Open Settings", verified: true },
  "android.settings.WIFI_SETTINGS": { label: "Open Wi-Fi Settings", verified: true },
  "android.settings.WIRELESS_SETTINGS": { label: "Open Network Settings", verified: true },
  "android.settings.AIRPLANE_MODE_SETTINGS": { label: "Open Airplane Mode", verified: true },
  "android.settings.DATA_USAGE_SETTINGS": { label: "Open Data Usage", verified: true },
  "android.settings.NETWORK_OPERATOR_SETTINGS": { label: "Open Mobile Networks", verified: true },
  "android.settings.TETHER_SETTINGS": { label: "Open Hotspot & Tethering", verified: true },
  "android.settings.VPN_SETTINGS": { label: "Open VPN Settings", verified: true },
  "android.settings.BLUETOOTH_SETTINGS": { label: "Open Bluetooth Settings", verified: true },
  "android.settings.NFC_SETTINGS": { label: "Open NFC Settings", verified: true },
  "android.settings.BATTERY_SAVER_SETTINGS": { label: "Open Battery Settings", verified: true },
  "android.settings.DISPLAY_SETTINGS": { label: "Open Display Settings", verified: true },
  "android.settings.SOUND_SETTINGS": { label: "Open Sound Settings", verified: true },
  "android.settings.NOTIFICATION_SETTINGS": { label: "Open Notification Settings", verified: true },
  "android.settings.APPLICATION_SETTINGS": { label: "Open App Settings", verified: true },
  "android.settings.MANAGE_APPLICATIONS_SETTINGS": { label: "Open All Apps", verified: true },
  "android.settings.MANAGE_ALL_APPLICATIONS_SETTINGS": { label: "Open All Apps (Full)", verified: true },
  "android.settings.INTERNAL_STORAGE_SETTINGS": { label: "Open Storage Settings", verified: true },
  "android.settings.LOCATION_SOURCE_SETTINGS": { label: "Open Location Settings", verified: true },
  "android.settings.SYNC_SETTINGS": { label: "Open Accounts & Sync", verified: true },
  "android.settings.ADD_ACCOUNT_SETTINGS": { label: "Add Account", verified: true },
  "android.settings.DATE_SETTINGS": { label: "Open Date & Time", verified: true },
  "android.settings.ACCESSIBILITY_SETTINGS": { label: "Open Accessibility", verified: true },
  "android.settings.INPUT_METHOD_SETTINGS": { label: "Open Keyboard Settings", verified: true },
  "android.settings.DEVICE_INFO_SETTINGS": { label: "Open About Phone", verified: true },
  "android.settings.APN_SETTINGS": { label: "Open APN Settings", verified: true },
  "android.settings.SECURITY_SETTINGS": { label: "Open Security Settings", verified: true },
};

export const UNRESOLVED = "unresolved" as const;

/** Loose hints the LLM may emit instead of an exact intent action. */
const HINT_MAP: Record<string, string> = {
  wifi: "android.settings.WIFI_SETTINGS",
  "wi-fi": "android.settings.WIFI_SETTINGS",
  bluetooth: "android.settings.BLUETOOTH_SETTINGS",
  hotspot: "android.settings.TETHER_SETTINGS",
  tethering: "android.settings.TETHER_SETTINGS",
  "mobile data": "android.settings.DATA_USAGE_SETTINGS",
  battery: "android.settings.BATTERY_SAVER_SETTINGS",
  display: "android.settings.DISPLAY_SETTINGS",
  screen: "android.settings.DISPLAY_SETTINGS",
  sound: "android.settings.SOUND_SETTINGS",
  audio: "android.settings.SOUND_SETTINGS",
  notifications: "android.settings.NOTIFICATION_SETTINGS",
  storage: "android.settings.INTERNAL_STORAGE_SETTINGS",
  apps: "android.settings.APPLICATION_SETTINGS",
  location: "android.settings.LOCATION_SOURCE_SETTINGS",
  accounts: "android.settings.SYNC_SETTINGS",
  settings: "android.settings.SETTINGS",
  nfc: "android.settings.NFC_SETTINGS",
  contactless: "android.settings.NFC_SETTINGS",
  keyboard: "android.settings.INPUT_METHOD_SETTINGS",
  fingerprint: "android.settings.SECURITY_SETTINGS",
  biometric: "android.settings.SECURITY_SETTINGS",
  biometrics: "android.settings.SECURITY_SETTINGS",
  "about phone": "android.settings.DEVICE_INFO_SETTINGS",
  vpn: "android.settings.VPN_SETTINGS",
  airplane: "android.settings.AIRPLANE_MODE_SETTINGS",
  "airplane mode": "android.settings.AIRPLANE_MODE_SETTINGS",
  date: "android.settings.DATE_SETTINGS",
  time: "android.settings.DATE_SETTINGS",
  apn: "android.settings.APN_SETTINGS",
  accessibility: "android.settings.ACCESSIBILITY_SETTINGS",
  security: "android.settings.SECURITY_SETTINGS",
  "mobile network": "android.settings.NETWORK_OPERATOR_SETTINGS",
  "mobile networks": "android.settings.NETWORK_OPERATOR_SETTINGS",
};

export function isApproved(deeplink: string | null | undefined): boolean {
  return !!deeplink && deeplink in APPROVED_DEEPLINKS;
}

export function deeplinkLabel(deeplink: string): string | null {
  return APPROVED_DEEPLINKS[deeplink]?.label ?? null;
}

/**
 * Resolve any candidate value to an approved deeplink, or UNRESOLVED.
 * Never fabricates: unknown values degrade instead of being invented.
 */
export function resolveDeeplink(candidate: string | null | undefined): string {
  if (!candidate) return UNRESOLVED;
  const raw = candidate.trim();
  if (isApproved(raw)) return raw;

  const upper = raw.toUpperCase().replace(/[^A-Z_]/g, "");
  const byAction = Object.keys(APPROVED_DEEPLINKS).find(
    (key) => key.split(".").pop() === upper,
  );
  if (byAction) return byAction;

  const lower = raw.toLowerCase();
  for (const [hint, action] of Object.entries(HINT_MAP)) {
    if (lower.includes(hint)) return action;
  }
  return UNRESOLVED;
}
