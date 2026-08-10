/* =========================================================
   mi.net messenger — app.js
   Segment 1: Icon system
   ========================================================= */
const icons = {
  message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  hash: '<path d="M4 9h16M3 15h16M10 3 8 21M16 3l-2 18"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.6v-.1A1.7 1.7 0 0 0 8 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 3.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2V9.6h.1A1.7 1.7 0 0 0 3.6 8a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8 3.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2h4v.1A1.7 1.7 0 0 0 15 3.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 8c.2.4.6.8 1 1 .3.2.7.3 1.1.3h.1v4h-.1c-.4 0-.8.1-1.1.4-.4.3-.8.6-1 1.3z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.7 19.7 0 0 1-8.6-3.1 19.2 19.2 0 0 1-6-6A19.7 19.7 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.4 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  paperclip: '<path d="m21.4 11.6-8.5 8.5a6 6 0 1 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 1 1-2.8-2.8l8.5-8.5"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  'user-plus': '<path d="M15 21a7 7 0 0 0-14 0"/><circle cx="8" cy="8" r="4"/><path d="M19 8v6M16 11h6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  'arrow-left': '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  volume: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'
};

function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.more}</svg>`;
}

function hydrateIcons(scope = document) {
  scope.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));
}

/* =========================================================
   Segment 2: Data
   ========================================================= */
const currentUser = {
  id: 'me',
  name: 'Kim Dung',
  handle: '@kimdung',
  initials: 'KD',
  bio: 'Building a quieter corner of the internet.',
  online: true
};

let conversations = [
  {
    id: 'alex',
    kind: 'direct',
    name: 'Alex Morgan',
    handle: '@alex',
    initials: 'AM',
    preview: 'окей, тогда завтра',
    time: '2m',
    unread: 2,
    subtitle: 'online',
    description: 'Designer, developer and internet person.',
    members: null,
    messages: [
      { id: 1, author: 'Alex Morgan', initials: 'AM', time: '17:12', text: 'Ты уже решил, каким будет главный экран mi.net?' },
      { id: 2, author: 'Kim Dung', initials: 'KD', time: '17:15', text: 'Да. Хочу, чтобы человек сразу видел разговоры, а не ленту.' , own: true},
      { id: 3, author: 'Alex Morgan', initials: 'AM', time: '17:17', text: 'Это намного лучше. Тогда паблики тоже ощущаются частью общения, а не отдельной соцсетью.' },
      { id: 4, author: 'Kim Dung', initials: 'KD', time: '17:20', text: 'Именно. Посты могут жить внутри пабликов, но не быть центром продукта.', own: true }
    ]
  },
  {
    id: 'dev',
    kind: 'group',
    name: 'mi.net dev',
    handle: '/mi-dev',
    initials: 'MI',
    preview: 'Nora: обновила дизайн',
    time: '8m',
    unread: 4,
    subtitle: '8 members',
    description: 'Private workspace for the mi.net team.',
    members: 8,
    messages: [
      { id: 1, author: 'Nora Ito', initials: 'NI', time: '16:20', text: 'Обновила сетку. Левая колонка теперь чуть компактнее.' },
      { id: 2, author: 'Leo V.', initials: 'LV', time: '16:23', text: 'На мобильном это тоже работает?' },
      { id: 3, author: 'Nora Ito', initials: 'NI', time: '16:24', text: 'Да, там список и чат переключаются как отдельные экраны.' },
      { id: 4, author: 'Kim Dung', initials: 'KD', time: '16:26', text: 'Супер. Оставим именно так.', own: true }
    ]
  },
  {
    id: 'design',
    kind: 'public',
    mode: 'hybrid',
    name: '/design',
    handle: 'mi.net/design',
    initials: 'D',
    preview: 'новая подборка шрифтов',
    time: '21m',
    unread: 12,
    subtitle: '18.4K members',
    description: 'Design, typography and interfaces.',
    members: 18420,
    joined: true,
    posts: [
      { id: 101, author: '/design', time: '15:50', text: 'Новая подборка нейтральных гротесков для интерфейсов: Geist, Inter, Suisse Int’l, Neue Montreal.', replies: 184, reactions: 824 },
      { id: 102, author: '/design', time: '13:12', text: 'Вопрос дня: что важнее в минималистичном интерфейсе — ритм, типографика или пространство?', replies: 96, reactions: 403 }
    ]
  },
  {
    id: 'music',
    kind: 'public',
    mode: 'community',
    name: '/music',
    handle: 'mi.net/music',
    initials: 'M',
    preview: 'Leo: кто слушал новый альбом?',
    time: '1h',
    unread: 0,
    subtitle: '24.1K members',
    description: 'Albums, artists and discoveries.',
    members: 24100,
    joined: true,
    messages: [
      { id: 1, author: 'Leo V.', initials: 'LV', time: '15:01', text: 'Кто уже слушал новый релиз?' },
      { id: 2, author: 'Mina Sol', initials: 'MS', time: '15:04', text: 'Да. Вторая половина намного сильнее первой.' },
      { id: 3, author: 'Alex Morgan', initials: 'AM', time: '15:08', text: 'Третий трек пока лучший для меня.' }
    ]
  },
  {
    id: 'nora',
    kind: 'direct',
    name: 'Nora Ito',
    handle: '@nora',
    initials: 'NI',
    preview: 'скину макеты вечером',
    time: '2h',
    unread: 0,
    subtitle: 'last seen recently',
    description: 'Interface designer.',
    messages: [
      { id: 1, author: 'Nora Ito', initials: 'NI', time: '14:12', text: 'Я закончу экран паблика сегодня.' },
      { id: 2, author: 'Kim Dung', initials: 'KD', time: '14:15', text: 'Супер. Скинь, когда будет готово.', own: true },
      { id: 3, author: 'Nora Ito', initials: 'NI', time: '14:16', text: 'скину макеты вечером' }
    ]
  }
];

const people = [
  { name: 'Alex Morgan', handle: '@alex', initials: 'AM', status: 'online' },
  { name: 'Nora Ito', handle: '@nora', initials: 'NI', status: 'recently' },
  { name: 'Leo V.', handle: '@leov', initials: 'LV', status: 'online' },
  { name: 'Mina Sol', handle: '@minasol', initials: 'MS', status: 'recently' }
];

const discoverPublics = [
  { name: '/technology', initials: 'T', members: '31.2K', desc: 'Software, hardware and the internet.' },
  { name: '/gaming', initials: 'G', members: '16.9K', desc: 'Games, studios, modding and play.' },
  { name: '/photography', initials: 'P', members: '9.8K', desc: 'Frames, cameras and visual stories.' },
  { name: '/culture', initials: 'C', members: '14.6K', desc: 'Films, books, internet and culture.' }
];

let activeView = 'chats';
let activeConversationId = 'alex';
let activeFilter = 'all';
let searchQuery = '';

/* =========================================================
   Segment 3: Utility helpers
   ========================================================= */
const listContent = document.getElementById('listContent');
const chatPane = document.getElementById('chatPane');
const detailsPane = document.getElementById('detailsPane');

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function avatar(initials, options = {}) {
  const classes = [
    'avatar',
    options.dark ? 'dark' : '',
    options.square ? 'square' : ''
  ].filter(Boolean).join(' ');
  return `<span class="${classes}">${escapeHtml(initials)}</span>`;
}

function showToast(message) {
  const stack = document.getElementById('toastStack');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  stack.appendChild(toast);
  setTimeout(() => toast.remove(), 2300);
}

function setMobileTitle(text) {
  document.getElementById('mobileTitle').textContent = text;
}

function findConversation(id) {
  return conversations.find(item => item.id === id);
}

/* =========================================================
   Segment 4: List pane — chats
   ========================================================= */
function renderChatList() {
  const q = searchQuery.trim().toLowerCase();

  let items = conversations.filter(item => {
    if (activeFilter !== 'all' && item.kind !== activeFilter) return false;
    if (!q) return true;
    return `${item.name} ${item.handle} ${item.preview}`.toLowerCase().includes(q);
  });

  listContent.innerHTML = `
    <div class="list-section-title">Conversations</div>
    ${items.length ? items.map(item => `
      <button class="conversation-row ${item.id === activeConversationId ? 'active' : ''}" data-conversation="${item.id}">
        ${avatar(item.initials, { square: item.kind === 'public' || item.kind === 'group', dark: item.kind === 'public' })}
        <div class="conversation-main">
          <div class="conversation-title">
            <strong>${escapeHtml(item.name)}</strong>
            <span class="type-mark">${item.kind === 'direct' ? '' : item.kind === 'group' ? 'group' : item.mode || 'public'}</span>
          </div>
          <div class="conversation-preview">${escapeHtml(item.preview)}</div>
        </div>
        <div class="conversation-meta">
          <time>${escapeHtml(item.time)}</time>
          ${item.unread ? `<span class="unread-badge">${item.unread}</span>` : ''}
        </div>
      </button>
    `).join('') : `
      <div class="details-empty">No conversations found.</div>
    `}
  `;

  listContent.querySelectorAll('[data-conversation]').forEach(btn => {
    btn.addEventListener('click', () => openConversation(btn.dataset.conversation));
  });
}

/* =========================================================
   Segment 5: List pane — contacts/publics/explore/profile
   ========================================================= */
function renderContacts() {
  listContent.innerHTML = `
    <div class="pane-page">
      <div class="pane-page-header">
        <h2>Contacts</h2>
        <p>People you can reach quickly.</p>
      </div>
      ${people.map(person => `
        <button class="person-row" data-open-person="${person.handle}">
          ${avatar(person.initials)}
          <div class="person-copy">
            <strong>${person.name}</strong>
            <small>${person.handle} · ${person.status}</small>
          </div>
          <span class="icon" data-icon="message"></span>
        </button>
      `).join('')}
    </div>
  `;
  hydrateIcons(listContent);

  listContent.querySelectorAll('[data-open-person]').forEach(btn => {
    btn.addEventListener('click', () => {
      const conv = conversations.find(c => c.handle === btn.dataset.openPerson);
      if (conv) openConversation(conv.id);
      else showToast('New direct message started');
    });
  });
}

function renderPublics() {
  const publics = conversations.filter(c => c.kind === 'public');
  listContent.innerHTML = `
    <div class="pane-page">
      <div class="pane-page-header">
        <h2>Publics</h2>
        <p>Channels and communities you follow.</p>
      </div>
      ${publics.map(pub => `
        <button class="public-row" data-conversation="${pub.id}">
          ${avatar(pub.initials, { square: true, dark: true })}
          <div class="public-copy">
            <strong>${pub.name}</strong>
            <small>${pub.description}</small>
          </div>
          <span class="type-mark">${pub.subtitle}</span>
        </button>
      `).join('')}
    </div>
  `;

  listContent.querySelectorAll('[data-conversation]').forEach(btn => {
    btn.addEventListener('click', () => openConversation(btn.dataset.conversation));
  });
}

function renderExplore() {
  listContent.innerHTML = `
    <div class="pane-page">
      <div class="pane-page-header">
        <h2>Explore</h2>
        <p>Find people and publics worth joining.</p>
      </div>

      <div class="section-label">Categories</div>
      <div class="category-row">
        ${['Technology','Design','Music','Gaming','Culture','Photography'].map(x => `<button class="category-chip">${x}</button>`).join('')}
      </div>

      <div class="section-label">Popular publics</div>
      ${discoverPublics.map(pub => `
        <div class="public-row">
          ${avatar(pub.initials, { square: true, dark: true })}
          <div class="public-copy">
            <strong>${pub.name}</strong>
            <small>${pub.desc}</small>
          </div>
          <button class="follow-btn join-discovered">Join</button>
        </div>
      `).join('')}
    </div>
  `;

  listContent.querySelectorAll('.join-discovered').forEach(btn => {
    btn.addEventListener('click', () => {
      const joined = btn.textContent === 'Joined';
      btn.textContent = joined ? 'Join' : 'Joined';
      if (!joined) showToast('Public added to your list');
    });
  });

  listContent.querySelectorAll('.category-chip').forEach(btn => {
    btn.addEventListener('click', () => showToast(`${btn.textContent} selected`));
  });
}

function renderProfileList() {
  listContent.innerHTML = `
    <div class="pane-page">
      <div class="big-profile">
        ${avatar('KD', { dark: true })}
        <h2>Kim Dung</h2>
        <div class="muted">@kimdung</div>
        <p>Building a quieter corner of the internet.</p>
        <button class="outline-btn" id="editProfileBtn">Edit profile</button>
      </div>

      <div class="profile-links">
        <button class="detail-row"><span class="icon" data-icon="user"></span><span>Account</span></button>
        <button class="detail-row"><span class="icon" data-icon="bell"></span><span>Notifications</span></button>
        <button class="detail-row"><span class="icon" data-icon="settings"></span><span>Appearance</span></button>
        <button class="detail-row"><span class="icon" data-icon="info"></span><span>About mi.net</span></button>
      </div>
    </div>
  `;
  hydrateIcons(listContent);
  document.getElementById('editProfileBtn').addEventListener('click', () => showToast('Profile editor would open here'));
}

/* =========================================================
   Segment 6: Conversation rendering
   ========================================================= */
function renderMessage(message) {
  return `
    <article class="message ${message.own ? 'own' : ''}">
      ${avatar(message.initials, { dark: message.own })}
      <div>
        <div class="message-author">
          <strong>${escapeHtml(message.author)}</strong>
          <time>${escapeHtml(message.time)}</time>
        </div>
        <div class="message-body">${escapeHtml(message.text)}</div>
        <div class="message-actions">
          <button class="reaction-btn" data-reaction>♡</button>
          <button class="reaction-btn" data-reaction>+1</button>
          <button class="reaction-btn" data-reply>Reply</button>
        </div>
      </div>
    </article>
  `;
}

function renderChatConversation(conv) {
  const messages = conv.messages || [];
  chatPane.innerHTML = `
    <header class="chat-header">
      ${avatar(conv.initials, { square: conv.kind !== 'direct', dark: conv.kind === 'public' })}
      <div class="chat-heading">
        <strong>${escapeHtml(conv.name)}</strong>
        <span>${escapeHtml(conv.subtitle || conv.handle)}</span>
      </div>
      <div class="chat-header-actions">
        ${conv.kind === 'direct' ? `<button class="icon-btn" aria-label="Call"><span class="icon" data-icon="phone"></span></button>` : ''}
        <button class="icon-btn" aria-label="Search"><span class="icon" data-icon="search"></span></button>
        <button class="icon-btn" id="detailToggle" aria-label="Info"><span class="icon" data-icon="more"></span></button>
      </div>
    </header>

    <section class="messages" id="messagesArea">
      <div class="day-divider">Today</div>
      ${messages.map(renderMessage).join('')}
    </section>

    <footer class="composer">
      <button class="icon-btn" aria-label="Attach"><span class="icon" data-icon="paperclip"></span></button>
      <textarea id="messageInput" rows="1" placeholder="Message ${escapeHtml(conv.name)}"></textarea>
      <button class="send-btn" id="sendMessageBtn" aria-label="Send"><span class="icon" data-icon="send"></span></button>
    </footer>
  `;

  hydrateIcons(chatPane);
  bindConversationActions(conv);
}

function renderPublicConversation(conv) {
  chatPane.innerHTML = `
    <header class="chat-header">
      ${avatar(conv.initials, { square: true, dark: true })}
      <div class="chat-heading">
        <strong>${escapeHtml(conv.name)}</strong>
        <span>${escapeHtml(conv.subtitle)}</span>
      </div>
      <div class="chat-header-actions">
        <button class="icon-btn" aria-label="Search"><span class="icon" data-icon="search"></span></button>
        <button class="icon-btn" id="detailToggle" aria-label="Info"><span class="icon" data-icon="more"></span></button>
      </div>
    </header>

    <section class="messages">
      <div class="day-divider">${conv.mode === 'hybrid' ? 'Hybrid public' : 'Public'}</div>

      ${(conv.posts || []).map(post => `
        <article class="public-post">
          <div class="public-post-header">
            ${avatar(conv.initials, { square: true, dark: true })}
            <strong>${escapeHtml(post.author)}</strong>
            <time>${escapeHtml(post.time)}</time>
          </div>
          <div class="public-post-body">${escapeHtml(post.text)}</div>
          <div class="public-post-footer">
            <button class="metric-btn" data-public-like>♡ ${post.reactions}</button>
            <button class="metric-btn" data-discuss>${post.replies} replies</button>
            <button class="metric-btn">Share</button>
          </div>
        </article>
      `).join('')}
    </section>

    <footer class="composer">
      <button class="icon-btn" aria-label="Attach"><span class="icon" data-icon="paperclip"></span></button>
      <textarea id="messageInput" rows="1" placeholder="${conv.mode === 'hybrid' ? 'Write to the discussion…' : 'Message ' + escapeHtml(conv.name)}"></textarea>
      <button class="send-btn" id="sendMessageBtn" aria-label="Send"><span class="icon" data-icon="send"></span></button>
    </footer>
  `;

  hydrateIcons(chatPane);

  document.querySelectorAll('[data-public-like]').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      showToast('Reaction updated');
    });
  });

  document.querySelectorAll('[data-discuss]').forEach(btn => {
    btn.addEventListener('click', () => showToast('Discussion thread would open here'));
  });

  const input = document.getElementById('messageInput');
  document.getElementById('sendMessageBtn').addEventListener('click', () => {
    if (!input.value.trim()) return;
    showToast('Message added to discussion');
    input.value = '';
  });
}

function bindConversationActions(conv) {
  const input = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendMessageBtn');

  function send() {
    const text = input.value.trim();
    if (!text) return;

    conv.messages.push({
      id: Date.now(),
      author: currentUser.name,
      initials: currentUser.initials,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      text,
      own: true
    });

    conv.preview = text;
    conv.time = 'now';
    input.value = '';
    renderChatConversation(conv);
    renderChatList();
    scrollMessagesToBottom();
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  document.querySelectorAll('[data-reaction]').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('active'));
  });

  document.querySelectorAll('[data-reply]').forEach(btn => {
    btn.addEventListener('click', () => {
      input.focus();
      showToast('Reply mode enabled');
    });
  });
}

function scrollMessagesToBottom() {
  const area = document.getElementById('messagesArea');
  if (area) area.scrollTop = area.scrollHeight;
}

/* =========================================================
   Segment 7: Details pane
   ========================================================= */
function renderDetails(conv) {
  if (!conv) {
    detailsPane.innerHTML = `<div class="details-empty">Conversation info will appear here.</div>`;
    return;
  }

  detailsPane.innerHTML = `
    <section class="details-card">
      ${avatar(conv.initials, { square: conv.kind !== 'direct', dark: conv.kind === 'public' })}
      <h2>${escapeHtml(conv.name)}</h2>
      <div class="handle">${escapeHtml(conv.handle || '')}</div>
      <p>${escapeHtml(conv.description || '')}</p>

      <div class="details-actions">
        ${conv.kind === 'public'
          ? `<button class="follow-btn" id="joinPublicBtn">${conv.joined ? 'Joined' : 'Join'}</button>`
          : `<button class="outline-btn">Message</button>`
        }
      </div>
    </section>

    <div class="detail-list">
      ${conv.kind !== 'direct' ? `<button class="detail-row"><span class="icon" data-icon="users"></span><span>Members</span><small>${conv.subtitle}</small></button>` : ''}
      <button class="detail-row"><span class="icon" data-icon="image"></span><span>Media</span><small>24</small></button>
      <button class="detail-row"><span class="icon" data-icon="link"></span><span>Links</span><small>12</small></button>
      <button class="detail-row"><span class="icon" data-icon="file"></span><span>Files</span><small>7</small></button>
      <button class="detail-row"><span class="icon" data-icon="bell"></span><span>Notifications</span><small>On</small></button>
      <button class="detail-row"><span class="icon" data-icon="search"></span><span>Search</span></button>
    </div>
  `;

  hydrateIcons(detailsPane);

  const joinBtn = document.getElementById('joinPublicBtn');
  if (joinBtn) {
    joinBtn.addEventListener('click', () => {
      conv.joined = !conv.joined;
      joinBtn.textContent = conv.joined ? 'Joined' : 'Join';
      showToast(conv.joined ? 'Joined public' : 'Left public');
    });
  }
}

/* =========================================================
   Segment 8: Open/navigate
   ========================================================= */
function openConversation(id) {
  const conv = findConversation(id);
  if (!conv) return;

  activeConversationId = id;
  conv.unread = 0;

  if (conv.kind === 'public' && conv.mode === 'hybrid') {
    renderPublicConversation(conv);
  } else {
    renderChatConversation(conv);
  }

  renderDetails(conv);
  renderChatList();

  document.body.classList.add('chat-open');
  setMobileTitle(conv.name);
  hydrateIcons();
  setTimeout(scrollMessagesToBottom, 0);
}

function navigate(view) {
  activeView = view;

  document.querySelectorAll('.rail-btn[data-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  document.getElementById('filterTabs').style.display = view === 'chats' ? 'flex' : 'none';
  document.getElementById('searchRow').style.display = 'block';

  if (view === 'chats') renderChatList();
  if (view === 'contacts') renderContacts();
  if (view === 'publics') renderPublics();
  if (view === 'explore') renderExplore();
  if (view === 'profile') renderProfileList();

  setMobileTitle(view === 'profile' ? 'Profile' : view.charAt(0).toUpperCase() + view.slice(1));
}

/* =========================================================
   Segment 9: Create public
   ========================================================= */
function openPublicModal() {
  document.getElementById('publicModal').hidden = false;
  document.getElementById('publicName').focus();
}

function closePublicModal() {
  document.getElementById('publicModal').hidden = true;
}

function createPublic() {
  const name = document.getElementById('publicName').value.trim();
  const addressRaw = document.getElementById('publicAddress').value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
  const description = document.getElementById('publicDescription').value.trim();
  const mode = document.querySelector('input[name="publicMode"]:checked').value;

  if (!name || !addressRaw) {
    showToast('Add a name and address');
    return;
  }

  const id = `pub-${Date.now()}`;
  conversations.unshift({
    id,
    kind: 'public',
    mode,
    name: `/${addressRaw}`,
    handle: `mi.net/${addressRaw}`,
    initials: name.slice(0, 2).toUpperCase(),
    preview: 'Public created',
    time: 'now',
    unread: 0,
    subtitle: '1 member',
    description: description || name,
    members: 1,
    joined: true,
    posts: mode === 'hybrid' ? [{
      id: Date.now(),
      author: `/${addressRaw}`,
      time: 'now',
      text: `Welcome to ${name}.`,
      replies: 0,
      reactions: 0
    }] : [],
    messages: mode === 'hybrid' ? undefined : [{
      id: Date.now(),
      author: currentUser.name,
      initials: currentUser.initials,
      time: 'now',
      text: `Welcome to ${name}.`,
      own: true
    }]
  });

  closePublicModal();
  navigate('chats');
  openConversation(id);
  showToast('Public created');
}

/* =========================================================
   Segment 10: Global events
   ========================================================= */
document.querySelectorAll('[data-view]').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.view));
});

document.querySelectorAll('[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(x => x.classList.toggle('active', x === btn));
    renderChatList();
  });
});

document.getElementById('globalSearch').addEventListener('input', e => {
  searchQuery = e.target.value;
  if (activeView === 'chats') renderChatList();
});

const createPopover = document.getElementById('createPopover');

function toggleCreateMenu(anchor) {
  const rect = anchor.getBoundingClientRect();
  createPopover.hidden = !createPopover.hidden;
  if (!createPopover.hidden) {
    createPopover.style.top = `${rect.bottom + 6}px`;
    createPopover.style.left = `${Math.max(10, rect.right - 190)}px`;
  }
}

document.getElementById('createMenuBtn').addEventListener('click', e => {
  e.stopPropagation();
  toggleCreateMenu(e.currentTarget);
});

document.getElementById('mobileCreateBtn').addEventListener('click', e => {
  e.stopPropagation();
  toggleCreateMenu(e.currentTarget);
});

document.addEventListener('click', e => {
  if (!e.target.closest('#createPopover') && !e.target.closest('#createMenuBtn') && !e.target.closest('#mobileCreateBtn')) {
    createPopover.hidden = true;
  }
});

createPopover.querySelectorAll('[data-create]').forEach(btn => {
  btn.addEventListener('click', () => {
    createPopover.hidden = true;
    if (btn.dataset.create === 'public') openPublicModal();
    if (btn.dataset.create === 'group') showToast('Group creator would open here');
    if (btn.dataset.create === 'direct') {
      navigate('contacts');
      showToast('Choose a contact');
    }
  });
});

document.querySelector('.modal-close').addEventListener('click', closePublicModal);
document.getElementById('publicModal').addEventListener('click', e => {
  if (e.target.id === 'publicModal') closePublicModal();
});
document.getElementById('createPublicSubmit').addEventListener('click', createPublic);

document.getElementById('settingsBtn').addEventListener('click', () => showToast('Settings would open here'));

document.getElementById('mobileBackBtn').addEventListener('click', () => {
  document.body.classList.remove('chat-open');
  setMobileTitle(activeView === 'chats' ? 'Chats' : activeView);
});

document.getElementById('searchToggle').addEventListener('click', () => {
  document.getElementById('globalSearch').focus();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    createPopover.hidden = true;
    closePublicModal();
  }
});

/* =========================================================
   Segment 11: Boot
   ========================================================= */
hydrateIcons();
navigate('chats');
openConversation(activeConversationId);
