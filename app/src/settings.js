// Agent settings live on this device (localStorage) and are sent with every call as Bolna user_data,
// so edits take effect on the next call without touching the Bolna agent.
const KEY = 'arhamavaz.settings.v2'

// `speech` is the BCP-47 code used for voice dictation in that language
export const LANGUAGES = [
  { id: 'hi', label: 'हिन्दी', name: 'Hindi', speech: 'hi-IN' },
  { id: 'gu', label: 'ગુજરાતી', name: 'Gujarati', speech: 'gu-IN' },
  { id: 'en', label: 'English', name: 'English', speech: 'en-IN' },
  { id: 'hinglish', label: 'Hinglish', name: 'Hinglish', speech: 'hi-IN' },
  { id: 'mr', label: 'मराठी', name: 'Marathi', speech: 'mr-IN' },
  { id: 'ta', label: 'தமிழ்', name: 'Tamil', speech: 'ta-IN' },
  { id: 'te', label: 'తెలుగు', name: 'Telugu', speech: 'te-IN' },
  { id: 'kn', label: 'ಕನ್ನಡ', name: 'Kannada', speech: 'kn-IN' },
  { id: 'ml', label: 'മലയാളം', name: 'Malayalam', speech: 'ml-IN' },
  { id: 'bn', label: 'বাংলা', name: 'Bengali', speech: 'bn-IN' },
  { id: 'pa', label: 'ਪੰਜਾਬੀ', name: 'Punjabi', speech: 'pa-IN' },
  { id: 'od', label: 'ଓଡ଼ିଆ', name: 'Odia', speech: 'or-IN' },
]

export const INSURANCE_TYPES = [
  { id: 'health', label: 'Health', icon: '🩺' },
  { id: 'life', label: 'Life', icon: '🛡️' },
  { id: 'motor', label: 'Motor', icon: '🚗' },
]

export const SCRIPT_TYPES = [
  { id: 'new', label: 'New policy' },
  { id: 'renewal', label: 'Renewal' },
  { id: 'port', label: 'Rollover / Port' },
]

export const MEMBERS = [
  { id: 'self', label: 'Self' },
  { id: 'couple', label: 'Self + spouse' },
  { id: 'family', label: 'Family' },
  { id: 'parents', label: 'Parents' },
]

export const VEHICLES = [
  { id: 'car', label: 'Car', icon: '🚗' },
  { id: 'bike', label: 'Bike', icon: '🏍️' },
]

// One-line summary of the type-specific answers, handed to the agent as {{customer_details}}
export function buildCustomerDetails({ insuranceType, members, age, cover, vehicleType, vehicleModel }) {
  if (insuranceType === 'health') {
    return [`Cover for: ${MEMBERS.find((m) => m.id === members)?.label || members}`, age && `eldest member age ${age}`].filter(Boolean).join(', ')
  }
  if (insuranceType === 'life') {
    return [age ? `Age ${age}` : 'Age not specified', cover?.trim() && `wants cover of ${cover.trim()}`].filter(Boolean).join(', ')
  }
  return `${vehicleType === 'bike' ? 'Bike' : 'Car'}: ${vehicleModel?.trim() || 'make and model not specified'}`
}

