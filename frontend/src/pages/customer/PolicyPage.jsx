import { Link } from 'react-router-dom';
import useStorePages from '../../hooks/useStorePages';
import usePageTitle from '../../hooks/usePageTitle';
import PolicyText from '../../components/common/PolicyText';
import Skeleton from '../../components/ui/Skeleton';

const POLICY_LINKS = [
  { kind: 'terms',    label: 'Terms & Conditions',   to: '/terms' },
  { kind: 'privacy',  label: 'Privacy Policy',       to: '/privacy' },
  { kind: 'shipping', label: 'Shipping Policy',      to: '/shipping-policy' },
  { kind: 'returns',  label: 'Return & Refund Policy', to: '/returns-policy' },
];

// Terms / Privacy / Shipping / Returns: text Admin -> Store Pages se (ya Settings se bana default)
export default function PolicyPage({ kind }) {
  const { data, isLoading, isError, refetch } = useStorePages();
  const fallbackTitle = POLICY_LINKS.find((p) => p.kind === kind)?.label || 'Policy';
  const page = data?.pages?.[kind];
  usePageTitle(page?.title || fallbackTitle);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{page?.title || fallbackTitle}</h1>

      {isLoading && <div className="space-y-3"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>}

      {isError && (
        <div className="text-center py-10 space-y-3">
          <p className="text-gray-600">We could not load this page right now.</p>
          <button onClick={() => refetch()} className="btn-primary px-5 py-2.5">Try again</button>
        </div>
      )}

      {page && <PolicyText content={page.content} />}

      <div className="mt-12 pt-6 border-t border-gray-100 text-sm text-gray-500 flex flex-wrap gap-x-5 gap-y-2">
        {POLICY_LINKS.filter((p) => p.kind !== kind).map((p) => (
          <Link key={p.kind} to={p.to} className="hover:text-primary hover:underline">{p.label}</Link>
        ))}
        <Link to="/contact" className="hover:text-primary hover:underline">Contact Us</Link>
      </div>
    </div>
  );
}
