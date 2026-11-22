import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  FiMail, FiSend, FiSearch, FiCheck, FiCheckCircle, 
  FiUser, FiExternalLink, FiClock 
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { messagesAPI } from '../../services/api';
import toast from 'react-hot-toast';

const FALLBACK_CONVERSATIONS = [
  {
    _id: 'conv-1',
    recipient: {
      name: 'Sarah Chen',
      username: 'sarahc',
      primaryRole: 'Full-Stack Engineer',
      avatar: 'SC'
    },
    lastMessage: {
      text: 'Sounds great! I pushed the AST parser branch to GitHub.',
      createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString()
    }
  },
  {
    _id: 'conv-2',
    recipient: {
      name: 'David Kim',
      username: 'dkim',
      primaryRole: 'UI/UX Lead',
      avatar: 'DK'
    },
    lastMessage: {
      text: 'Do you have the Figma token exports handy?',
      createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    }
  },
  {
    _id: 'conv-3',
    recipient: {
      name: 'NeuralFlow Labs',
      username: 'neuralflow_recruiter',
      primaryRole: 'Talent Partner',
      avatar: 'NF'
    },
    lastMessage: {
      text: 'We would love to schedule a technical chat regarding the internship.',
      createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    }
  }
];

const FALLBACK_MESSAGES = [
  {
    _id: 'm1',
    sender: { _id: 'other', username: 'sarahc', name: 'Sarah Chen' },
    content: 'Hey Alex! Saw your project on AutonomAI. Are you free to collaborate on the frontend visualization?',
    createdAt: new Date(Date.now() - 3600 * 1000).toISOString()
  },
  {
    _id: 'm2',
    sender: { _id: 'me', username: 'alex', name: 'Alex Rivera' },
    content: 'Hey Sarah! Absolutely, we need a React 19 lead to build our observability dashboard with canvas micro-interactions.',
    createdAt: new Date(Date.now() - 3000 * 1000).toISOString()
  },
  {
    _id: 'm3',
    sender: { _id: 'other', username: 'sarahc', name: 'Sarah Chen' },
    content: 'Sounds great! I pushed the AST parser branch to GitHub. Looking forward to integrating it!',
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString()
  }
];

const Messages = () => {
  const { conversationId: routeConvId } = useParams();
  const { user, isAuth } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(routeConvId || null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, [isAuth]);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    }
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    setLoading(true);
    if (!isAuth) {
      setConversations(FALLBACK_CONVERSATIONS);
      setActiveConvId(routeConvId || 'conv-1');
      setLoading(false);
      return;
    }

    try {
      const res = await messagesAPI.getConversations();
      if (res.data && res.data.length > 0) {
        setConversations(res.data);
        setActiveConvId(routeConvId || res.data[0]._id);
      } else {
        setConversations(FALLBACK_CONVERSATIONS);
        setActiveConvId(routeConvId || 'conv-1');
      }
    } catch {
      setConversations(FALLBACK_CONVERSATIONS);
      setActiveConvId(routeConvId || 'conv-1');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId) => {
    if (!isAuth || convId.startsWith('conv-')) {
      setMessages(FALLBACK_MESSAGES);
      return;
    }

    setLoadingMessages(true);
    try {
      const res = await messagesAPI.getMessages(convId);
      setMessages(res.data || []);
    } catch {
      setMessages(FALLBACK_MESSAGES);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    const text = inputMessage.trim();
    setInputMessage('');

    if (!isAuth || activeConvId?.startsWith('conv-')) {
      const localMsg = {
        _id: `m-${Date.now()}`,
        sender: { _id: user?._id || 'me', username: user?.username || 'you', name: 'You' },
        content: text,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, localMsg]);
      return;
    }

    setSending(true);
    try {
      const res = await messagesAPI.send({
        conversationId: activeConvId,
        content: text
      });
      setMessages(prev => [...prev, res.data]);
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const activeConv = conversations.find(c => (c._id || c.id) === activeConvId) || conversations[0];
  const recipient = activeConv?.recipient || {};
  const recipientName = recipient.name || recipient.username || 'Builder';

  const filteredConversations = conversations.filter(c => {
    const rName = c.recipient?.name || c.recipient?.username || '';
    return rName.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs h-[calc(100vh-8.5rem)] flex overflow-hidden">
      {/* Left Conversations Sidebar */}
      <div className="w-full sm:w-80 border-r border-slate-200/80 dark:border-slate-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FiMail className="text-primary-600" /> Builder Messages
          </h2>
          <div className="relative mt-2.5">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 outline-none text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredConversations.map(conv => {
            const cId = conv._id || conv.id;
            const r = conv.recipient || {};
            const dName = r.name || r.username || 'Builder';
            const isActive = activeConvId === cId;

            return (
              <button
                key={cId}
                onClick={() => setActiveConvId(cId)}
                className={`w-full p-4 flex items-start gap-3 text-left transition-colors ${
                  isActive ? 'bg-primary-50/70 dark:bg-primary-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs">
                  {dName.slice(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {dName}
                    </h4>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {conv.lastMessage?.createdAt ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {conv.lastMessage?.text || 'No messages yet'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Chat Area */}
      <div className="hidden sm:flex flex-1 flex-col justify-between bg-slate-50/40 dark:bg-slate-950/30">
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-xs">
                  {recipientName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Link to={`/profile/${recipient.username}`} className="font-bold text-sm text-slate-900 dark:text-white hover:text-primary-600 transition-colors">
                      {recipientName}
                    </Link>
                    <span className="text-xs text-slate-400">@{recipient.username}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {recipient.primaryRole || 'Software Builder'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={`/u/${recipient.username}`}
                  target="_blank"
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1"
                >
                  Portfolio <FiExternalLink size={11} />
                </Link>
              </div>
            </div>

            {/* Messages Scroll View */}
            <div className="flex-1 p-6 overflow-y-auto space-y-3.5">
              {loadingMessages ? (
                <p className="text-xs text-center text-slate-400">Loading conversation...</p>
              ) : messages.map((m, idx) => {
                const isMe = (m.sender?._id || m.sender?.username) === (user?._id || user?.username) || m.sender === 'me';

                return (
                  <div
                    key={m._id || idx}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-md px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isMe
                          ? 'bg-primary-600 text-white rounded-br-xs shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200/80 dark:border-slate-700/80 rounded-bl-xs shadow-xs'
                      }`}
                    >
                      {m.content || m.text}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={`Message ${recipientName}...`}
                  className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary-500"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || sending}
                  className="p-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-xs disabled:opacity-50 transition-colors"
                >
                  <FiSend size={15} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
            Select a conversation to start chatting.
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
