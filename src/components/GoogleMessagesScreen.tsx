import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  MessageSquare,
  Send,
  Trash2,
  Phone,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Check,
  CheckCheck,
  AlertCircle,
  Clock,
  MoreVertical,
  Plus,
  RefreshCw,
  User,
} from 'lucide-react';
import { Language, StoredSmsMessage } from '../types';
import { translateInline } from '../utils/translateInline';
import {
  fetchStoredSmsMessages,
  removeStoredSmsMessage,
  purgeStoredSmsMessages,
  sendSilentBackgroundSms,
  checkIsDefaultSmsApp,
  requestSetDefaultSmsApp,
} from '../utils/nativeEmergencySms';

interface GoogleMessagesScreenProps {
  lang: Language;
  onOpenSmsConfig?: () => void;
}

// Initial sample messages that match Algerian phone numbers and realistic alerts shown in user screenshot
const INITIAL_DEMO_CONVERSATIONS: StoredSmsMessage[] = [
  {
    id: 'msg_demo_1',
    sender: '0550 03 15 41',
    body: '[إنذار 3 - DroidGuard محاولات فاشلة]\nتم رصد محاولة اختراق الهاتف! إحداثيات الموقع: 36.7538, 3.0588\nhttps://maps.google.com/?q=36.7538,3.0588',
    timestamp: Date.now() - 1000 * 60 * 15, // 15 mins ago
    type: 'inbox',
    read: false,
  },
  {
    id: 'msg_demo_2',
    sender: '0563 75 20 23',
    body: 'أنت: [إنذار 3 - DroidGuard محاولات فاشلة] تم تفعيل نظام الحماية وإرسال التقرير بنجاح.',
    timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    type: 'sent',
    read: true,
  },
  {
    id: 'msg_demo_3',
    sender: '333',
    body: 'Félicitations cher fan du MCA ! Vous venez de recevoir 5 Go de bonus internet, valable (s) 24 heures. Pour consulter votre solde, composez *200#.',
    timestamp: Date.now() - 1000 * 60 * 60 * 9, // 9 hours ago
    type: 'inbox',
    read: true,
  },
  {
    id: 'msg_demo_4',
    sender: '505',
    body: 'إن رصيدك غير كاف ! شكّل #505* لاستلاف رصيد الآن وادفع عند تعبئتك القادمة.',
    timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    type: 'inbox',
    read: true,
  },
  {
    id: 'msg_demo_5',
    sender: 'خالي عبدالله (0655122180)',
    body: 'السلام عليكم يا وليدي، إن شاء الله راك بخير والوالدة لاباس عليها، اتصل بيا كي تقعد.',
    timestamp: Date.now() - 1000 * 60 * 60 * 28,
    type: 'inbox',
    read: true,
  },
  {
    id: 'msg_demo_6',
    sender: 'EXCLUSIF',
    body: 'Cher client, pour votre fidélité, tapez *511# et profitez de 25Go + illimité Ooredoo + 1500da de crédit valables 30 jours.',
    timestamp: Date.now() - 1000 * 60 * 60 * 48,
    type: 'inbox',
    read: true,
  },
  {
    id: 'msg_demo_7',
    sender: 'Brevo',
    body: 'Your Brevo activation code is 120569.',
    timestamp: Date.now() - 1000 * 60 * 60 * 72,
    type: 'inbox',
    read: true,
  },
  {
    id: 'msg_demo_8',
    sender: 'ALG Poste',
    body: 'ATTENTION aux arnaques, votre code du Virement a partir de votre compte CCP est : 334874',
    timestamp: Date.now() - 1000 * 60 * 60 * 96,
    type: 'inbox',
    read: true,
  },
  {
    id: 'msg_demo_9',
    sender: 'خالي بلال',
    body: 'Le +213540134335 est de nouveau joignable.',
    timestamp: Date.now() - 1000 * 60 * 60 * 120,
    type: 'inbox',
    read: true,
  },
  {
    id: 'msg_demo_10',
    sender: '0563 50 34 54',
    body: '213563503454 est de nouveau joignable.',
    timestamp: Date.now() - 1000 * 60 * 60 * 144,
    type: 'inbox',
    read: true,
  },
];

