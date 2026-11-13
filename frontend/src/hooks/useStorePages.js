import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

// Terms / Privacy / Shipping / Returns / FAQs (admin ka text ya settings se bana default).
// Admin -> Store Pages isi key ko invalidate karta hai, isliye save ke baad yahan naya text aata hai.
export default function useStorePages() {
  return useQuery({
    queryKey: ['store-pages'],
    queryFn: () => api.get('/settings/pages').then((r) => r.data?.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
