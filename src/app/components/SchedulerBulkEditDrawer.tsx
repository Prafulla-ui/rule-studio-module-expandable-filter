import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { X } from 'lucide-react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from './ui/drawer';
import { CustomButton } from './CustomButton';
import { CustomSelect } from './CustomSelect';
import { MultiSelect } from './MultiSelect';
import { Input } from './ui/input';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { TIME_12H_SELECT_OPTIONS } from '../utils/timeFormat';
import { RULE_CAR_CODE_OPTIONS } from '../constants/ruleDefineOptions';

const NO_CHANGE = '__no_change__';

const LOCATION_OPTIONS = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
  'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose',
];

const PRODUCT_CODE_OPTIONS = ['AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL', 'AM'];
const CAR_CODE_OPTIONS = RULE_CAR_CODE_OPTIONS;
const LOR_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '14', '21', '28'];
const DATA_SOURCE_OPTIONS = ['ExpediaAPI_1xV3', 'ExpediaCOUK'];
const DAYS_OF_WEEK_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAY_VALUES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const scheduleTimeOptions = (() => {
  const times: { value: string; label: string }[] = [
    { value: NO_CHANGE, label: '— Keep existing —' },
  ];
  for (let hour = 0; hour < 24; hour++) {
    for (let min = 0; min < 60; min += 15) {
      const h = hour.toString().padStart(2, '0');
      const m = min.toString().padStart(2, '0');
      const time = `${h}:${m}`;
      times.push({ value: time, label: time });
    }
  }
  return times;
})();

export type BulkEditUpdates = {
  submissionType?: string;
  rateType?: string;
  pickupLocation?: string[];
  dropOffLocation?: string[];
  lorCode?: string[];
  productCode?: string[];
  carCode?: string[];
  daysOfWeek?: string[];
  dataSource?: string[];
  pickupTime?: string;
  dropoffTime?: string;
  scheduleTime?: string;
  repeatType?: string;
  everyValue?: string;
  selectedDays?: string[];
  endType?: string;
  endDate?: string;
  endAfterOccurrences?: string;
  startDate?: string;
  dateRangeType?: string;
  daysOutValue?: string;
  fixedStartDate?: string;
  fixedEndDate?: string;
};

type BulkEditForm = ReturnType<typeof emptyForm>;

interface SchedulerBulkEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onApply: (updates: BulkEditUpdates) => void;
}

