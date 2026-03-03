const envVariant = import.meta.env.VITE_APP_VARIANT;

function detectVariantFromBaseUrl() {
  const baseUrl = import.meta.env.BASE_URL || '/';

  if (baseUrl.startsWith('/wal/')) return 'wal';
  if (baseUrl.startsWith('/wal2/')) return 'wal2';
  return 'local';
}

export const APP_VARIANT = envVariant || detectVariantFromBaseUrl();
export const APP_BASE_URL = import.meta.env.BASE_URL || '/';
