// mi.net auth build: 2026-08-10-v8-email-only
// Supabase authentication and profile synchronization for mi.net.
const miAuth = {
  client: null,
  session: null,
  user: null,
  profile: null,
  recovery: false
};

function miSupabaseConfigured(){
  const config=window.MINET_SUPABASE_CONFIG||{};
  return Boolean(
    config.url &&
    config.key &&
    !config.url.includes('YOUR_SUPABASE') &&
    !config.key.includes('YOUR_SUPABASE')
  );
}

function miSupabaseConfig(){
  return window.MINET_SUPABASE_CONFIG||{};
}

function miNormalizeSupabaseUrl(value){
  return String(value||'').trim().replace(/\/+$/,'');
}

function miValidateSupabaseConfigShape(){
  const config=miSupabaseConfig();
  const url=miNormalizeSupabaseUrl(config.url);
  const key=String(config.key||'').trim();

  if(!url||url.includes('YOUR_SUPABASE')){
    return {ok:false,message:'Supabase Project URL is missing.'};
  }

  if(!key||key.includes('YOUR_SUPABASE')){
    return {ok:false,message:'Supabase publishable/anon key is missing.'};
  }

  let parsed;
  try{
    parsed=new URL(url);
  }catch(e){
    return {ok:false,message:'Supabase Project URL is not a valid URL.'};
  }

  if(!/^https?:$/.test(parsed.protocol)){
    return {ok:false,message:'Supabase Project URL must use https://.'};
  }

  if(parsed.pathname && parsed.pathname!=='/'){
    return {
      ok:false,
      message:'Use the Supabase Project URL only, without /auth/v1, /rest/v1 or another path.'
    };
  }

  if(parsed.hostname===window.location.hostname){
    return {
      ok:false,
      message:'Supabase Project URL points to this website. Use the URL from Supabase Dashboard instead.'
    };
  }

  return {ok:true,url,key};
}

async function miProbeSupabaseEndpoint(){
  const shape=miValidateSupabaseConfigShape();
  if(!shape.ok)return shape;

  const endpoint=shape.url+'/auth/v1/settings';

  try{
    const response=await fetch(endpoint,{
      method:'GET',
      headers:{
        apikey:shape.key,
        Authorization:'Bearer '+shape.key,
        Accept:'application/json'
      },
      cache:'no-store'
    });

    const contentType=(response.headers.get('content-type')||'').toLowerCase();
    const raw=await response.text();
    const startsAsHtml=/^\s*</.test(raw)||contentType.includes('text/html');

    if(startsAsHtml){
      return {
        ok:false,
        code:'html-response',
        message:'Supabase URL is incorrect: the Auth endpoint returned an HTML page instead of JSON.',
        endpoint,
        status:response.status
      };
    }

    let payload=null;
    try{
      payload=raw?JSON.parse(raw):null;
    }catch(e){
      return {
        ok:false,
        code:'invalid-json',
        message:'Supabase endpoint did not return valid JSON. Check the Project URL and browser key.',
        endpoint,
        status:response.status
      };
    }

    if(!response.ok){
      const serverMessage=payload?.msg||payload?.message||payload?.error_description||payload?.error;
      return {
        ok:false,
        code:'http-error',
        message:serverMessage
          ?'Supabase rejected the connection: '+serverMessage
          :'Supabase rejected the connection. Check the publishable/anon key.',
        endpoint,
        status:response.status
      };
    }

    return {ok:true,endpoint,status:response.status};
  }catch(error){
    return {
      ok:false,
      code:'network-error',
      message:'Could not reach the Supabase Auth endpoint. Check the Project URL, network and CORS configuration.',
      details:error?.message||String(error)
    };
  }
}

