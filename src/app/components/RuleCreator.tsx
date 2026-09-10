import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Info, ArrowLeft, Copy } from 'lucide-react';
import {
  buildDuplicateFormState,
  generateDuplicateRuleName,
  isDefineRuleUnchanged,
  isDuplicateNameTaken,
} from '../utils/ruleDuplicate';
import {
  DEFAULT_DEFINE_RULE_ATTRIBUTES,
  RULE_VENDOR_PRICE_OPTIONS,
  resolveSelectedOptions,
} from '../constants/ruleDefineOptions';
import { DefineRuleSection, getDefineRuleSectionValues } from './DefineRuleSection';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { MultiSelect } from './MultiSelect';

interface RuleCreatorProps {
  onSave: (rule: any) => void;
  onCancel: () => void;
  editingRule?: any;
  mode?: 'create' | 'duplicate';
  sourceRule?: any;
  existingRuleNames?: string[];
}

const defaultFirstCondition = {
  enabled: true,
  leftMinMax: 'Min',
  leftOptions: [] as string[],
  leftValue: '',
  operator: 'Less or Equal',
  rightMinMax: 'Min',
  rightOptions: [] as string[],
  rightValue: '',
};

const defaultConditionalRule = {
  enabled: true,
  type: 'if',
  mainCondition: { type: 'Utilization', operator: 'Less than', value: '', valueEnd: '', unit: '%', utilizationType: 'Actual' },
  subConditions: [{
    connector: 'And',
    type: 'Days out',
    dateRangeType: 'daysOut',
    operator: 'Less than or equal to',
    value: '',
    valueEnd: '',
    unit: 'days',
    pickupStartDate: '',
    pickupEndDate: ''
  }],
  actions: [],
  selectedDays: [] as string[],
  valueDetails: {
    value: '',
    priceEndsWith: ''
  },
  currentPriceDetails: {
    currentPrice: '',
    currentPriceUnit: '$',
    byFix: 'Lower',
    min: 'Min',
    minMaxOptions: [] as string[],
    minMaxValue: '',
    minMaxValueUnit: '%',
    minMaxOperators: '',
    minMaxOperatorsUnit: '%',
    priceEndsWith: '',
    priceEndsWithUnit: '%'
  },
  vendorPriceDetails: {
    currentPrice: '',
    currentPriceUnit: '$',
    byFix: 'Lower',
    min: 'Min',
    minMaxOptionsTop: [] as string[],
    minMaxOptions: [] as string[],
    minMaxValue: '',
    minMaxValueUnit: '%',
    minMaxOperators: '',
    minMaxOperatorsUnit: '%',
    priceEndsWith: '',
    priceEndsWithUnit: '%',
    butNoInputValue: '',
    butNoCheckbox: false
  }
};

function buildInitialRuleData(editingRule?: any) {
  return {
    name: editingRule?.name || '',
    description: editingRule?.description || '',
    brand: editingRule?.brand || DEFAULT_DEFINE_RULE_ATTRIBUTES.brand,
    pickupLocation: editingRule?.pickupLocation || DEFAULT_DEFINE_RULE_ATTRIBUTES.pickupLocation,
    sameDropoff: editingRule?.sameDropoff ?? DEFAULT_DEFINE_RULE_ATTRIBUTES.sameDropoff,
    dropOffLocation:
      editingRule?.dropOffLocation || DEFAULT_DEFINE_RULE_ATTRIBUTES.dropOffLocation,
    productCode: editingRule?.productCode || DEFAULT_DEFINE_RULE_ATTRIBUTES.productCode,
    lor: editingRule?.lor?.length
      ? editingRule.lor
      : editingRule?.lors?.length
        ? editingRule.lors
        : DEFAULT_DEFINE_RULE_ATTRIBUTES.lor,
    carCode: editingRule?.carCode || DEFAULT_DEFINE_RULE_ATTRIBUTES.carCode,
    locations: editingRule?.pickupLocation || editingRule?.locations || DEFAULT_DEFINE_RULE_ATTRIBUTES.pickupLocation,
    productTypes: editingRule?.productCode
      ? [editingRule.productCode]
      : editingRule?.productTypes || [DEFAULT_DEFINE_RULE_ATTRIBUTES.productCode],
    lors: editingRule?.lors?.length
      ? editingRule.lors
      : editingRule?.lor?.length
        ? editingRule.lor
        : DEFAULT_DEFINE_RULE_ATTRIBUTES.lor,
    fleetTypes: editingRule?.carCode || editingRule?.fleetTypes || DEFAULT_DEFINE_RULE_ATTRIBUTES.carCode,
    firstConditions: editingRule?.firstConditions
      ? structuredClone(editingRule.firstConditions)
      : [defaultFirstCondition],
    conditionalRules: editingRule?.conditionalRules
      ? structuredClone(editingRule.conditionalRules)
      : [structuredClone(defaultConditionalRule)],
    elseCondition: editingRule?.elseCondition || {
      enabled: false,
      action: { type: '', value: '', valueType: 'percentage' }
    }
  };
}

