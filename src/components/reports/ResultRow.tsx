import { ResultItem } from '../../hooks/useLabReport';

interface ResultRowProps {
  result: ResultItem;
}

export function ResultRow({ result }: ResultRowProps) {
  const getFlagIndicator = (flag: string) => {
    if (flag === 'high' || flag === 'critical_high') return '↑';
    if (flag === 'low' || flag === 'critical_low') return '↓';
    return '';
  };

  const getFlagClass = (flag: string) => {
    if (flag === 'critical_high' || flag === 'critical_low') {
      return 'text-red-600 font-bold';
    }
    if (flag === 'high' || flag === 'low') {
      return 'text-orange-600';
    }
    return 'text-black';
  };

  const getFlagLabel = (flag: string) => {
    if (flag === 'normal') return 'Normal';
    return flag.replace('_', ' ').toUpperCase();
  };

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50">
      <td className="py-2 px-3">
        <div className="font-semibold text-sm">{result.testCode}</div>
        <div className="text-xs text-gray-600">{result.testName}</div>
        {result.isAmended && (
          <div className="text-xs text-orange-600 font-semibold mt-1">
            AMENDED
            {result.amendmentReason && (
              <span className="text-gray-600 font-normal"> - {result.amendmentReason}</span>
            )}
          </div>
        )}
      </td>
      <td className={`py-2 px-3 ${getFlagClass(result.flag)}`}>
        <span className="font-semibold">{result.value}</span>
        {getFlagIndicator(result.flag) && (
          <span className="ml-1 text-lg">{getFlagIndicator(result.flag)}</span>
        )}
      </td>
      <td className="py-2 px-3 text-sm">{result.unit || '-'}</td>
      <td className="py-2 px-3 text-sm">{result.referenceRange || '-'}</td>
      <td className={`py-2 px-3 text-sm ${getFlagClass(result.flag)}`}>
        {getFlagLabel(result.flag)}
      </td>
    </tr>
  );
}