function miFormatUnexpectedAuthError(error){
  const message=String(error?.message||error||'');

  if(/Unexpected token ['"]?<['"]?|not valid JSON|JSON/i.test(message)){
    return 'Supabase returned HTML instead of JSON. Check js/supabase-config.js: Project URL must be the Supabase project URL, not your website URL.';
  }

  return miFriendlyAuthError(error);
}

function miCreateSupabaseClient(){
  if(!miSupabaseConfigured() || !window.supabase?.createClient)return null;

  const config=miSupabaseConfig();
  return window.supabase.createClient(
    miNormalizeSupabaseUrl(config.url),
    String(config.key||'').trim(),
    {
    auth:{
      persistSession:true,
      autoRefreshToken:true,
      detectSessionInUrl:true
    }
  });
}

function miAuthUserEmail(){
  return miAuth.user?.email||'';
}

function miAuthMessage(message,type=''){
  const box=document.getElementById('authMessage');
  if(!box)return;
  box.textContent=message||'';
  box.hidden=!message;
  box.className='auth-message'+(type?' '+type:'');
}

function miSetAuthBusy(form,busy){
  if(!form)return;
  form.querySelectorAll('button,input').forEach(el=>{
    if(el.classList.contains('auth-password-toggle'))return;
    el.disabled=busy;
  });
}

function miShowAuthView(view){
  const tabs=document.getElementById('authTabs');
  const forms={
    signin:document.getElementById('signInForm'),
    signup:document.getElementById('signUpForm'),
    forgot:document.getElementById('forgotForm'),
    recovery:document.getElementById('recoveryForm')
  };

  Object.entries(forms).forEach(([name,form])=>{
    if(form)form.hidden=name!==view;
  });

  if(tabs)tabs.hidden=!['signin','signup'].includes(view);
  document.querySelectorAll('[data-auth-view]').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.authView===view);
  });

  miAuthMessage('');
}

function miShowAuthGate(view='signin'){
  document.body.classList.remove('auth-pending','auth-authenticated');
  document.body.classList.add('auth-needed');
  if(view==='recovery')document.body.classList.add('auth-recovery');
  else document.body.classList.remove('auth-recovery');
  miShowAuthView(view);
}

function miHideAuthGate(){
  document.body.classList.remove('auth-pending','auth-needed','auth-recovery');
  document.body.classList.add('auth-authenticated');
}

function miRedirectUrl(){
  return window.location.href.split('#')[0].split('?')[0];
}

function miFriendlyAuthError(error){
  const message=String(error?.message||error||'Authentication failed.');

  if(/invalid login credentials/i.test(message))return 'Incorrect email or password.';
  if(/email not confirmed/i.test(message))return 'Confirm your email before signing in.';
  if(/user already registered/i.test(message))return 'An account with this email already exists.';
  if(/duplicate key|unique constraint|profiles_username_lower_unique/i.test(message))return 'This username is already taken.';
  if(/username is not allowed|profiles_username_allowed|check constraint/i.test(message))return 'This username is not allowed.';
  if(/database error saving new user/i.test(message))return 'Could not create the account. The username may already be taken/blocked, or the Supabase profile trigger is not installed correctly.';
  if(/duplicate key|unique/i.test(message))return 'This username is already taken.';
  if(/password/i.test(message)&&/short|least|characters/i.test(message))return 'Password must be at least 8 characters.';
  return message;
}

async function miFetchProfile(userId){
  const {data,error}=await miAuth.client
    .from('profiles')
    .select('id, username, display_name, bio, avatar_url, created_at, updated_at')
    .eq('id',userId)
    .single();

  if(error)return {profile:null,error};
  return {profile:data,error:null};
}

function miApplyProfile(profile,user){
  const metadata=user?.user_metadata||{};
  const name=profile?.display_name||metadata.display_name||metadata.name||'mi.net user';
  const username=profile?.username||metadata.username||('user_'+String(user?.id||'').slice(0,8));
  const bio=profile?.bio||'';

  state.me.name=name;
  state.me.handle='@'+String(username).replace(/^@/,'');
  state.me.bio=bio;
  state.me.initials=initials(name);
  persist();

  const orb=document.getElementById('profileOrb');
  if(orb)orb.textContent=state.me.initials;
}

async function miEstablishSession(session){
  if(!session?.user){
    miAuth.session=null;
    miAuth.user=null;
    miAuth.profile=null;
    miShowAuthGate('signin');
    return false;
  }

  miAuth.session=session;
  miAuth.user=session.user;

  miActivateAuthenticatedState(session.user.id);

  const {profile,error}=await miFetchProfile(session.user.id);
  if(error){
    console.error('Could not load Supabase profile:',error);
    miApplyProfile(null,session.user);
  }else{
    miAuth.profile=profile;
    miApplyProfile(profile,session.user);
  }

  miHideAuthGate();
  if(typeof window.miBootApp==='function')window.miBootApp();

  if(typeof window.miRealtimeStart==='function'){
    await window.miRealtimeStart();
  }

  return true;
}

