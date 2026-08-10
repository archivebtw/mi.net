// SVG icon registry and formatting helpers
const I={
message:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>',
users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
hash:'<path d="M4 9h16M3 15h16M10 3 8 21M16 3l-2 18"/>',
compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5z"/>',
settings:'<circle cx="12" cy="12" r="3"/><path d="M4 12a8 8 0 0 1 .2-1.8l-2-1.5 2-3.4 2.4 1A8 8 0 0 1 9.5 4L10 1.5h4l.5 2.5a8 8 0 0 1 2.9 1.3l2.4-1 2 3.4-2 1.5A8 8 0 0 1 20 12a8 8 0 0 1-.2 1.8l2 1.5-2 3.4-2.4-1a8 8 0 0 1-2.9 1.3L14 21.5h-4L9.5 19a8 8 0 0 1-2.9-1.3l-2.4 1-2-3.4 2-1.5A8 8 0 0 1 4 12z"/>',
search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',plus:'<path d="M12 5v14M5 12h14"/>',
phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.7 19.7 0 0 1-8.6-3.1 19.2 19.2 0 0 1-6-6A19.7 19.7 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.4 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/>',
more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
paperclip:'<path d="m21.4 11.6-8.5 8.5a6 6 0 1 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 1 1-2.8-2.8l8.5-8.5"/>',
send:'<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/>',
link:'<path d="M10 13a5 5 0 0 0 7 .1l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7-.1l-2 2a5 5 0 0 0 7 7l1-1"/>',
file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
'user-plus':'<path d="M15 21a7 7 0 0 0-14 0"/><circle cx="8" cy="8" r="4"/><path d="M19 8v6M16 11h6"/>',
x:'<path d="M6 6l12 12M18 6 6 18"/>','arrow-left':'<path d="M19 12H5M12 19l-7-7 7-7"/>',
mic:'<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8"/>',
volume:'<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>',
trash:'<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
pin:'<path d="m12 17-5 5M15 4l5 5-4 1-4.5 4.5L10 19l-5-5 4.5-1.5L14 8z"/>',
copy:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
forward:'<path d="m15 7 5 5-5 5"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/>',
check:'<path d="m5 12 4 4L19 6"/>',
check2:'<path d="m1 12 4 4L15 6"/><path d="m9 12 4 4L23 6"/>',
archive:'<path d="M3 6h18M5 6v14h14V6M9 10h6"/>',
user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
video:'<rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 4-2v8l-4-2z"/>',
external:'<path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>'

};
const svg=n=>`<svg viewBox="0 0 24 24">${I[n]||I.more}</svg>`;
function icons(root=document){root.querySelectorAll('[data-icon]').forEach(x=>x.innerHTML=svg(x.dataset.icon))}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const formatSize=n=>n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(1)+' MB';
