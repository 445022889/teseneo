import { EventItem, CalendarType, CycleType } from '../types';

export const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const getNextDate = (event: EventItem): string => {
  const today = new Date();
  today.setHours(0,0,0,0);
  const baseDate = new Date(event.date);
  baseDate.setHours(0,0,0,0);
  
  // Single occurrence
  if (event.cycleType === CycleType.ONCE) {
    return baseDate.toISOString().split('T')[0];
  }

  // If base date is already in future, that is the next date
  if (baseDate > today) {
    // return baseDate.toISOString().split('T')[0];
    // Logic decision: Do we want to find the *next* cycle relative to today, or just respect base?
    // Usually we want the next occurrence relative to today.
  }

  let nextDate = new Date(baseDate);
  const interval = event.interval || 1; // Default to 1 if not set

  // Simple brute-force to find next occurrence > yesterday
  // Optimization: Could calculate difference and modulo, but loop is safer for calendar oddities (leap years etc)
  // For standard personal events, loop count is low.
  
  // Safety break
  let loopCount = 0;
  while (nextDate < today && loopCount < 10000) {
    switch (event.cycleType) {
        case CycleType.DAILY:
            nextDate.setDate(nextDate.getDate() + interval);
            break;
        case CycleType.WEEKLY:
            nextDate.setDate(nextDate.getDate() + (interval * 7));
            break;
        case CycleType.MONTHLY:
            nextDate.setMonth(nextDate.getMonth() + interval);
            break;
        case CycleType.YEARLY:
            nextDate.setFullYear(nextDate.getFullYear() + interval);
            break;
    }
    loopCount++;
  }

  // TODO: Integrate 'lunar-javascript' for Lunar conversion here if needed.
  // Currently treating Lunar dates as Solar dates for calculation logic in this demo.
  
  return nextDate.toISOString().split('T')[0];
};

export const getDaysUntil = (dateStr: string): number => {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0,0,0,0);
  target.setHours(0,0,0,0);
  
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays;
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
}