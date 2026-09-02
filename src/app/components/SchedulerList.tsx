import { useState, useMemo, useEffect } from 'react';
import { CustomButton } from './CustomButton';
import { Search, Calendar, Info, Plus, Edit, ChevronsRight, ChevronsLeft, X, AlertTriangle, Archive, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown } from 'lucide-react';
import { SchedulerBulkEditDrawer, type BulkEditUpdates } from './SchedulerBulkEditDrawer';
import {
  emptySchedulerFilters,
  SCHEDULER_MORE_FILTER_FIELDS,
  SCHEDULER_PRIMARY_FILTER_FIELDS,
  type SchedulerFilterState,
  type SchedulerFilterOptions,
} from './SchedulerFilterDrawer';
import { SchedulerFilterPanel } from './SchedulerFilterPanel';
import { MultiSelect } from './MultiSelect';
import { SchedulerEditDrawer } from './SchedulerEditDrawer';
import { Switch } from './ui/switch';
import { Checkbox } from './ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { toast } from 'sonner@2.0.3';
import { normalizeTimeTo12Hour } from '../utils/timeFormat';
import { formatListCreatedDate, parseListDateValue } from '../utils/listDateFormat';
import { formatListResultsText } from '../utils/listResultsText';
import { RULE_BRAND_OPTIONS } from '../constants/ruleDefineOptions';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

function countActiveFilterFieldsForKeys<T extends Record<string, string[]>>(
  filters: T,
  keys: readonly (keyof T)[]
): number {
  return keys.filter((key) => filters[key].length > 0).length;
}

const ARCHIVE_UNUSED_DAYS = 90;
type SchedulerSortColumn = 'name' | 'brand' | 'createdDate';
type SortDirection = 'asc' | 'desc';

function compareSchedulerBrand(a: string, b: string, direction: SortDirection): number {
  const normalize = (value: string) => (value === '—' ? '' : value.toLowerCase());
  const comparison = normalize(a).localeCompare(normalize(b));
  return direction === 'asc' ? comparison : -comparison;
}

function compareSchedulers(
  a: Scheduler,
  b: Scheduler,
  column: SchedulerSortColumn,
  direction: SortDirection
): number {
  let comparison = 0;

  if (column === 'name') {
    comparison = a.name.localeCompare(b.name);
  } else if (column === 'brand') {
    comparison = compareSchedulerBrand(a.brand, b.brand, 'asc');
  } else {
    const dateA = parseListDateValue(a.createdDateRaw)?.getTime() ?? 0;
    const dateB = parseListDateValue(b.createdDateRaw)?.getTime() ?? 0;
    comparison = dateA - dateB;
  }

  return direction === 'asc' ? comparison : -comparison;
}

function schedulerMatchesSearch(mapped: Scheduler, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const searchableText = [
    mapped.name,
    mapped.brand,
    mapped.pickup,
    mapped.dropoff,
    mapped.productCode,
    mapped.submissionType,
    mapped.carCodes,
    mapped.lor,
    mapped.source,
  ]
    .join(' ')
    .toLowerCase();

  return searchableText.includes(normalizedQuery);
}

function schedulerMatchesRefinements(
  mapped: Scheduler,
  raw: any,
  searchQuery: string,
  appliedFilters: SchedulerFilterState,
  showNeedsAttentionOnly: boolean
): boolean {
  if (showNeedsAttentionOnly && mapped.importStatus !== 'needs_attention') {
    return false;
  }

  if (!schedulerMatchesSearch(mapped, searchQuery)) {
    return false;
  }

  return schedulerMatchesFilters(raw, appliedFilters);
}
type StatusTab = 'active' | 'inactive';

function parseSchedulerDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getSchedulerIsActive(scheduler: any, activeStates: Record<string, boolean>): boolean {
  if (activeStates[scheduler.id] !== undefined) return activeStates[scheduler.id];
  return scheduler.scheduleIsActive !== false;
}

function isSchedulerArchivable(scheduler: any, isActive: boolean): boolean {
  if (isActive || scheduler.isArchived) return false;
  const lastUsed = parseSchedulerDate(scheduler.lastUsedAt) ?? parseSchedulerDate(scheduler.createdDate);
  if (!lastUsed) return false;
  const daysSinceUse = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceUse >= ARCHIVE_UNUSED_DAYS;
}

interface Scheduler {
  id: string;
  name: string;
  submissionType: string;
  rateBasis: string;
  pickup: string;
  dropoff: string;
  lor: string;
  pickupTime: string;
  dropoffTime: string;
  productCode: string;
  carCodes: string;
  daysOfWeek: string;
  source: string;
  fixedRate: string;
  daysOut: string;
  nextRun: string;
  updateTime: string;
  recurrence: string;
  brand: string;
  createdDate: string;
  createdDateRaw: string;
  isActive: boolean;
  importStatus: 'complete' | 'needs_attention' | null;
  importValidationErrors: string[];
}

interface SchedulerListProps {
  schedulers: any[];
  onCreateScheduler?: () => void;
  onUpdateScheduler?: (updatedScheduler: any, options?: { skipToast?: boolean }) => void;
  onDeleteScheduler?: (schedulerId: string) => void;
  onBulkUpdateSchedulers?: (schedulerIds: string[], updates: BulkEditUpdates) => void;
  onBulkDeleteSchedulers?: (schedulerIds: string[]) => void;
}

