import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { createSchedule, deleteSchedule, getMySchedules } from '../api/scheduleApi';
import AppShell from '../components/AppShell';

function CalendarView({ schedules, onDateSelect, selectedDate }) {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const startDate = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  return (
    <div className="glass-card p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold text-lg">Weekly Schedule</h3>
        <div className="flex gap-2">
          <button 
            type="button"
            className="secondary-btn text-xs py-1"
            onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
          >
            ← Prev
          </button>
          <button 
            type="button"
            className="secondary-btn text-xs py-1"
            onClick={() => setCurrentWeek(new Date())}
          >
            Today
          </button>
          <button 
            type="button"
            className="secondary-btn text-xs py-1"
            onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
          >
            Next →
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map(day => {
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const daySchedules = schedules.filter(s => isSameDay(parseISO(s.date), day));
          
          return (
            <div 
              key={day.toISOString()} 
              className={`flex flex-col border rounded-xl p-2 cursor-pointer transition ${
                isSelected 
                  ? 'border-brand-500 bg-brand-500/10' 
                  : 'border-slate-700 bg-slate-800/40 hover:bg-slate-800/80'
              }`}
              onClick={() => onDateSelect(day)}
            >
              <span className={`text-xs font-semibold mb-1 ${isSameDay(day, new Date()) ? 'text-brand-300' : 'text-slate-400'}`}>
                {format(day, 'EEE')}
              </span>
              <span className={`text-xl font-bold mb-2 ${isSelected ? 'text-brand-100' : 'text-white'}`}>
                {format(day, 'd')}
              </span>
              
              <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
                {daySchedules.map(s => (
                  <div key={s._id} className="bg-brand-500/20 border border-brand-500/30 rounded px-1.5 py-1" title={`${s.topic} - ${s.role}`}>
                    <p className="text-[10px] text-brand-100 font-semibold truncate">{format(parseISO(s.date), 'HH:mm')}</p>
                    <p className="text-[10px] text-white truncate">{s.topic}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '14:00',
    topic: 'System Design',
    role: 'Software Engineer',
    difficulty: 'medium',
    emailReminder: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadSchedules = async () => {
    try {
      const data = await getMySchedules();
      setSchedules(data.schedules);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const dateTimeString = `${formData.date}T${formData.time}:00`;
      const combinedDate = new Date(dateTimeString);
      
      await createSchedule({
        date: combinedDate.toISOString(),
        topic: formData.topic,
        role: formData.role,
        difficulty: formData.difficulty,
        emailReminder: formData.emailReminder,
      });
      
      await loadSchedules();
      setSelectedDate(combinedDate);
      setFormData(prev => ({...prev, topic: ''}));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteSchedule(id);
      await loadSchedules();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setFormData(prev => ({
      ...prev,
      date: format(date, 'yyyy-MM-dd')
    }));
  };

  const selectedDaySchedules = schedules.filter(s => isSameDay(parseISO(s.date), selectedDate))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <AppShell 
      title="Interview Scheduler" 
      subtitle="Plan and track your upcoming AI mock interviews with email reminders."
    >
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Left column: Calendar & List */}
        <div className="lg:col-span-2 space-y-6">
          <CalendarView 
            schedules={schedules} 
            onDateSelect={handleDateSelect} 
            selectedDate={selectedDate} 
          />
          
          <div className="glass-card p-5">
            <h3 className="text-white font-bold text-lg mb-4">
              Schedule for {format(selectedDate, 'MMMM d, yyyy')}
            </h3>
            
            {selectedDaySchedules.length === 0 ? (
              <p className="text-slate-400 text-sm">No interviews scheduled for this day.</p>
            ) : (
              <div className="space-y-3">
                {selectedDaySchedules.map(schedule => (
                  <div key={schedule._id} className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="text-center w-16 bg-slate-900 rounded-lg p-2 border border-slate-700">
                        <p className="text-sm font-bold text-brand-300">{format(parseISO(schedule.date), 'HH:mm')}</p>
                      </div>
                      <div>
                        <p className="font-bold text-white text-base">{schedule.topic}</p>
                        <p className="text-sm text-slate-300">{schedule.role} • {schedule.difficulty}</p>
                        {schedule.emailReminder && (
                          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                            <span>📧</span> Reminder scheduled
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition">
                      <button 
                        type="button" 
                        onClick={() => navigate('/setup', { state: { ...schedule } })}
                        className="secondary-btn text-xs"
                      >
                        Start Now
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleDelete(schedule._id)}
                        className="text-slate-400 hover:text-rose-400 transition"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Right column: Form */}
        <div>
          <div className="glass-card p-5 sticky top-24">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <span>📅</span> Create Schedule
            </h3>
            
            {error && <p className="mb-4 text-sm text-rose-400 bg-rose-500/10 p-2 rounded">{error}</p>}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Date</label>
                  <input
                    type="date"
                    required
                    className="soft-input text-sm"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({...prev, date: e.target.value}))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Time</label>
                  <input
                    type="time"
                    required
                    className="soft-input text-sm"
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({...prev, time: e.target.value}))}
                  />
                </div>
              </div>
              
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Topic</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. System Design, React, AWS"
                  className="soft-input text-sm"
                  value={formData.topic}
                  onChange={(e) => setFormData(prev => ({...prev, topic: e.target.value}))}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Target Role</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Frontend Engineer"
                  className="soft-input text-sm"
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({...prev, role: e.target.value}))}
                />
              </div>
              
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Difficulty</label>
                <select
                  className="soft-input text-sm"
                  value={formData.difficulty}
                  onChange={(e) => setFormData(prev => ({...prev, difficulty: e.target.value}))}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2 pb-2">
                <input
                  type="checkbox"
                  id="emailReminder"
                  className="w-4 h-4 rounded border-slate-600 text-brand-500 focus:ring-brand-500 bg-slate-900"
                  checked={formData.emailReminder}
                  onChange={(e) => setFormData(prev => ({...prev, emailReminder: e.target.checked}))}
                />
                <label htmlFor="emailReminder" className="text-sm font-medium text-slate-300 cursor-pointer">
                  Send email reminder 24h before
                </label>
              </div>

              <button
                type="submit"
                className="primary-btn w-full flex justify-center py-3"
                disabled={isLoading}
              >
                {isLoading ? 'Scheduling...' : 'Schedule Interview'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
