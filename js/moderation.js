// Username/content moderation helpers for mi.net
const MI_BANNED_USERNAME_WORDS = [
  // English profanity / hate / sexual terms commonly blocked in usernames
  'fuck','fucker','fucking','shit','bullshit','bitch','cunt','dick','cock','pussy',
  'asshole','whore','slut','porn','porno','sex','nazi','hitler',
  'nigger','nigga','faggot','retard',

  // Russian profanity / abusive terms
  'хуй','хуи','хуе','хуё','хуя','пизд','еба','ебл','ёба','бляд','блят',
  'сука','сучк','мудак','долбоеб','долбоёб','пидор','пидар','педик',
  'шлюх','нацист'
];

const MI_USERNAME_CONFUSABLES = {
  // Leetspeak
  '0':'o','1':'i','2':'z','3':'e','4':'a','5':'s','6':'g','7':'t','8':'b','9':'g',
  '@':'a','$':'s','!':'i','|':'i',

  // Common Cyrillic -> Latin homoglyphs used to bypass filters
  'а':'a','е':'e','ё':'e','о':'o','р':'p','с':'c','у':'y','х':'x','к':'k','м':'m','т':'t','в':'b','н':'h',

  // Common Latin -> Cyrillic-like variants are handled by lowercasing + mapping above.
};

function miNormalizeUsernameForModeration(value){
  return String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/^@+/, '')
    .split('')
    .map(ch => MI_USERNAME_CONFUSABLES[ch] || ch)
    .join('')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\-.·•\s]+/g, '')
    .replace(/(.)\1{2,}/g, '$1$1');
}

function miUsernameTokens(value){
  const raw = String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/^@+/, '');

  const compact = miNormalizeUsernameForModeration(raw);

  return [
    raw,
    compact,
    raw.replace(/[^a-zа-яё0-9]+/gi, ''),
  ].filter(Boolean);
}

function miCheckUsername(username){
  const raw = String(username || '').trim();
  const cleanHandle = raw.startsWith('@') ? raw.slice(1) : raw;

  if(!cleanHandle){
    return {ok:false, code:'empty', message:'Username is required.'};
  }

  if(cleanHandle.length < 3){
    return {ok:false, code:'short', message:'Username must be at least 3 characters.'};
  }

  if(cleanHandle.length > 24){
    return {ok:false, code:'long', message:'Username must be 24 characters or fewer.'};
  }

  if(!/^[a-zA-Z0-9_.-]+$/.test(cleanHandle)){
    return {
      ok:false,
      code:'characters',
      message:'Use only Latin letters, numbers, _, . and -.'
    };
  }

  if(/^[._-]|[._-]$/.test(cleanHandle)){
    return {
      ok:false,
      code:'edge-separator',
      message:'Username cannot start or end with ., _ or -.'
    };
  }

  if(/[._-]{2,}/.test(cleanHandle)){
    return {
      ok:false,
      code:'separator-run',
      message:'Do not use repeated separators.'
    };
  }

  const tokens = miUsernameTokens(cleanHandle);

  for(const banned of MI_BANNED_USERNAME_WORDS){
    const normalizedBanned = miNormalizeUsernameForModeration(banned);

    if(tokens.some(token => {
      const normalizedToken = miNormalizeUsernameForModeration(token);
      return normalizedToken.includes(normalizedBanned);
    })){
      return {
        ok:false,
        code:'banned-word',
        message:'This username contains a word that is not allowed.'
      };
    }
  }

  return {
    ok:true,
    value:'@' + cleanHandle,
    normalized:miNormalizeUsernameForModeration(cleanHandle)
  };
}

function miSetUsernameValidation(input, result, errorElement){
  if(!input)return result;

  const message = result.ok ? '' : result.message;
  input.setCustomValidity(message);
  input.classList.toggle('field-invalid', !result.ok);

  if(errorElement){
    errorElement.textContent = message;
    errorElement.hidden = result.ok;
  }

  return result;
}
