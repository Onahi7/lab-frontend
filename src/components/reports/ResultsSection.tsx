import { ResultCategory } from '../../hooks/useLabReport';
import { CategorySection } from './CategorySection';

interface ResultsSectionProps {
  resultsByCategory: ResultCategory[];
}

export function ResultsSection({ resultsByCategory }: ResultsSectionProps) {
  return (
    <div className="results-section mb-6">
      {resultsByCategory.map((category) => (
        <CategorySection key={category.category} category={category} />
      ))}
    </div>
  );
}
