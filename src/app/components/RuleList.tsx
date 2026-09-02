import { useState, useEffect, useMemo } from 'react';
import { Search, Edit, Trash2, Plus, LayoutGrid, X, Info, Copy, ChevronsRight, ChevronsLeft, ChevronDown } from 'lucide-react';
import { CustomButton } from './CustomButton';
import { toast } from 'sonner@2.0.3';
import { RuleEditDrawer } from './RuleEditDrawer';
import { SchedulerList } from './SchedulerList';
import {
  emptyRuleFilters,
  RULE_MORE_FILTER_FIELDS,
  RULE_PRIMARY_FILTER_FIELDS,
  type RuleFilterState,
  type RuleFilterOptions,
} from './RuleFilterDrawer';
import { RuleFilterPanel } from './RuleFilterPanel';
import { MultiSelect } from './MultiSelect';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Switch } from './ui/switch';
import { CustomSelect } from './CustomSelect';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { applyImportValidation } from '../utils/schedulerImportValidation';
import { formatListCreatedDate } from '../utils/listDateFormat';
import { formatListResultsText } from '../utils/listResultsText';
import { RULE_BRAND_OPTIONS } from '../constants/ruleDefineOptions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface Rule {
  id: string;
  name: string;
  status: string;
  fleetTypes: string[];
  location?: string;
  productType?: string;
  condition: string;
  action: string;
  schedule: string;
  createdDate: string;
  lastExecuted: string | null;
  executionCount: number;
  revenueImpact: string;
  scheduleNames?: string[];
  pickupLocation?: string[];
  dropOffLocation?: string[];
  sameDropoff?: boolean;
  locations?: string[];
  brand?: string;
  productCode?: string;
  productTypes?: string[];
  lor?: string[];
  lors?: string[];
  carCode?: string[];
}

const RULE_LIST_MULTI_VALUE_VISIBLE_COUNT = 3;
const RULE_LIST_MULTI_VALUE_SCROLL_THRESHOLD = 10;

