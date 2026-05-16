import { PanelInterpretationInfo } from '../../hooks/useLabReport';
import { Sparkles } from 'lucide-react';

interface InterpretationsSectionProps {
  panelInterpretations: PanelInterpretationInfo[];
}

export function InterpretationsSection({ panelInterpretations }: InterpretationsSectionProps) {
  // Only show interpretations that have AI-generated content
  const aiInterpretations = panelInterpretations.filter(
    (interp) => interp.interpretation && interp.aiProvider
  );

  if (aiInterpretations.length === 0) {
    return null;
  }

  return (
    <div className="interpretations-section mb-4 px-4">
      <h3 className="text-[16px] font-bold uppercase tracking-wide text-gray-800 mb-3 flex items-center gap-2 border-b-2 border-purple-200 pb-2">
        <Sparkles className="h-5 w-5 text-purple-600" />
        Clinical Interpretations
      </h3>
      
      <div className="space-y-3">
        {aiInterpretations.map((interp) => (
          <div
            key={interp.panelCode}
            className="interpretation-item border-l-4 border-purple-400 bg-purple-50/50 px-3 py-2 rounded-r"
          >
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              {interp.panelName || interp.panelCode}
            </h4>
            <p className="text-xs text-gray-700 leading-relaxed">
              {interp.interpretation}
            </p>
            <p className="text-[10px] text-purple-600 mt-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              AI-generated interpretation ({interp.aiProvider})
            </p>
          </div>
        ))}
      </div>
      
      <p className="text-[10px] text-gray-500 mt-3 italic">
        Note: AI interpretations are provided as clinical guidance. Please consult with your healthcare provider for personalized medical advice.
      </p>
    </div>
  );
}
