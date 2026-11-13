import { parsePolicyText } from '../../utils/policyText';

export default function PolicyText({ content }) {
  const blocks = parsePolicyText(content);
  return (
    <div className="space-y-4 text-gray-700 leading-relaxed">
      {blocks.map((b, i) => {
        if (b.type === 'h') return <h2 key={i} className="text-lg font-semibold text-gray-900 pt-4">{b.text}</h2>;
        if (b.type === 'ul') {
          return (
            <ul key={i} className="list-disc pl-6 space-y-1">
              {b.items.map((it, j) => <li key={j}>{it}</li>)}
            </ul>
          );
        }
        return <p key={i} className="whitespace-pre-line">{b.text}</p>;
      })}
    </div>
  );
}