async function miCheckUsernameAvailability(username){
  if(!miAuth.client){
    return {available:null,degraded:true,message:'Supabase is not connected.'};
  }

  const candidate=username.replace(/^@/,'');

  const {data,error}=await miAuth.client.rpc('is_username_available',{candidate});

  if(error){
    console.error('mi.net username RPC failed', {
      message:error.message,
      code:error.code,
      details:error.details,
      hint:error.hint
    });

    // Availability is a UX pre-check only.
    // The database still enforces username rules atomically on signup/update.
    return {
      available:null,
      degraded:true,
      code:error.code||'rpc-error',
      message:'Username pre-check is temporarily unavailable.'
    };
  }

  return {
    available:Boolean(data),
    degraded:false,
    message:data?'':'This username is already taken or not allowed.'
  };
}

function miSanitizeProfileSearch(value){
  return String(value||'')
    .trim()
    .replace(/^@+/,'')
    .replace(/[%_*(),]/g,'')
    .slice(0,40);
}

async function miSearchProfiles(searchTerm='',limit=12){
  if(!miAuth.client||!miAuth.user){
    return {ok:false,profiles:[],message:'You must be signed in.'};
  }

  const term=miSanitizeProfileSearch(searchTerm);
  const columns='id, username, display_name, bio, avatar_url, updated_at';

  try{
    if(!term){
      const {data,error}=await miAuth.client
        .from('profiles')
        .select(columns)
        .neq('id',miAuth.user.id)
        .order('updated_at',{ascending:false})
        .limit(limit);

      if(error)throw error;
      return {ok:true,profiles:data||[]};
    }

    // Use typed ilike filters instead of injecting a raw PostgREST .or() string.
    // Username prefix results are ranked first; display-name matches follow.
    const [usernameResult,nameResult]=await Promise.all([
      miAuth.client
        .from('profiles')
        .select(columns)
        .neq('id',miAuth.user.id)
        .ilike('username',term+'%')
        .limit(limit),
      miAuth.client
        .from('profiles')
        .select(columns)
        .neq('id',miAuth.user.id)
        .ilike('display_name','%'+term+'%')
        .limit(limit)
    ]);

    if(usernameResult.error)throw usernameResult.error;
    if(nameResult.error)throw nameResult.error;

    const merged=[];
    const seen=new Set();

    for(const profile of [...(usernameResult.data||[]),...(nameResult.data||[])]){
      if(seen.has(profile.id))continue;
      seen.add(profile.id);
      merged.push(profile);
      if(merged.length>=limit)break;
    }

    return {ok:true,profiles:merged};
  }catch(error){
    console.error('mi.net profile search failed',error);

    const message=String(error?.message||'');
    if(/row-level security|permission denied/i.test(message)){
      return {
        ok:false,
        profiles:[],
        message:'Profile search is blocked by Supabase RLS. Run profiles_search_fix.sql.'
      };
    }

    return {
      ok:false,
      profiles:[],
      message:'Could not search mi.net users.'
    };
  }
}

async function miSaveRemoteProfile({displayName,username,bio}){
  if(!miAuth.client||!miAuth.user)return {ok:false,message:'You are not signed in.'};

  const usernameCheck=miCheckUsername(username);
  if(!usernameCheck.ok)return {ok:false,message:usernameCheck.message};

  // No RPC pre-check here either. The UPDATE is validated by PostgreSQL.


  const {data,error}=await miAuth.client
    .from('profiles')
    .update({
      username,
      display_name:displayName,
      bio
    })
    .eq('id',miAuth.user.id)
    .select('id, username, display_name, bio, avatar_url, created_at, updated_at')
    .single();

  if(error)return {ok:false,message:miFormatUnexpectedAuthError(error)};

  const {error:metadataError}=await miAuth.client.auth.updateUser({
    data:{
      username,
      display_name:displayName
    }
  });

  if(metadataError)console.warn('Auth metadata update failed:',metadataError);

  miAuth.profile=data;
  return {ok:true,profile:data};
}

