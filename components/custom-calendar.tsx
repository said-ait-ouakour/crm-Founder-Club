'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek } from 'date-fns';

interface CustomCalendarProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
  disabled?: boolean;
}

export default function CustomCalendar({ selectedDate, onSelect, disabled = false }: CustomCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
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
          disabled={disabled}
          className="h-8 w-8 p-0 hover:bg-gray-100"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

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
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentDay = isToday(day);
          
          return (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={() => onSelect(day)}
              disabled={disabled || !isCurrentMonth}
              className={cn(
                "h-10 w-10 p-0 text-sm font-medium rounded-md transition-colors",
                !isCurrentMonth && "text-gray-300",
                isCurrentMonth && "text-gray-900 hover:bg-blue-50 hover:text-blue-600",
                isSelected && "bg-blue-600 text-white hover:bg-blue-700",
                isCurrentDay && !isSelected && "bg-blue-100 text-blue-600 hover:bg-blue-200",
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
        </div>
      </div>
    </div>
  );
}
