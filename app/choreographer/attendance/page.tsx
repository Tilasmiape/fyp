"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AttendanceItem {
  id: string;
  studentName: string;
  classTitle: string;
  classTime: string;
  style: string;
  date: string;
  status: 'unmarked' | 'present' | 'absent';
  score?: number | null;
  client_id?: string;
  booking_id?: string;
}

interface BookingItem {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  time: string;
  status: string;
}

const todayKey = () => new Date().toISOString().slice(0, 10);

export default function ChoreographerAttendancePage() {
  const router = useRouter();
  const [dateKey, setDateKey] = useState(todayKey());
  const [todayRoll, setTodayRoll] = useState<AttendanceItem[]>([]);
  const [recentHistory, setRecentHistory] = useState<AttendanceItem[]>([]);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [bookingsError, setBookingsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    studentName: '',
    classTitle: 'Student Session',
    classTime: '11:30 AM - 12:30 PM',
    style: 'Hip Hop',
    bookingId: '',
    clientId: '',
  });

  const friendlyDate = useMemo(() => {
    const date = new Date(dateKey);
    if (Number.isNaN(date.getTime())) return 'Today';
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }, [dateKey]);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/choreographer/attendance?date=${dateKey}`, {
        method: 'GET',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to load attendance');
      }
      setTodayRoll(Array.isArray(data.todayRoll) ? data.todayRoll : []);
      setRecentHistory(Array.isArray(data.recentHistory) ? data.recentHistory : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [dateKey]);

  useEffect(() => {
    const loadBookings = async () => {
      try {
        setBookingsError('');
        const res = await fetch('/api/choreographer/reservations', {
          method: 'GET',
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to load bookings');
        }
        const items = Array.isArray(data.reservations) ? data.reservations : [];
        const mapped: BookingItem[] = items.map((item: any) => ({
          id: String(item.id),
          clientId: String(item.client?.id || ''),
          clientName: item.client?.name || 'Client',
          date: item.date || '',
          time: item.time || '',
          status: item.status || '',
        }));
        setBookings(mapped);
      } catch (err: any) {
        setBookingsError(err.message || 'Failed to load bookings');
      }
    };
    loadBookings();
  }, []);

  const updateHistory = (item: AttendanceItem) => {
    if (item.status !== 'present' && item.status !== 'absent') return;
    setRecentHistory(prev => {
      const exists = prev.findIndex(row => row.id === item.id);
      const updated = exists >= 0 ? prev.map(row => (row.id === item.id ? item : row)) : [item, ...prev];
      return updated.slice(0, 10);
    });
  };

  const handleMark = async (item: AttendanceItem, status: 'present' | 'absent') => {
    const scoreInput =
      status === 'present'
        ? window.prompt('Enter performance score (0-10):', item.score?.toString() || '')
        : null;
    if (status === 'present') {
      if (scoreInput === null) return;
      const scoreValue = Number(scoreInput);
      if (Number.isNaN(scoreValue) || scoreValue < 0 || scoreValue > 10) {
        setError('Score must be between 0 and 10.');
        return;
      }
      await saveAttendance({ ...item, status, score: scoreValue });
      return;
    }
    await saveAttendance({ ...item, status, score: null });
  };

  const saveAttendance = async (payload: Partial<AttendanceItem> & { status: 'present' | 'absent' | 'unmarked' }) => {
    try {
      setSavingId(payload.id || 'new');
      setError('');
      const res = await fetch('/api/choreographer/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...payload,
          date: dateKey,
          client_id: payload.client_id,
          booking_id: payload.booking_id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to save attendance');
      }
      const updated = data.attendance as AttendanceItem;
      setTodayRoll(prev => {
        const exists = prev.findIndex(row => row.id === updated.id);
        if (exists >= 0) {
          return prev.map(row => (row.id === updated.id ? updated : row));
        }
        return [updated, ...prev];
      });
      updateHistory(updated);
      setShowAddForm(false);
      setNewEntry({
        studentName: '',
        classTitle: 'Student Session',
        classTime: '11:30 AM - 12:30 PM',
        style: 'Hip Hop',
        bookingId: '',
        clientId: '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save attendance');
    } finally {
      setSavingId(null);
    }
  };

  const handleAddToRoll = async () => {
    if (!newEntry.studentName.trim()) {
      setError('Student name is required.');
      return;
    }
    const selectedBooking = bookings.find(b => b.id === newEntry.bookingId);
    await saveAttendance({
      studentName: newEntry.studentName.trim(),
      classTitle: newEntry.classTitle.trim() || 'Student Session',
      classTime: newEntry.classTime.trim(),
      style: newEntry.style.trim(),
      client_id: newEntry.clientId || selectedBooking?.clientId || undefined,
      booking_id: newEntry.bookingId || undefined,
      status: 'unmarked',
    });
  };

  return (
    <div className="attendance-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;600;700&family=Playfair+Display:wght@600;700&display=swap');
        * { box-sizing: border-box; }
        .attendance-root { min-height: 100vh; background: #f7f8fc; font-family: 'Manrope', sans-serif; color: #0f172a; }
        .topbar { display: flex; align-items: center; justify-content: space-between; padding: 18px 40px; background: #fff; border-bottom: 1px solid #e9ecf5; }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand-badge { width: 44px; height: 44px; border-radius: 999px; background: #fff; overflow: hidden; box-shadow: 0 10px 20px rgba(0,0,0,0.15); display: grid; place-items: center; }
        .brand-badge img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.1); }
        .brand-name { font-weight: 700; letter-spacing: 0.4px; }
        .brand-sub { font-size: 10px; color: #f4b63a; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
        .nav-links { display: flex; gap: 20px; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #6b7280; font-weight: 700; }
        .nav-links span { cursor: pointer; }
        .user-chip { display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 700; color: #0f172a; }
        .user-chip span { color: #f4b63a; font-size: 10px; letter-spacing: 1px; }
        .page { max-width: 980px; margin: 0 auto; padding: 34px; }
        .intro { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
        .intro h1 { font-family: 'Playfair Display', serif; font-size: 34px; margin: 6px 0 0; line-height: 1.1; }
        .intro .eyebrow { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #f4b63a; font-weight: 700; }
        .tabbar { margin-top: 20px; display: flex; gap: 12px; background: #eef1f7; padding: 8px; border-radius: 999px; width: fit-content; }
        .tab { padding: 8px 18px; border-radius: 999px; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; font-weight: 700; color: #94a3b8; }
        .tab.active { background: #0f172a; color: #fff; }
        .card { background: #fff; border-radius: 26px; padding: 26px; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08); border: 1px solid #edf0f6; }
        .section { margin-top: 28px; }
        .section-title { font-family: 'Playfair Display', serif; font-size: 22px; margin: 0 0 16px; }
        .roll-item { display: flex; align-items: center; justify-content: space-between; padding: 18px; border-radius: 18px; background: #f9fafc; border: 1px solid #eef1f6; }
        .roll-left { display: flex; align-items: center; gap: 16px; }
        .roll-badge { width: 44px; height: 44px; border-radius: 14px; background: #fff; display: grid; place-items: center; font-weight: 800; color: #0f172a; box-shadow: 0 6px 16px rgba(15,23,42,0.12); }
        .roll-name { font-weight: 700; }
        .roll-meta { font-size: 12px; color: #94a3b8; margin-top: 4px; }
        .roll-actions { display: flex; gap: 10px; }
        .btn { border: none; border-radius: 999px; padding: 8px 16px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; }
        .btn.present { background: #12b76a; color: #fff; }
        .btn.absent { background: #fff0f0; color: #ef4444; border: 1px solid #fecaca; }
        .btn.secondary { background: #fff; color: #0f172a; border: 1px solid #e5e7eb; }
        .status-pill { padding: 4px 12px; border-radius: 999px; font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
        .status-present { background: #dcfce7; color: #16a34a; }
        .status-absent { background: #fee2e2; color: #ef4444; }
        .status-unmarked { background: #e2e8f0; color: #64748b; }
        .history-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .history-table th { text-align: left; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #94a3b8; padding-bottom: 12px; }
        .history-table td { padding: 12px 0; border-top: 1px solid #eef1f6; font-weight: 600; }
        .score { font-weight: 800; }
        .score small { color: #94a3b8; font-weight: 600; }
        .empty { font-size: 13px; color: #94a3b8; padding: 16px 0; }
        .error { color: #ef4444; font-size: 12px; margin-top: 12px; }
        .form { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; margin-top: 16px; }
        .input { padding: 10px 12px; border-radius: 12px; border: 1px solid #e5e7eb; font-size: 12px; background: #fff; }
        .input:focus { outline: none; border-color: #f4b63a; box-shadow: 0 0 0 2px rgba(244,182,58,0.15); }
        @media (max-width: 860px) {
          .page { padding: 24px; }
          .intro { flex-direction: column; }
          .form { grid-template-columns: 1fr; }
          .roll-item { flex-direction: column; align-items: flex-start; gap: 16px; }
          .roll-actions { width: 100%; }
        }
      `}</style>

      <nav className="topbar">
        <div className="brand">
          <div className="brand-badge"><img src="/images/logo.png" alt="Logo" /></div>
          <div>
            <div className="brand-name">Step Out</div>
            <div className="brand-sub">Studio Hub</div>
          </div>
        </div>
        <div className="nav-links">
          <span onClick={() => router.push('/choreographer/home')}>Home</span>
          <span onClick={() => router.push('/choreographer/attendance')}>Dashboard</span>
        </div>
       
      </nav>

      <div className="page">
        <div className="intro">
          
          <div style={{ minWidth: '220px', textAlign: 'right', color: '#94a3b8', fontSize: '12px' }}>
            {friendlyDate}
          </div>
        </div>

        <div className="section card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <h2 className="section-title">Today's Class Roll</h2>
            <button className="btn secondary" onClick={() => setShowAddForm(prev => !prev)}>
              {showAddForm ? 'Close' : 'Add Student'}
            </button>
          </div>

          {showAddForm && (
            <div className="form">
              <select
                className="input"
                value={newEntry.bookingId}
                onChange={(e) => {
                  const bookingId = e.target.value;
                  if (!bookingId) {
                    setNewEntry((prev) => ({ ...prev, bookingId: '', clientId: '' }));
                    return;
                  }
                  const booking = bookings.find(b => b.id === bookingId);
                  setNewEntry((prev) => ({
                    ...prev,
                    bookingId,
                    clientId: booking?.clientId || '',
                    studentName: booking?.clientName || prev.studentName,
                    classTime: booking?.time || prev.classTime,
                  }));
                }}
              >
                <option value="">Select booking (optional)</option>
                {bookings.map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.clientName} • {booking.date} • {booking.time}
                  </option>
                ))}
              </select>
              <input
                className="input"
                placeholder="Client user id (optional)"
                value={newEntry.clientId}
                onChange={(e) => setNewEntry({ ...newEntry, clientId: e.target.value })}
              />
              <input
                className="input"
                placeholder="Student name"
                value={newEntry.studentName}
                onChange={(e) => setNewEntry({ ...newEntry, studentName: e.target.value })}
              />
              <input
                className="input"
                placeholder="Session title"
                value={newEntry.classTitle}
                onChange={(e) => setNewEntry({ ...newEntry, classTitle: e.target.value })}
              />
              <input
                className="input"
                placeholder="Time slot"
                value={newEntry.classTime}
                onChange={(e) => setNewEntry({ ...newEntry, classTime: e.target.value })}
              />
              <input
                className="input"
                placeholder="Style"
                value={newEntry.style}
                onChange={(e) => setNewEntry({ ...newEntry, style: e.target.value })}
              />
              <button className="btn present" onClick={handleAddToRoll} disabled={savingId === 'new'}>
                {savingId === 'new' ? 'Saving...' : 'Add to Roll'}
              </button>
              {bookingsError && <div className="error">{bookingsError}</div>}
            </div>
          )}

          {loading ? (
            <div className="empty">Loading attendance...</div>
          ) : todayRoll.length === 0 ? (
            <div className="empty">No students on the roll for today.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {todayRoll.map((item) => (
                <div key={item.id} className="roll-item">
                  <div className="roll-left">
                    <div className="roll-badge">{item.studentName.charAt(0) || 'S'}</div>
                    <div>
                      <div className="roll-name">{item.studentName}</div>
                      <div className="roll-meta">{item.classTitle} · {item.classTime} · {item.style}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`status-pill status-${item.status}`}>
                      {item.status === 'unmarked' ? 'Pending' : item.status}
                    </span>
                    <div className="roll-actions">
                      <button
                        className="btn present"
                        onClick={() => handleMark(item, 'present')}
                        disabled={savingId === item.id}
                      >
                        Present & Score
                      </button>
                      <button
                        className="btn absent"
                        onClick={() => handleMark(item, 'absent')}
                        disabled={savingId === item.id}
                      >
                        Absent
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="section card">
          <h2 className="section-title">Recent Scores & History</h2>
          {loading ? (
            <div className="empty">Loading history...</div>
          ) : recentHistory.length === 0 ? (
            <div className="empty">No attendance history yet.</div>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Student</th>
                  <th>Style</th>
                  <th>Status</th>
                  <th>Performance Score</th>
                </tr>
              </thead>
              <tbody>
                {recentHistory.map((row) => (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td>{row.studentName}</td>
                    <td>{row.style || '-'}</td>
                    <td>
                      <span className={`status-pill status-${row.status}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="score">
                      {row.status === 'present' ? (
                        <>
                          {row.score ?? 0} <small>/ 10</small>
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {error && <div className="error">{error}</div>}
        </div>
      </div>
    </div>
  );
}
