import { Fragment } from 'react';
import { PageCategory } from './SmartPaginatedReport';
import { ReportTemplate } from '../../hooks/useReportTemplates';

interface PaginatedCategorySectionProps {
  pageCategory: PageCategory;
  template?: ReportTemplate;
}

/**
 * Renders a category section for a single page
 * Handles continuation markers and panel grouping
 */
export function PaginatedCategorySection({ pageCategory, template }: PaginatedCategorySectionProps) {
  const colors = template?.colors;
  const resultsSection = template?.resultsSection;

  const primaryColor = colors?.primary || template?.styling?.primaryColor || '#1e3a8a';
  const categoryHeadingColor = resultsSection?.categoryHeaderColor || '#dc2626';
  const tableHeaderBg = resultsSection?.tableHeaderColor || colors?.secondary || '#f3f4f6';

  // Determine if this category uses special layouts
  const isInterpretationLayout = pageCategory.category === 'immunoassay' || pageCategory.category === 'serology';
  const isRangeOnlyLayout = pageCategory.category === 'microbiology' || pageCategory.category === 'urinalysis';
  const useThreeColumns = isInterpretationLayout || isRangeOnlyLayout;
  const thirdColumnLabel = isInterpretationLayout || isRangeOnlyLayout ? 'Interpretation' : 'R.Range';

  // Shared header cell styles for consistency
  const headerCellClass = "text-left py-1 px-3 font-semibold uppercase text-xs";

  return (
    <div className="category-section mb-4">
      {/* Category title */}
      <h3
        className="text-xl font-extrabold uppercase tracking-wide text-center mb-1"
        style={{ color: categoryHeadingColor, fontWeight: 800 }}
      >
        {pageCategory.categoryDisplayName}
      </h3>

      {/* Render each panel */}
      {pageCategory.panels.map((panel, panelIndex) => {
        const panelTitle = panel.panelName || panel.panelCode;
        const showPanelHeader = Boolean(panelTitle);

        // Check if tests have subcategories (e.g., urinalysis)
        const hasSubcategories = panel.results.some(r => r.subcategory);
        
        // Group results by subcategory if they exist
        const subcategoryMap = new Map<string, typeof panel.results>();
        if (hasSubcategories) {
          for (const result of panel.results) {
            const subcategory = result.subcategory || 'Other';
            if (!subcategoryMap.has(subcategory)) {
              subcategoryMap.set(subcategory, []);
            }
            subcategoryMap.get(subcategory)!.push(result);
          }
        }

        return (
          <Fragment key={`panel-${panelIndex}`}>
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
                {/* Panel name row - show if there's a specific panel */}
                {showPanelHeader && (
                  <tr>
                    <th
                      colSpan={useThreeColumns ? 3 : 4}
                      className="text-left py-1 px-3 font-bold uppercase text-sm border-b border-gray-300"
                      style={{
                        backgroundColor: '#f9fafb',
                        color: primaryColor,
                      }}
                    >
                      {panelTitle}
                    </th>
                  </tr>
                )}
                {/* Table header row — all columns get the same background */}
                <tr className="border-y border-gray-400">
                  <th
                    className={headerCellClass}
                    style={{ backgroundColor: tableHeaderBg, color: primaryColor }}
                  >
                    Test
                  </th>
                  <th
                    className={headerCellClass}
                    style={{ backgroundColor: tableHeaderBg, color: primaryColor }}
                  >
                    Result
                  </th>
                  <th
                    className={headerCellClass}
                    style={{ backgroundColor: tableHeaderBg, color: primaryColor }}
                  >
                    {useThreeColumns ? thirdColumnLabel : 'Range'}
                  </th>
                  {!useThreeColumns && (
                    <th
                      className={headerCellClass}
                      style={{ backgroundColor: tableHeaderBg, color: primaryColor }}
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
                        {results.map((result, resultIndex) => {
                          const firstColumnValue = result.testName || result.testCode;
                          const thirdColumnValue = useThreeColumns
                            ? (result.comments || result.referenceRange || '-')
                            : (result.referenceRange || '-');

                          return (
                            <tr key={`result-${resultIndex}`} className="border-b border-gray-200">
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
                              <td className="py-0.5 px-3 text-sm">
                                {typeof thirdColumnValue === 'string' ? thirdColumnValue.replace(/(\d)-(\d)/g, '$1 – $2') : thirdColumnValue}
                              </td>
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
                  panel.results.map((result, resultIndex) => {
                    const firstColumnValue = result.testName || result.testCode;
                    const thirdColumnValue = useThreeColumns
                      ? (result.comments || result.referenceRange || '-')
                      : (result.referenceRange || '-');

                    return (
                      <tr key={`result-${resultIndex}`} className="border-b border-gray-200">
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
                        <td className="py-0.5 px-3 text-sm">
                          {typeof thirdColumnValue === 'string' ? thirdColumnValue.replace(/(\d)-(\d)/g, '$1 – $2') : thirdColumnValue}
                        </td>
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
            {panel.panelCode === 'FBC' && panel.results.some(r => r.testCode === 'WBC' && r.comments) && (
              <div className="mt-1 px-3 py-1 text-xs font-medium text-gray-700 border-t border-gray-200">
                {panel.results.find(r => r.testCode === 'WBC')?.comments}
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
