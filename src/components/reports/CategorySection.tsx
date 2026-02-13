import { ResultCategory } from '../../hooks/useLabReport';
import { ResultRow } from './ResultRow';

interface CategorySectionProps {
  category: ResultCategory;
}

export function CategorySection({ category }: CategorySectionProps) {
  return (
    <div className="category-section mb-6 page-break-inside-avoid">
      <h3 className="category-header bg-blue-100 text-blue-900 font-bold text-sm uppercase px-3 py-2 mb-2 rounded">
        {category.categoryDisplayName}
      </h3>
      <table className="results-table w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b-2 border-gray-300">
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700 uppercase">
              Test
            </th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700 uppercase">
              Result
            </th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700 uppercase">
              Unit
            </th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700 uppercase">
              Reference Range
            </th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700 uppercase">
              Flag
            </th>
          </tr>
        </thead>
        <tbody>
          {category.results.map((result) => (
            <ResultRow key={result.testCode} result={result} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
