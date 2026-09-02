import { MultiSelect } from './MultiSelect';
import {
  RULE_MORE_FILTER_FIELDS,
  type RuleFilterOptions,
  type RuleFilterState,
} from './RuleFilterDrawer';

interface RuleFilterPanelProps {
  isOpen: boolean;
  options: RuleFilterOptions;
  filters: RuleFilterState;
  onFilterChange: (key: keyof RuleFilterState, value: string[]) => void;
  onReset: () => void;
}

export function RuleFilterPanel({
  isOpen,
  options,
  filters,
  onFilterChange,
  onReset,
}: RuleFilterPanelProps) {
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
        isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className="overflow-hidden">
        <div className="pt-3 mt-3 border-t border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {RULE_MORE_FILTER_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key} className="min-w-0">
                <label className="block text-xs text-[#666666] mb-1.5 whitespace-nowrap truncate" title={label}>
                  {label}
                </label>
                <MultiSelect
                  value={filters[key]}
                  onChange={(value) => onFilterChange(key, value)}
                  options={options[key]}
                  placeholder={placeholder}
                  disabled={options[key].length === 0}
                  compact
                />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={onReset}
              className="text-[#ff9800] hover:text-[#f57c00] transition-colors font-normal text-sm"
            >
              Reset more filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
