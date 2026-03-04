const envVariant = import.meta.env.VITE_APP_VARIANT;

function detectVariantFromBaseUrl() {
  const baseUrl = import.meta.env.BASE_URL || '/';

  const variants = ['wal', 'wal2', 'nier'];
  const found = variants.find(v => baseUrl.startsWith(`/${v}/`));

  return found || 'local';
}

export const APP_VARIANT = envVariant || detectVariantFromBaseUrl();
export const APP_BASE_URL = import.meta.env.BASE_URL || '/';