function normalizeValues(value: unknown): string[] {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value.map(String).filter((v) => v.trim() !== '');
  if (typeof value === 'string') {
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [String(value)];
}

function getSchedulerFieldValues(scheduler: any, field: keyof SchedulerFilterState): string[] {
  switch (field) {
    case 'scheduleName':
      return scheduler.scheduleName ? [scheduler.scheduleName] : [];
    case 'brand':
      return scheduler.brand ? [scheduler.brand] : [];
    case 'occurrence':
      return scheduler.endAfterOccurrences ? [String(scheduler.endAfterOccurrences)] : [];
    case 'scheduleTime':
      return scheduler.scheduleTime ? [scheduler.scheduleTime] : [];
    case 'pickupLocation':
      return normalizeValues(scheduler.pickupLocation);
    case 'dropoffLocation':
      return normalizeValues(scheduler.dropOffLocation);
    case 'productCode':
      return normalizeValues(scheduler.productCode);
    case 'lor':
      return normalizeValues(scheduler.lorCode);
    case 'carCode':
      return normalizeValues(scheduler.carCode);
    case 'dataSource':
      return normalizeValues(scheduler.dataSource);
    case 'dateRangeFixed':
      if (scheduler.dateRangeType === 'fixed' && scheduler.fixedStartDate && scheduler.fixedEndDate) {
        return [`${scheduler.fixedStartDate}-${scheduler.fixedEndDate}`];
      }
      return [];
    case 'dateRangeDaysOut':
      if (scheduler.dateRangeType === 'daysOut' && scheduler.daysOutValue) {
        return [scheduler.daysOutValue];
      }
      return [];
    case 'pickupTime':
      return scheduler.pickupTime ? [normalizeTimeTo12Hour(scheduler.pickupTime)] : [];
    case 'dropoffTime':
      return scheduler.dropoffTime ? [normalizeTimeTo12Hour(scheduler.dropoffTime)] : [];
    default:
      return [];
  }
}

function buildFilterOptions(schedulers: any[]): SchedulerFilterOptions {
  const options = emptySchedulerFilters();
  const fields = Object.keys(options) as (keyof SchedulerFilterState)[];

  schedulers.forEach((scheduler) => {
    fields.forEach((field) => {
      getSchedulerFieldValues(scheduler, field).forEach((value) => {
        if (value && !options[field].includes(value)) {
          options[field].push(value);
        }
      });
    });
  });

  fields.forEach((field) => {
    options[field].sort((a, b) => a.localeCompare(b));
  });

  RULE_BRAND_OPTIONS.forEach((brand) => {
    if (!options.brand.includes(brand)) {
      options.brand.push(brand);
    }
  });
  options.brand.sort((a, b) => a.localeCompare(b));

  return options;
}

function schedulerMatchesFilters(scheduler: any, filters: SchedulerFilterState): boolean {
  const fields = Object.keys(filters) as (keyof SchedulerFilterState)[];
  return fields.every((field) => {
    const selected = filters[field];
    if (selected.length === 0) return true;
    const values = getSchedulerFieldValues(scheduler, field);
    return selected.some((s) => values.includes(s));
  });
}

function hasAnyActiveFilters(filters: SchedulerFilterState): boolean {
  return Object.values(filters).some((values) => values.length > 0);
}

function countActiveFilterFields(filters: SchedulerFilterState): number {
  return Object.values(filters).filter((values) => values.length > 0).length;
}

const FILTER_LABELS: Record<keyof SchedulerFilterState, string> = {
  scheduleName: 'Schedule Name',
  brand: 'Brand',
  occurrence: 'Occurrence',
  scheduleTime: 'Schedule Time',
  pickupLocation: 'Pickup Location',
  dropoffLocation: 'Dropoff Location',
  productCode: 'Product Code',
  lor: 'LOR',
  carCode: 'Car Code',
  dataSource: 'Data Source',
  dateRangeFixed: 'Date Range Fixed',
  dateRangeDaysOut: 'Days Out',
  pickupTime: 'Pickup Time',
  dropoffTime: 'Dropoff Time',
};

const STICKY_COL_CHECKBOX = 'sticky left-0 z-20 w-[52px] min-w-[52px]';
const STICKY_COL_NAME = 'sticky left-[52px] z-20 w-[200px] min-w-[200px] max-w-[200px]';
const STICKY_COL_CHECKBOX_HEAD = 'sticky left-0 z-30 w-[52px] min-w-[52px]';
const STICKY_COL_NAME_HEAD = 'sticky left-[52px] z-30 w-[200px] min-w-[200px] max-w-[200px]';
const STICKY_COL_ACTION = 'sticky right-0 z-20 w-[140px] min-w-[140px]';
const STICKY_COL_ACTION_HEAD = 'sticky right-0 z-40 w-[140px] min-w-[140px]';
const STICKY_BORDER = 'border-r border-gray-200';

function getStickyCellBg(importStatus: Scheduler['importStatus'] | null, isSelected: boolean, isHeader = false): string {
  if (isHeader) return 'bg-gray-50';
  if (isSelected) return 'bg-orange-50';
  if (importStatus === 'needs_attention') return 'bg-red-50';
  return 'bg-white';
}

function getStickyCellHover(importStatus: Scheduler['importStatus'] | null, isSelected: boolean): string {
  if (isSelected) return 'group-hover:bg-orange-50';
  if (importStatus === 'needs_attention') return 'group-hover:bg-red-50';
  return 'group-hover:bg-gray-50';
}

export function SchedulerList({ schedulers, onCreateScheduler, onUpdateScheduler, onBulkUpdateSchedulers }: SchedulerListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [bulkEditDrawerOpen, setBulkEditDrawerOpen] = useState(false);
  const [editingScheduler, setEditingScheduler] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [pendingBulkStatus, setPendingBulkStatus] = useState<'activate' | 'deactivate' | null>(null);
  const [singleStatusDialogOpen, setSingleStatusDialogOpen] = useState(false);
  const [pendingSingleStatus, setPendingSingleStatus] = useState<{
    schedulerId: string;
    action: 'activate' | 'deactivate';
    name: string;
  } | null>(null);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [activeStates, setActiveStates] = useState<{ [key: string]: boolean }>({});
  const [statusTab, setStatusTab] = useState<StatusTab>('active');
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [pendingArchiveIds, setPendingArchiveIds] = useState<string[]>([]);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<SchedulerFilterState>(emptySchedulerFilters());
  const [showNeedsAttentionOnly, setShowNeedsAttentionOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<SchedulerSortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection | null>(null);

  const filterOptions = useMemo(() => buildFilterOptions(schedulers.filter((s) => !s.isArchived)), [schedulers]);

  const visibleSchedulers = useMemo(
    () => schedulers.filter((scheduler) => !scheduler.isArchived),
    [schedulers]
  );

  // Map the schedulers data to the format expected by the table
  const mappedSchedulers: Scheduler[] = visibleSchedulers.map((scheduler) => {
    // Convert data to match table format
    const formatRecurrence = () => {
      if (scheduler.repeatType === 'doesNotRepeat') {
        return 'Does not repeat';
      }
      if (scheduler.repeatType === 'daily') {
        return `Every ${scheduler.everyValue} day(s), Starting: ${scheduler.startDate}${
          scheduler.endType === 'never' ? ', NoEndLimit' : 
          scheduler.endType === 'on' ? `, Until: ${scheduler.endDate}` :
          `, After ${scheduler.endAfterOccurrences} occurrence(s)`
        }`;
      }
      if (scheduler.repeatType === 'weekly') {
        const days = scheduler.selectedDays?.join(', ') || '';
        return `Every: ${days}, Starting: ${scheduler.startDate}${
          scheduler.endType === 'never' ? ', NoEndLimit' : 
          scheduler.endType === 'on' ? `, Until: ${scheduler.endDate}` :
          `, After ${scheduler.endAfterOccurrences} occurrence(s)`
        }`;
      }
      return 'Custom';
    };

    return {
      id: scheduler.id,
      name: scheduler.scheduleName,
      submissionType: scheduler.submissionType,
      rateBasis: scheduler.rateType === 'baseRate' ? 'Base' : 'Final',
      pickup: Array.isArray(scheduler.pickupLocation) ? scheduler.pickupLocation.join(', ') : scheduler.pickupLocation,
      dropoff: Array.isArray(scheduler.dropOffLocation) ? scheduler.dropOffLocation.join(', ') : scheduler.dropOffLocation,
      lor: Array.isArray(scheduler.lorCode) ? scheduler.lorCode.join(', ') : scheduler.lorCode,
      pickupTime: normalizeTimeTo12Hour(scheduler.pickupTime || ''),
      dropoffTime: normalizeTimeTo12Hour(scheduler.dropoffTime || ''),
      productCode: Array.isArray(scheduler.productCode) ? scheduler.productCode.join(', ') : scheduler.productCode,
      carCodes: Array.isArray(scheduler.carCode) ? scheduler.carCode.join(',') : scheduler.carCode,
      daysOfWeek: Array.isArray(scheduler.daysOfWeek) ? scheduler.daysOfWeek.join(',') : scheduler.daysOfWeek,
      source: Array.isArray(scheduler.dataSource) ? scheduler.dataSource.join(', ') : scheduler.dataSource,
      fixedRate: scheduler.dateRangeType === 'fixed' ? `${scheduler.fixedStartDate}-${scheduler.fixedEndDate}` : '',
      daysOut: scheduler.dateRangeType === 'daysOut' ? scheduler.daysOutValue : '',
      nextRun: '',
      updateTime: scheduler.scheduleTime,
      recurrence: formatRecurrence(),
      brand: scheduler.brand || '—',
      createdDate: formatListCreatedDate(scheduler.createdDate),
      createdDateRaw: scheduler.createdDate || '',
      isActive: getSchedulerIsActive(scheduler, activeStates),
      importStatus: scheduler.importStatus ?? null,
      importValidationErrors: scheduler.importValidationErrors ?? [],
    };
  });

  const needsAttentionCount = useMemo(
    () => schedulers.filter((s) => s.importStatus === 'needs_attention').length,
    [schedulers]
  );

  const activeCount = useMemo(
    () => mappedSchedulers.filter((scheduler) => scheduler.isActive).length,
    [mappedSchedulers]
  );
  const inactiveCount = mappedSchedulers.length - activeCount;

  const hasListRefinements =
    searchQuery.trim().length > 0 || hasAnyActiveFilters(appliedFilters) || showNeedsAttentionOnly;

  const schedulersMatchingRefinements = useMemo(() => {
    return mappedSchedulers.filter((mapped) => {
      const raw = schedulers.find((s) => s.id === mapped.id);
      if (!raw) return false;
      return schedulerMatchesRefinements(mapped, raw, searchQuery, appliedFilters, showNeedsAttentionOnly);
    });
  }, [mappedSchedulers, schedulers, searchQuery, appliedFilters, showNeedsAttentionOnly]);

  const activeFilteredCount = useMemo(
    () => schedulersMatchingRefinements.filter((scheduler) => scheduler.isActive).length,
    [schedulersMatchingRefinements]
  );
  const inactiveFilteredCount = schedulersMatchingRefinements.length - activeFilteredCount;

  const archivableSchedulers = useMemo(
    () =>
      mappedSchedulers.filter((mapped) => {
        const raw = schedulers.find((s) => s.id === mapped.id);
        return raw && isSchedulerArchivable(raw, mapped.isActive);
      }),
    [mappedSchedulers, schedulers]
  );

  const filteredSchedulers = useMemo(() => {
    return schedulersMatchingRefinements.filter((mapped) => {
      if (statusTab === 'active' && !mapped.isActive) return false;
      if (statusTab === 'inactive' && mapped.isActive) return false;
      return true;
    });
  }, [schedulersMatchingRefinements, statusTab]);

  const sortedFilteredSchedulers = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredSchedulers;
    return [...filteredSchedulers].sort((a, b) => compareSchedulers(a, b, sortColumn, sortDirection));
  }, [filteredSchedulers, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedFilteredSchedulers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSchedulers = sortedFilteredSchedulers.slice(startIndex, startIndex + itemsPerPage);
  const statusTotalCount = statusTab === 'active' ? activeCount : inactiveCount;

  const handleColumnSort = (column: SchedulerSortColumn) => {
    if (sortColumn !== column) {
      setSortColumn(column);
      setSortDirection('asc');
      return;
    }

    if (sortDirection === 'asc') {
      setSortDirection('desc');
      return;
    }

    setSortColumn(null);
    setSortDirection(null);
  };

  const renderSortableHeader = (label: string, column: SchedulerSortColumn) => {
    const isActive = sortColumn === column;
    const ariaLabel = isActive
      ? sortDirection === 'asc'
        ? `Sort by ${label.toLowerCase()} ascending`
        : `Sort by ${label.toLowerCase()} descending`
      : `Sort by ${label.toLowerCase()}`;

    return (
      <button
        type="button"
        onClick={() => handleColumnSort(column)}
        className="inline-flex items-center gap-1 hover:text-[#2c3e50] transition-colors"
        aria-label={ariaLabel}
      >
        {label}
        {isActive && sortDirection === 'asc' && <ArrowUp className="h-3.5 w-3.5 text-[#ff9800]" />}
        {isActive && sortDirection === 'desc' && <ArrowDown className="h-3.5 w-3.5 text-[#ff9800]" />}
        {!isActive && <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />}
      </button>
    );
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, appliedFilters, statusTab, showNeedsAttentionOnly, itemsPerPage, sortColumn, sortDirection]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const hasActiveFilters = hasAnyActiveFilters(appliedFilters);
  const activeFilterCount = countActiveFilterFields(appliedFilters);
  const activeFilterChips = useMemo(() => {
    const fields = Object.keys(appliedFilters) as (keyof SchedulerFilterState)[];
    return fields.flatMap((field) =>
      appliedFilters[field].map((value) => ({
        field,
        value,
        label: `${FILTER_LABELS[field]}: ${value}`,
      }))
    );
  }, [appliedFilters]);

  const filteredIds = useMemo(() => filteredSchedulers.map((s) => s.id), [filteredSchedulers]);
  const selectedSchedulers = useMemo(
    () => filteredSchedulers.filter((s) => selectedIds.includes(s.id)),
    [filteredSchedulers, selectedIds]
  );
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));
  const someFilteredSelected = filteredIds.some((id) => selectedIds.includes(id)) && !allFilteredSelected;

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...filteredIds])]);
    }
  };

  const handleToggleSelect = (schedulerId: string) => {
    setSelectedIds((prev) =>
      prev.includes(schedulerId)
        ? prev.filter((id) => id !== schedulerId)
        : [...prev, schedulerId]
    );
  };

  const handleBulkEditApply = (updates: BulkEditUpdates) => {
    if (selectedIds.length === 0) return;
    if (onBulkUpdateSchedulers) {
      onBulkUpdateSchedulers(selectedIds, updates);
    } else {
      selectedIds.forEach((id) => {
        const scheduler = schedulers.find((s) => s.id === id);
        if (scheduler && onUpdateScheduler) {
          onUpdateScheduler({ ...scheduler, ...updates });
        }
      });
      toast.success(`Updated ${selectedIds.length} scheduler(s)`);
    }
    setBulkEditDrawerOpen(false);
    setSelectedIds([]);
  };

  const handleOpenBulkStatusDialog = (action: 'activate' | 'deactivate') => {
    setPendingBulkStatus(action);
    setBulkStatusDialogOpen(true);
  };

  const handleCloseBulkStatusDialog = () => {
    setBulkStatusDialogOpen(false);
    setPendingBulkStatus(null);
  };

  const handleConfirmBulkStatus = () => {
    if (!pendingBulkStatus) return;
    const active = pendingBulkStatus === 'activate';
    const count = selectedIds.length;
    selectedIds.forEach((id) => {
      setActiveStates((prev) => ({ ...prev, [id]: active }));
      const raw = schedulers.find((s) => s.id === id);
      if (raw && onUpdateScheduler) {
        onUpdateScheduler({ ...raw, scheduleIsActive: active }, { skipToast: true });
      }
    });
    setStatusTab(active ? 'active' : 'inactive');
    toast.success(
      active
        ? `Schedulers activated. ${count} scheduler(s) will now run as scheduled.`
        : `Schedulers deactivated. ${count} scheduler(s) will no longer run.`
    );
    setSelectedIds([]);
    handleCloseBulkStatusDialog();
  };

  const handleOpenArchiveDialog = (ids: string[]) => {
    setPendingArchiveIds(ids);
    setArchiveDialogOpen(true);
  };

  const handleConfirmArchive = () => {
    const count = pendingArchiveIds.length;
    pendingArchiveIds.forEach((id) => {
      const raw = schedulers.find((s) => s.id === id);
      if (raw && onUpdateScheduler) {
        onUpdateScheduler({ ...raw, isArchived: true }, { skipToast: true });
      }
    });
    setSelectedIds((prev) => prev.filter((id) => !pendingArchiveIds.includes(id)));
    setPendingArchiveIds([]);
    setArchiveDialogOpen(false);
    toast.success(
      `Schedulers archived. ${count} inactive scheduler(s) were removed from the list.`
    );
  };

  const activeMoreFilterCount = useMemo(
    () => countActiveFilterFieldsForKeys(appliedFilters, SCHEDULER_MORE_FILTER_FIELDS.map((field) => field.key)),
    [appliedFilters]
  );

  const handleToggleMoreFilters = () => {
    setFilterPanelOpen((open) => !open);
  };

  const handleMoreFilterChange = (key: keyof SchedulerFilterState, value: string[]) => {
    setAppliedFilters({ ...appliedFilters, [key]: value });
  };

  const handleResetMoreFilters = () => {
    const nextApplied = { ...appliedFilters };
    SCHEDULER_MORE_FILTER_FIELDS.forEach(({ key }) => {
      nextApplied[key] = [];
    });
    setAppliedFilters(nextApplied);
  };

  const handlePrimaryFilterChange = (key: keyof SchedulerFilterState, value: string[]) => {
    setAppliedFilters({ ...appliedFilters, [key]: value });
  };

  const handleClearFilters = () => {
    setAppliedFilters(emptySchedulerFilters());
    setSearchQuery('');
    setShowNeedsAttentionOnly(false);
    setFilterPanelOpen(false);
  };

  const handleRemoveFilterChip = (field: keyof SchedulerFilterState, value: string) => {
    setAppliedFilters({
      ...appliedFilters,
      [field]: appliedFilters[field].filter((item) => item !== value),
    });
  };

  const handleEditClick = (scheduler: Scheduler) => {
    const originalScheduler = schedulers.find(s => s.id === scheduler.id);
    setEditingScheduler(originalScheduler);
    setEditDrawerOpen(true);
  };

  const handleNeedsAttentionClick = (scheduler: Scheduler) => {
    handleEditClick(scheduler);
  };

  const handleCloseSingleStatusDialog = () => {
    setSingleStatusDialogOpen(false);
    setPendingSingleStatus(null);
  };

  const handleOpenSingleStatusDialog = (schedulerId: string, currentState: boolean) => {
    const mapped = mappedSchedulers.find((s) => s.id === schedulerId);
    setPendingSingleStatus({
      schedulerId,
      action: currentState ? 'deactivate' : 'activate',
      name: mapped?.name ?? 'Scheduler',
    });
    setSingleStatusDialogOpen(true);
  };

  const handleConfirmSingleStatus = () => {
    if (!pendingSingleStatus) return;

    const { schedulerId, action } = pendingSingleStatus;
    const nextActive = action === 'activate';

    setActiveStates((prev) => ({
      ...prev,
      [schedulerId]: nextActive,
    }));

    const raw = schedulers.find((s) => s.id === schedulerId);
    if (raw && onUpdateScheduler) {
      onUpdateScheduler(
        {
          ...raw,
          scheduleIsActive: nextActive,
          lastUsedAt: raw.lastUsedAt ?? new Date().toISOString(),
        },
        { skipToast: true }
      );
    }

    setStatusTab(nextActive ? 'active' : 'inactive');

    toast.success(
      nextActive
        ? 'Scheduler activated. It will now run as scheduled.'
        : 'Scheduler deactivated. It will no longer run until reactivated.'
    );

    handleCloseSingleStatusDialog();
  };

  const selectedArchivableIds = useMemo(
    () =>
      selectedIds.filter((id) => {
        const mapped = mappedSchedulers.find((s) => s.id === id);
        const raw = schedulers.find((s) => s.id === id);
        return mapped && raw && isSchedulerArchivable(raw, mapped.isActive);
      }),
    [selectedIds, mappedSchedulers, schedulers]
  );

  const pendingArchiveSchedulers = useMemo(
    () => mappedSchedulers.filter((s) => pendingArchiveIds.includes(s.id)),
    [mappedSchedulers, pendingArchiveIds]
  );

  const handleSaveEdit = (updatedScheduler: any) => {
    if (onUpdateScheduler) {
      onUpdateScheduler(updatedScheduler, { skipToast: true });
    }
    setEditDrawerOpen(false);
    setEditingScheduler(null);
  };

  // Find strategies that use this scheduler
  return (
    <div className="space-y-4">
      {/* Conditional Rendering: Empty State vs Table */}
      {mappedSchedulers.length === 0 ? (
        // Empty State for First-Time Users
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-[#ff9800]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Welcome to Scheduler Management
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              You haven't created any schedulers yet. Schedulers help you automate pricing strategies by defining rules that execute at specific times and intervals.
            </p>
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-6 text-left">
              <h4 className="text-sm font-medium text-gray-800 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Getting Started
              </h4>
              <ul className="text-xs text-gray-700 space-y-1.5 ml-6 list-disc">
                <li>Click the "Create Scheduler" button above to get started</li>
                <li>Define your pricing parameters, time windows, and execution schedule</li>
                <li>Set up recurrence patterns to automate your pricing strategies</li>
                <li>Save your scheduler to activate it</li>
              </ul>
            </div>
            <CustomButton 
              variant="primary" 
              onClick={onCreateScheduler}
              className="mx-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Scheduler
            </CustomButton>
          </div>
        </div>
      ) : (
        <>
          {/* Filter Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-wrap items-end gap-3 w-full">
                  {SCHEDULER_PRIMARY_FILTER_FIELDS.map(({ key, label, placeholder }) => (
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

            <SchedulerFilterPanel
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

          {statusTab === 'inactive' && archivableSchedulers.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{archivableSchedulers.length} inactive scheduler{archivableSchedulers.length === 1 ? '' : 's'}</span>
                {' '}haven&apos;t been used in {ARCHIVE_UNUSED_DAYS}+ days and can be archived.
              </p>
              <CustomButton
                variant="outline"
                size="sm"
                onClick={() => handleOpenArchiveDialog(archivableSchedulers.map((s) => s.id))}
              >
                <Archive className="h-3.5 w-3.5" />
                Archive eligible
              </CustomButton>
            </div>
          )}

          {needsAttentionCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
              <p className="text-sm text-red-900">
                <span className="font-medium">{needsAttentionCount} imported scheduler{needsAttentionCount === 1 ? '' : 's'} need attention.</span>
                {' '}Review and complete missing fields.
              </p>
              <button
                type="button"
                onClick={() => setShowNeedsAttentionOnly((prev) => !prev)}
                className={`text-sm font-medium px-3 py-1 rounded-md border transition-colors ${
                  showNeedsAttentionOnly
                    ? 'bg-red-200 border-red-400 text-red-900'
                    : 'bg-white border-red-300 text-red-800 hover:bg-red-100'
                }`}
              >
                {showNeedsAttentionOnly ? 'Show all' : 'Show only'}
              </button>
            </div>
          )}

          {selectedIds.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
              <span className="text-sm text-gray-800 font-medium">
                {selectedIds.length} scheduler{selectedIds.length === 1 ? '' : 's'} selected
              </span>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <CustomButton variant="outline" size="sm" onClick={() => setBulkEditDrawerOpen(true)}>
                  <Edit className="h-3.5 w-3.5" />
                  Bulk Edit
                </CustomButton>
                {statusTab === 'active' ? (
                  <CustomButton variant="outline" size="sm" onClick={() => handleOpenBulkStatusDialog('deactivate')}>
                    Deactivate
                  </CustomButton>
                ) : (
                  <CustomButton variant="outline" size="sm" onClick={() => handleOpenBulkStatusDialog('activate')}>
                    Activate
                  </CustomButton>
                )}
                {statusTab === 'inactive' && selectedArchivableIds.length > 0 && (
                  <CustomButton
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenArchiveDialog(selectedArchivableIds)}
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Archive
                  </CustomButton>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-sm text-[#ff9800] hover:text-[#f57c00] px-2"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Status tabs + Table */}
          <div className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
              <div
                className="inline-flex items-center p-1 h-9 rounded-lg bg-gray-100 border border-gray-300 shrink-0"
                role="tablist"
                aria-label="Scheduler status"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={statusTab === 'active'}
                  onClick={() => {
                    setStatusTab('active');
                    setSelectedIds([]);
                  }}
                  className={`h-7 px-4 text-sm font-medium rounded-md transition-all whitespace-nowrap inline-flex items-center ${
                    statusTab === 'active'
                      ? 'bg-white text-[#ff9800] shadow-sm'
                      : 'text-[#666666] hover:text-[#2c3e50]'
                  }`}
                >
                  Active ({activeFilteredCount})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={statusTab === 'inactive'}
                  onClick={() => {
                    setStatusTab('inactive');
                    setSelectedIds([]);
                  }}
                  className={`h-7 px-4 text-sm font-medium rounded-md transition-all whitespace-nowrap inline-flex items-center ${
                    statusTab === 'inactive'
                      ? 'bg-white text-[#ff9800] shadow-sm'
                      : 'text-[#666666] hover:text-[#2c3e50]'
                  }`}
                >
                  Inactive ({inactiveFilteredCount})
                </button>
              </div>

              <div className="hidden lg:block w-px h-9 bg-gray-300 shrink-0" aria-hidden="true" />

              <div className="relative w-full sm:w-[340px] shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="search"
                  aria-label="Search schedulers in current tab"
                  placeholder="Search by Scheduler, brand, location name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 border border-gray-300 bg-white rounded text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#ff9800] focus:border-[#ff9800]"
                />
              </div>

              <p className="text-xs sm:text-sm text-[#666666] shrink-0 lg:text-right lg:ml-auto">
                  {formatListResultsText({
                    startIndex,
                    itemsPerPage,
                    filteredCount: filteredSchedulers.length,
                    statusTotalCount,
                    statusLabel: statusTab,
                    hasRefinements: hasListRefinements,
                    entityLabel: 'scheduler',
                  })}
                  {hasActiveFilters && (
                    <span className="text-[#ff9800]">
                      {' '}· {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} applied
                    </span>
                  )}
                </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
            <div className="relative bg-white">
            {/* Right Scroll Indicator — aligned to table header */}
            {showRightArrow && (
              <div className="absolute top-0 right-[140px] h-11 w-16 z-10 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-l from-white via-white/95 to-transparent"></div>
                <div className="absolute top-1/2 right-2 -translate-y-1/2 flex items-center">
                  <ChevronsRight className="h-5 w-5 text-[#ff9800] animate-pulse drop-shadow-sm" />
                </div>
              </div>
            )}
            {/* Left Scroll Indicator — aligned to table header */}
            {showLeftArrow && (
              <div className="absolute top-0 left-0 h-11 w-16 z-10 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-transparent"></div>
                <div className="absolute top-1/2 left-2 -translate-y-1/2 flex items-center">
                  <ChevronsLeft className="h-5 w-5 text-[#ff9800] animate-pulse drop-shadow-sm" />
                </div>
              </div>
            )}
            <div 
              className="overflow-x-auto max-h-[720px] overflow-y-auto"
              onScroll={(e) => {
                const target = e.target as HTMLDivElement;
                const scrollLeft = target.scrollLeft;
                const scrollWidth = target.scrollWidth;
                const clientWidth = target.clientWidth;
                
                // Check if at the beginning (show right arrow only)
                if (scrollLeft <= 10) {
                  setShowLeftArrow(false);
                  setShowRightArrow(true);
                }
                // Check if at the end (show left arrow only)
                else if (scrollLeft + clientWidth >= scrollWidth - 10) {
                  setShowLeftArrow(true);
                  setShowRightArrow(false);
                }
                // In the middle (show both arrows)
                else {
                  setShowLeftArrow(true);
                  setShowRightArrow(true);
                }
              }}
            >
          <table className="w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-20">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className={`px-4 py-3 text-left ${STICKY_COL_CHECKBOX_HEAD} ${STICKY_BORDER} bg-gray-50`}>
                  <Checkbox
                    checked={allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false}
                    onCheckedChange={handleToggleSelectAll}
                    aria-label="Select all schedulers"
                    className="border-[#ff9800] data-[state=checked]:bg-[#ff9800] data-[state=checked]:border-[#ff9800] data-[state=indeterminate]:bg-[#ff9800] data-[state=indeterminate]:border-[#ff9800]"
                  />
                </th>
                <th className={`px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap ${STICKY_COL_NAME_HEAD} ${STICKY_BORDER} bg-gray-50`}>
                  {renderSortableHeader('Name', 'name')}
                </th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">
                  {renderSortableHeader('Brand', 'brand')}
                </th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">
                  {renderSortableHeader('Created Date', 'createdDate')}
                </th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">Submission Type</th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">Rate Basis</th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">Pickup Location</th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">Dropoff Location</th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">LOR</th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">Pickup Time</th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">Dropoff Time</th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">Product Code</th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">Car Codes</th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">Days of week</th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">Source</th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">Fixed Date</th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">Days Out</th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">Next Run</th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">Update Time</th>
                <th className="px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap">Recurrence</th>
                <th className={`px-4 py-3 text-left text-xs text-[#666666] whitespace-nowrap ${STICKY_COL_ACTION_HEAD} bg-gray-50`}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSchedulers.length === 0 ? (
                <tr>
                  <td colSpan={21} className="px-4 py-12 text-center text-gray-500">
                    No {statusTab} schedulers found.
                    {(searchQuery || hasActiveFilters || showNeedsAttentionOnly) && ' Try adjusting your search or filters.'}
                  </td>
                </tr>
              ) : (
              paginatedSchedulers.map((scheduler) => {
                const isSelected = selectedIds.includes(scheduler.id);
                const needsAttention = scheduler.importStatus === 'needs_attention';
                const stickyBg = getStickyCellBg(scheduler.importStatus, isSelected);
                const stickyHover = getStickyCellHover(scheduler.importStatus, isSelected);
                const rawScheduler = schedulers.find((s) => s.id === scheduler.id);
                const canArchive =
                  statusTab === 'inactive' &&
                  rawScheduler &&
                  isSchedulerArchivable(rawScheduler, scheduler.isActive);

                return (
                <tr
                  key={scheduler.id}
                  className={`group transition-colors ${
                    needsAttention
                      ? 'bg-red-50/50 border-l-4 border-l-red-500'
                      : 'hover:bg-gray-50'
                  } ${isSelected ? 'bg-orange-50/50' : ''}`}
                >
                  <td className={`px-4 py-3 ${STICKY_COL_CHECKBOX} ${STICKY_BORDER} ${stickyBg} ${stickyHover}`}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleSelect(scheduler.id)}
                      aria-label={`Select ${scheduler.name}`}
                      className="border-[#ff9800] data-[state=checked]:bg-[#ff9800] data-[state=checked]:border-[#ff9800]"
                    />
                  </td>
                  <td className={`px-4 py-3 text-sm text-gray-900 ${STICKY_COL_NAME} ${STICKY_BORDER} ${stickyBg} ${stickyHover}`}>
                    <div className="flex items-center gap-2 min-w-0 w-full overflow-hidden">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="min-w-0 flex-1 truncate font-medium text-left">
                            {scheduler.name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-sm break-words">
                          {scheduler.name}
                        </TooltipContent>
                      </Tooltip>
                      {needsAttention && (
                        <button
                          type="button"
                          onClick={() => handleNeedsAttentionClick(scheduler)}
                          title={scheduler.importValidationErrors.slice(0, 3).join('\n')}
                          className="inline-flex shrink-0 items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300 hover:bg-red-200 transition-colors"
                        >
                          <AlertTriangle className="h-3 w-3 text-red-600" />
                          Needs attention
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{scheduler.brand}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{scheduler.createdDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{scheduler.submissionType}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{scheduler.rateBasis}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{scheduler.pickup}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{scheduler.dropoff}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{scheduler.lor}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{scheduler.pickupTime}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{scheduler.dropoffTime}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{scheduler.productCode}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap" title={scheduler.carCodes}>
                    {scheduler.carCodes}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{scheduler.daysOfWeek}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{scheduler.source}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{scheduler.fixedRate}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{scheduler.daysOut}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{scheduler.nextRun}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{scheduler.updateTime}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{scheduler.recurrence}</td>
                  <td className={`px-4 py-3 whitespace-nowrap ${STICKY_COL_ACTION} ${stickyBg} ${stickyHover}`}>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={scheduler.isActive}
                        onCheckedChange={() => handleOpenSingleStatusDialog(scheduler.id, scheduler.isActive)}
                      />
                      <button
                        onClick={() => handleEditClick(scheduler)}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title="Edit Scheduler"
                      >
                        <Edit className="h-4 w-4 text-gray-600" />
                      </button>
                      {canArchive && (
                        <button
                          onClick={() => handleOpenArchiveDialog([scheduler.id])}
                          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                          title="Archive scheduler"
                        >
                          <Archive className="h-4 w-4 text-gray-600" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
              })
              )}
            </tbody>
          </table>
            </div>

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
                    {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredSchedulers.length)} of {filteredSchedulers.length}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
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
                          type="button"
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
                      type="button"
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
            </div>
          </div>
        </>
      )}
      
      <SchedulerBulkEditDrawer
        isOpen={bulkEditDrawerOpen}
        onClose={() => setBulkEditDrawerOpen(false)}
        selectedCount={selectedIds.length}
        onApply={handleBulkEditApply}
      />

      {/* Edit Drawer */}
      {editingScheduler && (
        <SchedulerEditDrawer
          isOpen={editDrawerOpen}
          onClose={() => {
            setEditDrawerOpen(false);
            setEditingScheduler(null);
          }}
          scheduler={editingScheduler}
          onSave={handleSaveEdit}
          existingSchedulers={schedulers}
        />
      )}

      {/* Bulk Activate / Deactivate Confirmation Dialog */}
      <AlertDialog
        open={bulkStatusDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseBulkStatusDialog();
        }}
      >
        <AlertDialogContent className="overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingBulkStatus === 'activate'
                ? `Activate ${selectedIds.length} scheduler${selectedIds.length === 1 ? '' : 's'}?`
                : `Deactivate ${selectedIds.length} scheduler${selectedIds.length === 1 ? '' : 's'}?`}
            </AlertDialogTitle>
          </AlertDialogHeader>

          <div className="space-y-3 min-w-0">
            <AlertDialogDescription>
              {pendingBulkStatus === 'activate'
                ? 'You are about to activate the selected schedulers.'
                : 'You are about to deactivate the selected schedulers.'}
            </AlertDialogDescription>

            {pendingBulkStatus === 'activate' && (() => {
              const alreadyActive = selectedSchedulers.filter((s) => s.isActive).length;
              const willActivate = selectedSchedulers.length - alreadyActive;
              return (
                <>
                  {alreadyActive > 0 && willActivate > 0 && (
                    <p className="text-sm text-gray-600">
                      {alreadyActive} of {selectedSchedulers.length} already active; {willActivate} will be activated.
                    </p>
                  )}
                  {alreadyActive === selectedSchedulers.length && selectedSchedulers.length > 0 && (
                    <p className="text-sm text-gray-600">
                      All selected schedulers are already active.
                    </p>
                  )}
                  <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm">
                    <p className="text-amber-900 font-medium mb-2">What will happen:</p>
                    <ul className="space-y-1 text-amber-800">
                      <li>• Status will change to Active</li>
                      <li>• Scheduled runs will execute according to their recurrence settings</li>
                      <li>• Inactive schedulers will resume their configured schedule</li>
                    </ul>
                  </div>
                </>
              );
            })()}

            {pendingBulkStatus === 'deactivate' && (() => {
              const alreadyInactive = selectedSchedulers.filter((s) => !s.isActive).length;
              const willDeactivate = selectedSchedulers.length - alreadyInactive;
              return (
                <>
                  {alreadyInactive > 0 && willDeactivate > 0 && (
                    <p className="text-sm text-gray-600">
                      {alreadyInactive} of {selectedSchedulers.length} already inactive; {willDeactivate} will be deactivated.
                    </p>
                  )}
                  {alreadyInactive === selectedSchedulers.length && selectedSchedulers.length > 0 && (
                    <p className="text-sm text-gray-600">
                      All selected schedulers are already inactive.
                    </p>
                  )}
                  <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm">
                    <p className="text-amber-900 font-medium mb-2">What will happen:</p>
                    <ul className="space-y-1 text-amber-800">
                      <li>• Status will change to Inactive</li>
                      <li>• No automatic runs will execute while inactive</li>
                      <li>• You can reactivate them later from the table or bulk actions</li>
                    </ul>
                  </div>
                </>
              );
            })()}

            {selectedSchedulers.length > 0 && (
              <div className="text-sm min-w-0 overflow-hidden">
                <p className="text-gray-700 font-medium mb-2">Selected schedulers:</p>
                <ul className="space-y-1 text-gray-600 ml-4 list-disc max-h-24 overflow-y-auto overflow-x-hidden pr-1">
                  {selectedSchedulers.slice(0, 5).map((scheduler) => (
                    <li key={scheduler.id} className="break-words">
                      {scheduler.name}
                    </li>
                  ))}
                </ul>
                {selectedSchedulers.length > 5 && (
                  <p className="text-gray-500 mt-1">
                    and {selectedSchedulers.length - 5} more
                  </p>
                )}
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <CustomButton variant="secondary" onClick={handleCloseBulkStatusDialog}>
              Cancel
            </CustomButton>
            <CustomButton
              variant={pendingBulkStatus === 'activate' ? 'primary' : 'outline'}
              onClick={handleConfirmBulkStatus}
            >
              {pendingBulkStatus === 'activate' ? 'Activate Selected' : 'Deactivate Selected'}
            </CustomButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single Activate / Deactivate Confirmation Dialog */}
      <AlertDialog
        open={singleStatusDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseSingleStatusDialog();
        }}
      >
        <AlertDialogContent className="overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words">
              {pendingSingleStatus?.action === 'activate'
                ? `Activate scheduler: ${pendingSingleStatus.name}?`
                : `Deactivate scheduler: ${pendingSingleStatus?.name ?? 'Scheduler'}?`}
            </AlertDialogTitle>
          </AlertDialogHeader>

          <div className="space-y-3 min-w-0">
            <AlertDialogDescription>
              {pendingSingleStatus?.action === 'activate'
                ? 'You are about to activate this scheduler.'
                : 'You are about to deactivate this scheduler.'}
            </AlertDialogDescription>

            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm">
              <p className="text-amber-900 font-medium mb-2">What will happen:</p>
              {pendingSingleStatus?.action === 'activate' ? (
                <ul className="space-y-1 text-amber-800">
                  <li>• Status will change to Active</li>
                  <li>• Scheduled runs will execute according to its recurrence settings</li>
                  <li>• The scheduler will resume its configured schedule</li>
                </ul>
              ) : (
                <ul className="space-y-1 text-amber-800">
                  <li>• Status will change to Inactive</li>
                  <li>• No automatic runs will execute while inactive</li>
                  <li>• You can reactivate it later from the table or bulk actions</li>
                </ul>
              )}
            </div>
          </div>

          <AlertDialogFooter>
            <CustomButton variant="secondary" onClick={handleCloseSingleStatusDialog}>
              Cancel
            </CustomButton>
            <CustomButton
              variant={pendingSingleStatus?.action === 'activate' ? 'primary' : 'outline'}
              onClick={handleConfirmSingleStatus}
            >
              {pendingSingleStatus?.action === 'activate' ? 'Activate Scheduler' : 'Deactivate Scheduler'}
            </CustomButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog
        open={archiveDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveDialogOpen(false);
            setPendingArchiveIds([]);
          }
        }}
      >
        <AlertDialogContent className="overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Archive {pendingArchiveIds.length} scheduler{pendingArchiveIds.length === 1 ? '' : 's'}?
            </AlertDialogTitle>
          </AlertDialogHeader>

          <div className="space-y-3 min-w-0">
            <AlertDialogDescription>
              Archived schedulers are removed from this list but kept for historical reference. They will not run or appear in active workflows.
            </AlertDialogDescription>

            <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm">
              <p className="text-gray-900 font-medium mb-2">What will happen:</p>
              <ul className="space-y-1 text-gray-700">
                <li>• Schedulers will be hidden from Active and Inactive tabs</li>
                <li>• No scheduled runs will occur for archived schedulers</li>
                <li>• Historical data and configuration are preserved</li>
              </ul>
            </div>

            {pendingArchiveSchedulers.length > 0 && (
              <div className="text-sm min-w-0 overflow-hidden">
                <p className="text-gray-700 font-medium mb-2">Schedulers to archive:</p>
                <ul className="space-y-1 text-gray-600 ml-4 list-disc max-h-24 overflow-y-auto overflow-x-hidden pr-1">
                  {pendingArchiveSchedulers.slice(0, 5).map((scheduler) => (
                    <li key={scheduler.id} className="break-words">
                      {scheduler.name}
                    </li>
                  ))}
                </ul>
                {pendingArchiveSchedulers.length > 5 && (
                  <p className="text-gray-500 mt-1">
                    and {pendingArchiveSchedulers.length - 5} more
                  </p>
                )}
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <CustomButton
              variant="secondary"
              onClick={() => {
                setArchiveDialogOpen(false);
                setPendingArchiveIds([]);
              }}
            >
              Cancel
            </CustomButton>
            <CustomButton variant="primary" onClick={handleConfirmArchive}>
              Archive Selected
            </CustomButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