const emptyForm = () => ({
  submissionType: NO_CHANGE,
  rateType: NO_CHANGE,
  pickupLocation: [] as string[],
  dropOffLocation: [] as string[],
  lorCode: [] as string[],
  productCode: [] as string[],
  carCode: [] as string[],
  daysOfWeek: [] as string[],
  dataSource: [] as string[],
  pickupTime: '',
  dropoffTime: '',
  scheduleTime: NO_CHANGE,
  repeatType: NO_CHANGE,
  everyValue: '1',
  selectedDays: [] as string[],
  endType: 'never',
  endDate: '',
  endAfterOccurrences: '',
  recurrenceStartDate: '',
  dateRangeType: NO_CHANGE,
  daysOutValue: '',
  fixedStartDate: '',
  fixedEndDate: '',
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-[#f8f9fa] rounded-lg p-4 space-y-4">
      <h3 className="text-[#2c3e50] text-base font-medium">{title}</h3>
      {children}
    </div>
  );
}

function getBulkRecurrenceSummary(form: BulkEditForm): string {
  if (form.repeatType === 'doesNotRepeat') {
    return 'Does not repeat.';
  }
  if (form.repeatType !== 'daily' && form.repeatType !== 'weekly') {
    return '';
  }

  const every = form.everyValue || '1';
  let pattern = '';

  if (form.repeatType === 'daily') {
    pattern = every === '1' ? 'every day' : `every ${every} days`;
  } else {
    const days = form.selectedDays.length > 0
      ? form.selectedDays.join(', ')
      : 'no days selected';
    pattern = `weekly on ${days}`;
  }

  let startText = '';
  if (form.recurrenceStartDate) {
    const startDate = new Date(form.recurrenceStartDate);
    startText = ` starting ${startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`;
  } else {
    startText = ' (each scheduler keeps its existing start date)';
  }

  let endText = '';
  if (form.endType === 'on' && form.endDate) {
    const endDate = new Date(form.endDate);
    endText = ` until ${endDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`;
  } else if (form.endType === 'after' && form.endAfterOccurrences) {
    endText = ` for ${form.endAfterOccurrences} occurrence(s)`;
  }

  return `Occurs ${pattern}${startText}${endText}.`;
}

function formatRepeatPreview(form: BulkEditForm): string {
  if (form.repeatType === 'doesNotRepeat') {
    return 'Does not repeat';
  }
  if (form.repeatType === 'daily') {
    const every = form.everyValue || '1';
    const interval = every === '1' ? 'every day' : `every ${every} days`;
    let end = 'ends never';
    if (form.endType === 'on' && form.endDate) end = `ends on ${form.endDate}`;
    if (form.endType === 'after' && form.endAfterOccurrences) {
      end = `ends after ${form.endAfterOccurrences} occurrence(s)`;
    }
    return `Daily, ${interval}; ${end}`;
  }
  if (form.repeatType === 'weekly') {
    const days = form.selectedDays.length > 0 ? form.selectedDays.join(', ') : 'no days selected';
    let end = 'ends never';
    if (form.endType === 'on' && form.endDate) end = `ends on ${form.endDate}`;
    if (form.endType === 'after' && form.endAfterOccurrences) {
      end = `ends after ${form.endAfterOccurrences} occurrence(s)`;
    }
    return `Weekly on ${days}; ${end}`;
  }
  return '';
}

function getPendingUpdates(form: BulkEditForm): BulkEditUpdates {
  const updates: BulkEditUpdates = {};

  if (form.submissionType !== NO_CHANGE) updates.submissionType = form.submissionType;
  if (form.rateType !== NO_CHANGE) updates.rateType = form.rateType;
  if (form.pickupLocation.length > 0) updates.pickupLocation = form.pickupLocation;
  if (form.dropOffLocation.length > 0) updates.dropOffLocation = form.dropOffLocation;
  if (form.lorCode.length > 0) updates.lorCode = form.lorCode;
  if (form.productCode.length > 0) updates.productCode = form.productCode;
  if (form.carCode.length > 0) updates.carCode = form.carCode;
  if (form.daysOfWeek.length > 0) updates.daysOfWeek = form.daysOfWeek;
  if (form.dataSource.length > 0) updates.dataSource = form.dataSource;
  if (form.pickupTime.trim()) updates.pickupTime = form.pickupTime.trim();
  if (form.dropoffTime.trim()) updates.dropoffTime = form.dropoffTime.trim();
  if (form.scheduleTime !== NO_CHANGE) updates.scheduleTime = form.scheduleTime;

  if (form.repeatType !== NO_CHANGE) {
    updates.repeatType = form.repeatType;

    if (form.repeatType === 'daily') {
      updates.everyValue = form.everyValue || '1';
      updates.endType = form.endType;
      if (form.endType === 'on' && form.endDate) updates.endDate = form.endDate;
      if (form.endType === 'after' && form.endAfterOccurrences) {
        updates.endAfterOccurrences = form.endAfterOccurrences;
      }
    }

    if (form.repeatType === 'weekly') {
      updates.selectedDays = form.selectedDays;
      updates.endType = form.endType;
      if (form.endType === 'on' && form.endDate) updates.endDate = form.endDate;
      if (form.endType === 'after' && form.endAfterOccurrences) {
        updates.endAfterOccurrences = form.endAfterOccurrences;
      }
    }

    if (form.recurrenceStartDate.trim()) {
      updates.startDate = form.recurrenceStartDate.trim();
    }
  }

  if (form.dateRangeType === 'fixed') {
    const start = form.fixedStartDate.trim();
    const end = form.fixedEndDate.trim();
    if (start && end) {
      updates.dateRangeType = 'fixed';
      updates.fixedStartDate = start;
      updates.fixedEndDate = end;
      updates.daysOutValue = '';
    }
  } else if (form.dateRangeType === 'daysOut') {
    const daysOut = form.daysOutValue.trim();
    if (daysOut) {
      updates.dateRangeType = 'daysOut';
      updates.daysOutValue = daysOut;
      updates.fixedStartDate = '';
      updates.fixedEndDate = '';
    }
  }

  return updates;
}

function getFormValidationErrors(form: BulkEditForm): string[] {
  const errors: string[] = [];

  if (form.repeatType === 'weekly') {
    if (form.selectedDays.length === 0) {
      errors.push('Select at least one day for weekly repeat.');
    }
  }

  if (form.repeatType === 'daily' || form.repeatType === 'weekly') {
    if (form.endType === 'on' && !form.endDate.trim()) {
      errors.push('Enter an end date or change End to Never / After.');
    }
    if (form.endType === 'after' && !form.endAfterOccurrences.trim()) {
      errors.push('Enter the number of occurrences or change End to Never / On this day.');
    }
  }

  if (form.dateRangeType === 'fixed') {
    if (!form.fixedStartDate.trim() || !form.fixedEndDate.trim()) {
      errors.push('Enter both start and end dates for fixed date range.');
    }
  }

  if (form.dateRangeType === 'daysOut') {
    if (!form.daysOutValue.trim()) {
      errors.push('Enter a Days Out value.');
    }
  }

  return errors;
}

function buildChangesPreview(form: BulkEditForm, selectedCount: number): string[] {
  const lines: string[] = [];

  if (form.submissionType !== NO_CHANGE) {
    lines.push(`Submission Type → ${form.submissionType}`);
  }
  if (form.rateType !== NO_CHANGE) {
    lines.push(`Rate Basis → ${form.rateType === 'baseRate' ? 'Base Rate' : 'Final Rate'}`);
  }
  if (form.pickupLocation.length > 0) {
    lines.push(`Pickup → ${form.pickupLocation.join(', ')}`);
  }
  if (form.dropOffLocation.length > 0) {
    lines.push(`Dropoff → ${form.dropOffLocation.join(', ')}`);
  }
  if (form.lorCode.length > 0) {
    lines.push(`LOR → ${form.lorCode.join(', ')}`);
  }
  if (form.productCode.length > 0) {
    lines.push(`Product Code → ${form.productCode.join(', ')}`);
  }
  if (form.carCode.length > 0) {
    lines.push(`Car Codes → ${form.carCode.join(', ')}`);
  }
  if (form.daysOfWeek.length > 0) {
    lines.push(`Days of Week → ${form.daysOfWeek.join(', ')}`);
  }
  if (form.scheduleTime !== NO_CHANGE) {
    lines.push(`Schedule Time → ${form.scheduleTime}`);
  }
  if (form.pickupTime.trim()) {
    lines.push(`Pick-up Time → ${form.pickupTime.trim()}`);
  }
  if (form.dropoffTime.trim()) {
    lines.push(`Dropoff Time → ${form.dropoffTime.trim()}`);
  }
  if (form.repeatType !== NO_CHANGE) {
    lines.push(`Repeat → ${formatRepeatPreview(form)}`);
    if (form.recurrenceStartDate.trim()) {
      lines.push(`Recurrence Start Date → ${form.recurrenceStartDate.trim()}`);
    }
  }
  if (form.dataSource.length > 0) {
    lines.push(`Source → ${form.dataSource.join(', ')}`);
  }
  if (form.dateRangeType === 'daysOut' && form.daysOutValue.trim()) {
    lines.push(`Date Range → Days Out: ${form.daysOutValue.trim()}`);
  } else if (
    form.dateRangeType === 'fixed' &&
    form.fixedStartDate.trim() &&
    form.fixedEndDate.trim()
  ) {
    lines.push(
      `Date Range → Fixed: ${form.fixedStartDate.trim()} to ${form.fixedEndDate.trim()}`
    );
  }

  if (lines.length > 0) {
    return [
      `${selectedCount} scheduler${selectedCount === 1 ? '' : 's'} will be updated:`,
      ...lines,
    ];
  }

  return [];
}

function RepeatEndFields({
  form,
  setForm,
}: {
  form: BulkEditForm;
  setForm: (form: BulkEditForm) => void;
}) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-4 items-start">
      <label className="text-sm text-gray-700 pt-1">End</label>
      <div className="flex items-center gap-2 flex-wrap">
        <CustomSelect
          value={form.endType}
          onChange={(value) => setForm({ ...form, endType: value })}
          options={[
            { value: 'never', label: 'Never' },
            { value: 'on', label: 'On this day' },
            { value: 'after', label: 'After' },
          ]}
          className="w-40"
        />
        {form.endType === 'on' && (
          <Input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            className="h-7 flex-1 min-w-[160px]"
          />
        )}
        {form.endType === 'after' && (
          <>
            <Input
              type="number"
              min="1"
              value={form.endAfterOccurrences}
              onChange={(e) => setForm({ ...form, endAfterOccurrences: e.target.value })}
              className="h-7 w-20"
            />
            <span className="text-sm text-gray-700">occurrence(s)</span>
          </>
        )}
      </div>
    </div>
  );
}