async function miSignOut(){
  if(!miAuth.client)return;

  if(typeof window.miRealtimeStop==='function'){
    await window.miRealtimeStop();
  }

  const {error}=await miAuth.client.auth.signOut();
  if(error){
    toast(miFormatUnexpectedAuthError(error));
    return;
  }

  miAuth.session=null;
  miAuth.user=null;
  miAuth.profile=null;
  document.body.classList.remove('chatopen');
  miShowAuthGate('signin');
  miAuthMessage('Signed out successfully.','success');
}

async function miHandleSignIn(event){
  event.preventDefault();
  if(!miAuth.client)return;

  const form=event.currentTarget;
  const email=document.getElementById('signInEmail').value.trim();
  const password=document.getElementById('signInPassword').value;

  miSetAuthBusy(form,true);
  miAuthMessage('');

  const {data,error}=await miAuth.client.auth.signInWithPassword({email,password});

  miSetAuthBusy(form,false);

  if(error){
    miAuthMessage(miFormatUnexpectedAuthError(error),'error');
    return;
  }

  await miEstablishSession(data.session);
}

async function miHandleSignUp(event){
  event.preventDefault();
  if(!miAuth.client)return;

  const form=event.currentTarget;
  const displayName=document.getElementById('signUpName').value.trim();
  const usernameInput=document.getElementById('signUpUsername');
  const email=document.getElementById('signUpEmail').value.trim();
  const password=document.getElementById('signUpPassword').value;
  const errorElement=document.getElementById('signUpUsernameError');

  const usernameResult=miCheckUsername(usernameInput.value);
  miSetUsernameValidation(usernameInput,usernameResult,errorElement);

  if(!usernameResult.ok)return;
  if(!displayName){
    miAuthMessage('Display name is required.','error');
    return;
  }
  if(password.length<8){
    miAuthMessage('Password must be at least 8 characters.','error');
    return;
  }

  miSetAuthBusy(form,true);

  // Registration no longer depends on the username availability RPC.
  // PostgreSQL is authoritative: profiles_username_lower_unique,
  // profiles_username_allowed and handle_new_user validate atomically.
  const username=usernameResult.value.replace(/^@/,'');
  usernameInput.classList.remove('auth-invalid');
  errorElement.hidden=true;
  miAuthMessage('Creating account…');

  const {data,error}=await miAuth.client.auth.signUp({
    email,
    password,
    options:{
      emailRedirectTo:miRedirectUrl(),
      data:{
        username,
        display_name:displayName
      }
    }
  });

  miSetAuthBusy(form,false);

  if(error){
    miAuthMessage(miFormatUnexpectedAuthError(error),'error');
    return;
  }

  if(data.session){
    await miEstablishSession(data.session);
  }else{
    form.reset();
    miShowAuthView('signin');
    document.getElementById('signInEmail').value=email;
    miAuthMessage('Account created. Check your email and confirm your address, then sign in.','success');
  }
}

async function miHandleForgot(event){
  event.preventDefault();
  if(!miAuth.client)return;

  const form=event.currentTarget;
  const email=document.getElementById('forgotEmail').value.trim();

  miSetAuthBusy(form,true);
  const {error}=await miAuth.client.auth.resetPasswordForEmail(email,{
    redirectTo:miRedirectUrl()
  });
  miSetAuthBusy(form,false);

  if(error){
    miAuthMessage(miFormatUnexpectedAuthError(error),'error');
    return;
  }

  miShowAuthView('signin');
  miAuthMessage('Recovery email sent. Open the link in your inbox.','success');
}

async function miHandleRecovery(event){
  event.preventDefault();
  if(!miAuth.client)return;

  const form=event.currentTarget;
  const password=document.getElementById('recoveryPassword').value;

  if(password.length<8){
    miAuthMessage('Password must be at least 8 characters.','error');
    return;
  }

  miSetAuthBusy(form,true);
  const {error}=await miAuth.client.auth.updateUser({password});
  miSetAuthBusy(form,false);

  if(error){
    miAuthMessage(miFormatUnexpectedAuthError(error),'error');
    return;
  }

  miAuth.recovery=false;
  document.body.classList.remove('auth-recovery');
  miAuthMessage('Password updated.','success');

  const {data}=await miAuth.client.auth.getSession();
  if(data.session)await miEstablishSession(data.session);
}

