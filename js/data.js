function initialState(){
 return {
  me:{
   name:'mi.net user',
   handle:'@user',
   initials:'MI',
   bio:'',
   statusText:''
  },
  settings:{dark:true,compact:false},
  muted:[],
  pinnedConversations:[],
  drafts:{},
  pinnedMessages:{},
  readState:{},
  dataVersion:10,
  conversations:[]
 };
}

const discover=[
 {name:'/technology',address:'technology',initials:'T',members:'31.2K',desc:'Software, hardware and the internet.',cat:'Technology'},
 {name:'/gaming',address:'gaming',initials:'G',members:'16.9K',desc:'Games, studios, modding and play.',cat:'Gaming'},
 {name:'/photography',address:'photography',initials:'P',members:'9.8K',desc:'Frames, cameras and visual stories.',cat:'Photography'},
 {name:'/culture',address:'culture',initials:'C',members:'14.6K',desc:'Films, books, internet and culture.',cat:'Culture'},
 {name:'/sound',address:'sound',initials:'S',members:'12.3K',desc:'Production, albums and audio.',cat:'Music'},
 {name:'/interface',address:'interface',initials:'I',members:'8.1K',desc:'UI, typography and product design.',cat:'Design'}
];
