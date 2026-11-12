import { useEffect } from 'react';
import { setPageTitle } from '../utils/pageTitle';

// Page ka title set karta hai; page chhodte hi store ka default title wapas aa jaata hai.
export default function usePageTitle(title) {
  useEffect(() => {
    setPageTitle(title);
    return () => setPageTitle(null);
  }, [title]);
}