// Color palette generator for avatars matching Google Messages exact style
const AVATAR_COLORS = [
  'bg-amber-600 text-white',
  'bg-purple-600 text-white',
  'bg-pink-600 text-white',
  'bg-blue-600 text-white',
  'bg-emerald-600 text-white',
  'bg-teal-600 text-white',
  'bg-rose-600 text-white',
  'bg-indigo-600 text-white',
  'bg-cyan-600 text-white',
  'bg-orange-600 text-white',
];

function getAvatarColor(sender: string): string {
  let hash = 0;
  for (let i = 0; i < sender.length; i++) {
    hash = sender.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getAvatarLetter(sender: string): string {
  const clean = sender.trim();
  if (!clean) return '؟';
  const first = clean[0];
  if (/^[0-9+*#]/.test(first)) return '';
  return first.toUpperCase();
}

function formatGoogleTimestamp(timestamp: number, lang: Language): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24 && date.getDate() === now.getDate()) {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const isAm = hours < 12;
    const h12 = hours % 12 || 12;
    if (lang === 'ar') {
      return `${h12}:${minutes} ${isAm ? 'ص' : 'م'}`;
    }
    return `${h12}:${minutes} ${isAm ? 'AM' : 'PM'}`;
  }

  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (diffHours < 24 * 7) {
    return lang === 'ar' ? days[date.getDay()] : daysEn[date.getDay()];
  }

  const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  if (lang === 'ar') {
    return `${date.getDate()} ${monthNamesAr[date.getMonth()]}`;
  }
  return date.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' });
}

export const GoogleMessagesScreen: React.FC<GoogleMessagesScreenProps> = ({
  lang,
  onOpenSmsConfig,
}) => {
  const [messages, setMessages] = useState<StoredSmsMessage[]>(() => {
    try {
      const saved = localStorage.getItem('droidguard_sms_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_DEMO_CONVERSATIONS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isDefaultSms, setIsDefaultSms] = useState<boolean | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatNumber, setNewChatNumber] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');

  // Refresh messages from native storage & localStorage
  const loadMessages = async () => {
    try {
      const nativeList = await fetchStoredSmsMessages();
      if (nativeList && nativeList.length > 0) {
        setMessages((prev) => {
          const merged = [...nativeList];
          const existingIds = new Set(nativeList.map((m) => m.id));
          for (const p of prev) {
            if (!existingIds.has(p.id)) {
              merged.push(p);
            }
          }
          merged.sort((a, b) => b.timestamp - a.timestamp);
          localStorage.setItem('droidguard_sms_messages', JSON.stringify(merged));
          return merged;
        });
      }
    } catch (err) {
      console.warn('Could not fetch native messages:', err);
    }
  };

  useEffect(() => {
    loadMessages();
    checkIsDefaultSmsApp().then((res) => setIsDefaultSms(res));
    const interval = setInterval(loadMessages, 3500);
    return () => clearInterval(interval);
  }, []);

  // Filter messages by search
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(
      (m) =>
        m.sender.toLowerCase().includes(q) ||
        m.body.toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  // Group messages for active conversation
  const activeConversationMessages = useMemo(() => {
    if (!selectedConversation) return [];
    return messages
      .filter((m) => m.sender === selectedConversation)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, selectedConversation]);

  const handleSendReply = async () => {
    if (!selectedConversation || !replyText.trim() || isSending) return;
    const textToSend = replyText.trim();
    setIsSending(true);

    try {
      // Send real silent SMS via background SmsManager
      await sendSilentBackgroundSms(selectedConversation, textToSend);

      const newMsg: StoredSmsMessage = {
        id: `msg_sent_${Date.now()}`,
        sender: selectedConversation,
        body: textToSend,
        timestamp: Date.now(),
        type: 'sent',
        read: true,
      };

      setMessages((prev) => {
        const next = [newMsg, ...prev];
        localStorage.setItem('droidguard_sms_messages', JSON.stringify(next));
        return next;
      });

      setReplyText('');
    } catch (err) {
      console.error('Failed to send SMS:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleStartNewChat = async () => {
    if (!newChatNumber.trim() || !newChatMessage.trim()) return;
    setIsSending(true);
    try {
      await sendSilentBackgroundSms(newChatNumber.trim(), newChatMessage.trim());
      const newMsg: StoredSmsMessage = {
        id: `msg_sent_${Date.now()}`,
        sender: newChatNumber.trim(),
        body: newChatMessage.trim(),
        timestamp: Date.now(),
        type: 'sent',
        read: true,
      };
      setMessages((prev) => {
        const next = [newMsg, ...prev];
        localStorage.setItem('droidguard_sms_messages', JSON.stringify(next));
        return next;
      });
      setSelectedConversation(newChatNumber.trim());
      setShowNewChatModal(false);
      setNewChatNumber('');
      setNewChatMessage('');
    } catch (err) {
      console.error('Failed to start chat:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await removeStoredSmsMessage(id);
    setMessages((prev) => {
      const next = prev.filter((m) => m.id !== id);
      localStorage.setItem('droidguard_sms_messages', JSON.stringify(next));
      return next;
    });
  };

  return (
    <div
      id="google-messages-container"
      className="flex flex-col min-h-screen bg-[#131314] text-[#E3E3E3] font-sans select-none pb-24"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* 1. Top Google Messages Search / Action Bar */}
      {!selectedConversation ? (
        <header className="sticky top-0 z-30 bg-[#131314]/95 backdrop-blur-md px-4 pt-3 pb-2 border-b border-white/5">
          <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto">
            {/* Search Input Bar (Matches exact Google Messages look) */}
            <div className="flex-1 flex items-center gap-3 bg-[#1E1F20] hover:bg-[#28292A] transition-colors rounded-full px-4 py-2.5 shadow-inner border border-white/5">
              <Search className="w-5 h-5 text-[#8E918F] shrink-0" />
              <input
                id="input-search-google-messages"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={translateInline(
                  lang,
                  'Search in Google Messages...',
                  'البحث في رسائل Google...'
                )}
                className="bg-transparent border-none outline-none text-sm text-[#E3E3E3] placeholder-[#8E918F] w-full"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-[#C4C7C5] hover:text-white px-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Profile Avatar / DroidGuard Security Badge */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={onOpenSmsConfig}
                title={translateInline(lang, 'DroidGuard Security Settings', 'إعدادات أمان DroidGuard')}
                className="w-10 h-10 rounded-full bg-[#2B2C2E] border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-md hover:scale-105 transition-transform"
              >
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#131314]" />
              </button>
            </div>
          </div>

          {/* Top Title Banner matching Screenshot */}
          <div className="flex items-center justify-between max-w-2xl mx-auto mt-2 px-1">
            <h1 className="text-xl font-medium tracking-tight text-white flex items-center gap-2">
              <span>{translateInline(lang, 'Google Messages', 'رسائل Google')}</span>
              {isDefaultSms ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  {translateInline(lang, 'DEFAULT SMS APP', 'التطبيق الافتراضي للهاتف')}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    await requestSetDefaultSmsApp();
                    const state = await checkIsDefaultSmsApp();
                    setIsDefaultSms(state);
                  }}
                  className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 transition cursor-pointer font-medium"
                >
                  {translateInline(lang, 'Set as Default App', 'تعيين كتطبيق الهاتف الأساسي')}
                </button>
              )}
            </h1>
            <div className="flex items-center gap-2 text-xs text-[#8E918F]">
              <button
                type="button"
                onClick={loadMessages}
                className="p-1.5 rounded-full hover:bg-white/10 transition text-[#C4C7C5]"
                title="تحديث الرسائل"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <span>{filteredMessages.length} {translateInline(lang, 'conversations', 'محادثة')}</span>
            </div>
          </div>
        </header>
      ) : (
        /* Single Conversation Header */
        <header className="sticky top-0 z-30 bg-[#1E1F20] px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedConversation(null)}
              className="p-2 rounded-full hover:bg-white/10 transition text-white"
            >
              <ArrowRight className={`w-5 h-5 ${lang === 'ar' ? 'rotate-0' : 'rotate-180'}`} />
            </button>
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColor(
                selectedConversation
              )}`}
            >
              {getAvatarLetter(selectedConversation) || <User className="w-4 h-4 text-white" />}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white leading-tight">
                {selectedConversation}
              </h2>
              <p className="text-[11px] text-emerald-400 font-medium">
                {translateInline(lang, 'SMS / MMS Encrypted', 'رسالة نصية SMS / مشفرة')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <a
              href={`tel:${selectedConversation}`}
              className="p-2 rounded-full hover:bg-white/10 text-white transition"
              title="اتصال"
            >
              <Phone className="w-4 h-4" />
            </a>
          </div>
        </header>
      )}

      {/* 2. Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-2 sm:px-4 py-2">
        {!selectedConversation ? (
          /* List of Conversations */
          <div className="divide-y divide-white/5 space-y-0.5">
            {filteredMessages.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center text-[#8E918F]">
                <MessageSquare className="w-12 h-12 mb-3 text-white/20" />
                <p className="text-sm font-medium">
                  {translateInline(lang, 'No messages found', 'لا توجد رسائل')}
                </p>
                <p className="text-xs text-[#8E918F] mt-1">
                  {translateInline(
                    lang,
                    'Incoming and emergency SMS will appear here automatically',
                    'الرسائل النصية الواردة وحالات الطوارئ ستظهر هنا تلقائياً'
                  )}
                </p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isTheftAlert = msg.body.includes('DroidGuard') || msg.body.includes('إنذار');
                const avatarLetter = getAvatarLetter(msg.sender);
                const avatarColor = getAvatarColor(msg.sender);

                return (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedConversation(msg.sender)}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl hover:bg-[#1E1F20] transition-colors cursor-pointer group"
                  >
                    {/* Left: Contact Avatar */}
                    <div className="relative shrink-0">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shadow-md ${avatarColor}`}
                      >
                        {avatarLetter ? (
                          <span>{avatarLetter}</span>
                        ) : (
                          <User className="w-6 h-6 text-white" />
                        )}
                      </div>
                      {!msg.read && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#A8C7FA] border-2 border-[#131314]" />
                      )}
                    </div>

                    {/* Middle: Sender + Message Snippet */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          className={`text-sm truncate font-medium ${
                            !msg.read ? 'text-white font-bold' : 'text-[#E3E3E3]'
                          }`}
                        >
                          {msg.sender}
                        </h3>
                        <span className="text-[11px] text-[#8E918F] shrink-0 font-sans">
                          {formatGoogleTimestamp(msg.timestamp, lang)}
                        </span>
                      </div>

                      <p
                        className={`text-xs truncate mt-0.5 leading-relaxed ${
                          !msg.read ? 'text-[#C4C7C5] font-semibold' : 'text-[#8E918F]'
                        }`}
                      >
                        {msg.type === 'sent' && (
                          <span className="text-cyan-400 mr-1 ml-1 font-medium">
                            {translateInline(lang, 'You: ', 'أنت: ')}
                          </span>
                        )}
                        {msg.body}
                      </p>

                      {isTheftAlert && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30">
                          <AlertCircle className="w-3 h-3" />
                          {translateInline(lang, 'DroidGuard Anti-Theft Alert', 'إنذار حماية DroidGuard')}
                        </span>
                      )}
                    </div>

                    {/* Quick Delete Option on Hover */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteMessage(msg.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 transition"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Active Chat Thread */
          <div className="flex flex-col h-full min-h-[70vh] justify-between">
            {/* Conversation Messages */}
            <div className="space-y-3 py-4">
              <div className="text-center my-3">
                <span className="text-[11px] bg-[#1E1F20] text-[#8E918F] px-3 py-1 rounded-full border border-white/5">
                  {translateInline(lang, 'Encrypted SMS Conversation', 'محادثة SMS مشفرة')}
                </span>
              </div>

              {activeConversationMessages.map((msg) => {
                const isSentByMe = msg.type === 'sent';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isSentByMe ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isSentByMe
                          ? 'bg-[#004A77] text-[#D3E3FD] rounded-br-xs'
                          : 'bg-[#2A2B2D] text-[#E3E3E3] rounded-bl-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap select-text">{msg.body}</p>
                      <div
                        className={`flex items-center gap-1 mt-1 text-[10px] text-right ${
                          isSentByMe ? 'text-[#A8C7FA]' : 'text-[#8E918F]'
                        }`}
                      >
                        <span>{formatGoogleTimestamp(msg.timestamp, lang)}</span>
                        {isSentByMe && <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Chat Input Bar */}
            <div className="sticky bottom-20 pt-2 pb-1 bg-[#131314]/90 backdrop-blur-md">
              <div className="flex items-center gap-2 bg-[#1E1F20] rounded-full px-4 py-2 border border-white/10 shadow-lg">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                  placeholder={translateInline(
                    lang,
                    `Text message to ${selectedConversation}...`,
                    `إرسال رسالة نصية إلى ${selectedConversation}...`
                  )}
                  className="bg-transparent border-none outline-none text-sm text-[#E3E3E3] placeholder-[#8E918F] flex-1"
                />
                <button
                  type="button"
                  disabled={!replyText.trim() || isSending}
                  onClick={handleSendReply}
                  className={`p-2 rounded-full transition ${
                    replyText.trim() && !isSending
                      ? 'bg-[#A8C7FA] text-[#003355] shadow hover:scale-105 cursor-pointer'
                      : 'bg-white/10 text-white/30 cursor-not-allowed'
                  }`}
                >
                  <Send className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : 'rotate-0'}`} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. Floating Action Button: "بدء محادثة" / "Start Chat" (Matches Google Messages Pill) */}
      {!selectedConversation && (
        <div className="fixed bottom-24 left-4 sm:left-8 z-30" dir="ltr">
          <button
            id="btn-start-google-chat"
            type="button"
            onClick={() => setShowNewChatModal(true)}
            className="flex items-center gap-2.5 px-5 py-3.5 rounded-full bg-[#A8C7FA] hover:bg-[#8AB4F8] text-[#041E49] font-medium text-sm shadow-2xl shadow-blue-950/80 transition-all transform hover:scale-105 cursor-pointer"
          >
            <MessageSquare className="w-5 h-5 fill-[#041E49]" />
            <span className="font-semibold font-sans tracking-wide">
              {translateInline(lang, 'Start chat', 'بدء محادثة')}
            </span>
          </button>
        </div>
      )}

      {/* 4. New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E1F20] border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                <span>{translateInline(lang, 'Start New SMS Conversation', 'بدء محادثة SMS جديدة')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs text-[#8E918F] block mb-1">
                {translateInline(lang, 'Recipient Phone Number', 'رقم هاتف المستلم')}
              </label>
              <input
                type="tel"
                value={newChatNumber}
                onChange={(e) => setNewChatNumber(e.target.value)}
                placeholder="0550 00 00 00"
                className="w-full bg-[#131314] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-[#8E918F] block mb-1">
                {translateInline(lang, 'Message', 'نص الرسالة')}
              </label>
              <textarea
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
                rows={3}
                placeholder={translateInline(lang, 'Type SMS content...', 'اكتب نص الرسالة...')}
                className="w-full bg-[#131314] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-[#C4C7C5] hover:bg-white/5 transition"
              >
                {translateInline(lang, 'Cancel', 'إلغاء')}
              </button>
              <button
                type="button"
                disabled={!newChatNumber.trim() || !newChatMessage.trim() || isSending}
                onClick={handleStartNewChat}
                className="px-5 py-2.5 rounded-xl bg-[#A8C7FA] hover:bg-[#8AB4F8] text-[#041E49] text-xs font-bold transition shadow-lg disabled:opacity-50"
              >
                {isSending
                  ? translateInline(lang, 'Sending...', 'جاري الإرسال...')
                  : translateInline(lang, 'Send SMS', 'إرسال الرسالة')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
