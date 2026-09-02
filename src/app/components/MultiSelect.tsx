import React, { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverScrollArea, PopoverTrigger } from './ui/popover';
import { Checkbox } from './ui/checkbox';

interface MultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  hasError?: boolean;
  selectAllLabel?: string;
  compact?: boolean;
}

export function MultiSelect({
  value,
  onChange,
  options,
  placeholder = 'Select options',
  className = '',
  disabled = false,
  hasError = false,
  selectAllLabel = 'Select All',
  compact = false,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleOption = (option: string) => {
    const newValue = value.includes(option)
      ? value.filter(v => v !== option)
      : [...value, option];
    onChange(newValue);
  };

  const handleSelectAll = () => {
    const newValue = [...new Set([...value, ...filteredOptions])];
    onChange(newValue);
  };

  const getDisplayText = () => {
    if (value.length === 0) return placeholder;
    if (value.length === 1) return value[0];
    const firstOne = value[0];
    const remaining = value.length - 1;
    return `${firstOne} +${remaining}`;
  };

  const filteredOptions = options.filter(option => 
    String(option).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allFilteredSelected = filteredOptions.length > 0 && 
    filteredOptions.every(option => value.includes(option));

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchQuery('');
    }
  };

  const renderTriggerContent = () => {
    if (value.length === 0) {
      return <span className="text-gray-400 whitespace-nowrap">{placeholder}</span>;
    }

    return (
      <span className={`${disabled ? 'text-gray-500' : 'text-gray-900'} ${compact ? 'truncate' : ''}`}>
        {getDisplayText()}
      </span>
    );
  };

  return (
    <Popover open={isOpen && !disabled} onOpenChange={handleOpenChange} modal={false}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`w-full border rounded px-3 text-left flex items-center justify-between transition-colors text-sm ${
            compact ? 'h-7 min-h-7 py-0' : 'min-h-7 h-auto py-1.5'
          } ${
            disabled 
              ? 'bg-gray-100 cursor-not-allowed text-gray-500 opacity-100 border-[#ced4da]' 
              : hasError
                ? 'bg-white hover:bg-gray-50 cursor-pointer border-amber-400 ring-1 ring-amber-400'
                : 'bg-white hover:bg-gray-50 cursor-pointer border-[#ced4da]'
          } ${className}`}
        >
          <span className="min-w-0 flex-1 overflow-hidden">
            {renderTriggerContent()}
          </span>
          <ChevronDown className={`h-4 w-4 flex-shrink-0 ml-2 ${disabled ? 'text-gray-400' : 'text-gray-500'}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-3 flex flex-col overflow-hidden max-h-[min(320px,var(--radix-popover-content-available-height,320px))]"
        align="start"
      >
        <div className="shrink-0">
          {/* Search Input */}
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full h-7 pl-8 pr-3 text-xs border border-gray-300 rounded focus:outline-none focus:border-[#ff9800]"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Select All */}
          <div className="border-b border-gray-200 mb-2 pb-2">
            <div
              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
              onClick={handleSelectAll}
            >
              <Checkbox
                checked={allFilteredSelected}
                onCheckedChange={handleSelectAll}
                className="data-[state=checked]:bg-[#ff9800] data-[state=checked]:border-[#ff9800]"
              />
              <span className="text-xs text-gray-900">{selectAllLabel}</span>
            </div>
          </div>
        </div>

        {/* Options List */}
        <PopoverScrollArea className="flex-1 space-y-2 pr-1 -mr-1">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <div
                key={option}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                onClick={() => toggleOption(option)}
              >
                <Checkbox
                  checked={value.includes(option)}
                  onCheckedChange={() => toggleOption(option)}
                  className="data-[state=checked]:bg-[#ff9800] data-[state=checked]:border-[#ff9800]"
                />
                <span className="text-sm text-gray-900">{option}</span>
              </div>
            ))
          ) : (
            <div className="text-xs text-gray-500 text-center py-2">No results found</div>
          )}
        </PopoverScrollArea>
      </PopoverContent>
    </Popover>
  );
}
