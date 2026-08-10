/* =========================================================
   mi.net — app.js
   Segment 1: SVG icon system
   ========================================================= */
const icons = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-7h6v7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>',
  'bar-chart': '<path d="M4 20V10M10 20V4M16 20v-7M22 20V8"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8z"/>',
  message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>',
  repeat: '<path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 23-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  check: '<path d="m5 12 4 4L19 6"/>'
};

function svgIcon(name) {
  const body = icons[name] || icons.more;
  return `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

function hydrateIcons(scope = document) {
  scope.querySelectorAll('[data-icon]').forEach(el => {
    el.innerHTML = svgIcon(el.dataset.icon);
  });
}

/* =========================================================
   Segment 2: Mock data
   ========================================================= */
const currentUser = {
  name: 'Kim Dung',
  handle: '@kimdung',
  initials: 'KD',
  bio: 'Building a quieter corner of the internet.',
  location: 'Internet',
  link: 'mi.net/kimdung',
  joined: 'Joined August 2026',
  following: 183,
  followers: 1240
};

let posts = [
  {
    id: 1,
    initials: 'AM',
    name: 'Alex Morgan',
    handle: '@alex',
    time: '12m',
    text: 'Building small things on the internet feels fun again.',
    replies: 18,
    reposts: 24,
    likes: 128,
    liked: false,
    bookmarked: false
  },
  {
    id: 2,
    initials: 'NI',
    name: 'Nora Ito',
    handle: '@nora',
    time: '34m',
    text: 'Minimal interfaces are not about removing everything. They are about making every remaining element earn its place.\n\n#minimalism #design',
    replies: 9,
    reposts: 31,
    likes: 216,
    liked: true,
    bookmarked: false
  },
  {
    id: 3,
    initials: 'LV',
    name: 'Leo V.',
    handle: '@leov',
    time: '1h',
    text: 'Made a monochrome visual study today. The web needs more weird personal experiments.',
    replies: 27,
    reposts: 46,
    likes: 302,
    liked: false,
    bookmarked: true,
    media: true
  },
  {
    id: 4,
    initials: 'MS',
    name: 'Mina Sol',
    handle: '@minasol',
    time: '2h',
    text: 'What if a social network felt less like a marketplace and more like a room full of interesting people?',
    replies: 42,
    reposts: 57,
    likes: 418,
    liked: false,
    bookmarked: false
  }
];

const communities = [
  { name: '/design', desc: 'Design, typography and interfaces.', members: '18.4k' },
  { name: '/technology', desc: 'Software, hardware and the internet.', members: '31.2k' },
  { name: '/music', desc: 'Albums, artists and discoveries.', members: '24.1k' },
  { name: '/random', desc: 'Anything worth talking about.', members: '12.7k' },
  { name: '/gaming', desc: 'Games, studios, modding and play.', members: '16.9k' },
  { name: '/photography', desc: 'Frames, cameras and visual stories.', members: '9.8k' }
];

const notifications = [
  { icon: 'user', text: '<strong>Nora Ito</strong> followed you.', time: '4m', unread: true },
  { icon: 'heart', text: '<strong>Alex Morgan</strong> liked your post about independent social spaces.', time: '18m', unread: true },
  { icon: 'message', text: '<strong>Leo V.</strong> replied: “That is exactly the kind of thing I want to see.”', time: '44m', unread: true },
  { icon: 'repeat', text: '<strong>Mina Sol</strong> reposted your post.', time: '2h', unread: false },
  { icon: 'users', text: 'Your post is trending in <strong>/design</strong>.', time: '6h', unread: false }
];

const conversations = [
  { name: 'Alex Morgan', handle: '@alex', initials: 'AM', time: '12m', snippet: 'The homepage looks much cleaner now.' },
  { name: 'Nora Ito', handle: '@nora', initials: 'NI', time: '1h', snippet: 'Send me the type scale when you can.' },
  { name: 'Leo V.', handle: '@leov', initials: 'LV', time: '3h', snippet: 'This is wonderfully weird.' }
];

/* =========================================================
   Segment 3: Shared render helpers
   ========================================================= */
const content = document.getElementById('content');
let activeView = 'home';
let homeFeedMode = 'for-you';
let searchTerm = '';

function avatar(initials, dark = false, large = false) {
  return `<span class="avatar ${dark ? 'avatar-dark' : ''} ${large ? 'avatar-lg' : ''}">${initials}</span>`;
}

function postTemplate(post) {
  return `
    <article class="post" data-post-id="${post.id}">
      ${avatar(post.initials)}
      <div class="post-main">
        <div class="post-meta">
          <strong>${post.name}</strong>
          <span>${post.handle}</span>
          <span>· ${post.time}</span>
        </div>
        <div class="post-body">${escapeHtml(post.text)}</div>
        ${post.media ? '<div class="post-media" aria-label="Monochrome visual study placeholder"></div>' : ''}
        <div class="post-actions">
          <button class="action-btn" data-action="reply" aria-label="Reply">
            <span class="icon" data-icon="message"></span><span>${post.replies}</span>
          </button>
          <button class="action-btn" data-action="repost" aria-label="Repost">
            <span class="icon" data-icon="repeat"></span><span>${post.reposts}</span>
          </button>
          <button class="action-btn ${post.liked ? 'active' : ''}" data-action="like" aria-label="Like">
            <span class="icon" data-icon="heart"></span><span>${post.likes}</span>
          </button>
          <button class="action-btn ${post.bookmarked ? 'active' : ''}" data-action="bookmark" aria-label="Bookmark">
            <span class="icon" data-icon="bookmark"></span><span></span>
          </button>
          <button class="action-btn" data-action="share" aria-label="Share">
            <span class="icon" data-icon="share"></span><span></span>
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderPosts(list) {
  if (!list.length) {
    return `
      <div class="empty-state">
        <div class="empty-icon"><span class="icon" data-icon="search"></span></div>
        <strong>Nothing here yet</strong>
        <span>Try another search or start a new conversation.</span>
      </div>
    `;
  }
  return list.map(postTemplate).join('');
}

function pageHeader(title) {
  return `<header class="page-header"><h1>${title}</h1></header>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/* =========================================================
   Segment 4: Home
   ========================================================= */
function renderHome() {
  const visiblePosts = homeFeedMode === 'following'
    ? posts.filter(p => ['@alex', '@nora'].includes(p.handle) || p.handle === currentUser.handle)
    : posts;

  content.innerHTML = `
    ${pageHeader('Home')}
    <div class="feed-tabs">
      <button class="tab-btn ${homeFeedMode === 'for-you' ? 'active' : ''}" data-feed="for-you">For you</button>
      <button class="tab-btn ${homeFeedMode === 'following' ? 'active' : ''}" data-feed="following">Following</button>
    </div>

    <section class="composer">
      <div class="composer-top">
        ${avatar(currentUser.initials, true)}
        <textarea id="composerText" maxlength="400" placeholder="What's on your mind?"></textarea>
      </div>
      <div class="composer-bottom">
        <div class="tool-group">
          <button class="tool-btn" aria-label="Add image"><span class="icon" data-icon="image"></span></button>
          <button class="tool-btn" aria-label="Add link"><span class="icon" data-icon="link"></span></button>
          <button class="tool-btn" aria-label="Add poll"><span class="icon" data-icon="bar-chart"></span></button>
        </div>
        <div class="composer-actions">
          <span class="char-count"><span id="composerCharCount">0</span>/400</span>
          <button class="compact-primary" id="composerPostBtn" disabled>Post</button>
        </div>
      </div>
    </section>

    <section id="feed">${renderPosts(visiblePosts)}</section>
  `;

  hydrateIcons(content);

  const textarea = document.getElementById('composerText');
  const count = document.getElementById('composerCharCount');
  const postBtn = document.getElementById('composerPostBtn');

  textarea.addEventListener('input', () => {
    count.textContent = textarea.value.length;
    postBtn.disabled = !textarea.value.trim();
  });

  postBtn.addEventListener('click', () => createPost(textarea.value));

  content.querySelectorAll('[data-feed]').forEach(btn => {
    btn.addEventListener('click', () => {
      homeFeedMode = btn.dataset.feed;
      renderHome();
    });
  });
}

/* =========================================================
   Segment 5: Explore
   ========================================================= */
function renderExplore() {
  const q = searchTerm.trim().toLowerCase();
  const filteredPosts = q
    ? posts.filter(p => (`${p.name} ${p.handle} ${p.text}`).toLowerCase().includes(q))
    : posts.slice(0, 3);

  content.innerHTML = `
    ${pageHeader('Explore')}
    <div class="explore-search">
      <label class="search-box">
        <span class="icon" data-icon="search"></span>
        <input id="exploreSearch" value="${escapeHtml(searchTerm)}" placeholder="Search people, posts or communities" />
      </label>
    </div>
    <div class="category-tabs">
      ${['Trending','Technology','Art','Music','Gaming','Culture'].map((c, i) =>
        `<button class="tab-btn ${i===0 ? 'active' : ''}" data-category="${c}">${c}</button>`
      ).join('')}
    </div>

    <section class="section">
      <h2>${q ? `Results for “${escapeHtml(searchTerm)}”` : 'Trending now'}</h2>
      <div class="card-grid">
        <div class="simple-card"><strong>#indieweb</strong><p>Small sites, personal publishing and an internet you can shape.</p><footer><span>1.8k posts</span><span>↗</span></footer></div>
        <div class="simple-card"><strong>#minimalism</strong><p>Interfaces, objects and systems with less noise.</p><footer><span>924 posts</span><span>↗</span></footer></div>
        <div class="simple-card"><strong>#buildinpublic</strong><p>Shipping ideas, sharing progress and learning in the open.</p><footer><span>712 posts</span><span>↗</span></footer></div>
        <div class="simple-card"><strong>#internetculture</strong><p>Memes, archives, communities and weird corners of the web.</p><footer><span>603 posts</span><span>↗</span></footer></div>
      </div>
    </section>

    <section>${renderPosts(filteredPosts)}</section>
  `;

  hydrateIcons(content);

  const input = document.getElementById('exploreSearch');
  input.addEventListener('input', e => {
    searchTerm = e.target.value;
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') renderExplore();
  });

  content.querySelectorAll('[data-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      content.querySelectorAll('[data-category]').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      showToast(`${btn.dataset.category} selected`);
    });
  });
}

/* =========================================================
   Segment 6: Communities
   ========================================================= */
function renderCommunities() {
  content.innerHTML = `
    ${pageHeader('Communities')}
    <section class="section">
      <h2>Find your people</h2>
      <div class="card-grid">
        ${communities.map(c => `
          <div class="simple-card">
            <strong>${c.name}</strong>
            <p>${c.desc}</p>
            <footer>
              <span>${c.members} members</span>
              <button class="follow-btn join-btn">Join</button>
            </footer>
          </div>
        `).join('')}
      </div>
    </section>
    <div class="empty-state">
      <strong>Small communities, focused conversations.</strong>
      <span>Join only the spaces you actually care about.</span>
    </div>
  `;

  hydrateIcons(content);
  bindToggleButtons(content, '.join-btn', 'Join', 'Joined', 'Joined community');
}

/* =========================================================
   Segment 7: Notifications
   ========================================================= */
function renderNotifications() {
  content.innerHTML = `
    ${pageHeader('Notifications')}
    <div>
      ${notifications.map(n => `
        <article class="notification ${n.unread ? 'unread' : ''}">
          <div class="notification-icon"><span class="icon" data-icon="${n.icon}"></span></div>
          <div>
            <p>${n.text}</p>
            <time>${n.time}</time>
          </div>
        </article>
      `).join('')}
    </div>
  `;
  hydrateIcons(content);
}

/* =========================================================
   Segment 8: Messages
   ========================================================= */
function renderMessages(selected = 0) {
  const convo = conversations[selected];

  content.innerHTML = `
    ${pageHeader('Messages')}
    <div class="messages-layout">
      <div class="conversation-list ${selected !== null ? '' : ''}">
        ${conversations.map((c, i) => `
          <button class="conversation ${i === selected ? 'active' : ''}" data-conversation="${i}">
            ${avatar(c.initials)}
            <div class="conversation-copy">
              <div class="conversation-title"><strong>${c.name}</strong><time>${c.time}</time></div>
              <p>${c.snippet}</p>
            </div>
          </button>
        `).join('')}
      </div>
      <section class="chat-panel ${selected !== null ? 'chat-open' : ''}">
        <div class="chat-header">
          ${avatar(convo.initials)}
          <div class="follow-copy"><strong>${convo.name}</strong><small>${convo.handle}</small></div>
        </div>
        <div class="chat-messages" id="chatMessages">
          <div class="message">I like where mi.net is going. It feels calmer.</div>
          <div class="message own">That was the goal — less interface noise, more people.</div>
          <div class="message">${convo.snippet}</div>
        </div>
        <div class="chat-input">
          <input id="chatInput" placeholder="Write a message" />
          <button class="compact-primary" id="sendMessage"><span class="icon" data-icon="send"></span></button>
        </div>
      </section>
    </div>
  `;

  hydrateIcons(content);

  content.querySelectorAll('[data-conversation]').forEach(btn => {
    btn.addEventListener('click', () => renderMessages(Number(btn.dataset.conversation)));
  });

  const input = document.getElementById('chatInput');
  document.getElementById('sendMessage').addEventListener('click', () => {
    if (!input.value.trim()) return;
    document.getElementById('chatMessages').insertAdjacentHTML(
      'beforeend',
      `<div class="message own">${escapeHtml(input.value.trim())}</div>`
    );
    input.value = '';
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('sendMessage').click();
  });
}

/* =========================================================
   Segment 9: Bookmarks
   ========================================================= */
function renderBookmarks() {
  const saved = posts.filter(p => p.bookmarked);
  content.innerHTML = `
    ${pageHeader('Bookmarks')}
    <section>${renderPosts(saved)}</section>
  `;
  hydrateIcons(content);
}

/* =========================================================
   Segment 10: Profile
   ========================================================= */
function renderProfile() {
  const ownPosts = posts.filter(p => p.handle === currentUser.handle);
  const profileFeed = ownPosts.length ? ownPosts : [posts[1], posts[3]];

  content.innerHTML = `
    ${pageHeader('Profile')}
    <section class="profile-cover"></section>
    <section class="profile-info">
      <div class="profile-topline">
        ${avatar(currentUser.initials, true, true)}
        <button class="outline-btn" id="editProfileBtn">Edit profile</button>
      </div>
      <h2>${currentUser.name}</h2>
      <div class="profile-handle">${currentUser.handle}</div>
      <p class="profile-bio">${currentUser.bio}</p>
      <div class="profile-meta">
        <span>${currentUser.location}</span>
        <span>${currentUser.link}</span>
        <span>${currentUser.joined}</span>
      </div>
      <div class="profile-stats">
        <span><strong>${currentUser.following}</strong> Following</span>
        <span><strong>${currentUser.followers.toLocaleString()}</strong> Followers</span>
      </div>
    </section>
    <div class="profile-tabs">
      <button class="tab-btn active">Posts</button>
      <button class="tab-btn">Replies</button>
      <button class="tab-btn">Media</button>
      <button class="tab-btn">Likes</button>
    </div>
    <section>${renderPosts(profileFeed)}</section>
  `;

  hydrateIcons(content);
  document.getElementById('editProfileBtn').addEventListener('click', () => showToast('Profile editor would open here'));

  content.querySelectorAll('.profile-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      content.querySelectorAll('.profile-tabs .tab-btn').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      showToast(`${btn.textContent} selected`);
    });
  });
}

/* =========================================================
   Segment 11: Main router
   ========================================================= */
const renderers = {
  home: renderHome,
  explore: renderExplore,
  notifications: renderNotifications,
  messages: renderMessages,
  communities: renderCommunities,
  bookmarks: renderBookmarks,
  profile: renderProfile
};

function navigate(view) {
  activeView = renderers[view] ? view : 'home';

  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === activeView);
  });

  renderers[activeView]();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* =========================================================
   Segment 12: Actions and interactivity
   ========================================================= */
function createPost(text) {
  const clean = text.trim();
  if (!clean) return;

  posts.unshift({
    id: Date.now(),
    initials: currentUser.initials,
    name: currentUser.name,
    handle: currentUser.handle,
    time: 'now',
    text: clean,
    replies: 0,
    reposts: 0,
    likes: 0,
    liked: false,
    bookmarked: false
  });

  closePostModal();
  homeFeedMode = 'for-you';
  navigate('home');
  showToast('Post published');
}

function bindToggleButtons(scope, selector, offText, onText, toastText) {
  scope.querySelectorAll(selector).forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const on = btn.classList.toggle('following');
      btn.textContent = on ? onText : offText;
      if (on) showToast(toastText);
    });
  });
}

function showToast(message) {
  const stack = document.getElementById('toastStack');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  stack.appendChild(toast);
  setTimeout(() => toast.remove(), 2400);
}

function openPostModal() {
  const modal = document.getElementById('postModal');
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  const textarea = document.getElementById('modalPostText');
  textarea.focus();
}

function closePostModal() {
  document.getElementById('postModal').hidden = true;
  document.body.style.overflow = '';
  document.getElementById('modalPostText').value = '';
  document.getElementById('modalCharCount').textContent = '0';
}

document.addEventListener('click', e => {
  const nav = e.target.closest('[data-view]');
  if (nav) {
    e.preventDefault();
    navigate(nav.dataset.view);
    return;
  }

  const post = e.target.closest('[data-post-id]');
  const action = e.target.closest('[data-action]');
  if (post && action) {
    const id = Number(post.dataset.postId);
    const item = posts.find(p => p.id === id);
    if (!item) return;

    const kind = action.dataset.action;
    if (kind === 'like') {
      item.liked = !item.liked;
      item.likes += item.liked ? 1 : -1;
      action.classList.toggle('active', item.liked);
      action.querySelector('span:last-child').textContent = item.likes;
    }

    if (kind === 'bookmark') {
      item.bookmarked = !item.bookmarked;
      action.classList.toggle('active', item.bookmarked);
      showToast(item.bookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks');
    }

    if (kind === 'repost') {
      item.reposts += 1;
      action.querySelector('span:last-child').textContent = item.reposts;
      showToast('Reposted');
    }

    if (kind === 'reply') {
      showToast('Reply composer would open here');
    }

    if (kind === 'share') {
      if (navigator.clipboard) navigator.clipboard.writeText(`https://mi.net/post/${item.id}`).catch(() => {});
      showToast('Post link copied');
    }
  }
});

