import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import useStorePages from '../../hooks/useStorePages';
import usePageTitle from '../../hooks/usePageTitle';
import Skeleton from '../../components/ui/Skeleton';

export default function FAQ() {
  usePageTitle('FAQs');
  const { data, isLoading, isError, refetch } = useStorePages();
  const faqs = data?.faqs || [];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h1>
      <p className="text-gray-500 mb-8">Quick answers to the questions we hear most.</p>

      {isLoading && <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>}

      {isError && (
        <div className="text-center py-10 space-y-3">
          <p className="text-gray-600">We could not load the FAQs right now.</p>
          <button onClick={() => refetch()} className="btn-primary px-5 py-2.5">Try again</button>
        </div>
      )}

      <div className="space-y-3">
        {faqs.map((f, i) => (
          <details key={i} className="group bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm">
            <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-medium text-gray-900">
              {f.question}
              <ChevronDown size={18} className="flex-shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-gray-600 leading-relaxed whitespace-pre-line">{f.answer}</p>
          </details>
        ))}
      </div>

      <p className="mt-10 text-sm text-gray-500">
        Still need help? <Link to="/contact" className="text-primary font-medium hover:underline">Contact us</Link>
        {' '}or <Link to="/track-order" className="text-primary font-medium hover:underline">track your order</Link>.
      </p>
    </div>
  );
}
