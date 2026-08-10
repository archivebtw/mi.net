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

function miCreateSupabaseClient(){
  if(!miSupabaseConfigured() || !window.supabase?.createClient)return null;

  const config=window.MINET_SUPABASE_CONFIG;
  return window.supabase.createClient(config.url,config.key,{
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
  if(/database error saving new user/i.test(message))return 'Could not create the profile. The username may already be used or blocked.';
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
  return true;
}

async function miCheckUsernameAvailability(username){
  if(!miAuth.client)return {available:false,message:'Supabase is not connected.'};

  const {data,error}=await miAuth.client.rpc('is_username_available',{
    candidate:username.replace(/^@/,'')
  });

  if(error){
    console.error('Username availability:',error);
    return {available:false,message:'Could not verify username.'};
  }

  return {
    available:Boolean(data),
    message:data?'':'This username is already taken or not allowed.'
  };
}

async function miSaveRemoteProfile({displayName,username,bio}){
  if(!miAuth.client||!miAuth.user)return {ok:false,message:'You are not signed in.'};

  const usernameCheck=miCheckUsername(username);
  if(!usernameCheck.ok)return {ok:false,message:usernameCheck.message};

  const availability=await miCheckUsernameAvailability(username);
  const sameUsername=(miAuth.profile?.username||'').toLowerCase()===username.toLowerCase();
  if(!availability.available&&!sameUsername)return {ok:false,message:availability.message};

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

  if(error)return {ok:false,message:miFriendlyAuthError(error)};

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

  const {error}=await miAuth.client.auth.signOut();
  if(error){
    toast(miFriendlyAuthError(error));
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
    miAuthMessage(miFriendlyAuthError(error),'error');
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
  miAuthMessage('Checking username…');

  const username=usernameResult.value.replace(/^@/,'');
  const availability=await miCheckUsernameAvailability(username);

  if(!availability.available){
    miSetAuthBusy(form,false);
    usernameInput.classList.add('auth-invalid');
    errorElement.textContent=availability.message;
    errorElement.hidden=false;
    miAuthMessage(availability.message,'error');
    return;
  }

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
    miAuthMessage(miFriendlyAuthError(error),'error');
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
    miAuthMessage(miFriendlyAuthError(error),'error');
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
    miAuthMessage(miFriendlyAuthError(error),'error');
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
    miAuthMessage(miFriendlyAuthError(error),'error');
    return;
  }

  if(data.session){
    await miEstablishSession(data.session);
  }else{
    miShowAuthGate('signin');
  }
}

window.miSignOut=miSignOut;
window.miSaveRemoteProfile=miSaveRemoteProfile;
window.miAuthUserEmail=miAuthUserEmail;

miInitAuth();
