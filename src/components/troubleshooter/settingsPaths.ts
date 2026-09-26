/**
 * Approved Settings navigation paths and verified deeplink whitelist.
 *
 * Source of truth: mirrors APPROVED_DEEPLINKS in deeplink.service.ts.
 * Only verified actions in this map are permitted to attempt intent:// launches.
 */

export const APPROVED_SETTINGS_PATHS: Record<string, { label: string; path: string }> = {
  "android.settings.SETTINGS": {
    label: "Open Settings",
    path: "Settings",
  },
  "android.settings.WIFI_SETTINGS": {
    label: "Open Wi-Fi Settings",
    path: "Settings → Connections → Wi-Fi",
  },
  "android.settings.WIRELESS_SETTINGS": {
    label: "Open Network Settings",
    path: "Settings → Connections",
  },
  "android.settings.AIRPLANE_MODE_SETTINGS": {
    label: "Open Airplane Mode",
    path: "Settings → Connections → Flight mode",
  },
  "android.settings.DATA_USAGE_SETTINGS": {
    label: "Open Data Usage",
    path: "Settings → Connections → Data usage",
  },
  "android.settings.NETWORK_OPERATOR_SETTINGS": {
    label: "Open Mobile Networks",
    path: "Settings → Connections → Mobile networks",
  },
  "android.settings.TETHER_SETTINGS": {
    label: "Open Hotspot & Tethering",
    path: "Settings → Connections → Mobile Hotspot and Tethering",
  },
  "android.settings.VPN_SETTINGS": {
    label: "Open VPN Settings",
    path: "Settings → Connections → More connection settings → VPN",
  },
  "android.settings.BLUETOOTH_SETTINGS": {
    label: "Open Bluetooth Settings",
    path: "Settings → Connections → Bluetooth",
  },
  "android.settings.NFC_SETTINGS": {
    label: "Open NFC Settings",
    path: "Settings → Connections → NFC and contactless payments",
  },
  "android.settings.BATTERY_SAVER_SETTINGS": {
    label: "Open Battery Settings",
    path: "Settings → Battery (or Device care → Battery)",
  },
  "android.settings.DISPLAY_SETTINGS": {
    label: "Open Display Settings",
    path: "Settings → Display",
  },
  "android.settings.SOUND_SETTINGS": {
    label: "Open Sound Settings",
    path: "Settings → Sounds and vibration",
  },
  "android.settings.NOTIFICATION_SETTINGS": {
    label: "Open Notification Settings",
    path: "Settings → Notifications",
  },
  "android.settings.APPLICATION_SETTINGS": {
    label: "Open App Settings",
    path: "Settings → Apps",
  },
  "android.settings.MANAGE_APPLICATIONS_SETTINGS": {
    label: "Open All Apps",
    path: "Settings → Apps",
  },
  "android.settings.MANAGE_ALL_APPLICATIONS_SETTINGS": {
    label: "Open All Apps (Full)",
    path: "Settings → Apps",
  },
  "android.settings.INTERNAL_STORAGE_SETTINGS": {
    label: "Open Storage Settings",
    path: "Settings → Device care → Storage",
  },
  "android.settings.LOCATION_SOURCE_SETTINGS": {
    label: "Open Location Settings",
    path: "Settings → Location",
  },
  "android.settings.SYNC_SETTINGS": {
    label: "Open Accounts & Sync",
    path: "Settings → Accounts and backup → Manage accounts",
  },
  "android.settings.ADD_ACCOUNT_SETTINGS": {
    label: "Add Account",
    path: "Settings → Accounts and backup → Manage accounts → Add account",
  },
  "android.settings.DATE_SETTINGS": {
    label: "Open Date & Time",
    path: "Settings → General management → Date and time",
  },
  "android.settings.ACCESSIBILITY_SETTINGS": {
    label: "Open Accessibility",
    path: "Settings → Accessibility",
  },
  "android.settings.INPUT_METHOD_SETTINGS": {
    label: "Open Keyboard Settings",
    path: "Settings → General management → Keyboard list and default",
  },
  "android.settings.DEVICE_INFO_SETTINGS": {
    label: "Open About Phone",
    path: "Settings → About phone",
  },
  "android.settings.APN_SETTINGS": {
    label: "Open APN Settings",
    path: "Settings → Connections → Mobile networks → Access Point Names",
  },
  "android.settings.SECURITY_SETTINGS": {
    label: "Open Security Settings",
    path: "Settings → Security and privacy",
  },
};

/**
 * Validates that an action string is explicitly in the approved list.
 * Arbitrary LLM strings or unresolved steps evaluate to false.
 */
export function isApprovedSettingsDeeplink(action: string | null | undefined): boolean {
  if (!action || action === "unresolved") return false;
  return Object.prototype.hasOwnProperty.call(APPROVED_SETTINGS_PATHS, action);
}

/**
 * Returns the human-navigable Samsung One UI / Android Settings path.
 */
export function getSettingsNavPath(action: string | null | undefined): string | null {
  if (!action || !isApprovedSettingsDeeplink(action)) return null;
  return APPROVED_SETTINGS_PATHS[action]?.path ?? null;
}
