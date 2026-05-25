'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  FaCalendarDays, 
  FaClock, 
  FaUser, 
  FaCheck, 
  FaWandMagicSparkles, 
  FaCircleCheck, 
  FaPaperPlane, 
  FaChevronLeft, 
  FaChevronRight, 
  FaCircleExclamation,
  FaArrowLeft,
  FaFire,
  FaCashRegister,
  FaTrash,
  FaUserPlus,
  FaCopy
} from 'react-icons/fa6';
import { toast } from 'react-toastify';
import Link from 'next/link';

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
}

interface Shift {
  id: number;
  uid: string;
  title: string;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'ACCEPTED' | 'CANCELLED';
  eventType?: {
    slug: 'grill-shift' | 'register-shift';
    title: string;
  };
  userId?: number;
  user?: {
    id: number;
    name: string;
    verifiedNumbers?: Array<{ phoneNumber: string }>;
  };
}

export default function RosterManagementCenter() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, 1 = next week, etc.
  const [actionLoading, setActionLoading] = useState(false);
  const [draggedOverId, setDraggedOverId] = useState<number | null>(null);

  // Staff management states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [enrollLoading, setEnrollLoading] = useState(false);

  // Compatibility/conflict states
  const [conflicts, setConflicts] = useState<{ email1: string; email2: string }[]>([]);
  const [conflictLoading, setConflictLoading] = useState(false);
  const [newConflictEmail1, setNewConflictEmail1] = useState('');
  const [newConflictEmail2, setNewConflictEmail2] = useState('');
  const [showConflictsManager, setShowConflictsManager] = useState(false);

  // Mobile active selection states
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);
  const [activeMobileDay, setActiveMobileDay] = useState<string>('Monday');

  // Roster Analytics collapse state
  const [showAnalytics, setShowAnalytics] = useState(true);

  // Hourly rates states
  const [hourlyRates, setHourlyRates] = useState<Record<string, number>>({});
  const [editingRateUserId, setEditingRateUserId] = useState<number | null>(null);
  const [tempRateValue, setTempRateValue] = useState<string>('');
  const [ratesLoading, setRatesLoading] = useState(false);


  // Enroll new employee handler
  const handleEnrollStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim()) {
      toast.error('Name and Email are required.');
      return;
    }

    setEnrollLoading(true);
    try {
      const res = await fetch('/api/scheduling/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStaffName.trim(),
          email: newStaffEmail.trim(),
          phone: newStaffPhone.trim(),
        }),
      });

      const result = await res.json();
      if (res.ok) {
        toast.success(`🎉 ${newStaffName.trim()} enrolled successfully!`);
        if (result.data?.user) {
          setUsers((prev) => [...prev, result.data.user]);
        }
        setNewStaffName('');
        setNewStaffEmail('');
        setNewStaffPhone('');
        setShowAddForm(false);
      } else {
        toast.error(result.message || 'Failed to enroll staff member.');
      }
    } catch (err) {
      toast.error('Network failure during staff enrollment.');
    } finally {
      setEnrollLoading(false);
    }
  };

  // Remove employee handler
  const handleRemoveStaff = async (userId: number, userName: string) => {
    const confirmed = window.confirm(
      `⚠️ WARNING: Are you sure you want to remove ${userName} from the active roster?\n\nAny shifts currently scheduled for ${userName} will be automatically preserved on the calendar as Unassigned.`
    );
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/scheduling/staff', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const result = await res.json();
      if (res.ok) {
        toast.success(`👋 ${userName} has been removed.`);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        fetchRoster();
      } else {
        toast.error(result.message || 'Failed to remove employee.');
      }
    } catch (err) {
      toast.error('Network failure during employee decommissioning.');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchConflicts = useCallback(async () => {
    try {
      const res = await fetch('/api/scheduling/conflicts');
      if (res.ok) {
        const result = await res.json();
        setConflicts(result.data?.conflicts || []);
      }
    } catch (err) {
      console.error('Failed to fetch compatibility rules', err);
    }
  }, []);

  const fetchRates = useCallback(async () => {
    try {
      const res = await fetch('/api/scheduling/rates');
      if (res.ok) {
        const result = await res.json();
        setHourlyRates(result.data?.rates || {});
      }
    } catch (err) {
      console.error('Failed to fetch hourly rates', err);
    }
  }, []);

  const handleUpdateRate = async (email: string, rateStr: string, userId: number) => {
    const rateVal = rateStr.trim() === '' ? null : Number(rateStr);
    if (rateVal !== null && (isNaN(rateVal) || rateVal < 0)) {
      toast.error('Please enter a valid positive number.');
      return;
    }

    setRatesLoading(true);
    try {
      const res = await fetch('/api/scheduling/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          rate: rateVal,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        toast.success(rateVal === null ? 'Hourly rate reset to default.' : 'Hourly rate updated!');
        setHourlyRates(result.data?.rates || {});
        setEditingRateUserId(null);
      } else {
        toast.error(result.message || 'Failed to update hourly rate.');
      }
    } catch (err) {
      toast.error('Network failure while updating hourly rate.');
    } finally {
      setRatesLoading(false);
    }
  };

  const handleAddConflict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConflictEmail1 || !newConflictEmail2) {
      toast.error('Both employees are required.');
      return;
    }
    if (newConflictEmail1 === newConflictEmail2) {
      toast.error('An employee cannot conflict with themselves.');
      return;
    }

    setConflictLoading(true);
    try {
      const res = await fetch('/api/scheduling/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          email1: newConflictEmail1,
          email2: newConflictEmail2,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        toast.success('Compatibility rule added successfully!');
        setConflicts(result.data?.conflicts || []);
        setNewConflictEmail1('');
        setNewConflictEmail2('');
      } else {
        toast.error(result.message || 'Failed to add rule.');
      }
    } catch (err) {
      toast.error('Network failure while adding compatibility rule.');
    } finally {
      setConflictLoading(false);
    }
  };

  const handleRemoveConflict = async (email1: string, email2: string) => {
    const confirmed = window.confirm(`Are you sure you want to remove this compatibility rule?`);
    if (!confirmed) return;

    setConflictLoading(true);
    try {
      const res = await fetch('/api/scheduling/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          email1,
          email2,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        toast.success('Compatibility rule removed successfully!');
        setConflicts(result.data?.conflicts || []);
      } else {
        toast.error(result.message || 'Failed to remove rule.');
      }
    } catch (err) {
      toast.error('Network failure while removing compatibility rule.');
    } finally {
      setConflictLoading(false);
    }
  };

  // Calculate Monday to Sunday dates for the selected week offset, timezone-hardened to America/Chicago
  const getWeekRange = useCallback(() => {
    // 1. Get current moment in Chicago time
    const chicagoStr = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
    const todayInChicago = new Date(chicagoStr);
    const currentDay = todayInChicago.getDay(); // 0 is Sunday, 1 is Monday...

    // 2. Compute days to Monday of this week
    const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const targetMonday = new Date(todayInChicago);
    targetMonday.setDate(todayInChicago.getDate() + daysToMonday + weekOffset * 7);

    // 3. Helper to create absolute Date representing specific Central hour/min on targetMonday's day
    const getCentralDate = (targetDate: Date, hour: number, minute: number = 0, seconds: number = 0, ms: number = 0) => {
      // Use sv-SE locale to get YYYY-MM-DD
      const datePart = targetDate.toLocaleDateString('sv-SE', { timeZone: 'America/Chicago' });
      const localIso = `${datePart}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      const tempUtc = new Date(localIso + 'Z');
      const testChicago = tempUtc.toLocaleString('en-US', { timeZone: 'America/Chicago' });
      const testUtc = tempUtc.toLocaleString('en-US', { timeZone: 'UTC' });
      const diffMs = new Date(testChicago).getTime() - new Date(testUtc).getTime();
      const result = new Date(tempUtc.getTime() - diffMs);
      if (ms > 0) result.setMilliseconds(ms);
      return result;
    };

    const start = getCentralDate(targetMonday, 0, 0, 0, 0);

    const targetSunday = new Date(targetMonday);
    targetSunday.setDate(targetMonday.getDate() + 6);
    const end = getCentralDate(targetSunday, 23, 59, 59, 999);

    return { start, end };
  }, [weekOffset]);

  const { start: weekStart, end: weekEnd } = getWeekRange();

  const fetchRoster = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getWeekRange();
      const startIso = start.toISOString();
      const endIso = end.toISOString();
      const res = await fetch(`/api/scheduling?type=shifts&startDate=${startIso}&endDate=${endIso}`);
      
      if (res.ok) {
        const result = await res.json();
        setShifts(result.data?.scheduler?.bookings || []);
        setUsers(result.data?.scheduler?.users || []);
      } else {
        toast.error('Failed to capture schedule grid.');
      }
    } catch (error) {
      toast.error('Uplink failed during roster telemetry fetch.');
    } finally {
      setLoading(false);
    }
  }, [getWeekRange]);

  useEffect(() => {
    fetchRoster();
    fetchConflicts();
    fetchRates();
  }, [fetchRoster, fetchConflicts, fetchRates]);

  const handlePredict = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/scheduling/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffset: weekOffset + 1 }) // Predict for the targeted week offset
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(`🔮 Forecast completed! ${result.data?.predictedShiftsCount || 0} shifts predicted.`);
        fetchRoster();
      } else {
        toast.error(result.message || 'Prediction matrix compilation failed.');
      }
    } catch (error) {
      toast.error('Critical forecasting failure.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/scheduling/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffset })
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(`✅ Roster Approved! ${result.data?.approvedCount || 0} shifts activated.`);
        fetchRoster();
      } else {
        toast.error(result.message || 'Roster authorization failed.');
      }
    } catch (error) {
      toast.error('Critical approval transaction failure.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatch = async () => {
    setActionLoading(true);
    try {
      const secret = process.env.NEXT_PUBLIC_SCHEDULER_DISPATCH_SECRET || 'fallback-secret-key-12345';
      const res = await fetch('/api/scheduling/dispatch', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secret}`
        },
        body: JSON.stringify({ weekOffset })
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(`🚀 SMS Broadcast Dispatched successfully!`);
      } else {
        toast.error(result.message || 'SMS compilation failure.');
      }
    } catch (error) {
      toast.error('SMS transceiver uplink failure.');
    } finally {
      setActionLoading(false);
    }
  };

  // Clear target week assignments completely
  const handleClearWeek = async () => {
    const confirmed = window.confirm(
      `⚠️ Are you sure you want to revert all shifts this week back to Unassigned?\n\nThis will clear all current employee assignments for the entire week of ${formatDateRange()}.`
    );
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/scheduling/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear', weekOffset }),
      });

      const result = await res.json();
      if (res.ok) {
        toast.success(`🧹 Successfully cleared ${result.data?.clearedCount || 0} shifts.`);
        fetchRoster();
      } else {
        toast.error(result.message || 'Failed to clear week shifts.');
      }
    } catch (err) {
      toast.error('Network failure during bulk clear operation.');
    } finally {
      setActionLoading(false);
    }
  };

  // Clone previous week's roster assignments onto active week
  const handleClonePreviousWeek = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/scheduling/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clone', weekOffset }),
      });

      const result = await res.json();
      if (res.ok) {
        const cloned = result.data?.clonedCount || 0;
        const skipped = result.data?.skippedCount || 0;
        toast.success(`📋 Roster Cloned! ${cloned} shifts assigned.${skipped > 0 ? ` (${skipped} skipped due to conflicts)` : ''}`);
        
        if (skipped > 0 && result.data?.skipped) {
          result.data.skipped.forEach((skip: any) => {
            toast.warning(`⚠️ Skipped ${skip.userName} on ${skip.day} (${skip.shiftTitle}): ${skip.reason}`, {
              autoClose: 7000
            });
          });
        }
        fetchRoster();
      } else {
        toast.error(result.message || 'Failed to clone previous roster.');
        if (result.details && Array.isArray(result.details)) {
          result.details.forEach((skip: any) => {
            toast.warning(`⚠️ Conflict: ${skip.userName} on ${skip.day}: ${skip.reason}`, {
              autoClose: 8000
            });
          });
        }
      }
    } catch (err) {
      toast.error('Network failure during roster cloning.');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper to place shifts on their respective days
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const getShiftsForDayAndRole = (dayName: string, slug: 'grill-shift' | 'register-shift') => {
    return shifts
      .filter(shift => {
        const date = new Date(shift.startTime);
        // Map getDay() 0 (Sunday) - 6 (Saturday) to our days array
        const daysMapped = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const shiftDayName = daysMapped[date.getDay()];
        return shiftDayName === dayName && shift.eventType?.slug === slug;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };

  const formatDateRange = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'America/Chicago' };
    const startStr = weekStart.toLocaleDateString('en-US', options);
    const endStr = weekEnd.toLocaleDateString('en-US', { ...options, year: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  const formatHours = (isoStr: string) => {
    return new Date(isoStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Chicago'
    });
  };

  // Calculate dynamic weekly scheduled hours for an employee
  const calculateScheduledHours = (userId: number) => {
    return shifts
      .filter(s => s.user?.id === userId || s.userId === userId)
      .reduce((total, shift) => {
        const start = new Date(shift.startTime).getTime();
        const end = new Date(shift.endTime).getTime();
        const durationHours = (end - start) / (1000 * 60 * 60);
        return total + durationHours;
      }, 0);
  };

  // Calculate estimated wage cost for a single shift ($18.50/hr for Grill, $15.00/hr for Register, or employee custom rate)
  const calculateShiftCost = (shift: Shift) => {
    if (!shift.userId && !shift.user?.id) return 0;
    const start = new Date(shift.startTime).getTime();
    const end = new Date(shift.endTime).getTime();
    const durationHours = (end - start) / (1000 * 60 * 60);
    
    const userEmail = shift.user?.email || shift.userPrimaryEmail;
    const customRate = userEmail ? hourlyRates[userEmail.toLowerCase()] : null;
    
    if (customRate !== null && customRate !== undefined) {
      return durationHours * customRate;
    }
    
    const slug = shift.eventType?.slug || 'grill-shift';
    const hourlyRate = slug === 'grill-shift' ? 18.50 : 15.00;
    return durationHours * hourlyRate;
  };

  // Calculate comprehensive metrics for a given employee
  const getEmployeeMetrics = (userId: number) => {
    const empShifts = shifts.filter(s => s.userId === userId || s.user?.id === userId);
    let grillHours = 0;
    let registerHours = 0;
    
    empShifts.forEach(s => {
      const start = new Date(s.startTime).getTime();
      const end = new Date(s.endTime).getTime();
      const duration = (end - start) / (1000 * 60 * 60);
      if (s.eventType?.slug === 'register-shift') {
        registerHours += duration;
      } else {
        grillHours += duration;
      }
    });

    const totalHours = grillHours + registerHours;
    
    const userObj = users.find(u => u.id === userId);
    const userEmail = userObj?.email;
    const customRate = userEmail ? hourlyRates[userEmail.toLowerCase()] : null;

    let projectedEarnings = 0;
    if (customRate !== null && customRate !== undefined) {
      projectedEarnings = totalHours * customRate;
    } else {
      projectedEarnings = grillHours * 18.50 + registerHours * 15.00;
    }

    return {
      totalHours,
      grillHours,
      registerHours,
      projectedEarnings,
      isOvertime: totalHours > 40
    };
  };

  // --- Client-side Dry Helper validation functions for both drop events and tap clicks ---
  const runClientSideValidation = (employee: User, targetShift: Shift): boolean => {
    const userId = employee.id;
    
    // --- Client-side Compatibility Rule Validation ---
    const getChicagoLocalDateString = (dStr: string) => {
      return new Date(dStr).toLocaleDateString('en-US', { timeZone: 'America/Chicago' });
    };
    const targetDayStr = getChicagoLocalDateString(targetShift.startTime);

    const otherSameDayShifts = shifts.filter(s => 
      s.id !== targetShift.id && 
      (s.userId || s.user?.id) && 
      getChicagoLocalDateString(s.startTime) === targetDayStr
    );

    // --- Client-side Self-Conflict (Double-Scheduling) Validation ---
    let selfConflictDetected = false;
    for (const otherShift of otherSameDayShifts) {
      const otherUserId = otherShift.userId || otherShift.user?.id;
      if (otherUserId === userId) {
        const s1 = new Date(targetShift.startTime).getTime();
        const e1 = new Date(targetShift.endTime).getTime();
        const s2 = new Date(otherShift.startTime).getTime();
        const e2 = new Date(otherShift.endTime).getTime();

        if (Math.max(s1, s2) < Math.min(e1, e2)) {
          toast.error(`⚠️ DOUBLE SCHEDULING CONFLICT: ${employee.name} is already scheduled to work an overlapping shift (${otherShift.title || 'Shift'}) on this day.`);
          selfConflictDetected = true;
          break;
        }
      }
    }
    if (selfConflictDetected) return false;

    const employeeEmail = employee.email.toLowerCase();
    const conflictingEmails = conflicts.reduce((emails: string[], c: any) => {
      const e1 = c.email1.trim().toLowerCase();
      const e2 = c.email2.trim().toLowerCase();
      if (e1 === employeeEmail) emails.push(e2);
      if (e2 === employeeEmail) emails.push(e1);
      return emails;
    }, []);

    if (conflictingEmails.length > 0) {
      let conflictDetected = false;
      for (const otherShift of otherSameDayShifts) {
        const assignedUserEmail = (otherShift.user?.email || users.find(u => u.id === otherShift.userId)?.email || '').toLowerCase();
        if (conflictingEmails.includes(assignedUserEmail)) {
          // Check time overlap
          const s1 = new Date(targetShift.startTime).getTime();
          const e1 = new Date(targetShift.endTime).getTime();
          const s2 = new Date(otherShift.startTime).getTime();
          const e2 = new Date(otherShift.endTime).getTime();

          if (Math.max(s1, s2) < Math.min(e1, e2)) {
            const otherUserName = otherShift.user?.name || users.find(u => u.id === otherShift.userId)?.name || 'Conflicting Employee';
            toast.error(`⚠️ COMPATIBILITY CONFLICT: ${employee.name} and ${otherUserName} cannot work the same shift.`);
            conflictDetected = true;
            break;
          }
        }
      }
      if (conflictDetected) return false;
    }

    // --- 40 Hour Quota Tracking & warning logic ---
    const currentHours = calculateScheduledHours(userId);
    const shiftDuration = (new Date(targetShift.endTime).getTime() - new Date(targetShift.startTime).getTime()) / (1000 * 60 * 60);
    const newHours = currentHours + shiftDuration;

    if (newHours > 40) {
      const proceed = window.confirm(
        `⚠️ OVERTIME WARNING: Assigning ${employee.name} to this shift will put them at ${newHours} scheduled hours this week, exceeding the 40-hour quota.\n\nDo you wish to proceed?`
      );
      if (!proceed) return false;
    }

    return true;
  };

  const runClientSideSwapValidation = (sourceShift: Shift, targetShift: Shift): boolean => {
    if (!sourceShift.user?.id || !targetShift.user?.id) {
      toast.error('Both shifts must be assigned to employees to perform a swap.');
      return false;
    }

    const user1Id = sourceShift.user.id;
    const user2Id = targetShift.user.id;

    // --- Client-side Compatibility Rule Validation for Swaps ---
    const user1 = users.find(u => u.id === user1Id);
    const user2 = users.find(u => u.id === user2Id);

    if (user1 && user2) {
      const getChicagoLocalDateStringForSwap = (dStr: string) => {
        return new Date(dStr).toLocaleDateString('en-US', { timeZone: 'America/Chicago' });
      };

      // Check user2 moving to sourceShift
      const targetDayStrForU2 = getChicagoLocalDateStringForSwap(sourceShift.startTime);
      const otherSameDayShiftsForU2 = shifts.filter(s => 
        s.id !== sourceShift.id && 
        s.id !== targetShift.id && 
        (s.userId || s.user?.id) && 
        getChicagoLocalDateStringForSwap(s.startTime) === targetDayStrForU2
      );

      // Check user2 self-conflict
      let u2SelfConflict = false;
      for (const otherShift of otherSameDayShiftsForU2) {
        const otherUserId = otherShift.userId || otherShift.user?.id;
        if (otherUserId === user2Id) {
          const s1 = new Date(sourceShift.startTime).getTime();
          const e1 = new Date(sourceShift.endTime).getTime();
          const s2 = new Date(otherShift.startTime).getTime();
          const e2 = new Date(otherShift.endTime).getTime();

          if (Math.max(s1, s2) < Math.min(e1, e2)) {
            toast.error(`⚠️ DOUBLE SCHEDULING CONFLICT: Swapping will put ${user2.name} on an overlapping shift (${otherShift.title || 'Shift'}) on this day.`);
            u2SelfConflict = true;
            break;
          }
        }
      }
      if (u2SelfConflict) return false;

      const u2Email = user2.email.toLowerCase();
      const u2Conflicts = conflicts.reduce((emails: string[], c: any) => {
        const e1 = c.email1.trim().toLowerCase();
        const e2 = c.email2.trim().toLowerCase();
        if (e1 === u2Email) emails.push(e2);
        if (e2 === u2Email) emails.push(e1);
        return emails;
      }, []);

      if (u2Conflicts.length > 0) {
        let conflictDetected = false;
        for (const otherShift of otherSameDayShiftsForU2) {
          const assignedUserEmail = (otherShift.user?.email || users.find(u => u.id === otherShift.userId)?.email || '').toLowerCase();
          if (u2Conflicts.includes(assignedUserEmail)) {
            const s1 = new Date(sourceShift.startTime).getTime();
            const e1 = new Date(sourceShift.endTime).getTime();
            const s2 = new Date(otherShift.startTime).getTime();
            const e2 = new Date(otherShift.endTime).getTime();

            if (Math.max(s1, s2) < Math.min(e1, e2)) {
              const otherUserName = otherShift.user?.name || users.find(u => u.id === otherShift.userId)?.name || 'Conflicting Employee';
              toast.error(`⚠️ COMPATIBILITY CONFLICT: Swapping will put ${user2.name} on the same shift as ${otherUserName}.`);
              conflictDetected = true;
              break;
            }
          }
        }
        if (conflictDetected) return false;
      }

      // Check user1 moving to targetShift
      const targetDayStrForU1 = getChicagoLocalDateStringForSwap(targetShift.startTime);
      const otherSameDayShiftsForU1 = shifts.filter(s => 
        s.id !== sourceShift.id && 
        s.id !== targetShift.id && 
        (s.userId || s.user?.id) && 
        getChicagoLocalDateStringForSwap(s.startTime) === targetDayStrForU1
      );

      // Check user1 self-conflict
      let u1SelfConflict = false;
      for (const otherShift of otherSameDayShiftsForU1) {
        const otherUserId = otherShift.userId || otherShift.user?.id;
        if (otherUserId === user1Id) {
          const s1 = new Date(targetShift.startTime).getTime();
          const e1 = new Date(targetShift.endTime).getTime();
          const s2 = new Date(otherShift.startTime).getTime();
          const e2 = new Date(otherShift.endTime).getTime();

          if (Math.max(s1, s2) < Math.min(e1, e2)) {
            toast.error(`⚠️ DOUBLE SCHEDULING CONFLICT: Swapping will put ${user1.name} on an overlapping shift (${otherShift.title || 'Shift'}) on this day.`);
            u1SelfConflict = true;
            break;
          }
        }
      }
      if (u1SelfConflict) return false;

      const u1Email = user1.email.toLowerCase();
      const u1Conflicts = conflicts.reduce((emails: string[], c: any) => {
        const e1 = c.email1.trim().toLowerCase();
        const e2 = c.email2.trim().toLowerCase();
        if (e1 === u1Email) emails.push(e2);
        if (e2 === u1Email) emails.push(e1);
        return emails;
      }, []);

      if (u1Conflicts.length > 0) {
        let conflictDetected = false;
        for (const otherShift of otherSameDayShiftsForU1) {
          const assignedUserEmail = (otherShift.user?.email || users.find(u => u.id === otherShift.userId)?.email || '').toLowerCase();
          if (u1Conflicts.includes(assignedUserEmail)) {
            const s1 = new Date(targetShift.startTime).getTime();
            const e1 = new Date(targetShift.endTime).getTime();
            const s2 = new Date(otherShift.startTime).getTime();
            const e2 = new Date(otherShift.endTime).getTime();

            if (Math.max(s1, s2) < Math.min(e1, e2)) {
              const otherUserName = otherShift.user?.name || users.find(u => u.id === otherShift.userId)?.name || 'Conflicting Employee';
              toast.error(`⚠️ COMPATIBILITY CONFLICT: Swapping will put ${user1.name} on the same shift as ${otherUserName}.`);
              conflictDetected = true;
              break;
            }
          }
        }
        if (conflictDetected) return false;
      }
    }

    const duration1 = (new Date(sourceShift.endTime).getTime() - new Date(sourceShift.startTime).getTime()) / (1000 * 60 * 60);
    const duration2 = (new Date(targetShift.endTime).getTime() - new Date(targetShift.startTime).getTime()) / (1000 * 60 * 60);

    const u1Current = calculateScheduledHours(user1Id);
    const u2Current = calculateScheduledHours(user2Id);

    // Calculate hours after swap
    const u1New = u1Current - duration1 + duration2;
    const u2New = u2Current - duration2 + duration1;

    let warningMsg = '';
    if (u1New > 40) {
      warningMsg += `⚠️ OVERTIME WARNING: Swapping will put ${sourceShift.user!.name} at ${u1New} hours this week, exceeding the 40-hour limit.\n`;
    }
    if (u2New > 40) {
      warningMsg += `⚠️ OVERTIME WARNING: Swapping will put ${targetShift.user!.name} at ${u2New} hours this week, exceeding the 40-hour limit.\n`;
    }

    if (warningMsg) {
      const proceed = window.confirm(`${warningMsg}\nDo you wish to proceed with this swap?`);
      if (!proceed) return false;
    }

    return true;
  };

  const triggerReassign = async (targetShift: Shift, employee: User) => {
    const originalShifts = [...shifts];
    setShifts(prevShifts => 
      prevShifts.map(s => 
        s.id === targetShift.id 
          ? { 
              ...s, 
              userId: employee.id,
              user: { id: employee.id, name: employee.name }, 
              title: `${s.eventType?.title || 'Shift'} - ${employee.name}` 
            } 
          : s
      )
    );

    toast.info(`Updating schedule...`);
    const res = await fetch('/api/scheduling', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reassign',
        bookingId: targetShift.id,
        userId: employee.id
      })
    });

    if (res.ok) {
      toast.success(`Reassigned shift to ${employee.name}`);
      fetchRoster();
    } else {
      setShifts(originalShifts); // Rollback
      const errData = await res.json();
      toast.error(errData.message || 'Failed to reassign employee.');
    }
  };

  const triggerSwap = async (sourceShift: Shift, targetShift: Shift) => {
    const user1Id = sourceShift.user!.id;
    const user2Id = targetShift.user!.id;
    const originalShifts = [...shifts];
    setShifts(prevShifts => 
      prevShifts.map(s => {
        if (s.id === sourceShift.id) {
          return {
            ...s,
            userId: user2Id,
            user: { id: user2Id, name: targetShift.user!.name },
            title: `${s.eventType?.title || 'Shift'} - ${targetShift.user!.name}`
          };
        }
        if (s.id === targetShift.id) {
          return {
            ...s,
            userId: user1Id,
            user: { id: user1Id, name: sourceShift.user!.name },
            title: `${s.eventType?.title || 'Shift'} - ${sourceShift.user!.name}`
          };
        }
        return s;
      })
    );

    toast.info(`Swapping shifts...`);
    const res = await fetch('/api/scheduling', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'swap',
        bookingId1: sourceShift.id,
        bookingId2: targetShift.id
      })
    });

    if (res.ok) {
      toast.success(`Shifts successfully swapped!`);
      fetchRoster();
    } else {
      setShifts(originalShifts); // Rollback
      const errData = await res.json();
      toast.error(errData.message || 'Failed to complete swap.');
    }
  };

  // HTML5 Drag-and-Drop Event Handlers
  const handleStaffDragStart = (e: React.DragEvent, userId: number) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ source: 'pool', userId }));
  };

  const handleShiftDragStart = (e: React.DragEvent, bookingId: number, dayName: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ source: 'shift', bookingId, day: dayName }));
  };

  const handleDragOver = (e: React.DragEvent, shift: Shift) => {
    e.preventDefault();
    setDraggedOverId(shift.id);
  };

  const handleDragLeave = () => {
    setDraggedOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetShift: Shift, targetDayName: string) => {
    e.preventDefault();
    setDraggedOverId(null);

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);

      if (data.source === 'pool') {
        const { userId } = data;
        const employee = users.find(u => u.id === userId);
        if (!employee) return;

        // Skip if dropping onto they are already assigned
        if (targetShift.user?.id === userId || targetShift.userId === userId) {
          toast.info(`${employee.name} is already assigned to this shift.`);
          return;
        }

        // Run validation
        const checkPassed = runClientSideValidation(employee, targetShift);
        if (!checkPassed) return;

        // Trigger reassignment
        await triggerReassign(targetShift, employee);

      } else if (data.source === 'shift') {
        const { bookingId, day: sourceDay } = data;

        // Abort if dropping on itself
        if (bookingId === targetShift.id) return;

        // Constraint: Swaps strictly on the same calendar day
        if (sourceDay !== targetDayName) {
          toast.error('Swaps are strictly constrained to the same calendar day!');
          return;
        }

        const sourceShift = shifts.find(s => s.id === bookingId);
        if (!sourceShift) return;

        // Run swap validation
        const checkPassed = runClientSideSwapValidation(sourceShift, targetShift);
        if (!checkPassed) return;

        // Trigger swap
        await triggerSwap(sourceShift, targetShift);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed during drag-drop transmission.');
    }
  };

  // --- Tap-to-Select Fallback interaction Handlers ---
  const handleEmployeeClick = (userId: number) => {
    setSelectedShiftId(null); // Clear shift selection
    setSelectedUserId(prev => prev === userId ? null : userId);
  };

  const handleShiftClick = async (e: React.MouseEvent, shift: Shift, dayName: string) => {
    e.stopPropagation();

    // Case A: Assign Selected Employee to Shift
    if (selectedUserId !== null) {
      const employee = users.find(u => u.id === selectedUserId);
      if (!employee) return;

      // Prevent redundant drops
      if (shift.user?.id === selectedUserId || shift.userId === selectedUserId) {
        toast.info(`${employee.name} is already assigned to this shift.`);
        setSelectedUserId(null);
        return;
      }

      // Run validation
      const checkPassed = runClientSideValidation(employee, shift);
      if (!checkPassed) {
        setSelectedUserId(null);
        return;
      }

      // Trigger reassign
      await triggerReassign(shift, employee);
      setSelectedUserId(null);
      return;
    }

    // Case B: Select/Deselect Shift for Swapping
    if (selectedShiftId === null) {
      if (!shift.user?.id) {
        toast.error('Only assigned shifts can be selected for swapping.');
        return;
      }
      setSelectedShiftId(shift.id);
    } else {
      // Case C: Swap Shifts
      if (selectedShiftId === shift.id) {
        setSelectedShiftId(null); // Deselect
        return;
      }

      const sourceShift = shifts.find(s => s.id === selectedShiftId);
      if (!sourceShift) {
        setSelectedShiftId(null);
        return;
      }

      // Constraint: Must be same day
      const getChicagoLocalDateString = (dStr: string) => {
        return new Date(dStr).toLocaleDateString('en-US', { timeZone: 'America/Chicago' });
      };
      if (getChicagoLocalDateString(sourceShift.startTime) !== getChicagoLocalDateString(shift.startTime)) {
        toast.error('Swaps are strictly constrained to the same calendar day!');
        setSelectedShiftId(null);
        return;
      }

      if (!shift.user?.id) {
        toast.error('Both shifts must be assigned to employees to perform a swap.');
        setSelectedShiftId(null);
        return;
      }

      // Run swap validation
      const checkPassed = runClientSideSwapValidation(sourceShift, shift);
      if (!checkPassed) {
        setSelectedShiftId(null);
        return;
      }

      // Perform swap
      await triggerSwap(sourceShift, shift);
      setSelectedShiftId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 pb-24 font-mono">
      <div className="max-w-[1700px] xl:max-w-[95%] mx-auto">
        
        {/* Navigation Back */}
        <Link 
          href="/admin/pulse" 
          className="inline-flex items-center gap-2 text-[10px] font-black text-blue-500 hover:text-blue-400 uppercase tracking-widest transition-colors mb-8"
        >
          <FaArrowLeft size={10} /> Back to Pulse Center
        </Link>

        {/* Header Section */}
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-12 border-b border-orange-500/20 pb-8 gap-6">
          <div>
            <div className="flex items-center gap-3 text-orange-500 mb-2">
              <FaCalendarDays className="animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Operations & Logistics Center</span>
            </div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">Gas & Grill Roster</h1>
            <p className="text-slate-500 text-xs mt-2 uppercase tracking-widest font-black">Predict, Drag & Drop Assign, Approve, and SMS Dispatch Schedules</p>
          </div>

          {/* Week Selector / Date Filter */}
          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/5 gap-2">
            <button 
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="p-3 text-slate-500 hover:text-white transition-colors hover:bg-white/5 rounded-lg"
            >
              <FaChevronLeft size={12} />
            </button>
            <div className="px-6 py-2 text-center min-w-[200px]">
              <div className="text-[8px] text-slate-500 uppercase tracking-[0.2em] font-black mb-1">Active Window</div>
              <div className="text-xs font-black text-white uppercase tracking-wider">{formatDateRange()}</div>
            </div>
            <button 
              onClick={() => setWeekOffset(prev => prev + 1)}
              className="p-3 text-slate-500 hover:text-white transition-colors hover:bg-white/5 rounded-lg"
            >
              <FaChevronRight size={12} />
            </button>
          </div>
        </header>

        {/* Controls Bar */}
        <div className="flex flex-wrap bg-slate-900/40 border border-white/5 p-6 rounded-2xl mb-12 justify-between items-center gap-6 backdrop-blur-md">
          <div className="space-y-1">
            <div className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Roster Actions</div>
            <p className="text-xs text-slate-500">Drag employees onto shift cells to reassign, or drag shift cells onto each other to swap assignments.</p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            {/* Copy Previous Roster Button */}
            <button 
              onClick={handleClonePreviousWeek}
              disabled={actionLoading || loading}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-950/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <FaCopy size={11} /> Copy Previous Roster
            </button>

            {/* Clear Roster Button */}
            <button 
              onClick={handleClearWeek}
              disabled={actionLoading || loading}
              className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-900/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <FaTrash size={11} /> Clear Week Roster
            </button>

            {/* Predict Button */}
            <button 
              onClick={handlePredict}
              disabled={actionLoading || loading}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-900/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <FaWandMagicSparkles size={12} /> Forecast Shifts
            </button>

            {/* Approve Button */}
            <button 
              onClick={handleApprove}
              disabled={actionLoading || loading}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <FaCircleCheck size={12} /> Approve Drafts
            </button>

            {/* SMS Dispatch Button */}
            <button 
              onClick={handleDispatch}
              disabled={actionLoading || loading}
              className="flex items-center gap-2 bg-slate-800 hover:bg-blue-600 disabled:opacity-50 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 hover:border-blue-500 hover:scale-[1.02] active:scale-[0.98]"
            >
              <FaPaperPlane size={11} /> SMS Broadcast
            </button>
          </div>
        </div>

        {/* Active Selection Assist Banner (Mobile & Touch Helper) */}
        {(selectedUserId !== null || selectedShiftId !== null) && (
          <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/30 p-4 rounded-xl mb-12 animate-pulse backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
              <div>
                <span className="text-[10px] font-black uppercase text-orange-400 tracking-wider">Touch Selection Assist Mode Active</span>
                <p className="text-[11px] text-slate-300 mt-1 uppercase font-bold tracking-wider">
                  {selectedUserId !== null && (
                    <>Assigning <span className="text-orange-400 font-extrabold">{users.find(u => u.id === selectedUserId)?.name}</span>: Tap any shift block below to schedule them.</>
                  )}
                  {selectedShiftId !== null && (
                    <>Swapping Shift: Tap any other shift block ON THE SAME DAY to swap staff.</>
                  )}
                </p>
              </div>
            </div>
            <button 
              onClick={() => {
                setSelectedUserId(null);
                setSelectedShiftId(null);
              }}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-[9px] font-black text-white uppercase tracking-widest transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Visual Schedule Side-by-Side Grid */}
        {loading ? (
          <div className="py-32 text-center">
            <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.3em] animate-pulse">Syncing scheduling matrix...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            
            {/* Staff Pool Sidebar */}
            <div className="lg:col-span-1 bg-slate-900/40 border border-white/5 p-6 rounded-2xl flex flex-col gap-6 backdrop-blur-md h-fit">
              <div className="border-b border-orange-500/20 pb-4">
                <h2 className="text-sm font-black uppercase italic tracking-widest text-orange-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" /> Staff Pool
                </h2>
                <p className="text-[8px] text-slate-500 uppercase tracking-wider font-bold mt-1">
                  Drag employee cards to assign them. Limit: 40 hours/week.
                </p>
              </div>

              {/* Labor Cost & Roster Analytics */}
              <div className="border-b border-orange-500/20 pb-6 flex flex-col gap-4">
                <button 
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className="w-full flex items-center justify-between text-[10px] font-black uppercase italic tracking-widest text-orange-400 hover:text-orange-300 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <FaCashRegister className="animate-pulse" /> Labor & Cost Analytics
                  </span>
                  <span className="text-[10px] font-mono font-black">{showAnalytics ? '▼' : '▲'}</span>
                </button>

                {showAnalytics && (
                   <div className="bg-black/30 border border-white/5 p-4 rounded-xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300 shadow-inner">
                     
                     {/* Efficiency Coverage Progress */}
                     <div className="space-y-1.5">
                       <div className="flex justify-between items-center text-[8px] font-black uppercase">
                         <span className="text-slate-500">Roster Coverage</span>
                         <span className="text-orange-400 font-extrabold">
                           {shifts.filter(s => s.userId !== null && s.userId !== undefined).length} / {shifts.length} Shifts ({shifts.length > 0 ? Math.round((shifts.filter(s => s.userId !== null && s.userId !== undefined).length / shifts.length) * 100) : 0}%)
                         </span>
                       </div>
                       <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                         <div 
                           className="h-full rounded-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 transition-all duration-500 shadow-sm"
                           style={{ width: `${shifts.length > 0 ? (shifts.filter(s => s.userId !== null && s.userId !== undefined).length / shifts.length) * 100 : 0}%` }}
                         />
                       </div>
                     </div>

                     {/* Labor Cost Forecast Badge */}
                     <div className="bg-slate-950/80 border border-white/5 p-3 rounded-lg flex flex-col items-center justify-center text-center shadow-md relative overflow-hidden group animate-pulse">
                       <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-purple-500/5 opacity-50 pointer-events-none" />
                       <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Projected Weekly Payroll</span>
                       <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 tracking-tight mt-1">
                         ${shifts.reduce((sum, s) => sum + calculateShiftCost(s), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                       </span>
                     </div>

                     {/* Employee Earnings List */}
                     <div className="space-y-2">
                       <div className="text-[8px] font-black uppercase text-slate-500 tracking-wider">
                         Staff Earnings Breakdown
                       </div>
                       <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                         {users.map(u => {
                           const metrics = getEmployeeMetrics(u.id);
                           if (metrics.totalHours === 0) return null;

                           return (
                             <div 
                               key={`metrics-${u.id}`}
                               className="p-2.5 rounded-lg bg-slate-950/50 border border-white/5 hover:border-orange-500/15 transition-all flex justify-between items-center text-xs"
                             >
                               <div className="min-w-0 flex flex-col">
                                 <span className="font-bold text-[10px] text-white uppercase tracking-wider truncate">{u.name}</span>
                                 <span className={`text-[7px] font-extrabold uppercase mt-0.5 ${metrics.isOvertime ? 'text-red-400 animate-pulse' : 'text-slate-500'}`}>
                                   {metrics.totalHours} hrs {metrics.isOvertime && '⚠️ OVER'}
                                 </span>
                               </div>
                               <div className="text-right shrink-0">
                                 <span className="font-mono text-[10px] font-black text-slate-300">
                                   ${metrics.projectedEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                 </span>
                               </div>
                             </div>
                           );
                         })}
                         {users.filter(u => getEmployeeMetrics(u.id).totalHours > 0).length === 0 && (
                           <div className="text-[8px] font-bold text-slate-600 uppercase tracking-widest py-3 text-center border border-dashed border-white/5 rounded-lg bg-black/10">
                             No shifts assigned yet
                           </div>
                         )}
                       </div>
                     </div>

                   </div>
                )}
              </div>

              {/* Staff Management Portal Toggle & Form */}
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-orange-500/30 hover:border-orange-500/70 text-[9px] font-black uppercase tracking-widest text-orange-500/80 hover:text-orange-400 hover:bg-orange-500/5 transition-all"
                >
                  <FaUserPlus size={11} /> {showAddForm ? '✕ Close Form' : '+ Enroll Employee'}
                </button>

                {showAddForm && (
                  <form 
                    onSubmit={handleEnrollStaff}
                    className="bg-black/30 border border-white/5 p-4 rounded-xl flex flex-col gap-3.5 animate-in fade-in slide-in-from-top-4 duration-300 shadow-inner"
                  >
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Full Name</label>
                      <input 
                        type="text"
                        required
                        value={newStaffName}
                        onChange={(e) => setNewStaffName(e.target.value)}
                        placeholder="e.g. Stephanie"
                        className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-slate-800 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Email Address</label>
                      <input 
                        type="email"
                        required
                        value={newStaffEmail}
                        onChange={(e) => setNewStaffEmail(e.target.value)}
                        placeholder="e.g. stephanie@sunsetgrill.com"
                        className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-slate-800 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Phone (Optional)</label>
                      <input 
                        type="tel"
                        value={newStaffPhone}
                        onChange={(e) => setNewStaffPhone(e.target.value)}
                        placeholder="e.g. +15551110005"
                        className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-slate-800 font-mono"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={enrollLoading}
                      className="w-full py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 text-white font-black text-[9px] uppercase tracking-widest rounded-lg transition-all shadow-md shadow-orange-950/40"
                    >
                      {enrollLoading ? 'Enrolling...' : 'Enlist Employee'}
                    </button>
                  </form>
                )}
              </div>

              <div className="flex flex-col gap-4">
                {users.map(user => {
                  const hours = calculateScheduledHours(user.id);
                  const isOverLimit = hours > 40;
                  const pct = Math.min(100, (hours / 40) * 100);
                  const isSelected = selectedUserId === user.id;

                  // Unique aesthetics per employee
                  let colorClass = 'from-purple-500/10 to-indigo-600/10 border-indigo-500/25 text-indigo-400 hover:border-indigo-400/50';
                  let iconBg = 'bg-gradient-to-r from-purple-500 to-indigo-600';
                  if (user.name === 'Beth') {
                    colorClass = 'from-rose-500/10 to-pink-600/10 border-pink-500/25 text-pink-400 hover:border-pink-400/50';
                    iconBg = 'bg-gradient-to-r from-rose-500 to-pink-600';
                  } else if (user.name === 'Taz') {
                    colorClass = 'from-amber-500/10 to-orange-600/10 border-orange-500/25 text-orange-400 hover:border-orange-400/50';
                    iconBg = 'bg-gradient-to-r from-amber-500 to-orange-600';
                  } else if (user.name === 'Angela') {
                    colorClass = 'from-emerald-500/10 to-teal-600/10 border-emerald-500/25 text-emerald-400 hover:border-emerald-400/50';
                    iconBg = 'bg-gradient-to-r from-emerald-500 to-teal-600';
                  }

                  return (
                    <div
                      key={user.id}
                      draggable="true"
                      onDragStart={(e) => handleStaffDragStart(e, user.id)}
                      onClick={() => handleEmployeeClick(user.id)}
                      className={`p-3 rounded-xl border bg-gradient-to-br ${colorClass} cursor-pointer md:cursor-grab active:cursor-grabbing hover:scale-[1.03] transition-all flex flex-col gap-2 group relative overflow-hidden shadow-lg shadow-black/20 ${
                        isSelected 
                          ? 'ring-2 ring-orange-500 border-orange-500/60 shadow-orange-500/20 scale-[1.02]' 
                          : ''
                      }`}
                    >
                      {/* Interactive hover glow */}
                      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                      {/* Decommission Trash Trigger */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveStaff(user.id, user.name);
                        }}
                        title={`Decommission ${user.name}`}
                        className="absolute top-3.5 right-3.5 text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-red-500/10 rounded-lg z-20"
                      >
                        <FaTrash size={10} />
                      </button>

                      <div className="flex items-center gap-2 relative z-10 min-w-0">
                        <div className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center font-black text-xs text-white uppercase tracking-tighter shadow-md shadow-black/40 shrink-0`}>
                          {user.name.slice(0, 2)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-black text-white uppercase tracking-wider truncate flex items-center gap-1.5">
                            {user.name}
                            {isSelected && (
                              <span className="text-[7px] bg-orange-500 text-white font-black px-1 py-0.5 rounded tracking-normal animate-pulse">
                                Selected
                              </span>
                            )}
                          </span>
                          <span className="text-[7px] text-slate-500 uppercase tracking-widest truncate">{user.email}</span>
                        </div>
                      </div>

                      {/* Inline Hourly Rate Editor */}
                      <div className="flex items-center justify-between text-[8px] font-black uppercase pt-1 relative z-30 border-t border-white/5 mt-1" onClick={(e) => e.stopPropagation()}>
                        <span className="text-slate-500">Hourly Rate</span>
                        {editingRateUserId === user.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 font-mono text-[9px]">$</span>
                            <input
                              type="text"
                              value={tempRateValue}
                              onChange={(e) => setTempRateValue(e.target.value)}
                              className="w-12 bg-slate-950 border border-white/20 rounded px-1 py-0.5 text-[9px] font-mono text-white text-right focus:outline-none focus:border-orange-500"
                              placeholder="Default"
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateRate(user.email, tempRateValue, user.id)}
                              className="bg-emerald-600/30 hover:bg-emerald-600/60 border border-emerald-500/30 text-emerald-400 px-1 py-0.5 rounded transition-colors text-[8px]"
                              title="Save Rate"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingRateUserId(null)}
                              className="bg-rose-600/30 hover:bg-rose-600/60 border border-rose-500/30 text-rose-400 px-1 py-0.5 rounded transition-colors text-[8px]"
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingRateUserId(user.id);
                              setTempRateValue(hourlyRates[user.email.toLowerCase()] !== undefined ? String(hourlyRates[user.email.toLowerCase()]) : '');
                            }}
                            className="text-slate-300 hover:text-orange-400 font-mono text-[9px] tracking-tight hover:underline flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 hover:border-orange-500/20"
                            title="Click to customize hourly rate"
                          >
                            {hourlyRates[user.email.toLowerCase()] !== undefined 
                              ? `$${hourlyRates[user.email.toLowerCase()].toFixed(2)}/hr` 
                              : 'Default Rates ⚙️'}
                          </button>
                        )}
                      </div>

                      {/* Overtime Quota Progress Meter */}
                      <div className="space-y-1.5 relative z-10">
                        <div className="flex justify-between items-center text-[8px] font-black uppercase">
                          <span className="text-slate-500">Weekly Quota</span>
                          <span className={isOverLimit ? 'text-red-500 animate-pulse font-extrabold' : 'text-slate-400'}>
                             {hours}h / 40h {isOverLimit && '⚠️ OVERTIME'}
                          </span>
                        </div>
                        <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5 p-[1px]">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isOverLimit 
                                ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-md shadow-red-500/40' 
                                : 'bg-gradient-to-r from-orange-500 to-purple-600'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Compatibility Exclusions Section */}
              <div className="border-t border-orange-500/20 pt-6 mt-2 flex flex-col gap-4">
                <button 
                  onClick={() => setShowConflictsManager(!showConflictsManager)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-rose-500/30 hover:border-rose-500/70 text-[9px] font-black uppercase tracking-widest text-rose-500/80 hover:text-rose-400 hover:bg-rose-500/5 transition-all animate-pulse"
                >
                  <FaCircleExclamation size={11} /> 
                  {showConflictsManager ? '✕ Close Compatibility Exclusions' : '⚙️ Manage Exclusions'}
                </button>

                {showConflictsManager && (
                  <div className="bg-black/30 border border-white/5 p-4 rounded-xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300 shadow-inner">
                    <div className="space-y-1 pb-2 border-b border-white/5">
                      <h3 className="text-[10px] font-black uppercase text-rose-500 tracking-wider flex items-center gap-1.5">
                        <FaCircleExclamation size={10} /> Compatibility Exclusions
                      </h3>
                      <p className="text-[7px] text-slate-500 uppercase tracking-widest leading-relaxed">
                        Exclusions prevent specified employees from working overlapping shifts on the same day.
                      </p>
                    </div>

                    {/* Add New Exclusion Form */}
                    <form onSubmit={handleAddConflict} className="flex flex-col gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Employee 1</label>
                        <select
                          value={newConflictEmail1}
                          onChange={(e) => setNewConflictEmail1(e.target.value)}
                          required
                          className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500/50 transition-colors font-mono appearance-none"
                        >
                          <option value="" className="bg-slate-950 text-slate-500">-- Select Employee --</option>
                          {users.map(u => (
                            <option key={u.id} value={u.email} className="bg-slate-950 text-white">
                              {u.name} ({u.email})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Employee 2</label>
                        <select
                          value={newConflictEmail2}
                          onChange={(e) => setNewConflictEmail2(e.target.value)}
                          required
                          className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500/50 transition-colors font-mono appearance-none"
                        >
                          <option value="" className="bg-slate-950 text-slate-500">-- Select Employee --</option>
                          {users.map(u => (
                            <option key={u.id} value={u.email} className="bg-slate-950 text-white">
                              {u.name} ({u.email})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button 
                        type="submit"
                        disabled={conflictLoading}
                        className="w-full py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 text-white font-black text-[9px] uppercase tracking-widest rounded-lg transition-all shadow-md shadow-rose-950/40"
                      >
                        {conflictLoading ? 'Processing...' : 'Enforce Exclusion'}
                      </button>
                    </form>

                    {/* Exclusions List */}
                    <div className="space-y-2 mt-2">
                      <div className="text-[8px] font-black uppercase text-slate-500 tracking-wider">
                        Enforced Rules ({conflicts.length})
                      </div>
                      {conflicts.length === 0 ? (
                        <div className="text-[8px] font-bold text-slate-600 uppercase tracking-widest py-3 text-center border border-dashed border-white/5 rounded-lg bg-black/10">
                          No exclusions active
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
                          {conflicts.map((c, idx) => {
                            const u1 = users.find(u => u.email.toLowerCase() === c.email1.toLowerCase());
                            const u2 = users.find(u => u.email.toLowerCase() === c.email2.toLowerCase());
                            
                            const name1 = u1 ? u1.name : c.email1.split('@')[0];
                            const name2 = u2 ? u2.name : c.email2.split('@')[0];

                            return (
                              <div 
                                key={`${c.email1}-${c.email2}-${idx}`}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 border border-white/5 hover:border-rose-500/20 transition-all text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                  <span className="font-bold text-[10px] text-white uppercase tracking-wider">{name1}</span>
                                  <span className="text-[8px] text-rose-500 font-extrabold uppercase px-1">✕</span>
                                  <span className="font-bold text-[10px] text-white uppercase tracking-wider">{name2}</span>
                                </div>
                                <button
                                  onClick={() => handleRemoveConflict(c.email1, c.email2)}
                                  disabled={conflictLoading}
                                  className="text-slate-500 hover:text-rose-500 p-1 rounded hover:bg-rose-500/10 transition-colors"
                                  title="Remove rule"
                                >
                                  <FaTrash size={9} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Seven-Day Schedule Grid */}
            <div className="lg:col-span-3 xl:col-span-4 flex flex-col gap-6">
              
              {/* Mobile Day Navigation Header Layout */}
              <div className="xl:hidden bg-slate-900/40 border border-white/5 p-4 rounded-2xl backdrop-blur-md">
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <FaCalendarDays className="text-orange-500 animate-pulse" /> Roster Weekdays
                </div>
                <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                  {daysOfWeek.map((day) => {
                    const isActive = day === activeMobileDay;
                    const totalShiftsCount = getShiftsForDayAndRole(day, 'grill-shift').length + getShiftsForDayAndRole(day, 'register-shift').length;
                    return (
                      <button
                        key={day}
                        onClick={() => setActiveMobileDay(day)}
                        className={`px-4 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 flex items-center gap-2 ${
                          isActive
                            ? 'bg-orange-500/20 text-orange-400 border-orange-500/40 shadow-lg shadow-orange-500/10'
                            : 'bg-slate-950 text-slate-400 border-white/5 hover:text-white hover:bg-slate-900/40'
                        }`}
                      >
                        {day.slice(0, 3)}
                        <span className={`px-1.5 py-0.5 rounded text-[8px] ${
                          isActive ? 'bg-orange-500/20 text-orange-400 font-black' : 'bg-slate-800 text-slate-500'
                        }`}>
                          {totalShiftsCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Roster Calendar Columns Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
                {daysOfWeek.map((day) => {
                  const grillShifts = getShiftsForDayAndRole(day, 'grill-shift');
                  const registerShifts = getShiftsForDayAndRole(day, 'register-shift');
                  const isMobileHidden = day !== activeMobileDay;

                  return (
                    <div 
                      key={day} 
                      className={`bg-slate-900/30 border border-white/5 rounded-2xl px-2.5 py-4 flex flex-col gap-4 hover:border-orange-500/20 transition-all duration-300 backdrop-blur-sm ${
                        isMobileHidden ? 'hidden xl:flex' : 'flex'
                      }`}
                    >
                      {/* Day Header */}
                      <div className="border-b border-white/5 pb-3">
                        <span className="text-xs font-black text-white tracking-widest uppercase italic">{day}</span>
                      </div>

                      {/* Grill Slot */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[8px] font-black text-orange-400 uppercase tracking-wider">
                            <FaFire size={8} className="animate-pulse text-orange-500" /> Grill Staff
                          </div>
                        </div>

                        {grillShifts.length > 0 ? (
                          <div className="flex flex-col gap-3">
                            {grillShifts.map((grillShift) => {
                              const isDraggedOver = draggedOverId === grillShift.id;
                              const isSelectedForSwap = selectedShiftId === grillShift.id;
                              const isCandidateForAssign = selectedUserId !== null;
                              return (
                                <div 
                                  key={grillShift.id} 
                                  draggable="true"
                                  onDragStart={(e) => handleShiftDragStart(e, grillShift.id, day)}
                                  onDragOver={(e) => handleDragOver(e, grillShift)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, grillShift, day)}
                                  onClick={(e) => handleShiftClick(e, grillShift, day)}
                                  className={`px-2.5 py-3 rounded-xl border flex flex-col gap-1.5 transition-all cursor-pointer md:cursor-grab active:cursor-grabbing relative overflow-hidden ${
                                    isDraggedOver
                                      ? 'scale-[1.03] border-orange-500 border-dashed bg-orange-500/15 shadow-lg shadow-orange-500/20'
                                      : isSelectedForSwap
                                        ? 'ring-2 ring-purple-500 border-purple-500/60 bg-purple-500/10 shadow-lg shadow-purple-500/20 scale-[1.02]'
                                        : isCandidateForAssign
                                          ? 'border-dashed border-orange-500/40 hover:border-orange-500 bg-orange-500/5 hover:bg-orange-500/10 hover:scale-[1.02]'
                                          : grillShift.status === 'ACCEPTED' 
                                            ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/10' 
                                            : 'bg-orange-500/5 border-orange-500/20 hover:border-orange-500/40 hover:bg-orange-500/10'
                                  }`}
                                >
                                  {isDraggedOver && (
                                    <div className="absolute inset-0 bg-orange-500/5 animate-pulse pointer-events-none" />
                                  )}
                                  {isSelectedForSwap && (
                                    <div className="absolute inset-0 bg-purple-500/5 animate-pulse pointer-events-none" />
                                  )}
                                  <div className="flex items-center justify-between min-w-0">
                                    <div className="flex items-center gap-2 text-xs font-black text-white min-w-0">
                                      <FaUser size={10} className="text-slate-400 shrink-0" />
                                      <span className="truncate">{grillShift.user?.name || 'Staff Member'}</span>
                                    </div>
                                    {isSelectedForSwap && (
                                      <span className="text-[6px] font-black uppercase text-purple-400 bg-purple-500/20 px-1 py-0.5 rounded tracking-normal animate-pulse shrink-0">
                                        Swap Source
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 min-w-0">
                                    <FaClock size={10} className="text-slate-500 shrink-0" />
                                    <span className="whitespace-nowrap">
                                      {formatHours(grillShift.startTime)} - {formatHours(grillShift.endTime)}
                                    </span>
                                  </div>
                                  
                                  {/* Helper actions description overlay for touchscreen */}
                                  {isSelectedForSwap && (
                                    <div className="text-[7px] font-black text-purple-400 uppercase tracking-widest mt-1 text-center bg-purple-500/10 py-1 rounded">
                                      Tap target to swap
                                    </div>
                                  )}
                                  {isCandidateForAssign && !isSelectedForSwap && (
                                    <div className="text-[7px] font-black text-orange-400 uppercase tracking-widest mt-1 text-center bg-orange-500/10 py-1 rounded">
                                      Tap to assign
                                    </div>
                                  )}

                                  {!isSelectedForSwap && !isCandidateForAssign && (
                                    <div className={`self-start mt-1 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider border whitespace-nowrap ${
                                      grillShift.status === 'ACCEPTED'
                                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                        : 'bg-orange-500/10 border-orange-500 text-orange-400'
                                    }`}>
                                      {grillShift.status === 'ACCEPTED' ? 'Confirmed' : 'Draft'}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="bg-slate-950 border border-dashed border-white/5 rounded-xl py-6 text-center">
                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">⚠️ Unassigned</span>
                          </div>
                        )}
                      </div>

                      {/* Register Slot */}
                      <div className="space-y-3 pt-3 border-t border-white/5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[8px] font-black text-purple-400 uppercase tracking-wider">
                            <FaCashRegister size={8} className="text-purple-500" /> Register Staff
                          </div>
                        </div>

                        {registerShifts.length > 0 ? (
                          <div className="flex flex-col gap-3">
                            {registerShifts.map((registerShift) => {
                              const isDraggedOver = draggedOverId === registerShift.id;
                              const isSelectedForSwap = selectedShiftId === registerShift.id;
                              const isCandidateForAssign = selectedUserId !== null;
                              return (
                                <div 
                                  key={registerShift.id} 
                                  draggable="true"
                                  onDragStart={(e) => handleShiftDragStart(e, registerShift.id, day)}
                                  onDragOver={(e) => handleDragOver(e, registerShift)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, registerShift, day)}
                                  onClick={(e) => handleShiftClick(e, registerShift, day)}
                                  className={`px-2.5 py-3 rounded-xl border flex flex-col gap-1.5 transition-all cursor-pointer md:cursor-grab active:cursor-grabbing relative overflow-hidden ${
                                    isDraggedOver
                                      ? 'scale-[1.03] border-purple-500 border-dashed bg-purple-500/15 shadow-lg shadow-purple-500/20'
                                      : isSelectedForSwap
                                        ? 'ring-2 ring-purple-500 border-purple-500/60 bg-purple-500/10 shadow-lg shadow-purple-500/20 scale-[1.02]'
                                        : isCandidateForAssign
                                          ? 'border-dashed border-orange-500/40 hover:border-orange-500 bg-orange-500/5 hover:bg-orange-500/10 hover:scale-[1.02]'
                                          : registerShift.status === 'ACCEPTED' 
                                            ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/10' 
                                            : 'bg-orange-500/5 border-orange-500/20 hover:border-orange-500/40 hover:bg-orange-500/10'
                                  }`}
                                >
                                  {isDraggedOver && (
                                    <div className="absolute inset-0 bg-purple-500/5 animate-pulse pointer-events-none" />
                                  )}
                                  {isSelectedForSwap && (
                                    <div className="absolute inset-0 bg-purple-500/5 animate-pulse pointer-events-none" />
                                  )}
                                  <div className="flex items-center justify-between min-w-0">
                                    <div className="flex items-center gap-2 text-xs font-black text-white min-w-0">
                                      <FaUser size={10} className="text-slate-400 shrink-0" />
                                      <span className="truncate">{registerShift.user?.name || 'Staff Member'}</span>
                                    </div>
                                    {isSelectedForSwap && (
                                      <span className="text-[6px] font-black uppercase text-purple-400 bg-purple-500/20 px-1 py-0.5 rounded tracking-normal animate-pulse shrink-0">
                                        Swap Source
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 min-w-0">
                                    <FaClock size={10} className="text-slate-500 shrink-0" />
                                    <span className="whitespace-nowrap">
                                      {formatHours(registerShift.startTime)} - {formatHours(registerShift.endTime)}
                                    </span>
                                  </div>
                                  
                                  {/* Helper actions description overlay for touchscreen */}
                                  {isSelectedForSwap && (
                                    <div className="text-[7px] font-black text-purple-400 uppercase tracking-widest mt-1 text-center bg-purple-500/10 py-1 rounded">
                                      Tap target to swap
                                    </div>
                                  )}
                                  {isCandidateForAssign && !isSelectedForSwap && (
                                    <div className="text-[7px] font-black text-orange-400 uppercase tracking-widest mt-1 text-center bg-orange-500/10 py-1 rounded">
                                      Tap to assign
                                    </div>
                                  )}

                                  {!isSelectedForSwap && !isCandidateForAssign && (
                                    <div className={`self-start mt-1 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider border whitespace-nowrap ${
                                      registerShift.status === 'ACCEPTED'
                                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                        : 'bg-orange-500/10 border-orange-500 text-orange-400'
                                    }`}>
                                      {registerShift.status === 'ACCEPTED' ? 'Confirmed' : 'Draft'}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="bg-slate-950 border border-dashed border-white/5 rounded-xl py-6 text-center">
                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">⚠️ Unassigned</span>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>

          </div>
        )}

        {/* Empty State Banner */}
        {shifts.length === 0 && !loading && (
          <div className="py-24 text-center border border-dashed border-white/5 rounded-[2rem] mt-8 bg-slate-900/10">
            <FaCircleExclamation className="mx-auto text-slate-700 mb-4" size={36} />
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest italic">Grid Coordinates Vacant</h3>
            <p className="text-[9px] text-slate-600 mt-2 uppercase font-bold tracking-[0.2em]">Forecast shifts from the previous week to compile draft rosters.</p>
          </div>
        )}

      </div>
    </div>
  );
}
