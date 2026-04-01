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

  const primaryColor = colors?.primary || template?.styling?.primaryColor || '#1e3a8a';
  const categoryHeadingColor = resultsSection?.categoryHeaderColor || primaryColor;

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
  const isInterpretationLayout = category.category === 'immunoassay' || category.category === 'serology';
  const isRangeOnlyLayout = category.category === 'microbiology' || category.category === 'urinalysis';
  const useThreeColumns = isInterpretationLayout || isRangeOnlyLayout;

  const thirdColumnLabel = isInterpretationLayout || isRangeOnlyLayout ? 'Interpretation' : 'R.Range';

  return (
    <div className={`category-section mb-4`}>
      <h3
        className="text-xl font-extrabold uppercase tracking-wide text-center mb-1"
        style={{ color: categoryHeadingColor }}
      >
        {category.categoryDisplayName}
      </h3>

      {groupedResults.map((group, groupIndex) => {
        const sectionTitle =
          group.panelName ||
          group.panelCode ||
          (hasPanelGrouping ? category.categoryDisplayName : category.categoryDisplayName);

        // Check if tests have subcategories (e.g., urinalysis)
        const hasSubcategories = group.results.some(r => r.subcategory);
        
        // Group results by subcategory if they exist
        const subcategoryMap = new Map<string, typeof group.results>();
        if (hasSubcategories) {
          for (const result of group.results) {
            const subcategory = result.subcategory || 'Other';
            if (!subcategoryMap.has(subcategory)) {
              subcategoryMap.set(subcategory, []);
            }
            subcategoryMap.get(subcategory)!.push(result);
          }
        }

        return (
          <Fragment key={`${category.category}-${group.key}-${groupIndex}`}>
            <table className="results-table w-full border-collapse text-sm mb-3">
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
                {/* Panel name row - only show if there's a specific panel */}
                {(group.panelName || group.panelCode) && group.key !== '__UNGROUPED__' && (
                  <tr>
                    <th
                      colSpan={useThreeColumns ? 3 : 4}
                      className="text-left py-1 px-3 font-bold uppercase text-sm border-b border-gray-300"
                      style={{
                        backgroundColor: '#f9fafb',
                        color: primaryColor,
                      }}
                    >
                      {sectionTitle}
                    </th>
                  </tr>
                )}
                <tr className="border-y border-gray-400">
                  <th
                    className="text-left py-1 px-3 font-semibold uppercase text-xs"
                    style={{
                      backgroundColor: resultsSection?.tableHeaderColor || colors?.secondary || '#f3f4f6',
                      color: primaryColor,
                    }}
                  >
                    Test
                  </th>
                  <th
                    className="text-left py-1 px-3 font-semibold uppercase text-xs"
                    style={{
                      backgroundColor: resultsSection?.tableHeaderColor || colors?.secondary || '#f3f4f6',
                      color: primaryColor,
                    }}
                  >
                    Result
                  </th>
                  <th
                    className="text-left py-1 px-3 font-semibold uppercase text-xs"
                    style={{
                      backgroundColor: resultsSection?.tableHeaderColor || colors?.secondary || '#f3f4f6',
                      color: primaryColor,
                    }}
                  >
                    {useThreeColumns ? thirdColumnLabel : 'Range'}
                  </th>
                  {!useThreeColumns && (
                    <th
                      className="text-left py-1 px-3 font-semibold uppercase text-xs"
                      style={{
                        backgroundColor: resultsSection?.tableHeaderColor || colors?.secondary || '#f3f4f6',
                        color: primaryColor,
                      }}
                    >
                      Unit
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {hasSubcategories ? (
                  // Render results grouped by subcategory
                  <>
                    {Array.from(subcategoryMap.entries()).map(([subcategory, results], subIndex) => (
                      <Fragment key={`subcategory-${subIndex}`}>
                        {/* Subcategory header row */}
                        <tr>
                          <td
                            colSpan={useThreeColumns ? 3 : 4}
                            className="py-1 px-3 font-semibold uppercase text-xs bg-gray-50 border-y border-gray-300"
                            style={{ color: primaryColor }}
                          >
                            {subcategory}
                          </td>
                        </tr>
                        {/* Results for this subcategory */}
                        {results.map((result) => {
                          const firstColumnValue = result.testName || result.testCode;
                          const thirdColumnValue = useThreeColumns
                            ? (result.comments || result.referenceRange || '-')
                            : (result.referenceRange || '-');

                          return (
                            <tr key={`${result.testCode}-${result.resultedAt}`} className="border-b border-gray-200">
                              <td className="py-0.5 px-3 font-medium text-sm">{firstColumnValue}</td>
                              <td
                                className="py-0.5 px-3 font-semibold whitespace-nowrap"
                                style={{
                                  color:
                                    result.flag === 'critical_high' || result.flag === 'critical_low'
                                      ? (resultsSection?.criticalColor || colors?.critical || '#dc2626')
                                      : result.flag === 'high' || result.flag === 'low'
                                        ? (resultsSection?.abnormalColor || colors?.abnormal || '#dc2626')
                                        : undefined,
                                }}
                              >
                                {result.value}
                                {(result.flag === 'high' || result.flag === 'critical_high') && (
                                  <span style={{ marginLeft: '4px', fontSize: '0.85em' }}>&#x2191;</span>
                                )}
                                {(result.flag === 'low' || result.flag === 'critical_low') && (
                                  <span style={{ marginLeft: '4px', fontSize: '0.85em' }}>&#x2193;</span>
                                )}
                              </td>
                              <td className="py-0.5 px-3 text-sm">{typeof thirdColumnValue === 'string' ? thirdColumnValue.replace(/(\d)-(\d)/g, '$1 – $2') : thirdColumnValue}</td>
                              {!useThreeColumns && (
                                <td className="py-0.5 px-3 text-sm">{result.unit || '-'}</td>
                              )}
                            </tr>
                          );
                        })}
                      </Fragment>
                    ))}
                  </>
                ) : (
                  // Render results without subcategory grouping
                  group.results.map((result) => {
                    const firstColumnValue = result.testName || result.testCode;
                    const thirdColumnValue = useThreeColumns
                      ? (result.comments || result.referenceRange || '-')
                      : (result.referenceRange || '-');

                    return (
                      <tr key={`${result.testCode}-${result.resultedAt}`} className="border-b border-gray-200">
                        <td className="py-0.5 px-3 font-medium text-sm">{firstColumnValue}</td>
                        <td
                          className="py-0.5 px-3 font-semibold whitespace-nowrap"
                          style={{
                            color:
                              result.flag === 'critical_high' || result.flag === 'critical_low'
                                ? (resultsSection?.criticalColor || colors?.critical || '#dc2626')
                                : result.flag === 'high' || result.flag === 'low'
                                  ? (resultsSection?.abnormalColor || colors?.abnormal || '#dc2626')
                                  : undefined,
                          }}
                        >
                          {result.value}
                          {(result.flag === 'high' || result.flag === 'critical_high') && (
                            <span style={{ marginLeft: '4px', fontSize: '0.85em' }}>&#x2191;</span>
                          )}
                          {(result.flag === 'low' || result.flag === 'critical_low') && (
                            <span style={{ marginLeft: '4px', fontSize: '0.85em' }}>&#x2193;</span>
                          )}
                        </td>
                        <td className="py-0.5 px-3 text-sm">{typeof thirdColumnValue === 'string' ? thirdColumnValue.replace(/(\d)-(\d)/g, '$1 – $2') : thirdColumnValue}</td>
                        {!useThreeColumns && (
                          <td className="py-0.5 px-3 text-sm">{result.unit || '-'}</td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* FBC Panel Interpretation Message - display after FBC panel */}
            {group.panelCode === 'FBC' && group.results.some(r => r.testCode === 'WBC' && r.comments) && (
              <div className="mt-1 px-3 py-1 text-xs font-medium text-gray-700 border-t border-gray-200">
                {group.results.find(r => r.testCode === 'WBC')?.comments}
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