function miBindAuthUI(){
  document.querySelectorAll('[data-auth-view]').forEach(btn=>{
    btn.addEventListener('click',()=>miShowAuthView(btn.dataset.authView));
  });

  document.querySelectorAll('[data-password-toggle]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const input=document.getElementById(btn.dataset.passwordToggle);
      if(!input)return;
      const show=input.type==='password';
      input.type=show?'text':'password';
      btn.textContent=show?'Hide':'Show';
    });
  });

  document.getElementById('forgotPasswordBtn').addEventListener('click',()=>{
    const email=document.getElementById('signInEmail').value.trim();
    document.getElementById('forgotEmail').value=email;
    miShowAuthView('forgot');
  });

  const signupUsername=document.getElementById('signUpUsername');
  signupUsername.addEventListener('input',()=>{
    signupUsername.classList.remove('auth-invalid');
    const result=miCheckUsername(signupUsername.value);
    miSetUsernameValidation(signupUsername,result,document.getElementById('signUpUsernameError'));
  });

  document.getElementById('signInForm').addEventListener('submit',miHandleSignIn);
  document.getElementById('signUpForm').addEventListener('submit',miHandleSignUp);
  document.getElementById('forgotForm').addEventListener('submit',miHandleForgot);
  document.getElementById('recoveryForm').addEventListener('submit',miHandleRecovery);
}

async function miInitAuth(){
  miBindAuthUI();

  const warning=document.getElementById('authConfigWarning');

  if(!miSupabaseConfigured()){
    warning.hidden=false;
    document.body.classList.remove('auth-pending');
    document.body.classList.add('auth-needed');
    miShowAuthView('signin');
    document.querySelectorAll('.auth-form input,.auth-form button').forEach(el=>el.disabled=true);
    return;
  }

  const configCheck=miValidateSupabaseConfigShape();
  if(!configCheck.ok){
    warning.hidden=false;
    miShowAuthGate('signin');
    miAuthMessage(configCheck.message,'error');
    return;
  }

  warning.hidden=true;
  miShowAuthGate('signin');
  miAuthMessage('Connecting to Supabase…');

  const endpointCheck=await miProbeSupabaseEndpoint();
  if(!endpointCheck.ok){
    warning.hidden=false;
    miAuthMessage(endpointCheck.message,'error');
    console.error('mi.net Supabase endpoint diagnostic',endpointCheck);
    return;
  }

  miAuthMessage('');
  miAuth.client=miCreateSupabaseClient();

  if(!miAuth.client){
    warning.hidden=false;
    miShowAuthGate('signin');
    miAuthMessage('Could not initialize Supabase.','error');
    return;
  }

  miAuth.client.auth.onAuthStateChange((event,session)=>{
    window.setTimeout(async()=>{
      if(event==='PASSWORD_RECOVERY'){
        miAuth.recovery=true;
        miAuth.session=session;
        miAuth.user=session?.user||null;
        miShowAuthGate('recovery');
        return;
      }

      if(event==='SIGNED_OUT'){
        miAuth.session=null;
        miAuth.user=null;
        miAuth.profile=null;
        miShowAuthGate('signin');
        return;
      }

      if(event==='SIGNED_IN'&&session&&!miAuth.recovery){
        await miEstablishSession(session);
      }
    },0);
  });

  const {data,error}=await miAuth.client.auth.getSession();

  if(error){
    miShowAuthGate('signin');
    miAuthMessage(miFormatUnexpectedAuthError(error),'error');
    return;
  }

  if(data.session){
    await miEstablishSession(data.session);
  }else{
    miShowAuthGate('signin');
  }
}

window.miGetSupabaseClient=()=>miAuth.client;
window.miGetAuthUser=()=>miAuth.user;
window.miSignOut=miSignOut;
window.miSaveRemoteProfile=miSaveRemoteProfile;
window.miAuthUserEmail=miAuthUserEmail;
window.miSearchProfiles=miSearchProfiles;

miInitAuth();
