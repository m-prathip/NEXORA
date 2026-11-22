import { useState, useEffect } from 'react';
import { 
  FiCalendar, FiClock, FiMapPin, FiUsers, FiVideo, 
  FiCheck, FiExternalLink, FiPlus, FiX 
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { eventsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const FALLBACK_EVENTS = [
  {
    _id: 'ev-1',
    title: 'NEXORA Global AI & Systems Hackathon 2026',
    organizer: { username: 'nexora_foundation', name: 'NEXORA Foundation' },
    type: 'hackathon',
    startDate: '2026-12-12T10:00:00Z',
    endDate: '2026-12-14T18:00:00Z',
    location: 'Virtual / Online',
    isVirtual: true,
    attendeesCount: 1840,
    description: 'Build real-world multi-agent AI systems, developer tooling, or distributed databases. Judged by senior architects and startup founders. $25,000 in Prizes & GPU Cloud Credits.',
    tags: ['hackathon', 'ai', 'systems', 'cloud'],
    myRsvpStatus: 'going'
  },
  {
    _id: 'ev-2',
    title: 'Deep Dive: Scaling LLMs with Sub-100ms Inference',
    organizer: { username: 'alex', name: 'Alex Rivera' },
    type: 'tech_talk',
    startDate: '2026-11-28T18:00:00Z',
    endDate: '2026-11-28T19:30:00Z',
    location: 'Live Stream',
    isVirtual: true,
    attendeesCount: 640,
    description: 'Architecture breakdown on token quantization, streaming SSE sockets, memory-safe GPU buffer allocation, and custom AST parsers.',
    tags: ['webinar', 'pytorch', 'distributed'],
    myRsvpStatus: null
  },
  {
    _id: 'ev-3',
    title: 'UI/UX for Developers: Crafting 60fps Micro-interactions',
    organizer: { username: 'design_guild', name: 'HyperPulse Design Guild' },
    type: 'workshop',
    startDate: '2026-12-05T17:00:00Z',
    endDate: '2026-12-05T18:30:00Z',
    location: 'Interactive Workshop Live',
    isVirtual: true,
    attendeesCount: 420,
    description: 'Learn to use Framer Motion, Three.js shaders, and design tokens to create interfaces that stand out to technical recruiters.',
    tags: ['workshop', 'design', 'react19'],
    myRsvpStatus: null
  }
];

const Events = () => {
  const { user, isAuth } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('All');
  const [showHostModal, setShowHostModal] = useState(false);
  const [hostForm, setHostForm] = useState({
    title: '',
    type: 'hackathon',
    description: '',
    startDate: '',
    location: 'Virtual / Online',
    link: ''
  });
  const [hosting, setHosting] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [activeType]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await eventsAPI.getAll({
        type: activeType === 'All' ? undefined : activeType
      });
      if (res.data && res.data.length > 0) {
        setEvents(res.data);
      } else {
        setEvents(filterFallback());
      }
    } catch {
      setEvents(filterFallback());
    } finally {
      setLoading(false);
    }
  };

  const filterFallback = () => {
    if (activeType === 'All') return FALLBACK_EVENTS;
    return FALLBACK_EVENTS.filter(e => e.type === activeType);
  };

  const handleRsvp = async (event, targetStatus) => {
    const eventId = event._id;
    const newStatus = event.myRsvpStatus === targetStatus ? 'not_going' : targetStatus;

    if (!isAuth) {
      setEvents(prev => prev.map(e => {
        if (e._id === eventId) {
          const wasGoing = e.myRsvpStatus === 'going';
          const isGoing = newStatus === 'going';
          const delta = isGoing && !wasGoing ? 1 : !isGoing && wasGoing ? -1 : 0;
          return {
            ...e,
            myRsvpStatus: newStatus === 'not_going' ? null : newStatus,
            attendeesCount: Math.max(0, e.attendeesCount + delta)
          };
        }
        return e;
      }));
      toast.success(newStatus === 'not_going' ? 'RSVP cancelled' : `RSVP confirmed: ${targetStatus}!`);
      return;
    }

    try {
      const res = await eventsAPI.rsvp(eventId, newStatus);
      setEvents(prev => prev.map(e => {
        if (e._id === eventId) {
          return {
            ...e,
            myRsvpStatus: newStatus === 'not_going' ? null : newStatus,
            attendeesCount: res.data.attendeesCount
          };
        }
        return e;
      }));
      toast.success(newStatus === 'not_going' ? 'RSVP cancelled' : `RSVP confirmed: ${targetStatus}!`);
    } catch (err) {
      toast.error('Failed to update RSVP');
    }
  };

  const handleHostSubmit = async (e) => {
    e.preventDefault();
    if (!hostForm.title.trim() || !hostForm.description.trim() || !hostForm.startDate) {
      return toast.error('Please complete required fields');
    }

    setHosting(true);
    if (!isAuth) {
      const localE = {
        _id: `ev-${Date.now()}`,
        ...hostForm,
        organizer: { name: 'You', username: 'builder' },
        attendeesCount: 1,
        myRsvpStatus: 'going'
      };
      setEvents([localE, ...events]);
      setShowHostModal(false);
      setHosting(false);
      toast.success('Event scheduled!');
      return;
    }

    try {
      const res = await eventsAPI.create(hostForm);
      setEvents([res.data, ...events]);
      setShowHostModal(false);
      setHostForm({ title: '', type: 'hackathon', description: '', startDate: '', location: 'Virtual / Online', link: '' });
      toast.success('Event scheduled successfully!');
    } catch (err) {
      toast.error('Failed to schedule event');
    } finally {
      setHosting(false);
    }
  };

  const formatEventType = (t) => {
    switch (t) {
      case 'hackathon': return '🏆 Hackathon';
      case 'workshop': return '🛠 Workshop';
      case 'tech_talk': return '🎙 Tech Talk';
      case 'meetup': return '👥 Meetup';
      default: return 'Event';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FiCalendar className="text-indigo-500" /> Hackathons & Tech Events
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Participate in builder hackathons, architectural workshops, and live AMAs with leading engineers.
          </p>
        </div>

        <button
          onClick={() => setShowHostModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs flex items-center gap-2 self-start sm:self-auto shadow-xs transition-all"
        >
          <FiPlus size={15} /> Host an Event
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {['All', 'hackathon', 'workshop', 'tech_talk', 'meetup'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveType(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap capitalize transition-all ${
              activeType === tab
                ? 'bg-slate-900 dark:bg-primary-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            {tab === 'All' ? 'All Events' : formatEventType(tab)}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {events.map(ev => {
          const isGoing = ev.myRsvpStatus === 'going';

          return (
            <div
              key={ev._id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">{ev.title}</h3>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                        {formatEventType(ev.type)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Hosted by <strong className="text-slate-800 dark:text-slate-200">{ev.organizer?.name || ev.organizer?.username || 'Host'}</strong>
                    </p>
                  </div>

                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 self-start sm:self-auto">
                    <FiUsers size={13} /> {ev.attendeesCount || 0} attending
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-semibold text-primary-600">
                    <FiCalendar size={12} /> {new Date(ev.startDate).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <FiMapPin size={12} /> {ev.location}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                  {ev.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRsvp(ev, 'going')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                      isGoing
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : 'bg-primary-600 hover:bg-primary-700 text-white'
                    }`}
                  >
                    {isGoing ? (
                      <>
                        <FiCheck size={13} /> You're Attending
                      </>
                    ) : (
                      'RSVP / Join'
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Host Event */}
      {showHostModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <FiCalendar className="text-primary-600" /> Host a Tech Event
              </h3>
              <button onClick={() => setShowHostModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleHostSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Event Title</label>
                <input
                  type="text"
                  value={hostForm.title}
                  onChange={(e) => setHostForm({ ...hostForm, title: e.target.value })}
                  placeholder="e.g. Distributed LLM Architecture AMA"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Event Type</label>
                  <select
                    value={hostForm.type}
                    onChange={(e) => setHostForm({ ...hostForm, type: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none"
                  >
                    <option value="hackathon">Hackathon</option>
                    <option value="workshop">Interactive Workshop</option>
                    <option value="tech_talk">Tech Talk / Webinar</option>
                    <option value="meetup">Community Meetup</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={hostForm.startDate}
                    onChange={(e) => setHostForm({ ...hostForm, startDate: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Location or Stream URL</label>
                <input
                  type="text"
                  value={hostForm.location}
                  onChange={(e) => setHostForm({ ...hostForm, location: e.target.value })}
                  placeholder="e.g. Zoom, Google Meet, or Discord Stage"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Event Description & Agenda</label>
                <textarea
                  rows={3}
                  value={hostForm.description}
                  onChange={(e) => setHostForm({ ...hostForm, description: e.target.value })}
                  placeholder="What will builders learn? What is the judging criteria or schedule?"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowHostModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={hosting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-xs disabled:opacity-60"
                >
                  {hosting ? 'Scheduling…' : 'Host Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