export const DEFAULT_SETTINGS = {
  agentName: 'Deepali',
  companyName: 'ArhamSecure',
  // Placeholders: {name} customer name, {agent}, {company}, {insurance} e.g. "health insurance"
  greetings: {
    hi: 'नमस्ते {name}, मैं {company} से {agent} बात कर रही हूँ। क्या आपकी {insurance} के बारे में दो मिनट बात कर सकते हैं?',
    gu: 'નમસ્તે {name}, હું {company} માંથી {agent} બોલું છું. શું તમારા {insurance} વિશે બે મિનિટ વાત કરી શકીએ?',
    en: 'Hi {name}, I am {agent} from {company}. Do you have two minutes to talk about your {insurance}?',
    mr: 'नमस्कार {name}, मी {company} मधून {agent} बोलत आहे. तुमच्या {insurance} बद्दल दोन मिनिटे बोलू शकतो का?',
    ta: 'வணக்கம் {name}, நான் {company} நிறுவனத்திலிருந்து {agent} பேசுகிறேன். உங்கள் {insurance} பற்றி இரண்டு நிமிடம் பேசலாமா?',
    te: 'నమస్కారం {name}, నేను {company} నుండి {agent} మాట్లాడుతున్నాను. మీ {insurance} గురించి రెండు నిమిషాలు మాట్లాడవచ్చా?',
    kn: 'ನಮಸ್ಕಾರ {name}, ನಾನು {company} ಇಂದ {agent} ಮಾತನಾಡುತ್ತಿದ್ದೇನೆ. ನಿಮ್ಮ {insurance} ಬಗ್ಗೆ ಎರಡು ನಿಮಿಷ ಮಾತನಾಡಬಹುದೇ?',
    ml: 'നമസ്കാരം {name}, ഞാൻ {company} ൽ നിന്ന് {agent} ആണ് സംസാരിക്കുന്നത്. നിങ്ങളുടെ {insurance} നെക്കുറിച്ച് രണ്ട് മിനിറ്റ് സംസാരിക്കാമോ?',
    bn: 'নমস্কার {name}, আমি {company} থেকে {agent} বলছি। আপনার {insurance} নিয়ে দুই মিনিট কথা বলা যাবে?',
    pa: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ {name}, ਮੈਂ {company} ਤੋਂ {agent} ਬੋਲ ਰਹੀ ਹਾਂ। ਕੀ ਤੁਹਾਡੇ {insurance} ਬਾਰੇ ਦੋ ਮਿੰਟ ਗੱਲ ਕਰ ਸਕਦੇ ਹਾਂ?',
    od: 'ନମସ୍କାର {name}, ମୁଁ {company} ରୁ {agent} କହୁଛି। ଆପଣଙ୍କ {insurance} ବିଷୟରେ ଦୁଇ ମିନିଟ୍ କଥା ହୋଇପାରିବା କି?',
    hinglish: 'Hello {name}, main {company} se {agent} baat kar rahi hoon. Kya aapki {insurance} ke baare mein do minute baat kar sakte hain?',
  },
  scripts: {
    health: {
      new: `Goal: sell a new health insurance policy.
1. Ask who needs cover: self, spouse, children or parents, and the age of the eldest member.
2. Ask about any existing illness such as diabetes or blood pressure, and whether they have employer cover.
3. Explain why personal cover matters: rising hospital costs and employer cover ends when the job changes.
4. Recommend a family floater of 10 to 25 lakh, and mention cashless treatment at network hospitals, no-claim bonus, free health check-ups, and tax saving under section 80D.
5. Mention waiting periods for pre-existing diseases honestly.
6. Offer to send plan options on WhatsApp and confirm a callback time.`,
      renewal: `Goal: renew their health policy before it lapses.
1. Ask when the policy expires and who the current insurer is.
2. Stress renewing on time: continuous renewal protects their waiting-period credit and accumulated no-claim bonus.
3. Ask if any member was hospitalised or claimed this year, and whether a new member needs to be added.
4. Suggest increasing the sum insured or adding a super top-up, since medical costs rise every year.
5. Offer to send the renewal quote on WhatsApp and confirm a follow-up before the expiry date.`,
      port: `Goal: port their health policy to us.
1. Ask which insurer they are with, the sum insured, and when the policy expires.
2. Ask what they are unhappy about: premium, claim rejections, room rent limits, or network hospitals.
3. Explain portability: the waiting period already served and the no-claim bonus carry over to the new policy.
4. Address their pain point: better claim settlement, no room rent capping, larger hospital network.
5. Explain the port request must be made at least 45 days before renewal.
6. Offer a side-by-side comparison on WhatsApp and confirm a callback time.`,
    },
    life: {
      new: `Goal: sell a new term life insurance policy.
1. Ask their age, occupation, and who depends on them financially.
2. Ask if they have any existing life cover or home and personal loans.
3. Explain term insurance simply: a large cover at a low yearly premium that protects the family if something happens.
4. Suggest a cover of 10 to 15 times their annual income, and mention the tax saving under section 80C.
5. Mention useful riders: critical illness, accidental death, and waiver of premium.
6. Offer to send a personalised quote on WhatsApp and confirm a callback time.`,
      renewal: `Goal: make sure their life policy premium is paid and the policy stays active.
1. Ask about their policy and when the premium is due.
2. Explain that missing the premium can lapse the policy after the grace period and they would lose the cover.
3. Offer easy payment options, including auto-debit so it never lapses again.
4. Ask whether their cover is still enough, given changes like marriage, children or a home loan, and suggest a top-up term plan if needed.
5. Confirm when they will pay and offer to send the payment link on WhatsApp.`,
      port: `Goal: help them review and upgrade or switch their life cover.
1. Ask which policy they hold, the cover amount, and the yearly premium.
2. Check if it is an expensive endowment or money-back plan with low cover.
3. Explain that a pure term plan can give much higher cover for a lower premium.
4. Advise them never to stop the old policy until the new one is issued.
5. Offer a comparison of their current plan against a term plan on WhatsApp and confirm a callback time.`,
    },
    motor: {
      new: `Goal: sell a new motor insurance policy.
1. Confirm the vehicle make, model and year, and whether it is brand new or already on the road without insurance.
2. If they are driving without insurance, gently remind them third-party cover is mandatory by law and fines apply.
3. Explain Third-Party vs Comprehensive, and recommend Comprehensive with Zero Depreciation for vehicles under 5 years old.
4. Suggest two or three add-ons. Car: Engine Protection, Roadside Assistance, Return to Invoice. Bike: Personal Accident cover, Roadside Assistance, multi-year policy.
5. Ask for their city and registration number to prepare a quote.
6. Offer to send an exact quote on WhatsApp and confirm a convenient callback time.`,
      renewal: `Goal: renew their motor policy before it lapses.
1. Ask when the current policy expires and who the current insurer is.
2. Stress renewing before expiry: no vehicle inspection is needed and they keep their No Claim Bonus, up to 50 percent off.
3. Ask whether they made any claim in the last year, since that affects the No Claim Bonus.
4. Ask if they want the same cover or want to add Zero Depreciation, Engine Protection or Roadside Assistance.
5. Offer to send the renewal quote on WhatsApp and confirm a follow-up before the expiry date.`,
      port: `Goal: roll over their motor policy from their current insurer to us.
1. Ask which insurer they are with now and when the policy expires.
2. Ask what they are unhappy about: premium, claim experience, service, or cover.
3. Address that pain point: a better price, faster cashless claims at network garages, or dedicated claim support.
4. Reassure them their No Claim Bonus transfers fully on rollover, using their previous policy copy.
5. Explain the rollover happens at renewal time with no gap in cover and no inspection if done before expiry.
6. Offer a side-by-side comparison quote on WhatsApp and confirm a callback time.`,
    },
  },
  guidelines: `- Never quote exact premium amounts; the premium depends on the customer's details and the advisor will share an exact quote.
- If interested, confirm their name and a convenient time for the quote callback or WhatsApp, thank them and end.
- If not interested or they ask not to be called, apologise, confirm they won't be called again, and end politely.`,
}

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY))
    if (saved) {
      const scripts = {}
      for (const t of INSURANCE_TYPES) scripts[t.id] = { ...DEFAULT_SETTINGS.scripts[t.id], ...saved.scripts?.[t.id] }
      return { ...DEFAULT_SETTINGS, ...saved, greetings: { ...DEFAULT_SETTINGS.greetings, ...saved.greetings }, scripts }
    }
  } catch {
    // storage unavailable or corrupt; fall back to defaults
  }
  return DEFAULT_SETTINGS
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
    return true
  } catch {
    return false
  }
}