export function RuleCreator({
  onSave,
  onCancel,
  editingRule,
  mode = 'create',
  sourceRule,
  existingRuleNames = [],
}: RuleCreatorProps) {
  const isDuplicateMode = mode === 'duplicate' && sourceRule;
  const duplicateInit = isDuplicateMode
    ? buildDuplicateFormState(
        sourceRule,
        generateDuplicateRuleName(sourceRule.name, existingRuleNames)
      )
    : null;

  const [ruleData, setRuleData] = useState(() => {
    if (duplicateInit) {
      const { schedule: _schedule, scheduleData: _scheduleData, hasFullConfig: _hasFullConfig, hasCopiedSchedule: _hasCopiedSchedule, ...formData } = duplicateInit;
      return formData;
    }
    return buildInitialRuleData(editingRule);
  });

  const [copiedSchedule, setCopiedSchedule] = useState(
    duplicateInit?.schedule ?? 'Not scheduled'
  );
  const [copiedScheduleData, setCopiedScheduleData] = useState(
    duplicateInit?.scheduleData
  );

  useEffect(() => {
    if (!isDuplicateMode) {
      return;
    }
    const timer = window.setTimeout(() => {
      const input = document.getElementById('rule-name-input') as HTMLInputElement | null;
      input?.focus();
      input?.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isDuplicateMode]);

  const conditionTypes = ['Utilization', 'Day of Week', 'Time of Day', 'Competitor Price', 'Booking Volume', 'Historical Demand', 'Lead Time', 'Season'];
  const operators = ['Less than', 'Greater than', 'Equal to', 'Less or Equal', 'Greater or Equal', 'Range', 'Equal to or more than', 'Equal to or less than'];
  const actionTypes = ['Alert Only', 'Value', 'Vendor Price', 'Rank'];
  const addApplyRule = () => {
    setRuleData(prev => ({
      ...prev,
      conditionalRules: [...prev.conditionalRules, {
        enabled: true,
        type: 'if',
        mainCondition: { type: 'Utilization', operator: 'Less than', value: '', valueEnd: '', unit: '%', utilizationType: 'Actual' },
        subConditions: [{
          connector: 'And',
          type: 'Days out',
          operator: 'Less than or equal to',
          value: '',
          valueEnd: '',
          unit: 'days'
        }],
        actions: [],
        selectedDays: [] as string[],
        valueDetails: {
          value: '',
          priceEndsWith: ''
        },
        currentPriceDetails: {
          currentPrice: '',
          currentPriceUnit: '$',
          byFix: 'Lower',
          min: 'Min',
          minMaxOperators: '',
          minMaxOperatorsUnit: '%',
          priceEndsWith: '',
          priceEndsWithUnit: '%'
        }
      }]
    }));
  };

  const removeApplyRule = (index: number) => {
    setRuleData(prev => ({
      ...prev,
      conditionalRules: prev.conditionalRules.filter((_, i) => i !== index)
    }));
  };

  const toggleApplyRule = (index: number) => {
    setRuleData(prev => ({
      ...prev,
      conditionalRules: prev.conditionalRules.map((rule, i) =>
        i === index ? { ...rule, enabled: !rule.enabled } : rule
      )
    }));
  };

  const addSubCondition = (ruleIndex: number) => {
    setRuleData(prev => ({
      ...prev,
      conditionalRules: prev.conditionalRules.map((rule, i) =>
        i === ruleIndex ? {
          ...rule,
          subConditions: [...(rule.subConditions || []), { 
            connector: 'And',
            type: 'Days out',
            dateRangeType: 'daysOut',
            operator: 'Less than or equal to',
            value: '',
            valueEnd: '',
            unit: 'days',
            pickupStartDate: '',
            pickupEndDate: ''
          }]
        } : rule
      )
    }));
  };

  const removeSubCondition = (ruleIndex: number, subIndex: number) => {
    setRuleData(prev => ({
      ...prev,
      conditionalRules: prev.conditionalRules.map((rule, i) =>
        i === ruleIndex ? {
          ...rule,
          subConditions: rule.subConditions.filter((_, j) => j !== subIndex)
        } : rule
      )
    }));
  };

  const updateMainCondition = (ruleIndex: number, field: string, value: string) => {
    setRuleData(prev => ({
      ...prev,
      conditionalRules: prev.conditionalRules.map((rule, i) =>
        i === ruleIndex ? {
          ...rule,
          mainCondition: { ...rule.mainCondition, [field]: value }
        } : rule
      )
    }));
  };

  const updateSubCondition = (ruleIndex: number, subIndex: number, field: string, value: string) => {
    setRuleData(prev => ({
      ...prev,
      conditionalRules: prev.conditionalRules.map((rule, i) =>
        i === ruleIndex ? {
          ...rule,
          subConditions: rule.subConditions.map((sub, j) =>
            j === subIndex ? { ...sub, [field]: value } : sub
          )
        } : rule
      )
    }));
  };

  const toggleDay = (ruleIndex: number, day: string) => {
    setRuleData(prev => ({
      ...prev,
      conditionalRules: prev.conditionalRules.map((rule, i) =>
        i === ruleIndex ? {
          ...rule,
          selectedDays: rule.selectedDays?.includes(day)
            ? rule.selectedDays.filter(d => d !== day)
            : [...(rule.selectedDays || []), day]
        } : rule
      )
    }));
  };

  const toggleAction = (ruleIndex: number, action: string) => {
    setRuleData(prev => ({
      ...prev,
      conditionalRules: prev.conditionalRules.map((rule, i) =>
        i === ruleIndex ? {
          ...rule,
          actions: rule.actions?.includes(action)
            ? rule.actions.filter(a => a !== action)
            : [...(rule.actions || []), action]
        } : rule
      )
    }));
  };

  const toggleElseCondition = () => {
    setRuleData(prev => ({
      ...prev,
      elseCondition: { ...prev.elseCondition, enabled: !prev.elseCondition.enabled }
    }));
  };

  const addFirstCondition = () => {
    setRuleData(prev => ({
      ...prev,
      firstConditions: [...prev.firstConditions, {
        enabled: true,
        leftMinMax: 'Min',
        leftOptions: [] as string[],
        leftValue: '',
        operator: 'Less or Equal',
        rightMinMax: 'Min',
        rightOptions: [] as string[],
        rightValue: ''
      }]
    }));
  };

  const removeFirstCondition = (index: number) => {
    if (ruleData.firstConditions.length > 1) {
      setRuleData(prev => ({
        ...prev,
        firstConditions: prev.firstConditions.filter((_, i) => i !== index)
      }));
    }
  };

  const updateFirstCondition = (index: number, field: string, value: any) => {
    setRuleData(prev => ({
      ...prev,
      firstConditions: prev.firstConditions.map((cond, i) => {
        if (i === index) {
          return { ...cond, [field]: value };
        }
        return cond;
      })
    }));
  };

  const handleSaveAsDraft = () => {
    if (isDuplicateMode && sourceRule && isDefineRuleUnchanged(sourceRule, ruleData)) {
      return;
    }

    const schedule = isDuplicateMode && copiedSchedule ? copiedSchedule : 'Not scheduled';
    const formattedRule = {
      name: ruleData.name,
      description: ruleData.description,
      brand: ruleData.brand,
      pickupLocation: ruleData.pickupLocation,
      sameDropoff: ruleData.sameDropoff,
      dropOffLocation: ruleData.sameDropoff ? ruleData.pickupLocation : ruleData.dropOffLocation,
      productCode: ruleData.productCode,
      lor: ruleData.lor,
      carCode: ruleData.carCode,
      locations: ruleData.pickupLocation,
      productTypes: ruleData.productCode ? [ruleData.productCode] : [],
      lors: ruleData.lor?.length ? ruleData.lor : [],
      fleetTypes: ruleData.carCode,
      condition: 'Custom condition',
      action: 'Custom action',
      schedule,
      firstConditions: ruleData.firstConditions,
      conditionalRules: ruleData.conditionalRules,
      elseCondition: ruleData.elseCondition,
      ...(isDuplicateMode && copiedScheduleData ? { scheduleData: copiedScheduleData } : {}),
    };
    onSave(formattedRule);
  };

  const nameAlreadyExists = isDuplicateMode
    ? isDuplicateNameTaken(ruleData.name, existingRuleNames)
    : false;

  const defineRuleUnchanged =
    isDuplicateMode && sourceRule
      ? isDefineRuleUnchanged(sourceRule, ruleData)
      : false;

  const canSaveAsDraft = () => {
    return (
      ruleData.name &&
      ruleData.firstConditions[0].enabled &&
      !nameAlreadyExists &&
      !defineRuleUnchanged
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-center relative">
            {/* Left - Back Button */}
            <button
              onClick={onCancel}
              className="absolute left-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>

            {/* Center - Title */}
            <h1 className="text-lg text-[#2c3e50] font-semibold">
              {isDuplicateMode ? 'Duplicate Rule' : 'Create Rule'}
            </h1>
          </div>
        </div>
      </div>

      {isDuplicateMode && sourceRule && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div
            role="status"
            className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 flex gap-3"
          >
            <Copy className="h-5 w-5 text-[#ff9800] shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-gray-900">Duplicating rule</p>
              <p className="text-sm text-gray-700">
                Creating a new rule based on &ldquo;{sourceRule.name}&rdquo;. Review the name and settings below, then save.
              </p>
              {duplicateInit?.hasCopiedSchedule && (
                <p className="text-sm text-gray-600">
                  Schedule settings from the original rule have been copied.
                </p>
              )}
              {!duplicateInit?.hasFullConfig && (
                <p className="text-sm text-amber-800">
                  Full configuration was unavailable for this rule; review all fields before saving.
                </p>
              )}
              {defineRuleUnchanged && (
                <p className="text-sm text-amber-800">
                  Change at least one define-rule field from the original —{' '}
                  <span className="font-medium">Brand</span>,{' '}
                  <span className="font-medium">Pickup/Drop-off</span>,{' '}
                  <span className="font-medium">Product Code</span>,{' '}
                  <span className="font-medium">LOR</span>, or{' '}
                  <span className="font-medium">Car Code</span>. Save stays disabled until you update one of these values.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden m-6">
          {/* Rule Configuration */}
          <div className="p-6 space-y-6">
            {/* Basic Information Section */}
            <DefineRuleSection
              values={getDefineRuleSectionValues(ruleData)}
              onChange={(updates) =>
                setRuleData({
                  ...ruleData,
                  ...updates,
                  ...(updates.lor ? { lors: updates.lor } : {}),
                })
              }
              nameInputId="rule-name-input"
              nameError={nameAlreadyExists ? 'A rule with this name already exists.' : undefined}
              duplicateDefineRuleUnchanged={defineRuleUnchanged}
            />

            {/* First IF Condition - Special Structure */}
            <div className="bg-[#f8f9fa] rounded-lg p-4 space-y-4">
              <div>
                <h3 className="text-[#2c3e50] text-base font-medium">Conditions</h3>
                <p className="text-sm text-gray-500 mt-1">Define the Rule conditions</p>
              </div>

              {/* First IF Block */}
              {ruleData.firstConditions.map((condition, index) => (
                <div key={index} className="border border-gray-200 rounded p-4 bg-gray-50">
                  {index === 0 && (
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-sm font-medium text-[#ff9800] uppercase">IF</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="grid grid-cols-12 gap-2 items-center flex-1">
                      {/* Left Min/Max */}
                      <div className="col-span-1">
                        <Select
                          value={condition.leftMinMax}
                          onValueChange={(value) => updateFirstCondition(index, 'leftMinMax', value)}
                        >
                          <SelectTrigger className="h-7">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Min">Min</SelectItem>
                            <SelectItem value="Max">Max</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Left Options Multi-select */}
                      <div className="col-span-2">
                        <MultiSelect
                          value={condition.leftOptions}
                          onChange={(leftOptions) => updateFirstCondition(index, 'leftOptions', leftOptions)}
                          options={RULE_VENDOR_PRICE_OPTIONS}
                          placeholder="Select *"
                          selectAllLabel="All"
                        />
                      </div>

                      {/* Left Value Input */}
                      <div className="col-span-3">
                        <Input
                          placeholder="Value"
                          value={condition.leftValue}
                          onChange={(e) => updateFirstCondition(index, 'leftValue', e.target.value)}
                          className="h-7"
                        />
                      </div>

                      {/* Operator */}
                      <div className="col-span-2">
                        <Select
                          value={condition.operator}
                          onValueChange={(value) => updateFirstCondition(index, 'operator', value)}
                        >
                          <SelectTrigger className="h-7">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {operators.map(op => (
                              <SelectItem key={op} value={op}>{op}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Right Min/Max */}
                      <div className="col-span-1">
                        <Select
                          value={condition.rightMinMax}
                          onValueChange={(value) => updateFirstCondition(index, 'rightMinMax', value)}
                        >
                          <SelectTrigger className="h-7">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Min">Min</SelectItem>
                            <SelectItem value="Max">Max</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Right Options Multi-select */}
                      <div className="col-span-2">
                        <MultiSelect
                          value={condition.rightOptions}
                          onChange={(rightOptions) => updateFirstCondition(index, 'rightOptions', rightOptions)}
                          options={RULE_VENDOR_PRICE_OPTIONS}
                          placeholder="Select *"
                          selectAllLabel="All"
                        />
                      </div>

                      {/* Right Value Input */}
                      <div className="col-span-1">
                        <Input
                          placeholder="Value"
                          value={condition.rightValue}
                          onChange={(e) => updateFirstCondition(index, 'rightValue', e.target.value)}
                          className="h-7"
                        />
                      </div>
                    </div>
                    
                    {/* Delete button aligned with inputs */}
                    {ruleData.firstConditions.length > 1 && (
                      <button
                        onClick={() => removeFirstCondition(index)}
                        className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Add First Condition Button */}
              <button
                onClick={addFirstCondition}
                className="w-full py-2.5 border-2 border-dashed border-[#ff9800] rounded text-sm text-[#ff9800] hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Another Condition
              </button>
            </div>

            {/* Actions Section */}
            <div className="bg-[#f8f9fa] rounded-lg p-4 space-y-4">
              <div>
                <h3 className="text-[#2c3e50] text-base font-medium">Actions</h3>
                <p className="text-sm text-gray-500 mt-1">Define how rules should be applied</p>
              </div>

              {/* Apply Rules Section */}
              <div className="space-y-3">
                {ruleData.conditionalRules.map((rule, ruleIndex) => (
                  <div key={ruleIndex} className="border border-gray-200 rounded p-4 bg-white">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="font-semibold text-gray-900">Apply Rules</span>
                        </div>

                        <div className="space-y-3">
                          {/* Main Condition - Utilization */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">If</span>
                            
                            {/* Actual/Forecasted Dropdown */}
                            <Select
                              value={rule.mainCondition?.utilizationType || 'Actual'}
                              onValueChange={(value) => updateMainCondition(ruleIndex, 'utilizationType', value)}
                            >
                              <SelectTrigger className="h-7 w-[110px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Actual">Actual</SelectItem>
                                <SelectItem value="Forecasted">Forecasted</SelectItem>
                              </SelectContent>
                            </Select>

                            <span className="text-sm text-gray-900 font-medium">Utilization Range</span>

                            {/* Range Inputs */}
                            <Input
                              placeholder="Value"
                              value={rule.mainCondition?.value || ''}
                              onChange={(e) => updateMainCondition(ruleIndex, 'value', e.target.value)}
                              className="h-7 w-20"
                            />
                            <span className="text-sm text-gray-600">to</span>
                            <Input
                              placeholder="Value"
                              value={rule.mainCondition?.valueEnd || ''}
                              onChange={(e) => updateMainCondition(ruleIndex, 'valueEnd', e.target.value)}
                              className="h-7 w-20"
                            />
                            <span className="text-sm text-gray-600">%</span>
                          </div>

                          {/* Sub Conditions - Days out / Pickup Date Range */}
                          {rule.subConditions && rule.subConditions.map((subCond, subIndex) => (
                            <div key={subIndex} className="space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-900 font-medium">And</span>

                                {/* Days out Range / Pickup Date Range Dropdown */}
                                <Select
                                  value={subCond.dateRangeType || 'daysOut'}
                                  onValueChange={(value) => updateSubCondition(ruleIndex, subIndex, 'dateRangeType', value)}
                                >
                                  <SelectTrigger className="h-7 w-[150px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="daysOut">Days out Range</SelectItem>
                                    <SelectItem value="pickupDate">Pickup Date Range</SelectItem>
                                  </SelectContent>
                                </Select>

                                {/* Conditional rendering based on dateRangeType */}
                                {(!subCond.dateRangeType || subCond.dateRangeType === 'daysOut') ? (
                                  <>
                                    {/* Days out Range Inputs */}
                                    <Input
                                      placeholder="Value"
                                      value={subCond.value || ''}
                                      onChange={(e) => updateSubCondition(ruleIndex, subIndex, 'value', e.target.value)}
                                      className="h-7 w-20"
                                    />
                                    <span className="text-sm text-gray-600">to</span>
                                    <Input
                                      placeholder="Value"
                                      value={subCond.valueEnd || ''}
                                      onChange={(e) => updateSubCondition(ruleIndex, subIndex, 'valueEnd', e.target.value)}
                                      className="h-7 w-20"
                                    />
                                    <span className="text-sm text-gray-600">day</span>
                                  </>
                                ) : (
                                  <>
                                    {/* Pickup Date Range Inputs */}
                                    <Input
                                      type="date"
                                      value={subCond.pickupStartDate || ''}
                                      onChange={(e) => updateSubCondition(ruleIndex, subIndex, 'pickupStartDate', e.target.value)}
                                      className="h-7 w-[140px]"
                                    />
                                    <span className="text-sm text-gray-600">to</span>
                                    <Input
                                      type="date"
                                      value={subCond.pickupEndDate || ''}
                                      onChange={(e) => updateSubCondition(ruleIndex, subIndex, 'pickupEndDate', e.target.value)}
                                      className="h-7 w-[140px]"
                                    />
                                  </>
                                )}

                                <button
                                  onClick={() => removeSubCondition(ruleIndex, subIndex)}
                                  className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* Add Days out button - only show when there are no subConditions */}
                          {(!rule.subConditions || rule.subConditions.length === 0) && (
                            <button
                              onClick={() => addSubCondition(ruleIndex)}
                              className="text-sm text-[#ff9800] hover:text-[#f57c00] transition-colors flex items-center gap-1.5"
                            >
                              <Plus className="h-4 w-4" />
                              Add Days out / Pickup Date
                            </button>
                          )}

                          {/* Action Radio Buttons */}
                          {rule.enabled && (
                            <>
                              <div className="flex items-center gap-6 pt-3 border-t border-gray-200 mt-3">
                                <RadioGroup
                                  value={rule.actions?.[0] || ''}
                                  onValueChange={(value) => {
                                    setRuleData(prev => ({
                                      ...prev,
                                      conditionalRules: prev.conditionalRules.map((r, i) =>
                                        i === ruleIndex ? { ...r, actions: [value] } : r
                                      )
                                    }));
                                  }}
                                >
                                  <div className="flex items-center gap-6">
                                    {actionTypes.map(action => (
                                      <div key={action} className="flex items-center gap-2">
                                        <RadioGroupItem
                                          value={action}
                                          id={`${ruleIndex}-${action}`}
                                        />
                                        <Label htmlFor={`${ruleIndex}-${action}`} className="text-sm cursor-pointer">
                                          {action}
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                </RadioGroup>
                              </div>

                              {/* Value Form - Shows when Value is selected */}
                              {rule.actions?.[0] === 'Value' && (
                                <div className="mt-4 space-y-4 p-4 bg-gray-50 border border-gray-200 rounded">
                                  {/* Value Input */}
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-[#666666]">Value *</Label>
                                    <div className="w-1/4">
                                      <Input
                                        placeholder="Enter value *"
                                        value={rule.valueDetails?.value || ''}
                                        onChange={(e) => {
                                          setRuleData(prev => ({
                                            ...prev,
                                            conditionalRules: prev.conditionalRules.map((r, i) =>
                                              i === ruleIndex ? {
                                                ...r,
                                                valueDetails: {
                                                  ...r.valueDetails,
                                                  value: e.target.value
                                                }
                                              } : r
                                            )
                                          }));
                                        }}
                                        className="h-7"
                                      />
                                    </div>
                                  </div>

                                  {/* Price Ends With */}
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-[#666666]">Price Ends With</Label>
                                    <div className="w-1/4">
                                      <Input
                                        placeholder=""
                                        value={rule.valueDetails?.priceEndsWith || ''}
                                        onChange={(e) => {
                                          setRuleData(prev => ({
                                            ...prev,
                                            conditionalRules: prev.conditionalRules.map((r, i) =>
                                              i === ruleIndex ? {
                                                ...r,
                                                valueDetails: {
                                                  ...r.valueDetails,
                                                  priceEndsWith: e.target.value
                                                }
                                              } : r
                                            )
                                          }));
                                        }}
                                        className="h-7"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Current Price Form - Shows when Current Price is selected */}
                              {rule.actions?.[0] === 'Current Price' && (
                                <div className="mt-4 space-y-6 p-4 bg-gray-50 border border-gray-200 rounded">
                                  {/* Section 1: Current Price */}
                                  {/* Current Price Input */}
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-[#666666]">Current Price *</Label>
                                    <div className="flex items-center gap-2 w-1/4">
                                      <Input
                                        placeholder="Enter value *"
                                        value={rule.currentPriceDetails?.currentPrice || ''}
                                        onChange={(e) => {
                                          setRuleData(prev => ({
                                            ...prev,
                                            conditionalRules: prev.conditionalRules.map((r, i) =>
                                              i === ruleIndex ? {
                                                ...r,
                                                currentPriceDetails: {
                                                  ...r.currentPriceDetails,
                                                  currentPrice: e.target.value
                                                }
                                              } : r
                                            )
                                          }));
                                        }}
                                        className="h-7 flex-1"
                                      />
                                      <Checkbox
                                        checked={rule.currentPriceDetails?.currentPriceUnit === '%'}
                                        onCheckedChange={(checked) => {
                                          setRuleData(prev => ({
                                            ...prev,
                                            conditionalRules: prev.conditionalRules.map((r, i) =>
                                              i === ruleIndex ? {
                                                ...r,
                                                currentPriceDetails: {
                                                  ...r.currentPriceDetails,
                                                  currentPriceUnit: checked ? '%' : '$'
                                                }
                                              } : r
                                            )
                                          }));
                                        }}
                                        className="data-[state=checked]:bg-[#ff9800] data-[state=checked]:border-[#ff9800]"
                                      />
                                      <span className="text-sm">%</span>
                                    </div>
                                  </div>

                                  {/* Section 2: But No */}
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-[#666666]">But No</Label>
                                    
                                    {/* Lower/Higher Radio Buttons */}
                                    <div className="flex items-center gap-2 pb-3">
                                      <RadioGroup
                                        value={rule.currentPriceDetails?.byFix || 'Lower'}
                                        onValueChange={(value) => {
                                          setRuleData(prev => ({
                                            ...prev,
                                            conditionalRules: prev.conditionalRules.map((r, i) =>
                                              i === ruleIndex ? {
                                                ...r,
                                                currentPriceDetails: {
                                                  ...r.currentPriceDetails,
                                                  byFix: value
                                                }
                                              } : r
                                            )
                                          }));
                                        }}
                                        className="flex-shrink-0"
                                      >
                                        <div className="flex items-center gap-6">
                                          <div className="flex items-center gap-2">
                                            <RadioGroupItem value="Lower" id={`${ruleIndex}-byfix-lower`} className="border-[#ff9800] text-[#ff9800]" />
                                            <Label htmlFor={`${ruleIndex}-byfix-lower`} className="text-sm cursor-pointer">
                                              Lower
                                            </Label>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <RadioGroupItem value="Higher" id={`${ruleIndex}-byfix-higher`} className="border-[#ff9800] text-[#ff9800]" />
                                            <Label htmlFor={`${ruleIndex}-byfix-higher`} className="text-sm cursor-pointer">
                                              Higher
                                            </Label>
                                          </div>
                                        </div>
                                      </RadioGroup>
                                    </div>

                                    {/* Horizontal line separator */}
                                    <div className="border-b border-gray-300"></div>

                                    {/* Min/Max Radio Buttons with Select Options, +, Input, Checkbox, and % */}
                                    <div className="flex items-center gap-2 pt-3 pb-3">
                                      {/* Min/Max Radio Buttons */}
                                      <RadioGroup
                                        value={rule.currentPriceDetails?.min || 'Min'}
                                        onValueChange={(value) => {
                                          setRuleData(prev => ({
                                            ...prev,
                                            conditionalRules: prev.conditionalRules.map((r, i) =>
                                              i === ruleIndex ? {
                                                ...r,
                                                currentPriceDetails: {
                                                  ...r.currentPriceDetails,
                                                  min: value
                                                }
                                              } : r
                                            )
                                          }));
                                        }}
                                        className="flex-shrink-0"
                                      >
                                        <div className="flex items-center gap-4">
                                          <div className="flex items-center gap-2">
                                            <RadioGroupItem value="Min" id={`${ruleIndex}-min-min`} className="border-[#ff9800] text-[#ff9800]" />
                                            <Label htmlFor={`${ruleIndex}-min-min`} className="text-sm cursor-pointer">
                                              Min
                                            </Label>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <RadioGroupItem value="Max" id={`${ruleIndex}-min-max`} className="border-[#ff9800] text-[#ff9800]" />
                                            <Label htmlFor={`${ruleIndex}-min-max`} className="text-sm cursor-pointer">
                                              Max
                                            </Label>
                                          </div>
                                        </div>
                                      </RadioGroup>

                                      {/* Select some options - Reduced width by 50% */}
                                      <div className="w-1/4">
                                        <MultiSelect
                                          value={resolveSelectedOptions(
                                            rule.currentPriceDetails?.minMaxOptions,
                                            rule.currentPriceDetails?.minMaxOption
                                          )}
                                          onChange={(minMaxOptions) => {
                                            setRuleData(prev => ({
                                              ...prev,
                                              conditionalRules: prev.conditionalRules.map((r, i) =>
                                                i === ruleIndex ? {
                                                  ...r,
                                                  currentPriceDetails: {
                                                    ...r.currentPriceDetails,
                                                    minMaxOptions
                                                  }
                                                } : r
                                              )
                                            }));
                                          }}
                                          options={RULE_VENDOR_PRICE_OPTIONS}
                                          placeholder="Select some options"
                                          selectAllLabel="All"
                                          compact
                                        />
                                      </div>

                                      {/* + Symbol */}
                                      <span className="text-sm text-gray-600 flex-shrink-0">+</span>

                                      {/* Input field after + */}
                                      <Input
                                        placeholder=""
                                        value={rule.currentPriceDetails?.butNoInputValue || ''}
                                        onChange={(e) => {
                                          setRuleData(prev => ({
                                            ...prev,
                                            conditionalRules: prev.conditionalRules.map((r, i) =>
                                              i === ruleIndex ? {
                                                ...r,
                                                currentPriceDetails: {
                                                  ...r.currentPriceDetails,
                                                  butNoInputValue: e.target.value
                                                }
                                              } : r
                                            )
                                          }));
                                        }}
                                        className="h-7 w-20 flex-shrink-0"
                                      />

                                      {/* Checkbox */}
                                      <Checkbox
                                        checked={rule.currentPriceDetails?.butNoCheckbox || false}
                                        onCheckedChange={(checked) => {
                                          setRuleData(prev => ({
                                            ...prev,
                                            conditionalRules: prev.conditionalRules.map((r, i) =>
                                              i === ruleIndex ? {
                                                ...r,
                                                currentPriceDetails: {
                                                  ...r.currentPriceDetails,
                                                  butNoCheckbox: checked
                                                }
                                              } : r
                                            )
                                          }));
                                        }}
                                        className="data-[state=checked]:bg-[#ff9800] data-[state=checked]:border-[#ff9800] flex-shrink-0"
                                      />

                                      {/* % Symbol */}
                                      <span className="text-sm text-gray-600 flex-shrink-0">%</span>
                                    </div>

                                    {/* Horizontal line separator */}
                                    <div className="border-b border-gray-300"></div>
                                  </div>

                                {/* Section 3: Price Ends With */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-[#666666]">Price Ends With</Label>
                                    <div className="flex items-center gap-2 w-1/4">
                                      <Input
                                        placeholder=""
                                        value={rule.currentPriceDetails?.priceEndsWith || ''}
                                        onChange={(e) => {
                                          setRuleData(prev => ({
                                            ...prev,
                                            conditionalRules: prev.conditionalRules.map((r, i) =>
                                              i === ruleIndex ? {
                                                ...r,
                                                currentPriceDetails: {
                                                  ...r.currentPriceDetails,
                                                  priceEndsWith: e.target.value
                                                }
                                              } : r
                                            )
                                          }));
                                        }}
                                        className="h-7 flex-1"
                                      />
                                      <Checkbox
                                        checked={rule.currentPriceDetails?.priceEndsWithUnit === '%'}
                                        onCheckedChange={(checked) => {
                                          setRuleData(prev => ({
                                            ...prev,
                                            conditionalRules: prev.conditionalRules.map((r, i) =>
                                              i === ruleIndex ? {
                                                ...r,
                                                currentPriceDetails: {
                                                  ...r.currentPriceDetails,
                                                  priceEndsWithUnit: checked ? '%' : '$'
                                                }
                                              } : r
                                            )
                                          }));
                                        }}
                                        className="data-[state=checked]:bg-[#ff9800] data-[state=checked]:border-[#ff9800]"
                                      />
                                      <span className="text-sm">%</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Vendor Price Form - Shows when Vendor Price is selected */}
                              {rule.actions?.[0] === 'Vendor Price' && (
                                <div className="mt-4 space-y-6 p-4 bg-gray-50 border border-gray-200 rounded">
                                  {/* Section 1: Min/Max row (top) */}
                                  <div className="flex items-center gap-2">
                                    {/* Min/Max Radio Buttons */}
                                    <RadioGroup
                                      value={rule.vendorPriceDetails?.minTop || 'Min'}
                                      onValueChange={(value) => {
                                        setRuleData(prev => ({
                                          ...prev,
                                          conditionalRules: prev.conditionalRules.map((r, i) =>
                                            i === ruleIndex ? {
                                              ...r,
                                              vendorPriceDetails: {
                                                ...r.vendorPriceDetails,
                                                minTop: value
                                              }
                                            } : r
                                          )
                                        }));
                                      }}
                                      className="flex-shrink-0"
                                    >
                                      <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                          <RadioGroupItem value="Min" id={`vendor-${ruleIndex}-mintop-min`} className="border-[#ff9800] text-[#ff9800]" />
                                          <Label htmlFor={`vendor-${ruleIndex}-mintop-min`} className="text-sm cursor-pointer">
                                            Min
                                          </Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <RadioGroupItem value="Max" id={`vendor-${ruleIndex}-mintop-max`} className="border-[#ff9800] text-[#ff9800]" />
                                          <Label htmlFor={`vendor-${ruleIndex}-mintop-max`} className="text-sm cursor-pointer">
                                            Max
                                          </Label>
                                        </div>
                                      </div>
                                    </RadioGroup>

                                    {/* Select some options - Reduced width by 50% */}
                                    <div className="w-1/4">
                                      <MultiSelect
                                        value={resolveSelectedOptions(
                                          rule.vendorPriceDetails?.minMaxOptionsTop,
                                          rule.vendorPriceDetails?.minMaxOptionTop
                                        )}
                                        onChange={(minMaxOptionsTop) => {
                                          setRuleData(prev => ({
                                            ...prev,
                                            conditionalRules: prev.conditionalRules.map((r, i) =>
                                              i === ruleIndex ? {
                                                ...r,
                                                vendorPriceDetails: {
                                                  ...r.vendorPriceDetails,
                                                  minMaxOptionsTop
                                                }
                                              } : r
                                            )
                                          }));
                                        }}
                                        options={RULE_VENDOR_PRICE_OPTIONS}
                                        placeholder="Select some options"
                                        selectAllLabel="All"
                                        compact
                                      />
                                    </div>

                                    {/* + Symbol */}
                                    <span className="text-sm text-gray-600 flex-shrink-0">+</span>

                                    {/* Input field after + */}
                                    <Input
                                      placeholder=""
                                      value={rule.vendorPriceDetails?.topInputValue || ''}
                                      onChange={(e) => {
                                        setRuleData(prev => ({
                                          ...prev,
                                          conditionalRules: prev.conditionalRules.map((r, i) =>
                                            i === ruleIndex ? {
                                              ...r,
                                              vendorPriceDetails: {
                                                ...r.vendorPriceDetails,
                                                topInputValue: e.target.value
                                              }
                                            } : r
                                          )
                                        }));
                                      }}
                                      className="h-7 w-20 flex-shrink-0"
                                    />

                                    {/* Checkbox */}
                                    <Checkbox
                                      checked={rule.vendorPriceDetails?.topCheckbox || false}
                                      onCheckedChange={(checked) => {
                                        setRuleData(prev => ({
                                          ...prev,
                                          conditionalRules: prev.conditionalRules.map((r, i) =>
                                            i === ruleIndex ? {
                                              ...r,
                                              vendorPriceDetails: {
                                                ...r.vendorPriceDetails,
                                                topCheckbox: checked
                                              }
                                            } : r
                                          )
                                        }));
                                      }}
                                      className="data-[state=checked]:bg-[#ff9800] data-[state=checked]:border-[#ff9800] flex-shrink-0"
                                    />

                                    {/* % Symbol */}
                                    <span className="text-sm text-gray-600 flex-shrink-0">%</span>
                                  </div>

                                  {/* Horizontal separator */}
                                  <div className="border-b border-gray-300"></div>

                                  {/* Section 2: But No */}
                                  <div className="space-y-1.5">
                                    {/* But No label with Lower/Higher Radio Buttons on same line */}
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs text-[#666666]">But No</Label>
                                      <RadioGroup
                                        value={rule.vendorPriceDetails?.byFix || 'Lower'}
                                        onValueChange={(value) => {
                                          setRuleData(prev => ({
                                            ...prev,
                                            conditionalRules: prev.conditionalRules.map((r, i) =>
                                              i === ruleIndex ? {
                                                ...r,
                                                vendorPriceDetails: {
                                                  ...r.vendorPriceDetails,
                                                  byFix: value
                                                }
                                              } : r
                                            )
                                          }));
                                        }}
                                        className="flex-shrink-0"
                                      >
                                        <div className="flex items-center gap-6">
                                          <div className="flex items-center gap-2">
                                            <RadioGroupItem value="Lower" id={`vendor-${ruleIndex}-byfix-lower`} className="border-[#ff9800] text-[#ff9800]" />
                                            <Label htmlFor={`vendor-${ruleIndex}-byfix-lower`} className="text-sm cursor-pointer">
                                              Lower
                                            </Label>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <RadioGroupItem value="Higher" id={`vendor-${ruleIndex}-byfix-higher`} className="border-[#ff9800] text-[#ff9800]" />
                                            <Label htmlFor={`vendor-${ruleIndex}-byfix-higher`} className="text-sm cursor-pointer">
                                              Higher
                                            </Label>
                                          </div>
                                        </div>
                                      </RadioGroup>
                                    </div>

                                    {/* Min/Max Radio Buttons with Select Options, +, Input, Checkbox, and % */}
                                    <div className="flex items-center gap-2">
                                      {/* Min/Max Radio Buttons */}
                                      <RadioGroup
                                        value={rule.vendorPriceDetails?.min || 'Min'}
                                        onValueChange={(value) => {
                                          setRuleData(prev => ({
                                            ...prev,
                                            conditionalRules: prev.conditionalRules.map((r, i) =>
                                              i === ruleIndex ? {
                                                ...r,
                                                vendorPriceDetails: {
                                                  ...r.vendorPriceDetails,
                                                  min: value
                                                }
                                              } : r
                                            )
                                          }));
                                        }}
                                        className="flex-shrink-0"
                                      >
                                        <div className="flex items-center gap-4">
                                          <div className="flex items-center gap-2">
                                            <RadioGroupItem value="Min" id={`vendor-${ruleIndex}-min-min`} className="border-[#ff9800] text-[#ff9800]" />
                                            <Label htmlFor={`vendor-${ruleIndex}-min-min`} className="text-sm cursor-pointer">
                                              Min
                                            </Label>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <RadioGroupItem value="Max" id={`vendor-${ruleIndex}-min-max`} className="border-[#ff9800] text-[#ff9800]" />
                                            <Label htmlFor={`vendor-${ruleIndex}-min-max`} className="text-sm cursor-pointer">
                                              Max
                                            </Label>
                                          </div>
                                        </div>
                                      </RadioGroup>

                                      {/* Select some options - Reduced width by 50% */}
                                      <div className="w-1/4">
                                        <MultiSelect
                                          value={resolveSelectedOptions(
                                            rule.vendorPriceDetails?.minMaxOptions,
                                            rule.vendorPriceDetails?.minMaxOption
                                          )}
                                          onChange={(minMaxOptions) => {
                                            setRuleData(prev => ({
                                              ...prev,
                                              conditionalRules: prev.conditionalRules.map((r, i) =>
                                                i === ruleIndex ? {
                                                  ...r,
                                                  vendorPriceDetails: {
                                                    ...r.vendorPriceDetails,
                                                    minMaxOptions
                                                  }
                                                } : r
                                              )
                                            }));
                                          }}
                                          options={RULE_VENDOR_PRICE_OPTIONS}
                                          placeholder="Select some options"
                                          selectAllLabel="All"
                                          compact
                                        />
                                      </div>

                                      {/* + Symbol */}
                                      <span className="text-sm text-gray-600 flex-shrink-0">+</span>

                                      {/* Input field after + */}
                                      <Input
                                        placeholder=""
                                        value={rule.vendorPriceDetails?.butNoInputValue || ''}
                                        onChange={(e) => {
                                          setRuleData(prev => ({
                                            ...prev,
                                            conditionalRules: prev.conditionalRules.map((r, i) =>
                                              i === ruleIndex ? {
                                                ...r,
                                                vendorPriceDetails: {
                                                  ...r.vendorPriceDetails,
                                                  butNoInputValue: e.target.value
                                                }
                                              } : r
                                            )
                                          }));
                                        }}
                                        className="h-7 w-20 flex-shrink-0"
                                      />

                                      {/* Checkbox */}
                                      <Checkbox
                                        checked={rule.vendorPriceDetails?.butNoCheckbox || false}
                                        onCheckedChange={(checked) => {
                                          setRuleData(prev => ({
                                            ...prev,
                                            conditionalRules: prev.conditionalRules.map((r, i) =>
                                              i === ruleIndex ? {
                                                ...r,
                                                vendorPriceDetails: {
                                                  ...r.vendorPriceDetails,
                                                  butNoCheckbox: checked
                                                }
                                              } : r
                                            )
                                          }));
                                        }}
                                        className="data-[state=checked]:bg-[#ff9800] data-[state=checked]:border-[#ff9800] flex-shrink-0"
                                      />

                                      {/* % Symbol */}
                                      <span className="text-sm text-gray-600 flex-shrink-0">%</span>
                                    </div>
                                  </div>

                                  {/* Horizontal separator */}
                                  <div className="border-b border-gray-300"></div>

                                  {/* Section 3: Price Ends With */}
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-[#666666]">Price Ends With</Label>
                                    <div className="flex items-center gap-2 w-1/4">
                                      <Input
                                        placeholder=""
                                        value={rule.vendorPriceDetails?.priceEndsWith || ''}
                                        onChange={(e) => {
                                          setRuleData(prev => ({
                                            ...prev,
                                            conditionalRules: prev.conditionalRules.map((r, i) =>
                                              i === ruleIndex ? {
                                                ...r,
                                                vendorPriceDetails: {
                                                  ...r.vendorPriceDetails,
                                                  priceEndsWith: e.target.value
                                                }
                                              } : r
                                            )
                                          }));
                                        }}
                                        className="h-7 flex-1"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Rank Form - Shows when Rank is selected */}
                              {rule.actions?.[0] === 'Rank' && (
                                <div className="mt-4 space-y-4 p-4 bg-gray-50 border border-gray-200 rounded">
                                  {/* CR/ER Radio Buttons Row */}
                                  <div className="flex items-center gap-4">
                                    <RadioGroup
                                      value={rule.rankDetails?.rateType || 'CR'}
                                      onValueChange={(value) => {
                                        setRuleData(prev => ({
                                          ...prev,
                                          conditionalRules: prev.conditionalRules.map((r, i) =>
                                            i === ruleIndex ? {
                                              ...r,
                                              rankDetails: {
                                                ...r.rankDetails,
                                                rateType: value
                                              }
                                            } : r
                                          )
                                        }));
                                      }}
                                      className="flex-shrink-0"
                                    >
                                      <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2">
                                          <RadioGroupItem value="CR" id={`rank-${ruleIndex}-cr`} className="border-[#ff9800] text-[#ff9800]" />
                                          <Label htmlFor={`rank-${ruleIndex}-cr`} className="text-sm cursor-pointer">
                                            CR
                                          </Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <RadioGroupItem value="ER" id={`rank-${ruleIndex}-er`} className="border-[#ff9800] text-[#ff9800]" />
                                          <Label htmlFor={`rank-${ruleIndex}-er`} className="text-sm cursor-pointer">
                                            ER
                                          </Label>
                                        </div>
                                      </div>
                                    </RadioGroup>

                                    {/* Numeric Dropdown */}
                                    <Select
                                      value={rule.rankDetails?.numericValue || ''}
                                      onValueChange={(value) => {
                                        setRuleData(prev => ({
                                          ...prev,
                                          conditionalRules: prev.conditionalRules.map((r, i) =>
                                            i === ruleIndex ? {
                                              ...r,
                                              rankDetails: {
                                                ...r.rankDetails,
                                                numericValue: value
                                              }
                                            } : r
                                          )
                                        }));
                                      }}
                                    >
                                      <SelectTrigger className="h-7 w-[100px]">
                                        <SelectValue placeholder="Select" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="1">1</SelectItem>
                                        <SelectItem value="2">2</SelectItem>
                                        <SelectItem value="3">3</SelectItem>
                                        <SelectItem value="4">4</SelectItem>
                                        <SelectItem value="5">5</SelectItem>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="15">15</SelectItem>
                                        <SelectItem value="20">20</SelectItem>
                                        <SelectItem value="25">25</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Difference Slider Row */}
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-[#666666]">Difference</Label>
                                    <div className="flex items-center gap-4">
                                      <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={rule.rankDetails?.differenceSlider || 0}
                                        onChange={(e) => {
                                          setRuleData(prev => ({
                                            ...prev,
                                            conditionalRules: prev.conditionalRules.map((r, i) =>
                                              i === ruleIndex ? {
                                                ...r,
                                                rankDetails: {
                                                  ...r.rankDetails,
                                                  differenceSlider: e.target.value
                                                }
                                              } : r
                                            )
                                          }));
                                        }}
                                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#00bcd4]"
                                        style={{
                                          background: `linear-gradient(to right, #00bcd4 0%, #00bcd4 ${rule.rankDetails?.differenceSlider || 0}%, #e5e7eb ${rule.rankDetails?.differenceSlider || 0}%, #e5e7eb 100%)`
                                        }}
                                      />
                                      <div className="flex items-center gap-2">
                                        <Input
                                          placeholder="0"
                                          value={rule.rankDetails?.differenceSlider || ''}
                                          onChange={(e) => {
                                            setRuleData(prev => ({
                                              ...prev,
                                              conditionalRules: prev.conditionalRules.map((r, i) =>
                                                i === ruleIndex ? {
                                                  ...r,
                                                  rankDetails: {
                                                    ...r.rankDetails,
                                                    differenceSlider: e.target.value
                                                  }
                                                } : r
                                              )
                                            }));
                                          }}
                                          className="h-7 w-[60px]"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Note */}
                                  <div className="text-xs text-gray-600 leading-relaxed">
                                    <span className="text-[#666666]">Note:</span> The price will be the selected percentage lower than the second cheapest price. 
                                    Vendors with the same price will be assigned the same rank for calculations. No price will be compared in cases 
                                    where there are insufficient ranks.
                                  </div>
                                </div>
                              )}

                            </>
                          )}
                        </div>
                      </div>

                      {ruleData.conditionalRules.length > 0 && (
                        <button
                          onClick={() => removeApplyRule(ruleIndex)}
                          className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  onClick={addApplyRule}
                  className="w-full py-2.5 border-2 border-dashed border-[#ff9800] rounded text-sm text-[#ff9800] hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Rule
                </button>
              </div>
            </div>

            {/* Info Box */}
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p><strong>How it works:</strong> Rules are evaluated from top to bottom. When a condition is met, the corresponding action is applied and evaluation stops.</p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between gap-3">
            {defineRuleUnchanged ? (
              <p className="text-xs text-amber-700 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Update a define-rule field above to enable Save
              </p>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="h-9 px-5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAsDraft}
              disabled={!canSaveAsDraft()}
              className="h-9 px-6 bg-[#ff9800] text-white rounded hover:bg-[#f57c00] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}