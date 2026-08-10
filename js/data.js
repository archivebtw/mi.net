// Initial demo state and discovery data
function initialState(){
 return {
  me:{name:'Kim Dung',handle:'@kimdung',initials:'KD',bio:'Building a quieter corner of the internet.'},
  settings:{dark:true,compact:false},
  muted:[],
  conversations:[
   {id:'alex',kind:'direct',name:'Alex Morgan',handle:'@alex',initials:'AM',preview:'окей, тогда завтра',time:'2m',unread:2,subtitle:'online',desc:'Designer, developer and internet person.',messages:[
    {id:'m1',a:'Alex Morgan',i:'AM',t:'17:12',x:'Ты уже решил, каким будет главный экран mi.net?',reactions:0},
    {id:'m2',a:'Kim Dung',i:'KD',t:'17:15',x:'Да. Хочу, чтобы человек сразу видел разговоры, а не ленту.',own:1,reactions:1},
    {id:'m3',a:'Alex Morgan',i:'AM',t:'17:17',x:'Тогда паблики тоже ощущаются частью общения, а не отдельной соцсетью.',reactions:0},
    {id:'m4',a:'Kim Dung',i:'KD',t:'17:20',x:'Именно. Посты живут внутри пабликов, но не являются центром продукта.',own:1,reactions:2}
   ]},
   {id:'dev',kind:'group',name:'mi.net dev',handle:'/mi-dev',initials:'MI',preview:'Nora: обновила дизайн',time:'8m',unread:4,subtitle:'8 members',desc:'Private workspace for the mi.net team.',members:['@alex','@nora','@leov'],messages:[
    {id:'d1',a:'Nora Ito',i:'NI',t:'16:20',x:'Обновила сетку. Левая колонка теперь чуть компактнее.',reactions:2},
    {id:'d2',a:'Leo V.',i:'LV',t:'16:23',x:'На мобильном это тоже работает?',reactions:0},
    {id:'d3',a:'Nora Ito',i:'NI',t:'16:24',x:'Да, там список и чат переключаются как отдельные экраны.',reactions:1}
   ]},
   {id:'design',kind:'public',mode:'hybrid',name:'/design',handle:'mi.net/design',initials:'D',preview:'новая подборка шрифтов',time:'21m',unread:12,subtitle:'18.4K members',desc:'Design, typography and interfaces.',joined:1,owner:false,posts:[
    {id:'p1',t:'15:50',x:'Новая подборка нейтральных гротесков для интерфейсов: Geist, Inter, Suisse Int’l, Neue Montreal.',r:184,l:824,liked:false,replies:[
      {id:'r1',a:'Nora Ito',i:'NI',t:'16:02',x:'Geist здесь особенно хорошо работает.'},
      {id:'r2',a:'Alex Morgan',i:'AM',t:'16:08',x:'Добавил бы ещё General Sans.'}
    ]},
    {id:'p2',t:'13:12',x:'Вопрос дня: что важнее в минималистичном интерфейсе — ритм, типографика или пространство?',r:96,l:403,liked:false,replies:[]}
   ]},
   {id:'music',kind:'public',mode:'community',name:'/music',handle:'mi.net/music',initials:'M',preview:'Leo: кто слушал новый альбом?',time:'1h',unread:0,subtitle:'24.1K members',desc:'Albums, artists and discoveries.',joined:1,owner:false,messages:[
    {id:'mu1',a:'Leo V.',i:'LV',t:'15:01',x:'Кто уже слушал новый релиз?',reactions:1},
    {id:'mu2',a:'Mina Sol',i:'MS',t:'15:04',x:'Да. Вторая половина намного сильнее первой.',reactions:3}
   ]},
   {id:'nora',kind:'direct',name:'Nora Ito',handle:'@nora',initials:'NI',preview:'скину макеты вечером',time:'2h',unread:0,subtitle:'last seen recently',desc:'Interface designer.',messages:[
    {id:'n1',a:'Nora Ito',i:'NI',t:'14:12',x:'Я закончу экран паблика сегодня.',reactions:0},
    {id:'n2',a:'Kim Dung',i:'KD',t:'14:15',x:'Супер. Скинь, когда будет готово.',own:1,reactions:0}
   ]}
  ]
 };
}
const people=[
 {name:'Alex Morgan',handle:'@alex',initials:'AM',status:'online'},
 {name:'Nora Ito',handle:'@nora',initials:'NI',status:'recently'},
 {name:'Leo V.',handle:'@leov',initials:'LV',status:'online'},
 {name:'Mina Sol',handle:'@minasol',initials:'MS',status:'recently'}
];
const discover=[
 {name:'/technology',address:'technology',initials:'T',members:'31.2K',desc:'Software, hardware and the internet.',cat:'Technology'},
 {name:'/gaming',address:'gaming',initials:'G',members:'16.9K',desc:'Games, studios, modding and play.',cat:'Gaming'},
 {name:'/photography',address:'photography',initials:'P',members:'9.8K',desc:'Frames, cameras and visual stories.',cat:'Photography'},
 {name:'/culture',address:'culture',initials:'C',members:'14.6K',desc:'Films, books, internet and culture.',cat:'Culture'},
 {name:'/sound',address:'sound',initials:'S',members:'12.3K',desc:'Production, albums and audio.',cat:'Music'},
 {name:'/interface',address:'interface',initials:'I',members:'8.1K',desc:'UI, typography and product design.',cat:'Design'}
];