/* =========================================================
   Segment 13: Global controls
   ========================================================= */
document.querySelectorAll('.create-post-open').forEach(btn => {
  btn.addEventListener('click', openPostModal);
});

document.querySelector('.modal-close').addEventListener('click', closePostModal);
document.getElementById('postModal').addEventListener('click', e => {
  if (e.target.id === 'postModal') closePostModal();
});

const modalText = document.getElementById('modalPostText');
modalText.addEventListener('input', () => {
  document.getElementById('modalCharCount').textContent = modalText.value.length;
});

document.getElementById('modalPostBtn').addEventListener('click', () => createPost(modalText.value));

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !document.getElementById('postModal').hidden) closePostModal();
});

document.querySelectorAll('.follow-btn').forEach(btn => {
  if (!btn.classList.contains('join-btn')) {
    btn.addEventListener('click', () => {
      const on = btn.classList.toggle('following');
      btn.textContent = on ? 'Following' : 'Follow';
      if (on) showToast('Following');
    });
  }
});

document.querySelectorAll('[data-search]').forEach(btn => {
  btn.addEventListener('click', () => {
    searchTerm = btn.dataset.search;
    navigate('explore');
  });
});

const globalSearch = document.getElementById('globalSearch');
globalSearch.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    searchTerm = globalSearch.value;
    navigate('explore');
  }
});

/* =========================================================
   Segment 14: Initial boot
   ========================================================= */
hydrateIcons();
navigate('home');
