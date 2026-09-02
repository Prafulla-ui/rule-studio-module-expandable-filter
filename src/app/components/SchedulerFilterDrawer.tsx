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
import { MultiSelect } from './MultiSelect';

export type SchedulerFilterState = {
  scheduleName: string[];
  brand: string[];
  occurrence: string[];
  scheduleTime: string[];
  pickupLocation: string[];
  productLocation: string[];
  dropoffLocation: string[];
  productCode: string[];
  lor: string[];
  carCode: string[];
  dataSource: string[];
  dateRangeFixed: string[];
  dateRangeDaysOut: string[];
  pickupTime: string[];
  dropoffTime: string[];
};

export type SchedulerFilterOptions = {
  [K in keyof SchedulerFilterState]: string[];
};

export const emptySchedulerFilters = (): SchedulerFilterState => ({
  scheduleName: [],
  brand: [],
  occurrence: [],
  scheduleTime: [],
  pickupLocation: [],
  productLocation: [],
  dropoffLocation: [],
  productCode: [],
  lor: [],
  carCode: [],
  dataSource: [],
  dateRangeFixed: [],
  dateRangeDaysOut: [],
  pickupTime: [],
  dropoffTime: [],
});

export const SCHEDULER_FILTER_FIELDS: { key: keyof SchedulerFilterState; label: string; placeholder: string }[] = [
  { key: 'scheduleName', label: 'Schedule Name', placeholder: 'Select schedule names' },
  { key: 'brand', label: 'Brand', placeholder: 'Select brands' },
  { key: 'occurrence', label: 'Occurrence', placeholder: 'Select occurrences' },
  { key: 'scheduleTime', label: 'Schedule Time', placeholder: 'Select schedule times' },
  { key: 'pickupLocation', label: 'Pickup Location', placeholder: 'Select pickup locations' },
  { key: 'productLocation', label: 'Product Location', placeholder: 'Select product locations' },
  { key: 'dropoffLocation', label: 'Dropoff Location', placeholder: 'Select dropoff locations' },
  { key: 'productCode', label: 'Product Code', placeholder: 'Select product codes' },
  { key: 'lor', label: 'LOR', placeholder: 'Select LOR values' },
  { key: 'carCode', label: 'Car Code', placeholder: 'Select car codes' },
  { key: 'dataSource', label: 'Data Sources', placeholder: 'Select data sources' },
  { key: 'dateRangeFixed', label: 'Date Range Fixed', placeholder: 'Select fixed date ranges' },
  { key: 'dateRangeDaysOut', label: 'Date Range Days Out', placeholder: 'Select days out values' },
  { key: 'pickupTime', label: 'Pickup Time', placeholder: 'Select pickup times' },
  { key: 'dropoffTime', label: 'Dropoff Time', placeholder: 'Select dropoff times' },
];

export const SCHEDULER_PRIMARY_FILTER_KEYS = ['brand', 'pickupLocation', 'productLocation'] as const satisfies readonly (keyof SchedulerFilterState)[];

export const SCHEDULER_PRIMARY_FILTER_FIELDS = SCHEDULER_FILTER_FIELDS.filter((field) =>
  (SCHEDULER_PRIMARY_FILTER_KEYS as readonly string[]).includes(field.key)
);

export const SCHEDULER_MORE_FILTER_FIELDS = SCHEDULER_FILTER_FIELDS.filter(
  (field) => !(SCHEDULER_PRIMARY_FILTER_KEYS as readonly string[]).includes(field.key)
);

interface SchedulerFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  options: SchedulerFilterOptions;
  draftFilters: SchedulerFilterState;
  onDraftChange: (filters: SchedulerFilterState) => void;
  onApply: () => void;
  onReset: () => void;
}

export function SchedulerFilterDrawer({
  isOpen,
  onClose,
  options,
  draftFilters,
  onDraftChange,
  onApply,
  onReset,
}: SchedulerFilterDrawerProps) {
  const updateField = (key: keyof SchedulerFilterState, value: string[]) => {
    onDraftChange({ ...draftFilters, [key]: value });
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} direction="right">
      <DrawerContent className="!w-[680px] !max-w-[680px] ml-auto h-screen">
        <div className="w-full h-full flex flex-col">
          <DrawerHeader className="border-b border-gray-200 px-6 py-4 bg-white">
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-8">
                <DrawerTitle className="text-lg text-[#2c3e50] font-medium mb-1">
                  Filter Schedulers
                </DrawerTitle>
                <DrawerDescription className="text-sm text-gray-500">
                  Narrow the scheduler list by criteria
                </DrawerDescription>
              </div>
              <DrawerClose className="p-2 hover:bg-gray-100 rounded transition-colors -mt-1">
                <X className="h-5 w-5 text-gray-500" />
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 bg-white">
            <div className="grid grid-cols-2 gap-4">
              {SCHEDULER_FILTER_FIELDS.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-[#666666] mb-1.5">{label}</label>
                  <MultiSelect
                    value={draftFilters[key]}
                    onChange={(value) => updateField(key, value)}
                    options={options[key]}
                    placeholder={placeholder}
                    disabled={options[key].length === 0}
                  />
                </div>
              ))}
            </div>
          </div>

          <DrawerFooter className="bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between gap-3 w-full">
              <button
                type="button"
                onClick={onReset}
                className="text-[#ff9800] hover:text-[#f57c00] transition-colors font-normal text-sm"
              >
                Reset
              </button>
              <div className="flex gap-3">
                <CustomButton variant="outline" onClick={onClose}>
                  Cancel
                </CustomButton>
                <CustomButton variant="primary" onClick={onApply}>
                  Apply Filters
                </CustomButton>
              </div>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