export function SchedulerBulkEditDrawer({
  isOpen,
  onClose,
  selectedCount,
  onApply,
}: SchedulerBulkEditDrawerProps) {
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    if (isOpen) {
      setForm(emptyForm());
    }
  }, [isOpen]);

  const pendingUpdates = useMemo(() => getPendingUpdates(form), [form]);
  const validationErrors = useMemo(() => getFormValidationErrors(form), [form]);
  const previewLines = useMemo(() => buildChangesPreview(form, selectedCount), [form, selectedCount]);
  const hasPendingChanges = Object.keys(pendingUpdates).length > 0;
  const canApply = hasPendingChanges && validationErrors.length === 0;

  const handleApply = () => {
    if (!canApply) return;
    onApply(pendingUpdates);
    onClose();
  };

  const handleRepeatTypeChange = (value: string) => {
    setForm({
      ...form,
      repeatType: value,
      everyValue: '1',
      selectedDays: [],
      endType: 'never',
      endDate: '',
      endAfterOccurrences: '',
      recurrenceStartDate: '',
    });
  };

  const handleDateRangeTypeChange = (value: string) => {
    if (value === NO_CHANGE) {
      setForm({
        ...form,
        dateRangeType: NO_CHANGE,
        daysOutValue: '',
        fixedStartDate: '',
        fixedEndDate: '',
      });
      return;
    }

    if (value === 'fixed') {
      setForm({
        ...form,
        dateRangeType: 'fixed',
        daysOutValue: '',
      });
      return;
    }

    setForm({
      ...form,
      dateRangeType: 'daysOut',
      fixedStartDate: '',
      fixedEndDate: '',
    });
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} direction="right">
      <DrawerContent className="!w-[1000px] !max-w-[1000px] ml-auto h-screen">
        <div className="w-full h-full flex flex-col">
          <DrawerHeader className="border-b border-gray-200 px-6 py-4 bg-white">
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-8">
                <DrawerTitle className="text-lg text-[#2c3e50] font-medium mb-1">
                  Bulk Edit Schedulers
                </DrawerTitle>
                <DrawerDescription className="text-sm text-gray-500">
                  Apply changes to {selectedCount} selected scheduler{selectedCount === 1 ? '' : 's'}.
                  Leave fields empty or set to &quot;Keep existing&quot; to skip. Choose Fixed or Days Out to change date range, or leave as Keep existing to skip.
                </DrawerDescription>
              </div>
              <DrawerClose className="p-2 hover:bg-gray-100 rounded transition-colors -mt-1">
                <X className="h-5 w-5 text-gray-500" />
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 bg-white space-y-6">
            <Section title="General">
              <div>
                <label className="block text-xs text-[#666666] mb-1.5">Submission Type</label>
                <CustomSelect
                  value={form.submissionType}
                  onChange={(value) => setForm({ ...form, submissionType: value })}
                  options={[
                    { value: NO_CHANGE, label: '— Keep existing —' },
                    { value: 'Automatic', label: 'Automatic' },
                    { value: 'Manual', label: 'Manual' },
                  ]}
                />
              </div>
            </Section>

            <Section title="Location & Product">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#666666] mb-1.5">Pickup Location</label>
                  <MultiSelect
                    value={form.pickupLocation}
                    onChange={(value) => setForm({ ...form, pickupLocation: value })}
                    options={LOCATION_OPTIONS}
                    placeholder="Keep existing"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#666666] mb-1.5">Dropoff</label>
                  <MultiSelect
                    value={form.dropOffLocation}
                    onChange={(value) => setForm({ ...form, dropOffLocation: value })}
                    options={LOCATION_OPTIONS}
                    placeholder="Keep existing"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#666666] mb-1.5">LOR</label>
                  <MultiSelect
                    value={form.lorCode}
                    onChange={(value) => setForm({ ...form, lorCode: value })}
                    options={LOR_OPTIONS}
                    placeholder="Keep existing"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#666666] mb-1.5">Product Code</label>
                  <MultiSelect
                    value={form.productCode}
                    onChange={(value) => setForm({ ...form, productCode: value })}
                    options={PRODUCT_CODE_OPTIONS}
                    placeholder="Keep existing"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#666666] mb-1.5">Car Codes</label>
                  <MultiSelect
                    value={form.carCode}
                    onChange={(value) => setForm({ ...form, carCode: value })}
                    options={CAR_CODE_OPTIONS}
                    placeholder="Keep existing"
                  />
                </div>
              </div>
            </Section>

            <Section title="Data Source">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#666666] mb-1.5">Rate Basis</label>
                  <CustomSelect
                    value={form.rateType}
                    onChange={(value) => setForm({ ...form, rateType: value })}
                    options={[
                      { value: NO_CHANGE, label: '— Keep existing —' },
                      { value: 'baseRate', label: 'Base Rate' },
                      { value: 'finalRate', label: 'Final Rate' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#666666] mb-1.5">Data Sources</label>
                  <MultiSelect
                    value={form.dataSource}
                    onChange={(value) => setForm({ ...form, dataSource: value })}
                    options={DATA_SOURCE_OPTIONS}
                    placeholder="Keep existing"
                  />
                </div>
              </div>
            </Section>

            <Section title="Date Range Configuration">
              <div className="space-y-4">
                <RadioGroup
                  value={form.dateRangeType}
                  onValueChange={handleDateRangeTypeChange}
                  className="flex items-center gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={NO_CHANGE}
                      id="bulk-date-keep-existing"
                      className="border-[#ff9800] text-[#ff9800]"
                    />
                    <label htmlFor="bulk-date-keep-existing" className="text-sm text-gray-700 cursor-pointer">
                      Keep existing
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="fixed"
                      id="bulk-date-fixed"
                      className="border-[#ff9800] text-[#ff9800]"
                    />
                    <label htmlFor="bulk-date-fixed" className="text-sm text-gray-700 cursor-pointer">
                      Fixed
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="daysOut"
                      id="bulk-date-days-out"
                      className="border-[#ff9800] text-[#ff9800]"
                    />
                    <label htmlFor="bulk-date-days-out" className="text-sm text-gray-700 cursor-pointer">
                      Days Out
                    </label>
                  </div>
                </RadioGroup>

                {form.dateRangeType === 'fixed' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#666666] mb-1.5">
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="date"
                        value={form.fixedStartDate}
                        onChange={(e) => setForm({ ...form, fixedStartDate: e.target.value })}
                        className="h-7"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#666666] mb-1.5">
                        End Date <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="date"
                        value={form.fixedEndDate}
                        onChange={(e) => setForm({ ...form, fixedEndDate: e.target.value })}
                        className="h-7"
                      />
                    </div>
                  </div>
                )}

                {form.dateRangeType === 'daysOut' && (
                  <div>
                    <label className="block text-xs text-[#666666] mb-1.5">
                      Days Out <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={form.daysOutValue}
                      onChange={(e) => setForm({ ...form, daysOutValue: e.target.value })}
                      placeholder="e.g. 181-300"
                      className="h-7 max-w-md"
                    />
                  </div>
                )}
              </div>
            </Section>

            <Section title="Days of Week">
              <div className="space-y-4">
                <div className="w-1/2">
                  <label className="block text-xs text-[#666666] mb-1.5">Days of Week</label>
                  <MultiSelect
                    value={form.daysOfWeek}
                    onChange={(value) => setForm({ ...form, daysOfWeek: value })}
                    options={DAYS_OF_WEEK_OPTIONS}
                    placeholder="Keep existing"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#666666] mb-1.5">Pick-up Time</label>
                    <CustomSelect
                      value={form.pickupTime}
                      onChange={(value) => setForm({ ...form, pickupTime: value })}
                      options={TIME_12H_SELECT_OPTIONS}
                      placeholder="Keep existing"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#666666] mb-1.5">Dropoff Time</label>
                    <CustomSelect
                      value={form.dropoffTime}
                      onChange={(value) => setForm({ ...form, dropoffTime: value })}
                      options={TIME_12H_SELECT_OPTIONS}
                      placeholder="Keep existing"
                    />
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Scheduler Settings">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#666666] mb-1.5">Schedule Time</label>
                    <CustomSelect
                      value={form.scheduleTime}
                      onChange={(value) => setForm({ ...form, scheduleTime: value })}
                      options={scheduleTimeOptions}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#666666] mb-1.5">Repeat</label>
                    <CustomSelect
                      value={form.repeatType}
                      onChange={handleRepeatTypeChange}
                      options={[
                        { value: NO_CHANGE, label: '— Keep existing —' },
                        { value: 'doesNotRepeat', label: 'Does not repeat' },
                        { value: 'daily', label: 'Daily' },
                        { value: 'weekly', label: 'Weekly' },
                      ]}
                    />
                  </div>
                </div>

                {form.repeatType === 'daily' && (
                  <div className="space-y-4 border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-[80px_1fr] gap-4 items-center">
                      <label className="text-sm text-gray-700">Every</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={form.everyValue}
                          onChange={(e) => setForm({ ...form, everyValue: e.target.value })}
                          className="h-7 w-20"
                        />
                        <span className="text-sm text-gray-700">day(s)</span>
                      </div>
                    </div>

                    <RepeatEndFields form={form} setForm={setForm} />

                    <div className="grid grid-cols-[80px_1fr] gap-4 items-center">
                      <label className="text-sm text-gray-700">Start</label>
                      <Input
                        type="date"
                        value={form.recurrenceStartDate}
                        onChange={(e) => setForm({ ...form, recurrenceStartDate: e.target.value })}
                        placeholder="Keep existing if empty"
                        className="h-7 max-w-xs"
                      />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="text-sm text-gray-700">{getBulkRecurrenceSummary(form)}</p>
                    </div>
                  </div>
                )}

                {form.repeatType === 'weekly' && (
                  <div className="space-y-4 border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-[80px_1fr] gap-4 items-center">
                      <label className="text-sm text-gray-700">On</label>
                      <div className="flex gap-2 flex-wrap">
                        {WEEKDAY_LABELS.map((day, index) => {
                          const dayValue = WEEKDAY_VALUES[index];
                          const isSelected = form.selectedDays.includes(dayValue);
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                const newDays = isSelected
                                  ? form.selectedDays.filter((d) => d !== dayValue)
                                  : [...form.selectedDays, dayValue];
                                setForm({ ...form, selectedDays: newDays });
                              }}
                              className={`w-10 h-10 rounded-md font-medium text-sm transition-colors ${
                                isSelected
                                  ? 'bg-[#ff9800] text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <RepeatEndFields form={form} setForm={setForm} />

                    <div className="grid grid-cols-[80px_1fr] gap-4 items-center">
                      <label className="text-sm text-gray-700">Start</label>
                      <Input
                        type="date"
                        value={form.recurrenceStartDate}
                        onChange={(e) => setForm({ ...form, recurrenceStartDate: e.target.value })}
                        placeholder="Keep existing if empty"
                        className="h-7 max-w-xs"
                      />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="text-sm text-gray-700">{getBulkRecurrenceSummary(form)}</p>
                    </div>
                  </div>
                )}
              </div>
            </Section>
          </div>

          <div className="border-t border-gray-200 px-6 py-4 bg-white">
            <div
              className={`rounded-lg border p-4 ${
                hasPendingChanges
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <h4 className="text-sm font-medium text-[#2c3e50] mb-2">Changes preview</h4>
              {validationErrors.length > 0 && (
                <ul className="mb-2 space-y-1">
                  {validationErrors.map((error) => (
                    <li key={error} className="text-sm text-red-600">
                      {error}
                    </li>
                  ))}
                </ul>
              )}
              {previewLines.length > 0 ? (
                <ul className="space-y-1">
                  {previewLines.map((line, index) => (
                    <li
                      key={index}
                      className={`text-sm ${index === 0 ? 'font-medium text-[#2c3e50]' : 'text-gray-700'}`}
                    >
                      {index === 0 ? line : `• ${line}`}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600">
                  No changes selected. Fields left empty or set to &quot;Keep existing&quot; will not be updated.
                </p>
              )}
            </div>
          </div>

          <DrawerFooter className="bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex items-center justify-end gap-3 w-full">
              <CustomButton variant="outline" onClick={onClose}>
                Cancel
              </CustomButton>
              <CustomButton variant="primary" onClick={handleApply} disabled={!canApply}>
                Apply to {selectedCount} Scheduler{selectedCount === 1 ? '' : 's'}
              </CustomButton>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
