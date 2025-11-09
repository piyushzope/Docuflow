'use client';

import { useState, useEffect } from 'react';
import { format, addMinutes, isPast, isFuture } from 'date-fns';

interface ScheduleSendPickerProps {
  sendImmediately: boolean;
  scheduledSendAt: string | null; // ISO datetime string
  onSendImmediatelyChange: (immediate: boolean) => void;
  onScheduledSendAtChange: (dateTime: string | null) => void;
  className?: string;
}

export default function ScheduleSendPicker({
  sendImmediately,
  scheduledSendAt,
  onSendImmediatelyChange,
  onScheduledSendAtChange,
  className = '',
}: ScheduleSendPickerProps) {
  const [dateInput, setDateInput] = useState(
    scheduledSendAt ? format(new Date(scheduledSendAt), 'yyyy-MM-dd') : ''
  );
  const [timeInput, setTimeInput] = useState(
    scheduledSendAt ? format(new Date(scheduledSendAt), 'HH:mm') : ''
  );

  // Sync internal state with prop changes
  useEffect(() => {
    if (scheduledSendAt) {
      try {
        const date = new Date(scheduledSendAt);
        setDateInput(format(date, 'yyyy-MM-dd'));
        setTimeInput(format(date, 'HH:mm'));
      } catch {
        setDateInput('');
        setTimeInput('');
      }
    } else {
      setDateInput('');
      setTimeInput('');
    }
  }, [scheduledSendAt]);

  const handleToggle = (immediate: boolean) => {
    // Always update the state
    onSendImmediatelyChange(immediate);
    if (immediate) {
      // Clear scheduled date when switching to immediate
      onScheduledSendAtChange(null);
      setDateInput('');
      setTimeInput('');
    }
  };

  const handleDateTimeChange = (date: string, time: string) => {
    setDateInput(date);
    setTimeInput(time);

    if (date && time) {
      const dateTimeString = `${date}T${time}:00`;
      const dateTime = new Date(dateTimeString);
      
      // Validate that it's in the future
      if (isPast(dateTime)) {
        // If past, set to current time + 1 hour
        const futureTime = addMinutes(new Date(), 60);
        const futureDate = format(futureTime, 'yyyy-MM-dd');
        const futureTimeStr = format(futureTime, 'HH:mm');
        setDateInput(futureDate);
        setTimeInput(futureTimeStr);
        onScheduledSendAtChange(futureTime.toISOString());
        return;
      }

      onScheduledSendAtChange(dateTime.toISOString());
    } else {
      onScheduledSendAtChange(null);
    }
  };

  const getTimezone = () => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  const getScheduledDateDisplay = () => {
    if (!scheduledSendAt) return null;
    try {
      const date = new Date(scheduledSendAt);
      if (isFuture(date)) {
        return format(date, 'PPpp'); // Pretty format: "Jan 1, 2024 at 2:30 PM"
      }
    } catch {
      return null;
    }
    return null;
  };

  const scheduledDisplay = getScheduledDateDisplay();
  const now = new Date();
  const minDateTime = format(addMinutes(now, 1), "yyyy-MM-dd'T'HH:mm");

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Send Options
      </label>

      <div className="space-y-3">
        {/* Send Immediately Option */}
        <div className="flex items-center">
          <input
            type="radio"
            id="send_immediately"
            name="send_option"
            value="immediate"
            checked={sendImmediately}
            onChange={() => handleToggle(true)}
            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <label
            htmlFor="send_immediately"
            className="ml-2 block text-sm font-medium text-gray-700 cursor-pointer"
          >
            Send immediately
          </label>
        </div>

        {/* Schedule for Later Option */}
        <div className="flex items-start">
          <input
            type="radio"
            id="schedule_send"
            name="send_option"
            value="scheduled"
            checked={!sendImmediately}
            onChange={() => handleToggle(false)}
            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5 cursor-pointer"
          />
          <div className="ml-2 flex-1">
            <label
              htmlFor="schedule_send"
              className="block text-sm font-medium text-gray-700 cursor-pointer"
            >
              Schedule for later
            </label>
            {!sendImmediately && (
              <div className="mt-2 space-y-2 pl-6 border-l-2 border-gray-200">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="scheduled_date"
                      className="block text-xs font-medium text-gray-600 mb-1"
                    >
                      Date
                    </label>
                    <input
                      type="date"
                      id="scheduled_date"
                      value={dateInput}
                      onChange={(e) => handleDateTimeChange(e.target.value, timeInput)}
                      min={format(now, 'yyyy-MM-dd')}
                      className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={!sendImmediately}
                      disabled={sendImmediately}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="scheduled_time"
                      className="block text-xs font-medium text-gray-600 mb-1"
                    >
                      Time
                    </label>
                    <input
                      type="time"
                      id="scheduled_time"
                      value={timeInput}
                      onChange={(e) => handleDateTimeChange(dateInput, e.target.value)}
                      className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={!sendImmediately}
                      disabled={sendImmediately}
                    />
                  </div>
                </div>

                {scheduledDisplay && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-xs text-blue-800">
                      <strong>Scheduled:</strong> {scheduledDisplay}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Timezone: {getTimezone()}
                    </p>
                  </div>
                )}

                {scheduledSendAt && isPast(new Date(scheduledSendAt)) && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-xs text-red-800">
                      ⚠️ Scheduled time is in the past. Please select a future date and time.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