const INSURANCE_WORDS = {
  hi: { health: 'हेल्थ इंश्योरेंस', life: 'लाइफ इंश्योरेंस', car: 'कार इंश्योरेंस', bike: 'बाइक इंश्योरेंस' },
  gu: { health: 'હેલ્થ ઇન્શ્યોરન્સ', life: 'લાઇફ ઇન્શ્યોરન્સ', car: 'કાર ઇન્શ્યોરન્સ', bike: 'બાઇક ઇન્શ્યોરન્સ' },
  en: { health: 'health insurance', life: 'life insurance', car: 'car insurance', bike: 'bike insurance' },
  hinglish: { health: 'health insurance', life: 'life insurance', car: 'car insurance', bike: 'bike insurance' },
  mr: { health: 'हेल्थ इन्शुरन्स', life: 'लाइफ इन्शुरन्स', car: 'कार इन्शुरन्स', bike: 'बाईक इन्शुरन्स' },
  ta: { health: 'ஹெல்த் இன்சூரன்ஸ்', life: 'லைஃப் இன்சூரன்ஸ்', car: 'கார் இன்சூரன்ஸ்', bike: 'பைக் இன்சூரன்ஸ்' },
  te: { health: 'హెల్త్ ఇన్సూరెన్స్', life: 'లైఫ్ ఇన్సూరెన్స్', car: 'కార్ ఇన్సూరెన్స్', bike: 'బైక్ ఇన్సూరెన్స్' },
  kn: { health: 'ಹೆಲ್ತ್ ಇನ್ಶೂರೆನ್ಸ್', life: 'ಲೈಫ್ ಇನ್ಶೂರೆನ್ಸ್', car: 'ಕಾರ್ ಇನ್ಶೂರೆನ್ಸ್', bike: 'ಬೈಕ್ ಇನ್ಶೂರೆನ್ಸ್' },
  ml: { health: 'ഹെൽത്ത് ഇൻഷുറൻസ്', life: 'ലൈഫ് ഇൻഷുറൻസ്', car: 'കാർ ഇൻഷുറൻസ്', bike: 'ബൈക്ക് ഇൻഷുറൻസ്' },
  bn: { health: 'হেলথ ইনস্যুরেন্স', life: 'লাইফ ইনস্যুরেন্স', car: 'গাড়ির ইনস্যুরেন্স', bike: 'বাইকের ইনস্যুরেন্স' },
  pa: { health: 'ਹੈਲਥ ਇੰਸ਼ੋਰੈਂਸ', life: 'ਲਾਈਫ ਇੰਸ਼ੋਰੈਂਸ', car: 'ਕਾਰ ਇੰਸ਼ੋਰੈਂਸ', bike: 'ਬਾਈਕ ਇੰਸ਼ੋਰੈਂਸ' },
  od: { health: 'ହେଲ୍ଥ ଇନସ୍ୟୁରେନ୍ସ', life: 'ଲାଇଫ୍ ଇନସ୍ୟୁରେନ୍ସ', car: 'କାର୍ ଇନସ୍ୟୁରେନ୍ସ', bike: 'ବାଇକ୍ ଇନସ୍ୟୁରେନ୍ସ' },
}