function RuleListMultiValueCell({ values }: { values: string[] }) {
  if (!values.length) {
    return <span className="text-gray-700">—</span>;
  }

  const isTruncated = values.length > RULE_LIST_MULTI_VALUE_VISIBLE_COUNT;
  const displayText = isTruncated
    ? `${values.slice(0, RULE_LIST_MULTI_VALUE_VISIBLE_COUNT).join(', ')}...`
    : values.join(', ');

  if (!isTruncated) {
    return <span className="text-gray-700">{displayText}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block min-w-0 truncate text-gray-700 cursor-default">{displayText}</span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className={`p-2 ${
          values.length > RULE_LIST_MULTI_VALUE_SCROLL_THRESHOLD
            ? 'max-w-md overflow-x-auto'
            : 'max-w-sm'
        }`}
      >
        <span
          className={`text-xs leading-snug ${
            values.length > RULE_LIST_MULTI_VALUE_SCROLL_THRESHOLD
              ? 'whitespace-nowrap'
              : 'break-words'
          }`}
        >
          {values.join(', ')}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

function countActiveFilterFieldsForKeys<T extends Record<string, string[]>>(
  filters: T,
  keys: readonly (keyof T)[]
): number {
  return keys.filter((key) => filters[key].length > 0).length;
}

const STICKY_COL_RULE_NAME = 'sticky left-0 z-20 w-[220px] min-w-[220px] max-w-[220px]';
const STICKY_COL_RULE_NAME_HEAD = 'sticky left-0 z-30 w-[220px] min-w-[220px] max-w-[220px]';

function getRulePickupLocations(rule: Rule): string[] {
  if (rule.pickupLocation?.length) {
    return rule.pickupLocation;
  }
  if (rule.locations?.length) {
    return rule.locations;
  }
  if (rule.location) {
    return [rule.location];
  }
  return [];
}

function getRuleDropoffLocations(rule: Rule): string[] {
  const pickupLocations = getRulePickupLocations(rule);
  if (rule.sameDropoff !== false) {
    return pickupLocations;
  }
  if (rule.dropOffLocation?.length) {
    return rule.dropOffLocation;
  }
  return pickupLocations;
}

function getRuleBrand(rule: Rule): string {
  return rule.brand || '—';
}

function getRuleProductCode(rule: Rule): string {
  if (rule.productCode) {
    return rule.productCode;
  }
  if (rule.productTypes?.length) {
    return rule.productTypes[0];
  }
  if (rule.productType) {
    return rule.productType;
  }
  return '—';
}

function getRuleLorValues(rule: Rule): string[] {
  if (rule.lor?.length) {
    return rule.lor;
  }
  if (rule.lors?.length) {
    return rule.lors;
  }
  return [];
}

function getRuleCarCodeValues(rule: Rule): string[] {
  if (rule.carCode?.length) {
    return rule.carCode;
  }
  if (rule.fleetTypes?.length) {
    return rule.fleetTypes;
  }
  return [];
}

function ruleMatchesSearch(rule: Rule, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const searchableText = [
    rule.name,
    rule.condition,
    rule.action,
    getRuleBrand(rule),
    ...getRulePickupLocations(rule),
    ...getRuleDropoffLocations(rule),
    getRuleProductCode(rule),
    ...getRuleLorValues(rule),
    ...getRuleCarCodeValues(rule),
  ]
    .join(' ')
    .toLowerCase();

  return searchableText.includes(normalizedQuery);
}

function ruleMatchesRefinements(rule: Rule, searchQuery: string, appliedFilters: RuleFilterState): boolean {
  if (!ruleMatchesSearch(rule, searchQuery)) {
    return false;
  }

  return ruleMatchesFilters(rule, appliedFilters);
}

function getRuleFieldValues(rule: Rule, field: keyof RuleFilterState): string[] {
  switch (field) {
    case 'ruleName':
      return rule.name ? [rule.name] : [];
    case 'brand':
      return rule.brand ? [rule.brand] : [];
    case 'pickupLocation':
      return getRulePickupLocations(rule);
    case 'dropoffLocation':
      return getRuleDropoffLocations(rule);
    case 'productCode': {
      const code = getRuleProductCode(rule);
      return code !== '—' ? [code] : [];
    }
    case 'lor':
      return getRuleLorValues(rule);
    case 'carCode':
      return getRuleCarCodeValues(rule);
    case 'createdDate': {
      const formatted = formatListCreatedDate(rule.createdDate);
      return formatted !== '—' ? [formatted] : [];
    }
    default:
      return [];
  }
}

function buildRuleFilterOptions(rules: Rule[]): RuleFilterOptions {
  const options = emptyRuleFilters();
  const fields = Object.keys(options) as (keyof RuleFilterState)[];

  rules.forEach((rule) => {
    fields.forEach((field) => {
      getRuleFieldValues(rule, field).forEach((value) => {
        if (value && !options[field].includes(value)) {
          options[field].push(value);
        }
      });
    });
  });

  fields.forEach((field) => {
    options[field].sort((a, b) => a.localeCompare(b));
  });

  return options;
}

function ruleMatchesFilters(rule: Rule, filters: RuleFilterState): boolean {
  const fields = Object.keys(filters) as (keyof RuleFilterState)[];
  return fields.every((field) => {
    const selected = filters[field];
    if (selected.length === 0) return true;
    const values = getRuleFieldValues(rule, field);
    return selected.some((item) => values.includes(item));
  });
}

function hasAnyActiveRuleFilters(filters: RuleFilterState): boolean {
  return Object.values(filters).some((values) => values.length > 0);
}

function countActiveRuleFilterFields(filters: RuleFilterState): number {
  return Object.values(filters).filter((values) => values.length > 0).length;
}

const RULE_FILTER_LABELS: Record<keyof RuleFilterState, string> = {
  ruleName: 'Rule Name',
  brand: 'Brand',
  pickupLocation: 'Pickup Location',
  dropoffLocation: 'Dropoff Location',
  productCode: 'Product Code',
  lor: 'LOR',
  carCode: 'Car Code',
  createdDate: 'Created Date',
};

type RuleStatusTab = 'active' | 'inactive';

interface RuleListProps {
  rules: Rule[];
  schedulers: any[];
  onUpdateStatus: (ruleId: string, newStatus: string) => void;
  onDelete: (ruleId: string) => void;
  onUpdateRule: (ruleId: string, updatedData: any) => void;
  onEdit: (rule: Rule) => void;
  onCreateRule?: () => void;
  onDuplicateRule?: (rule: Rule) => void;
  lastCreatedRuleId?: string | null;
  onHighlightConsumed?: () => void;
  onCreateScheduler?: () => void;
  onUpdateScheduler?: (updatedScheduler: any, options?: { skipToast?: boolean }) => void;
  onDeleteScheduler?: (schedulerId: string) => void;
  onBulkUpdateSchedulers?: (schedulerIds: string[], updates: Record<string, any>) => void;
  onBulkDeleteSchedulers?: (schedulerIds: string[]) => void;
}

export function RuleList({ rules, schedulers, onUpdateStatus, onDelete, onUpdateRule, onEdit, onCreateRule, onDuplicateRule, lastCreatedRuleId, onHighlightConsumed, onCreateScheduler, onUpdateScheduler, onDeleteScheduler, onBulkUpdateSchedulers, onBulkDeleteSchedulers }: RuleListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<RuleFilterState>(emptyRuleFilters());
  const [activeTab, setActiveTab] = useState('manage-scheduler');
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<Rule | null>(null);
  const [singleRuleStatusDialogOpen, setSingleRuleStatusDialogOpen] = useState(false);
  const [pendingRuleStatus, setPendingRuleStatus] = useState<{
    ruleId: string;
    action: 'activate' | 'deactivate';
    name: string;
  } | null>(null);
  const [highlightedRuleId, setHighlightedRuleId] = useState<string | null>(null);
  const [ruleStatusTab, setRuleStatusTab] = useState<RuleStatusTab>('active');
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  
  // First-time user states
  const [isFirstTimeRules, setIsFirstTimeRules] = useState(() => rules.length === 0);
  const [isFirstTimeScheduler, setIsFirstTimeScheduler] = useState(false);
  const [demoSchedulerData, setDemoSchedulerData] = useState(() =>
    demoSchedulers.map((scheduler, index) => {
      const withBrand = {
        ...scheduler,
        brand: scheduler.brand ?? RULE_BRAND_OPTIONS[index % RULE_BRAND_OPTIONS.length],
      };
      return withBrand.creationSource === 'excel'
        ? applyImportValidation(withBrand as Record<string, unknown>)
        : withBrand;
    })
  );

  useEffect(() => {
    if (rules.length > 0) {
      setIsFirstTimeRules(false);
    }
  }, [rules.length]);

  useEffect(() => {
    if (schedulers.length > 0) {
      setIsFirstTimeScheduler(false);
    }
  }, [schedulers.length]);

  // Show empty arrays for first-time user mode
  const displayRules = isFirstTimeRules ? [] : rules;
  const displaySchedulers =
    schedulers.length > 0
      ? schedulers
      : isFirstTimeScheduler
        ? []
        : demoSchedulerData;

  const handleBulkUpdateDemoOrReal = (schedulerIds: string[], updates: Record<string, any>) => {
    if (onBulkUpdateSchedulers) {
      onBulkUpdateSchedulers(schedulerIds, updates);
      return;
    }
    if (schedulers.length > 0) {
      schedulerIds.forEach((id) => {
        const scheduler = schedulers.find((s) => s.id === id);
        if (scheduler) onUpdateScheduler?.({ ...scheduler, ...updates });
      });
    } else {
      setDemoSchedulerData((prev) =>
        prev.map((s) => (schedulerIds.includes(s.id) ? { ...s, ...updates } : s))
      );
      toast.success(`Updated ${schedulerIds.length} scheduler(s)`);
    }
  };

  const handleBulkDeleteDemoOrReal = (schedulerIds: string[]) => {
    if (onBulkDeleteSchedulers) {
      onBulkDeleteSchedulers(schedulerIds);
      return;
    }
    if (schedulers.length > 0) {
      schedulerIds.forEach((id) => onDeleteScheduler?.(id));
    } else {
      setDemoSchedulerData((prev) => prev.filter((s) => !schedulerIds.includes(s.id)));
      toast.success(`Deleted ${schedulerIds.length} scheduler(s)`);
    }
  };

  // Filter rules
  const isRuleActive = (status: string) => status === 'active' || status === 'scheduled';

  const activeRuleCount = displayRules.filter((rule) => isRuleActive(rule.status)).length;
  const inactiveRuleCount = displayRules.length - activeRuleCount;

  const filterOptions = useMemo(() => buildRuleFilterOptions(displayRules), [displayRules]);
  const hasListRefinements = searchQuery.trim().length > 0 || hasAnyActiveRuleFilters(appliedFilters);

  const rulesMatchingRefinements = useMemo(() => {
    return displayRules.filter((rule) => ruleMatchesRefinements(rule, searchQuery, appliedFilters));
  }, [displayRules, searchQuery, appliedFilters]);

  const activeFilteredRuleCount = useMemo(
    () => rulesMatchingRefinements.filter((rule) => isRuleActive(rule.status)).length,
    [rulesMatchingRefinements]
  );
  const inactiveFilteredRuleCount = rulesMatchingRefinements.length - activeFilteredRuleCount;

  const filteredRules = useMemo(() => {
    return rulesMatchingRefinements.filter((rule) => {
      if (ruleStatusTab === 'active' && !isRuleActive(rule.status)) {
        return false;
      }
      if (ruleStatusTab === 'inactive' && isRuleActive(rule.status)) {
        return false;
      }
      return true;
    });
  }, [rulesMatchingRefinements, ruleStatusTab]);

  const statusTotalRuleCount = ruleStatusTab === 'active' ? activeRuleCount : inactiveRuleCount;

  const hasActiveFilters = hasAnyActiveRuleFilters(appliedFilters);
  const activeFilterCount = countActiveRuleFilterFields(appliedFilters);
  const activeFilterChips = useMemo(() => {
    const fields = Object.keys(appliedFilters) as (keyof RuleFilterState)[];
    return fields.flatMap((field) =>
      appliedFilters[field].map((value) => ({
        field,
        value,
        label: `${RULE_FILTER_LABELS[field]}: ${value}`,
      }))
    );
  }, [appliedFilters]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRules.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRules = filteredRules.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, appliedFilters, ruleStatusTab, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!lastCreatedRuleId) {
      return;
    }

    const createdRule = rules.find((rule) => rule.id === lastCreatedRuleId);

    setIsFirstTimeRules(false);
    setActiveTab('manage-rules');
    setRuleStatusTab(
      createdRule && isRuleActive(createdRule.status) ? 'active' : 'inactive'
    );
    setCurrentPage(1);
    setHighlightedRuleId(lastCreatedRuleId);

    const timer = window.setTimeout(() => {
      setHighlightedRuleId(null);
      onHighlightConsumed?.();
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [lastCreatedRuleId, onHighlightConsumed, rules]);

  const handleEditClick = (rule: Rule) => {
    setEditingRule(rule);
    setEditDrawerOpen(true);
  };

  const handleDuplicateClick = (rule: Rule) => {
    onDuplicateRule?.(rule);
  };

  const activeMoreFilterCount = useMemo(
    () => countActiveFilterFieldsForKeys(appliedFilters, RULE_MORE_FILTER_FIELDS.map((field) => field.key)),
    [appliedFilters]
  );

  const handleToggleMoreFilters = () => {
    setFilterPanelOpen((open) => !open);
  };

  const handleMoreFilterChange = (key: keyof RuleFilterState, value: string[]) => {
    setAppliedFilters({ ...appliedFilters, [key]: value });
  };

  const handleResetMoreFilters = () => {
    const nextApplied = { ...appliedFilters };
    RULE_MORE_FILTER_FIELDS.forEach(({ key }) => {
      nextApplied[key] = [];
    });
    setAppliedFilters(nextApplied);
  };

  const handlePrimaryFilterChange = (key: keyof RuleFilterState, value: string[]) => {
    setAppliedFilters({ ...appliedFilters, [key]: value });
  };

  const handleClearFilters = () => {
    setAppliedFilters(emptyRuleFilters());
    setSearchQuery('');
    setFilterPanelOpen(false);
  };

  const handleRemoveFilterChip = (field: keyof RuleFilterState, value: string) => {
    setAppliedFilters({
      ...appliedFilters,
      [field]: appliedFilters[field].filter((item) => item !== value),
    });
  };

  const isRuleToggleOn = (status: string) => isRuleActive(status);

  const handleCloseSingleRuleStatusDialog = () => {
    setSingleRuleStatusDialogOpen(false);
    setPendingRuleStatus(null);
  };

  const handleOpenSingleRuleStatusDialog = (rule: Rule) => {
    const isCurrentlyActive = isRuleToggleOn(rule.status);
    setPendingRuleStatus({
      ruleId: rule.id,
      action: isCurrentlyActive ? 'deactivate' : 'activate',
      name: rule.name,
    });
    setSingleRuleStatusDialogOpen(true);
  };

  const handleConfirmSingleRuleStatus = () => {
    if (!pendingRuleStatus) {
      return;
    }

    const rule = rules.find((item) => item.id === pendingRuleStatus.ruleId);
    if (!rule) {
      handleCloseSingleRuleStatusDialog();
      return;
    }

    const checked = pendingRuleStatus.action === 'activate';
    const newStatus = checked
      ? rule.schedule && rule.schedule !== 'Not scheduled'
        ? 'scheduled'
        : 'active'
      : 'inactive';

    onUpdateStatus(rule.id, newStatus);
    setRuleStatusTab(checked ? 'active' : 'inactive');

    toast.success(checked ? 'Rule activated' : 'Rule deactivated', {
      description: `"${rule.name}" is now ${newStatus}.`,
      duration: 3000,
    });

    handleCloseSingleRuleStatusDialog();
  };

  const handleSaveEdit = (ruleId: string, updatedData: any) => {
    const ruleName = editingRule?.name || 'Rule';
    onUpdateRule(ruleId, updatedData);
    setEditDrawerOpen(false);
    setEditingRule(null);
    
    toast.success('Rule updated successfully!', {
      description: `"${ruleName}" has been updated.`,
      duration: 4000,
    });
  };

  const handleDeleteClick = (rule: Rule) => {
    setRuleToDelete(rule);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (ruleToDelete) {
      onDelete(ruleToDelete.id);
      toast.success('Rule deleted', {
        description: `\"${ruleToDelete.name}\" has been removed.`,
        duration: 3000,
      });
    }
    setDeleteDialogOpen(false);
    setRuleToDelete(null);
  };

  const getRuleNameStickyBg = (isHighlighted: boolean) =>
    isHighlighted ? 'bg-orange-50' : 'bg-white group-hover:bg-gray-50';

  const handleRuleTableScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const scrollLeft = target.scrollLeft;
    const scrollWidth = target.scrollWidth;
    const clientWidth = target.clientWidth;

    if (scrollLeft <= 10) {
      setShowLeftArrow(false);
      setShowRightArrow(true);
    } else if (scrollLeft + clientWidth >= scrollWidth - 10) {
      setShowLeftArrow(true);
      setShowRightArrow(false);
    } else {
      setShowLeftArrow(true);
      setShowRightArrow(true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'scheduled':
        return 'bg-blue-100 text-blue-700';
      case 'inactive':
        return 'bg-gray-100 text-gray-700';
      case 'draft':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const uniqueFleetTypes = Array.from(new Set(rules.flatMap(r => r.fleetTypes)));

  // Calculate status counts
  const statusCounts = {
    active: rules.filter(r => r.status === 'active').length,
    scheduled: rules.filter(r => r.status === 'scheduled').length,
    draft: rules.filter(r => r.status === 'draft').length,
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex">
            <button
              onClick={() => setActiveTab('manage-scheduler')}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'manage-scheduler'
                  ? 'text-[#ff9800]'
                  : 'text-[#666666] hover:text-[#ff9800]'
              }`}
            >
              <span
                className={`inline-flex items-center gap-1.5 pb-2 ${
                  activeTab === 'manage-scheduler' ? 'border-b-2 border-[#ff9800]' : ''
                }`}
              >
                Manage Schedulers
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className="p-0.5 rounded hover:bg-gray-100 transition-colors"
                      aria-label="Schedulers definition"
                    >
                      <Info className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-3" align="start">
                    <p className="text-sm font-medium text-[#2c3e50] mb-1.5">Schedulers = When</p>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      Set when pricing jobs run — timing, recurrence, and locations.
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed mt-1.5">
                      e.g. Mon–Fri at 6 AM for LAS & PHX. Price logic lives in Rules.
                    </p>
                  </PopoverContent>
                </Popover>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('manage-rules')}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'manage-rules'
                  ? 'text-[#ff9800]'
                  : 'text-[#666666] hover:text-[#ff9800]'
              }`}
            >
              <span
                className={`inline-flex items-center gap-1.5 pb-2 ${
                  activeTab === 'manage-rules' ? 'border-b-2 border-[#ff9800]' : ''
                }`}
              >
                Manage Rules
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className="p-0.5 rounded hover:bg-gray-100 transition-colors"
                      aria-label="Rules definition"
                    >
                      <Info className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-3" align="start">
                    <p className="text-sm font-medium text-[#2c3e50] mb-1.5">Rules = What</p>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      Set pricing logic — conditions to check and actions to take.
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed mt-1.5">
                      e.g. Utilization &gt; 70% → lower rate 5%. Also set brand, locations, LOR & car codes.
                    </p>
                  </PopoverContent>
                </Popover>
              </span>
            </button>
          </div>
          
          {/* Action Buttons */}
          <div>
            {activeTab === 'manage-scheduler' && onCreateScheduler && (
              <CustomButton onClick={onCreateScheduler} variant="primary" size="md">
                Create Scheduler
              </CustomButton>
            )}
            {activeTab === 'manage-rules' && onCreateRule && (
              <CustomButton onClick={onCreateRule} variant="primary" size="md">
                Create Rule
              </CustomButton>
            )}
          </div>
        </div>
      </div>

      {/* Manage Scheduler Tab Content */}
      {activeTab === 'manage-scheduler' && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-900 font-medium">Demo Mode Toggle</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-blue-700">
                {isFirstTimeScheduler ? 'First-Time User View' : 'Existing User View'}
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!isFirstTimeScheduler}
                  onChange={(e) => setIsFirstTimeScheduler(!e.target.checked)}
                  className="w-4 h-4 text-[#ff9800] border-gray-300 rounded focus:ring-[#ff9800]"
                />
                <span className="text-xs text-blue-700">Show Existing Data</span>
              </label>
            </div>
          </div>

          <SchedulerList
            schedulers={displaySchedulers}
            onCreateScheduler={onCreateScheduler}
            onUpdateScheduler={(updated, options) => {
              if (schedulers.length > 0) {
                onUpdateScheduler?.(updated, options);
              } else {
                setDemoSchedulerData((prev) =>
                  prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
                );
                if (!options?.skipToast) {
                  toast.success('Scheduler updated successfully');
                }
              }
            }}
            onDeleteScheduler={(id) => {
              if (schedulers.length > 0) {
                onDeleteScheduler?.(id);
              } else {
                setDemoSchedulerData((prev) => prev.filter((s) => s.id !== id));
              }
            }}
            onBulkUpdateSchedulers={handleBulkUpdateDemoOrReal}
            onBulkDeleteSchedulers={handleBulkDeleteDemoOrReal}
          />
        </>
      )}

      {/* Manage Rules Tab Content */}
      {activeTab === 'manage-rules' && (
        <>
          {/* Toggle for Testing - Switch between First-Time and Existing Flow */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-900 font-medium">Demo Mode Toggle</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-blue-700">
                {isFirstTimeRules ? 'First-Time User View' : 'Existing User View'}
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!isFirstTimeRules}
                  onChange={(e) => setIsFirstTimeRules(!e.target.checked)}
                  className="w-4 h-4 text-[#ff9800] border-gray-300 rounded focus:ring-[#ff9800]"
                />
                <span className="text-xs text-blue-700">Show Existing Data</span>
              </label>
            </div>
          </div>

          {filteredRules.length === 0 && isFirstTimeRules ? (
            // Empty State for First-Time Users
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LayoutGrid className="h-8 w-8 text-[#ff9800]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Welcome to Rule Management
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  You haven't created any rules yet. Rules define the pricing logic and conditions that drive your automated pricing.
                </p>
                <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-6 text-left">
                  <h4 className="text-sm font-medium text-gray-800 mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Getting Started
                  </h4>
                  <ul className="text-xs text-gray-700 space-y-1.5 ml-6 list-disc">
                    <li>Click the "Create Rule" button above to begin</li>
                    <li>Define conditions (utilization rates, competitor pricing, time triggers)</li>
                    <li>Set actions (price adjustments, fixed pricing, competitor matching)</li>
                    <li>Save your rule to use it with schedulers</li>
                  </ul>
                </div>
                <CustomButton 
                  variant="primary" 
                  onClick={onCreateRule}
                  className="mx-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Rule
                </CustomButton>
              </div>
            </div>
          ) : (
            <>
              {/* Filter Section - Only show on Manage Rules tab */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-wrap items-end gap-3 w-full">
                {RULE_PRIMARY_FILTER_FIELDS.map(({ key, label, placeholder }) => (
                  <div key={key} className="flex-1 min-w-[200px]">
                    <label className="block text-xs text-[#666666] mb-1.5 h-[14px] whitespace-nowrap truncate" title={label}>
                      {label}
                    </label>
                    <MultiSelect
                      value={appliedFilters[key]}
                      onChange={(value) => handlePrimaryFilterChange(key, value)}
                      options={filterOptions[key]}
                      placeholder={placeholder}
                      disabled={filterOptions[key].length === 0}
                      compact
                    />
                  </div>
                ))}
                <div className="shrink-0">
                  <label className="block text-xs text-transparent mb-1.5 h-[14px] select-none">More</label>
                  <CustomButton
                    variant="outline"
                    size="sm"
                    onClick={handleToggleMoreFilters}
                    className={`group rounded ${filterPanelOpen || activeMoreFilterCount > 0 ? 'border-[#ff9800] bg-orange-50' : ''}`}
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform group-hover:text-white ${filterPanelOpen ? 'rotate-180 text-[#ff9800]' : activeMoreFilterCount > 0 ? 'text-[#ff9800]' : ''}`} />
                    More filters
                    {activeMoreFilterCount > 0 && (
                      <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#ff9800] text-white text-[10px] font-semibold leading-none">
                        {activeMoreFilterCount}
                      </span>
                    )}
                  </CustomButton>
                </div>
            </div>

          <RuleFilterPanel
            isOpen={filterPanelOpen}
            options={filterOptions}
            filters={appliedFilters}
            onFilterChange={handleMoreFilterChange}
            onReset={handleResetMoreFilters}
          />

          {activeFilterChips.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-gray-200">
              <div className="flex flex-wrap items-center gap-2">
                {activeFilterChips.map((chip) => (
                  <button
                    key={`${chip.field}-${chip.value}`}
                    type="button"
                    onClick={() => handleRemoveFilterChip(chip.field, chip.value)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs text-[#a65a00] hover:bg-orange-100 transition-colors"
                    title="Remove filter"
                  >
                    <span>{chip.label}</span>
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 h-7 px-2 text-xs text-[#ff9800] hover:text-[#f57c00] hover:bg-orange-50 rounded transition-colors shrink-0"
              >
                <X className="h-3.5 w-3.5" />
                Clear all
              </button>
            </div>
          )}

        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            <div
              className="inline-flex items-center p-1 h-9 rounded-lg bg-gray-100 border border-gray-300 shrink-0"
              role="tablist"
              aria-label="Rule status"
            >
              <button
                type="button"
                role="tab"
                aria-selected={ruleStatusTab === 'active'}
                onClick={() => setRuleStatusTab('active')}
                className={`h-7 px-4 text-sm font-medium rounded-md transition-all whitespace-nowrap inline-flex items-center ${
                  ruleStatusTab === 'active'
                    ? 'bg-white text-[#ff9800] shadow-sm'
                    : 'text-[#666666] hover:text-[#2c3e50]'
                }`}
              >
                Active ({activeFilteredRuleCount})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={ruleStatusTab === 'inactive'}
                onClick={() => setRuleStatusTab('inactive')}
                className={`h-7 px-4 text-sm font-medium rounded-md transition-all whitespace-nowrap inline-flex items-center ${
                  ruleStatusTab === 'inactive'
                    ? 'bg-white text-[#ff9800] shadow-sm'
                    : 'text-[#666666] hover:text-[#2c3e50]'
                }`}
              >
                Inactive ({inactiveFilteredRuleCount})
              </button>
            </div>

            <div className="hidden lg:block w-px h-9 bg-gray-300 shrink-0" aria-hidden="true" />

            <div className="relative w-full sm:w-[340px] shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="search"
                aria-label="Search rules in current tab"
                placeholder="Search by rule, brand, location name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 border border-gray-300 bg-white rounded text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#ff9800] focus:border-[#ff9800]"
              />
            </div>

            <p className="text-xs sm:text-sm text-[#666666] shrink-0 lg:text-right lg:ml-auto">
              {formatListResultsText({
                startIndex,
                itemsPerPage,
                filteredCount: filteredRules.length,
                statusTotalCount: statusTotalRuleCount,
                statusLabel: ruleStatusTab,
                hasRefinements: hasListRefinements,
                entityLabel: 'rule',
              })}
                {hasActiveFilters && (
                  <span className="text-[#ff9800]">
                    {' '}· {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} applied
                  </span>
                )}
              </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">

      {/* Card View */}
       {viewMode === 'card' && (
        <div className="p-4 space-y-3 bg-white">
          {paginatedRules.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500">
              No {ruleStatusTab} rules found. {(searchQuery || hasActiveFilters) && 'Try adjusting your search or filters.'}
            </div>
          ) : (
            paginatedRules.map((rule) => (
              <div
                key={rule.id}
                className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow ${
                  highlightedRuleId === rule.id ? 'bg-orange-50 border-l-4 border-l-[#ff9800]' : ''
                }`}
              >
                {/* Header - Name and Actions */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-gray-900 font-medium">{rule.name}</h3>
                  </div>

                  {/* Right Side - Actions */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isRuleToggleOn(rule.status)}
                      onCheckedChange={() => handleOpenSingleRuleStatusDialog(rule)}
                      className="data-[state=checked]:bg-[#ff9800]"
                      aria-label={`Toggle rule status: ${rule.name}`}
                    />
                    <button
                      onClick={() => handleEditClick(rule)}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      title="Edit Rule"
                    >
                      <Edit className="h-4 w-4 text-gray-600" />
                    </button>
                    {onDuplicateRule && (
                      <button
                        onClick={() => handleDuplicateClick(rule)}
                        className="p-1.5 hover:bg-orange-50 rounded transition-colors"
                        title="Duplicate Rule"
                        aria-label={`Duplicate rule: ${rule.name}`}
                      >
                        <Copy className="h-4 w-4 text-gray-600" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteClick(rule)}
                      className="p-1.5 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'list' && (
      <div className="relative bg-white">
        {showRightArrow && (
          <div className="absolute top-0 right-0 h-11 w-16 z-10 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-l from-white via-white/95 to-transparent" />
            <div className="absolute top-1/2 right-2 -translate-y-1/2 flex items-center">
              <ChevronsRight className="h-5 w-5 text-[#ff9800] animate-pulse drop-shadow-sm" />
            </div>
          </div>
        )}
        {showLeftArrow && (
          <div className="absolute top-0 left-0 h-11 w-16 z-10 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-transparent" />
            <div className="absolute top-1/2 left-2 -translate-y-1/2 flex items-center">
              <ChevronsLeft className="h-5 w-5 text-[#ff9800] animate-pulse drop-shadow-sm" />
            </div>
          </div>
        )}
        <div
          className="overflow-x-auto max-h-[720px] overflow-y-auto"
          onScroll={handleRuleTableScroll}
        >
          <table className="w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-20">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className={`px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap ${STICKY_COL_RULE_NAME_HEAD} bg-gray-50`}>
                  Rule Name
                </th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">Brand</th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">Pickup Location</th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">Drop-Off Location</th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">Product Code</th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">LOR</th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">Car Code</th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">Created Date</th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap w-[10%]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedRules.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    No {ruleStatusTab} rules found. {(searchQuery || hasActiveFilters) && 'Try adjusting your search or filters.'}
                  </td>
                </tr>
              ) : (
                paginatedRules.map((rule) => {
                  const isHighlighted = highlightedRuleId === rule.id;
                  const stickyBg = getRuleNameStickyBg(isHighlighted);

                  return (
                  <tr
                    key={rule.id}
                    className={`group transition-colors ${
                      isHighlighted ? 'bg-orange-50 border-l-4 border-l-[#ff9800]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className={`px-4 py-3 text-sm text-gray-900 ${STICKY_COL_RULE_NAME} ${stickyBg}`}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block min-w-0 truncate font-medium text-left">
                            {rule.name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-sm break-words">
                          {rule.name}
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {getRuleBrand(rule)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      <RuleListMultiValueCell values={getRulePickupLocations(rule)} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      <RuleListMultiValueCell values={getRuleDropoffLocations(rule)} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {getRuleProductCode(rule)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      <RuleListMultiValueCell values={getRuleLorValues(rule)} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      <RuleListMultiValueCell values={getRuleCarCodeValues(rule)} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {formatListCreatedDate(rule.createdDate)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={isRuleToggleOn(rule.status)}
                          onCheckedChange={() => handleOpenSingleRuleStatusDialog(rule)}
                          className="data-[state=checked]:bg-[#ff9800]"
                          aria-label={`Toggle rule status: ${rule.name}`}
                        />
                        <button
                          onClick={() => handleEditClick(rule)}
                          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                          title="Edit Rule"
                        >
                          <Edit className="h-4 w-4 text-gray-600" />
                        </button>
                        {onDuplicateRule && (
                          <button
                            onClick={() => handleDuplicateClick(rule)}
                            className="p-1.5 hover:bg-orange-50 rounded transition-colors"
                            title="Duplicate Rule"
                            aria-label={`Duplicate rule: ${rule.name}`}
                          >
                            <Copy className="h-4 w-4 text-gray-600" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteClick(rule)}
                          className="p-1.5 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Items per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="h-8 px-2 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#ff9800] focus:border-[#ff9800]"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">
                {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredRules.length)} of {filteredRules.length}
              </span>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-3 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-8 w-8 rounded text-sm flex items-center justify-center ${
                        currentPage === pageNum
                          ? 'bg-[#ff9800] text-white'
                          : 'bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 px-3 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
          </div>
        </div>
            </>
          )}
        </>
      )}

      <RuleEditDrawer 
        open={editDrawerOpen}
        onOpenChange={setEditDrawerOpen}
        rule={editingRule}
        onSave={handleSaveEdit}
      />
      {/* Single Activate / Deactivate Confirmation Dialog */}
      <AlertDialog
        open={singleRuleStatusDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseSingleRuleStatusDialog();
          }
        }}
      >
        <AlertDialogContent className="overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words">
              {pendingRuleStatus?.action === 'activate'
                ? `Activate rule: ${pendingRuleStatus.name}?`
                : `Deactivate rule: ${pendingRuleStatus?.name ?? 'Rule'}?`}
            </AlertDialogTitle>
          </AlertDialogHeader>

          <div className="space-y-3 min-w-0">
            <AlertDialogDescription>
              {pendingRuleStatus?.action === 'activate'
                ? 'You are about to activate this rule.'
                : 'You are about to deactivate this rule.'}
            </AlertDialogDescription>

            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm">
              <p className="text-amber-900 font-medium mb-2">What will happen:</p>
              {pendingRuleStatus?.action === 'activate' ? (
                <ul className="space-y-1 text-amber-800">
                  <li>• Status will change to Active</li>
                  <li>• The rule will be available for scheduling and execution</li>
                </ul>
              ) : (
                <ul className="space-y-1 text-amber-800">
                  <li>• Status will change to Inactive</li>
                  <li>• The rule will no longer run until reactivated</li>
                  <li>• You can reactivate it later from the table</li>
                </ul>
              )}
            </div>
          </div>

          <AlertDialogFooter>
            <CustomButton variant="secondary" onClick={handleCloseSingleRuleStatusDialog}>
              Cancel
            </CustomButton>
            <CustomButton
              variant={pendingRuleStatus?.action === 'activate' ? 'primary' : 'outline'}
              onClick={handleConfirmSingleRuleStatus}
            >
              {pendingRuleStatus?.action === 'activate' ? 'Activate Rule' : 'Deactivate Rule'}
            </CustomButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule: {ruleToDelete?.name}?</AlertDialogTitle>
          </AlertDialogHeader>
          
          <div className="space-y-3">
            <AlertDialogDescription>
              You're about to permanently delete this pricing rule. This action cannot be undone.
            </AlertDialogDescription>
            
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm">
              <p className="text-amber-900 font-medium mb-2">⚠️ What will happen:</p>
              <ul className="space-y-1 text-amber-800">
                <li>• All scheduled executions will be cancelled</li>
                <li>• Historical data for this rule will be archived</li>
                <li>• Pricing will revert to default settings for affected fleet types</li>
                <li>• This rule cannot be recovered after deletion</li>
              </ul>
            </div>
            
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-medium text-gray-900">"{ruleToDelete?.name}"</span>?
            </AlertDialogDescription>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="h-9 bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Rule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const demoSchedulers = [
  {
    id: 'demo-long-1',
    scheduleName: 'Multiple-Scheduler-Format_Complete_Validation_Test_Record_001',
    submissionType: 'Automatic',
    pickupLocation: ['BGLV1-PDX', 'BGLV1-SFO'],
    dropOffLocation: ['BGLV1-PDX', 'BGLV1-SFO'],
    sameDropoff: true,
    productCode: ['AD', 'AE'],
    carCode: ['C', 'E'],
    lorCode: ['1', '2', '3'],
    getRateShoppedData: true,
    rateType: 'baseRate',
    dataSource: ['ExpediaAPI_1xV3'],
    dateRangeType: 'daysOut',
    daysOutValue: '181-300',
    daysOfWeek: ['Mon', 'Wed', 'Fri'],
    pickupTime: '08:00 AM',
    dropoffTime: '06:00 PM',
    scheduleTime: '06:00',
    startDate: '2025-11-01',
    repeatType: 'weekly',
    everyValue: '1',
    selectedDays: ['Mon', 'Wed', 'Fri'],
    endType: 'never',
    createdDate: 'Jul 8, 2026',
    scheduleIsActive: true,
  },
  {
    id: 'demo-long-2',
    scheduleName: 'BRS_Premium_Weekend_Airport_Extended_Location_Bundle_LOR28_DaysOut',
    submissionType: 'Automatic',
    pickupLocation: ['Los Angeles', 'San Diego', 'Las Vegas'],
    dropOffLocation: ['Los Angeles', 'San Diego'],
    sameDropoff: false,
    productCode: ['AF', 'AG'],
    carCode: ['F', 'G'],
    lorCode: ['2', '3', '4'],
    getRateShoppedData: true,
    rateType: 'finalRate',
    dataSource: ['ExpediaCOUK'],
    dateRangeType: 'daysOut',
    daysOutValue: '14-60',
    daysOfWeek: ['Sat', 'Sun'],
    pickupTime: '09:00 AM',
    dropoffTime: '09:00 PM',
    scheduleTime: '08:00',
    startDate: '2025-10-01',
    repeatType: 'weekly',
    everyValue: '1',
    selectedDays: ['Sat', 'Sun'],
    endType: 'never',
    createdDate: 'Jul 8, 2026',
    scheduleIsActive: true,
  },
  {
    id: 'demo-long-3',
    scheduleName: 'Enterprise_Rate_Submission_Automatic_Nightly_Batch_Processing_Scheduler',
    submissionType: '',
    pickupLocation: ['New York', 'Chicago', 'Boston'],
    dropOffLocation: ['New York', 'Chicago'],
    sameDropoff: false,
    productCode: ['AD'],
    carCode: ['A', 'B'],
    lorCode: [],
    getRateShoppedData: true,
    rateType: 'baseRate',
    dataSource: ['ExpediaAPI_1xV3'],
    dateRangeType: 'daysOut',
    daysOutValue: '90-180',
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    pickupTime: '08:30 AM',
    dropoffTime: '05:30 PM',
    scheduleTime: '07:00',
    startDate: '2025-11-01',
    repeatType: 'daily',
    everyValue: '1',
    selectedDays: [],
    endType: 'never',
    createdDate: 'Jul 8, 2026',
    scheduleIsActive: true,
    creationSource: 'excel',
    importedAt: '2026-07-08T00:00:00.000Z',
    importFileName: 'demo_import.xlsx',
  },
  {
    id: 'demo-1',
    scheduleName: 'BRS_181-300_LOR28',
    submissionType: 'Automatic',
    pickupLocation: ['BGLV1-PDX', 'BGLV1-SFO', 'BGLV1-BGLV1'],
    dropOffLocation: ['BGLV1-PDX', 'BGLV1-SFO', 'BGLV1-BGLV1'],
    sameDropoff: false,
    productCode: ['AD', 'AE', 'AF'],
    carCode: ['C', 'E'],
    lorCode: ['1', '2', '3', '4'],
    getRateShoppedData: true,
    rateType: 'baseRate',
    dataSource: ['ExpediaAPI_1xV3'],
    dateRangeType: 'daysOut',
    daysOutValue: '181-300',
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    pickupTime: '08:00 AM',
    dropoffTime: '06:00 PM',
    scheduleTime: '06:00',
    startDate: '2025-11-01',
    repeatType: 'weekly',
    everyValue: '1',
    selectedDays: ['Mon', 'Wed', 'Fri'],
    endType: 'never',
    createdDate: 'Oct 15, 2025',
  },
  {
    id: 'demo-2',
    scheduleName: 'BRS_181-300_LOR21',
    submissionType: 'Automatic',
    pickupLocation: ['BGLV1-PDX', 'BGLV1-SFO'],
    dropOffLocation: ['BGLV1-PDX', 'BGLV1-SFO'],
    sameDropoff: true,
    productCode: ['AD', 'AE'],
    carCode: ['C', 'E'],
    lorCode: ['1', '2', '3', '4'],
    getRateShoppedData: true,
    rateType: 'baseRate',
    dataSource: ['ExpediaCOUK'],
    dateRangeType: 'daysOut',
    daysOutValue: '181-300',
    daysOfWeek: ['Mon', 'Wed', 'Fri', 'Sat', 'Sun'],
    pickupTime: '09:00 AM',
    dropoffTime: '05:00 PM',
    scheduleTime: '07:30',
    startDate: '2025-10-20',
    repeatType: 'weekly',
    everyValue: '1',
    selectedDays: ['Sat', 'Sun'],
    endType: 'never',
    createdDate: 'Oct 20, 2025',
  },
  {
    id: 'demo-3',
    scheduleName: 'BRS_181-300_LOR14',
    submissionType: 'Manual',
    pickupLocation: ['BGLV1-BGLV1', 'BGLV1-PHX'],
    dropOffLocation: ['BGLV1-BGLV1', 'BGLV1-PHX'],
    sameDropoff: false,
    productCode: ['AF'],
    carCode: ['A', 'B'],
    lorCode: ['3', '4'],
    getRateShoppedData: true,
    rateType: 'finalRate',
    dataSource: ['ExpediaAPI_1xV3'],
    dateRangeType: 'daysOut',
    daysOutValue: '181-300',
    daysOfWeek: ['Tue', 'Thu'],
    pickupTime: '10:00 AM',
    dropoffTime: '04:00 PM',
    scheduleTime: '08:00',
    startDate: '2025-11-10',
    repeatType: 'daily',
    everyValue: '1',
    selectedDays: [],
    endType: 'never',
    createdDate: 'Nov 1, 2025',
  },
  {
    id: 'demo-4',
    scheduleName: 'BRS_181-300_LOR13',
    submissionType: 'Automatic',
    pickupLocation: ['BGLV1-PDX', 'BGLV1-BGLV1'],
    dropOffLocation: ['BGLV1-PDX', 'BGLV1-BGLV1'],
    sameDropoff: true,
    productCode: ['AD'],
    carCode: ['B', 'C'],
    lorCode: ['1', '2', '3'],
    getRateShoppedData: false,
    rateType: 'baseRate',
    dataSource: ['ExpediaCOUK'],
    dateRangeType: 'fixed',
    fixedStartDate: '2025-12-01',
    fixedEndDate: '2025-12-31',
    daysOutValue: '',
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    pickupTime: '07:00 AM',
    dropoffTime: '07:00 PM',
    scheduleTime: '05:30',
    startDate: '2025-12-01',
    repeatType: 'doesNotRepeat',
    everyValue: '1',
    selectedDays: [],
    endType: 'never',
    createdDate: 'Nov 8, 2025',
    scheduleIsActive: false,
    lastUsedAt: '2025-11-20',
  },
  {
    id: 'demo-5',
    scheduleName: 'BRS_181-300_LOR12',
    submissionType: 'Automatic',
    pickupLocation: ['BGLV1-SFO', 'BGLV1-PHX'],
    dropOffLocation: ['BGLV1-SFO', 'BGLV1-PHX'],
    sameDropoff: false,
    productCode: ['AD', 'AE'],
    carCode: ['A', 'B', 'C'],
    lorCode: ['1', '2'],
    getRateShoppedData: true,
    rateType: 'baseRate',
    dataSource: ['ExpediaAPI_1xV3', 'ExpediaCOUK'],
    dateRangeType: 'daysOut',
    daysOutValue: '181-300',
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    pickupTime: '06:30 AM',
    dropoffTime: '08:00 PM',
    scheduleTime: '06:00',
    startDate: '2025-11-15',
    repeatType: 'weekly',
    everyValue: '1',
    selectedDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    endType: 'on',
    endDate: '2026-03-31',
    createdDate: 'Nov 12, 2025',
  },
  {
    id: 'demo-6',
    scheduleName: 'BRS_181-300_LOR11',
    submissionType: 'Manual',
    pickupLocation: ['BGLV1-PHX'],
    dropOffLocation: ['BGLV1-PHX'],
    sameDropoff: true,
    productCode: ['AD'],
    carCode: ['A', 'B'],
    lorCode: ['1', '2'],
    getRateShoppedData: true,
    rateType: 'finalRate',
    dataSource: ['ExpediaAPI_1xV3'],
    dateRangeType: 'daysOut',
    daysOutValue: '181-300',
    daysOfWeek: ['Sun'],
    pickupTime: '11:00 AM',
    dropoffTime: '03:00 PM',
    scheduleTime: '09:00',
    startDate: '2025-10-01',
    repeatType: 'weekly',
    everyValue: '1',
    selectedDays: ['Sun'],
    endType: 'never',
    createdDate: 'Oct 5, 2025',
  },
  {
    id: 'demo-7',
    scheduleName: 'BRS_90-180_LOR7',
    submissionType: 'Automatic',
    pickupLocation: ['New York', 'Chicago'],
    dropOffLocation: ['New York', 'Chicago'],
    sameDropoff: true,
    productCode: ['AD', 'AE'],
    carCode: ['A', 'B'],
    lorCode: ['5', '6', '7'],
    getRateShoppedData: true,
    rateType: 'baseRate',
    dataSource: ['ExpediaAPI_1xV3'],
    dateRangeType: 'daysOut',
    daysOutValue: '90-180',
    daysOfWeek: ['Mon', 'Wed', 'Fri'],
    pickupTime: '08:30 AM',
    dropoffTime: '05:30 PM',
    scheduleTime: '07:00',
    startDate: '2025-11-01',
    repeatType: 'weekly',
    everyValue: '1',
    selectedDays: ['Mon', 'Wed', 'Fri'],
    endType: 'never',
    createdDate: 'Sep 18, 2025',
  },
  {
    id: 'demo-8',
    scheduleName: 'BRS_Weekend_Premium',
    submissionType: 'Automatic',
    pickupLocation: ['Los Angeles', 'San Diego'],
    dropOffLocation: ['Los Angeles', 'San Diego'],
    sameDropoff: false,
    productCode: ['AF', 'AG'],
    carCode: ['F', 'G'],
    lorCode: ['2', '3', '4'],
    getRateShoppedData: true,
    rateType: 'finalRate',
    dataSource: ['ExpediaCOUK'],
    dateRangeType: 'daysOut',
    daysOutValue: '14-60',
    daysOfWeek: ['Sat', 'Sun'],
    pickupTime: '09:00 AM',
    dropoffTime: '09:00 PM',
    scheduleTime: '08:00',
    startDate: '2025-10-01',
    repeatType: 'weekly',
    everyValue: '1',
    selectedDays: ['Sat', 'Sun'],
    endType: 'never',
    createdDate: 'Sep 25, 2025',
  },
  {
    id: 'demo-9',
    scheduleName: 'BRS_Airport_Morning',
    submissionType: 'Manual',
    pickupLocation: ['Chicago', 'Houston'],
    dropOffLocation: ['Chicago', 'Houston'],
    sameDropoff: true,
    productCode: ['AD'],
    carCode: ['K', 'L'],
    lorCode: ['1', '2', '3'],
    getRateShoppedData: false,
    rateType: 'baseRate',
    dataSource: ['ExpediaAPI_1xV3'],
    dateRangeType: 'fixed',
    fixedStartDate: '2025-11-01',
    fixedEndDate: '2026-02-28',
    daysOutValue: '',
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    pickupTime: '06:00 AM',
    dropoffTime: '12:00 PM',
    scheduleTime: '05:00',
    startDate: '2025-11-01',
    repeatType: 'daily',
    everyValue: '1',
    selectedDays: [],
    endType: 'never',
    createdDate: 'Oct 2, 2025',
  },
  {
    id: 'demo-10',
    scheduleName: 'BRS_Holiday_Surge',
    submissionType: 'Automatic',
    pickupLocation: ['Phoenix', 'Dallas'],
    dropOffLocation: ['Phoenix', 'Dallas'],
    sameDropoff: false,
    productCode: ['AE', 'AF', 'AG'],
    carCode: ['H', 'L'],
    lorCode: ['7', '8', '9', '10'],
    getRateShoppedData: true,
    rateType: 'finalRate',
    dataSource: ['ExpediaAPI_1xV3', 'ExpediaCOUK'],
    dateRangeType: 'daysOut',
    daysOutValue: '30-90',
    daysOfWeek: ['Thu', 'Fri', 'Sat', 'Sun'],
    pickupTime: '10:00 AM',
    dropoffTime: '06:00 PM',
    scheduleTime: '09:30',
    startDate: '2025-12-15',
    repeatType: 'weekly',
    everyValue: '1',
    selectedDays: ['Thu', 'Fri', 'Sat', 'Sun'],
    endType: 'on',
    endDate: '2026-01-15',
    createdDate: 'Nov 20, 2025',
  },
  {
    id: 'demo-11',
    scheduleName: 'BRS_Economy_Weekday',
    submissionType: 'Automatic',
    pickupLocation: ['Philadelphia', 'San Antonio'],
    dropOffLocation: ['Philadelphia', 'San Antonio'],
    sameDropoff: true,
    productCode: ['AD', 'AE'],
    carCode: ['A', 'B', 'C'],
    lorCode: ['1', '2', '3', '4', '5'],
    getRateShoppedData: true,
    rateType: 'baseRate',
    dataSource: ['ExpediaCOUK'],
    dateRangeType: 'daysOut',
    daysOutValue: '7-30',
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    pickupTime: '07:30 AM',
    dropoffTime: '04:30 PM',
    scheduleTime: '06:45',
    startDate: '2025-11-05',
    repeatType: 'weekly',
    everyValue: '1',
    selectedDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    endType: 'never',
    createdDate: 'Nov 5, 2025',
  },
  {
    id: 'demo-12',
    scheduleName: 'BRS_LongTerm_LOR28',
    submissionType: 'Manual',
    pickupLocation: ['San Jose', 'New York'],
    dropOffLocation: ['San Jose', 'New York'],
    sameDropoff: false,
    productCode: ['AH', 'AI'],
    carCode: ['XA', 'XB'],
    lorCode: ['14', '21', '28'],
    getRateShoppedData: true,
    rateType: 'baseRate',
    dataSource: ['ExpediaAPI_1xV3'],
    dateRangeType: 'daysOut',
    daysOutValue: '181-300',
    daysOfWeek: ['Tue', 'Thu', 'Sat'],
    pickupTime: '11:30 AM',
    dropoffTime: '02:30 PM',
    scheduleTime: '10:00',
    startDate: '2025-10-15',
    repeatType: 'weekly',
    everyValue: '1',
    selectedDays: ['Tue', 'Thu', 'Sat'],
    endType: 'never',
    createdDate: 'Oct 28, 2025',
    scheduleIsActive: true,
    lastUsedAt: '2026-06-15',
  },
  {
    id: 'demo-13',
    scheduleName: 'BRS_Summer_Peak',
    submissionType: 'Automatic',
    pickupLocation: ['Miami', 'Orlando'],
    dropOffLocation: ['Miami', 'Orlando'],
    sameDropoff: true,
    productCode: ['AD', 'AE'],
    carCode: ['A', 'S'],
    lorCode: ['3', '4', '5'],
    getRateShoppedData: true,
    rateType: 'finalRate',
    dataSource: ['ExpediaAPI_1xV3'],
    dateRangeType: 'daysOut',
    daysOutValue: '30-90',
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    pickupTime: '08:00 AM',
    dropoffTime: '06:00 PM',
    scheduleTime: '07:00',
    startDate: '2026-05-01',
    repeatType: 'weekly',
    everyValue: '1',
    selectedDays: ['Mon', 'Wed', 'Fri'],
    endType: 'never',
    createdDate: 'May 10, 2026',
    scheduleIsActive: true,
    lastUsedAt: '2026-06-28',
  },
  {
    id: 'demo-14',
    scheduleName: 'BRS_OffSeason_Hold',
    submissionType: 'Manual',
    pickupLocation: ['Denver', 'Salt Lake City'],
    dropOffLocation: ['Denver', 'Salt Lake City'],
    sameDropoff: false,
    productCode: ['AF'],
    carCode: ['B', 'C'],
    lorCode: ['2', '3'],
    getRateShoppedData: true,
    rateType: 'baseRate',
    dataSource: ['ExpediaCOUK'],
    dateRangeType: 'fixed',
    fixedStartDate: '2025-09-01',
    fixedEndDate: '2025-11-30',
    daysOutValue: '',
    daysOfWeek: ['Tue', 'Thu'],
    pickupTime: '09:30 AM',
    dropoffTime: '04:00 PM',
    scheduleTime: '08:30',
    startDate: '2025-09-01',
    repeatType: 'doesNotRepeat',
    everyValue: '1',
    selectedDays: [],
    endType: 'never',
    createdDate: 'Aug 20, 2025',
    scheduleIsActive: false,
    lastUsedAt: '2026-05-20',
  },
  {
    id: 'demo-15',
    scheduleName: 'BRS_Legacy_Weekend',
    submissionType: 'Automatic',
    pickupLocation: ['Boston', 'Hartford'],
    dropOffLocation: ['Boston', 'Hartford'],
    sameDropoff: true,
    productCode: ['AD'],
    carCode: ['F'],
    lorCode: ['6', '7'],
    getRateShoppedData: true,
    rateType: 'baseRate',
    dataSource: ['ExpediaAPI_1xV3'],
    dateRangeType: 'daysOut',
    daysOutValue: '14-45',
    daysOfWeek: ['Sat', 'Sun'],
    pickupTime: '10:00 AM',
    dropoffTime: '08:00 PM',
    scheduleTime: '09:00',
    startDate: '2024-03-01',
    repeatType: 'weekly',
    everyValue: '1',
    selectedDays: ['Sat', 'Sun'],
    endType: 'never',
    createdDate: 'Feb 10, 2024',
    scheduleIsActive: false,
    lastUsedAt: '2024-12-01',
  },
  {
    id: 'demo-16',
    scheduleName: 'BRS_Corporate_Rates',
    submissionType: 'Automatic',
    pickupLocation: ['Atlanta', 'Charlotte'],
    dropOffLocation: ['Atlanta', 'Charlotte'],
    sameDropoff: true,
    productCode: ['AE', 'AF', 'AG'],
    carCode: ['G', 'H'],
    lorCode: ['1', '2', '3', '4'],
    getRateShoppedData: true,
    rateType: 'finalRate',
    dataSource: ['ExpediaAPI_1xV3', 'ExpediaCOUK'],
    dateRangeType: 'daysOut',
    daysOutValue: '7-21',
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    pickupTime: '07:00 AM',
    dropoffTime: '05:00 PM',
    scheduleTime: '06:30',
    startDate: '2026-04-01',
    repeatType: 'daily',
    everyValue: '1',
    selectedDays: [],
    endType: 'never',
    createdDate: 'Apr 2, 2026',
    scheduleIsActive: true,
    lastUsedAt: '2026-07-01',
  },
  {
    id: 'demo-17',
    scheduleName: 'BRS_Retired_Airport',
    submissionType: 'Manual',
    pickupLocation: ['Seattle', 'Portland'],
    dropOffLocation: ['Seattle', 'Portland'],
    sameDropoff: false,
    productCode: ['AH'],
    carCode: ['H'],
    lorCode: ['1'],
    getRateShoppedData: true,
    rateType: 'baseRate',
    dataSource: ['ExpediaCOUK'],
    dateRangeType: 'daysOut',
    daysOutValue: '60-120',
    daysOfWeek: ['Mon'],
    pickupTime: '06:00 AM',
    dropoffTime: '12:00 PM',
    scheduleTime: '05:00',
    startDate: '2023-06-01',
    repeatType: 'weekly',
    everyValue: '1',
    selectedDays: ['Mon'],
    endType: 'never',
    createdDate: 'Jun 1, 2023',
    scheduleIsActive: false,
    lastUsedAt: '2024-08-15',
  },
];