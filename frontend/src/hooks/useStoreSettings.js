import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { config } from '../config';
import { readCachedSettings, writeCachedSettings, settingsLoaded } from '../utils/storeBrand';

export const PUBLIC_SETTINGS_KEY = ['public-settings'];

// Storefront ka EK source: GET /api/settings/public (Admin -> Settings). Navbar, Footer, badges,
// cart delivery, Razorpay popup, page title sab isi se. VITE_CLIENT_NAME sirf pehle-load ka fallback hai.
export default function useStoreSettings() {
  const { data } = useQuery({
    queryKey: PUBLIC_SETTINGS_KEY,
    queryFn: async () => {
      const s = (await api.get('/settings/public')).data?.data || {};
      writeCachedSettings(s);
      return s;
    },
    initialData: readCachedSettings,
    initialDataUpdatedAt: 0, // cache purana maana jaye: dikhao, par turant naya laao
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  const settings = data || {};
  return {
    settings,
    loaded: settingsLoaded(settings),
    brandName: settings.storeName || config.clientName,
  };
}