// Builds the Bolna user_data payload shared by the single-call and bulk-call flows.
export function buildUserData(settings, { insuranceType, insuranceStatus, language, name, members, age, cover, vehicleType, vehicleModel, goal }) {
  const trimmedName = name?.trim()
  return {
    customer_name: trimmedName || 'not specified',
    agent_name: settings.agentName,
    company_name: settings.companyName,
    insurance_type: INSURANCE_TYPES.find((t) => t.id === insuranceType).label,
    call_type: insuranceStatus === 'new' ? 'sales' : insuranceStatus,
    language: LANGUAGES.find((l) => l.id === language).name,
    insurance_status: insuranceStatus,
    insurance_status_label: SCRIPT_TYPES.find((s) => s.id === insuranceStatus).label,
    customer_details: buildCustomerDetails({ insuranceType, members, age, cover, vehicleType, vehicleModel }),
    call_goal: goal?.trim() || 'none',
    ...(insuranceType === 'motor' && { vehicle_type: vehicleType, vehicle_model: vehicleModel?.trim() || 'not specified' }),
    greeting: buildGreeting(settings, { language, name: trimmedName, insuranceType, vehicleType }),
    script: settings.scripts[insuranceType][insuranceStatus],
    guidelines: settings.guidelines,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }
}

// Fills the opening-line template for a language; drops {name} cleanly when no name is given.
export function buildGreeting(settings, { language, name, insuranceType, vehicleType }) {
  const honorific = name ? (language === 'hi' ? `${name} जी` : language === 'hinglish' ? `${name} ji` : name) : ''
  const insurance = INSURANCE_WORDS[language][insuranceType === 'motor' ? vehicleType || 'car' : insuranceType]
  return settings.greetings[language]
    .replaceAll('{name}', honorific)
    .replaceAll('{agent}', settings.agentName)
    .replaceAll('{company}', settings.companyName)
    .replaceAll('{insurance}', insurance)
    .replace(/\s+([,.।?!])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
