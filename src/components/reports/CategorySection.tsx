import { Fragment } from 'react';
import { ResultCategory } from '../../hooks/useLabReport';
import { ReportTemplate } from '../../hooks/useReportTemplates';

interface CategorySectionProps {
  category: ResultCategory;
  template?: ReportTemplate;
  pageBreakBefore?: boolean;
}

export function CategorySection({ category, template, pageBreakBefore = false }: CategorySectionProps) {
  const colors = template?.colors;
  const resultsSection = template?.resultsSection;

  const primaryColor = colors?.primary || template?.styling?.primaryColor || '#1f2937';
  const categoryHeadingColor = resultsSection?.categoryHeaderColor || '#9f1239';

  const groupedResults = category.results.reduce((groups, result, index) => {
    const panelKey = result.panelCode || result.panelName || '__UNGROUPED__';
    const existingGroup = groups.find((group) => group.key === panelKey);

    if (existingGroup) {
      existingGroup.results.push(result);
      return groups;
    }

    groups.push({
      key: panelKey,
      panelCode: result.panelCode,
      panelName: result.panelName,
      firstIndex: index,
      results: [result],
    });

    return groups;
  }, [] as Array<{ key: string; panelCode?: string; panelName?: string; firstIndex: number; results: ResultCategory['results'] }>);

  groupedResults.sort((a, b) => {
    const aIsPanel = a.key !== '__UNGROUPED__';
    const bIsPanel = b.key !== '__UNGROUPED__';
    if (aIsPanel !== bIsPanel) return aIsPanel ? -1 : 1;
    return a.firstIndex - b.firstIndex;
  });

  const hasPanelGrouping = groupedResults.some((group) => group.panelCode || group.panelName);
  const isInterpretationLayout = category.category === 'immunoassay';
  const isRangeOnlyLayout = category.category === 'microbiology' || category.category === 'urinalysis';
  const useThreeColumns = isInterpretationLayout || isRangeOnlyLayout;

  const thirdColumnLabel = isInterpretationLayout || isRangeOnlyLayout ? 'Interpretation' : 'R.Range';

  return (
    <div
      className={`category-section mb-6 page-break-inside-avoid ${pageBreakBefore ? 'category-page-break' : ''}`}
    >
      <h3
        className="text-3xl font-bold uppercase tracking-wide text-center mb-2"
        style={{ color: categoryHeadingColor }}
      >
        {category.categoryDisplayName}
      </h3>

      {groupedResults.map((group, groupIndex) => {
        const sectionTitle =
          group.panelName ||
          group.panelCode ||
          (hasPanelGrouping ? category.categoryDisplayName : category.categoryDisplayName);

        return (
          <Fragment key={`${category.category}-${group.key}-${groupIndex}`}>
            <table className="results-table w-full border-collapse text-sm mb-4">
              <colgroup>
                {useThreeColumns ? (
                  <>
                    <col style={{ width: '56%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '22%' }} />
                  </>
                ) : (
                  <>
                    <col style={{ width: '52%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '12%' }} />
                  </>
                )}
              </colgroup>
              <thead>
                <tr className="border-y border-gray-400">
                  <th
                    className="text-left py-1.5 px-3 font-bold uppercase"
                    style={{
                      backgroundColor: resultsSection?.tableHeaderColor || colors?.secondary || '#f3f4f6',
                      color: primaryColor,
                    }}
                  >
                    {sectionTitle}
                  </th>
                  <th className="text-left py-1.5 px-3 text-xs font-bold uppercase tracking-wide">Result</th>
                  <th className="text-left py-1.5 px-3 text-xs font-bold uppercase tracking-wide">
                    {useThreeColumns ? thirdColumnLabel : 'Ranges'}
                  </th>
                  {!useThreeColumns && (
                    <th className="text-left py-1.5 px-3 text-xs font-bold uppercase tracking-wide">Unit</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {group.results.map((result) => {
                  const firstColumnValue = isRangeOnlyLayout
                    ? (result.testName || result.testCode)
                    : (result.testCode || result.testName);
                  const thirdColumnValue = useThreeColumns
                    ? (result.comments || result.referenceRange || '-')
                    : (result.referenceRange || '-');

                  return (
                    <tr key={`${result.testCode}-${result.resultedAt}`} className="border-b border-gray-200">
                      <td className="py-1.5 px-3 font-semibold text-sm">{firstColumnValue}</td>
                      <td
                        className="py-1.5 px-3 font-semibold"
                        style={{
                          color:
                            result.flag === 'critical_high' || result.flag === 'critical_low'
                              ? (resultsSection?.criticalColor || colors?.critical || '#dc2626')
                              : result.flag === 'high' || result.flag === 'low'
                                ? (resultsSection?.abnormalColor || colors?.abnormal || '#ea580c')
                                : undefined,
                        }}
                      >
                        {result.value}
                      </td>
                      <td className="py-1.5 px-3 text-sm">{thirdColumnValue}</td>
                      {!useThreeColumns && (
                        <td className="py-1.5 px-3 text-sm">{result.unit || '-'}</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Fragment>
        );
      })}
    </div>
  );
}
