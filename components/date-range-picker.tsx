'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek, isAfter, isBefore, startOfDay, differenceInDays } from 'date-fns';
import { enGB } from 'date-fns/locale';

interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface DateRangePickerProps {
  dateRange: DateRange;
  onSelect: (range: DateRange) => void;
  disabled?: boolean;
}

const MAX_DATE_RANGE_DAYS = 31;

export default function DateRangePicker({ dateRange, onSelect, disabled = false }: DateRangePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(dateRange.from || new Date());
  const [isOpen, setIsOpen] = useState(false);
  const [selectingFrom, setSelectingFrom] = useState(true);
  const [tempRange, setTempRange] = useState<DateRange>({ from: null, to: null });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const today = startOfDay(new Date());

  // Reset to selecting from mode when popover opens
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // When opening, always start with selecting start date
      setSelectingFrom(true);
      setTempRange({ from: null, to: null });
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const nextMonth = () => {
    const next = addMonths(currentMonth, 1);
    // Don't allow navigating to months in the future
    if (!isAfter(startOfMonth(next), today)) {
      setCurrentMonth(next);
    }
  };

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleDateClick = (day: Date) => {
    // Disable future dates
    if (isAfter(day, today)) {
      return;
    }

    if (selectingFrom) {
      // Always select start date first
      const newRange: DateRange = {
        from: day,
        to: null
      };
      setTempRange(newRange);
      setSelectingFrom(false); // Switch to selecting end date
      setErrorMessage(null); // Clear any previous error when starting new selection
    } else {
      // Selecting end date (must be after start date)
      if (!tempRange.from) {
        // If somehow we don't have a start date, treat this as start date
        setTempRange({ from: day, to: null });
        setSelectingFrom(false);
        setErrorMessage(null);
        return;
      }

      let newRange: DateRange;
      if (isBefore(day, tempRange.from)) {
        // If end date is before start date, swap them
        newRange = { from: day, to: tempRange.from };
      } else {
        newRange = { from: tempRange.from, to: day };
      }
      
      // Check if the range exceeds the maximum allowed days
      const daysDiff = differenceInDays(newRange.to!, newRange.from!) + 1; // +1 to include both start and end days
      
      if (daysDiff > MAX_DATE_RANGE_DAYS) {
        setErrorMessage(`Maximum date range is ${MAX_DATE_RANGE_DAYS} days. Selected range is ${daysDiff} days.`);
        return; // Don't apply the selection
      }
      
      // Clear any previous error
      setErrorMessage(null);
      
      // Apply the final range
      onSelect(newRange);
      setTempRange({ from: null, to: null });
      setSelectingFrom(true); // Reset for next time
      // Close popover after selecting end date
      setIsOpen(false);
    }
  };

  const resetSelection = () => {
    setSelectingFrom(true);
    setTempRange({ from: null, to: null });
    setErrorMessage(null);
    onSelect({ from: null, to: null });
  };

  // Use tempRange for display when selecting, otherwise use dateRange
  const displayRange = tempRange.from || tempRange.to ? tempRange : dateRange;

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const formatDateRange = () => {
    if (!dateRange.from && !dateRange.to) {
      return 'Select date range';
    }
    if (dateRange.from && !dateRange.to) {
      return `${format(dateRange.from, 'PPP', { locale: enGB })} - ...`;
    }
    if (dateRange.from && dateRange.to) {
      if (isSameDay(dateRange.from, dateRange.to)) {
        return format(dateRange.from, 'PPP', { locale: enGB });
      }
      return `${format(dateRange.from, 'PPP', { locale: enGB })} - ${format(dateRange.to, 'PPP', { locale: enGB })}`;
    }
    return 'Select date range';
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "w-[300px] justify-start text-left font-normal",
            disabled && "opacity-50"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 bg-white rounded-lg shadow-lg border">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevMonth}
              disabled={disabled}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h2 className="text-lg font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={nextMonth}
              disabled={disabled || isAfter(startOfMonth(addMonths(currentMonth, 1)), today)}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Selection Mode Indicator */}
          <div className="mb-3 text-sm text-gray-600 flex items-center justify-between">
            <span>
              {selectingFrom || !displayRange.from ? (
                <span className="font-medium text-blue-600">Select start date</span>
              ) : (
                <span className="font-medium text-blue-600">Select end date (max {MAX_DATE_RANGE_DAYS} days)</span>
              )}
            </span>
            {(displayRange.from || displayRange.to || dateRange.from || dateRange.to) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetSelection}
                className="h-6 text-xs"
              >
                Reset
              </Button>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
              {errorMessage}
            </div>
          )}

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div
                key={day}
                className="h-8 flex items-center justify-center text-sm font-medium text-gray-500 uppercase tracking-wide"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelectedFrom = displayRange.from && isSameDay(day, displayRange.from);
              const isSelectedTo = displayRange.to && isSameDay(day, displayRange.to);
              const isCurrentDay = isToday(day);
              const isFuture = isAfter(day, today);
              const isInRange = displayRange.from && displayRange.to && 
                !isBefore(day, displayRange.from) && !isAfter(day, displayRange.to);
              
              // When selecting end date, disable dates before start date or beyond max range
              const isDisabledForEndDate = !selectingFrom && displayRange.from ? (
                isBefore(day, displayRange.from) || 
                differenceInDays(day, displayRange.from) + 1 > MAX_DATE_RANGE_DAYS
              ) : false;
              
              return (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDateClick(day)}
                  disabled={disabled || !isCurrentMonth || isFuture || isDisabledForEndDate}
                  className={cn(
                    "h-10 w-10 p-0 text-sm font-medium rounded-md transition-colors relative",
                    !isCurrentMonth && "text-gray-300",
                    isCurrentMonth && !isFuture && !isDisabledForEndDate && "text-gray-900 hover:bg-blue-50 hover:text-blue-600",
                    (isFuture || isDisabledForEndDate) && "text-gray-300 cursor-not-allowed opacity-50",
                    isSelectedFrom && "bg-blue-600 text-white hover:bg-blue-700 rounded-l-md",
                    isSelectedTo && "bg-blue-600 text-white hover:bg-blue-700 rounded-r-md",
                    isInRange && !isSelectedFrom && !isSelectedTo && "bg-blue-100 text-blue-600",
                    isCurrentDay && !isSelectedFrom && !isSelectedTo && !isInRange && "bg-blue-50 text-blue-600 hover:bg-blue-100",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {format(day, 'd')}
                </Button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                <span>Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-100"></div>
                <span>Today</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                <span>Future (disabled)</span>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

