// Agent settings live on this device (localStorage) and are sent with every call as Bolna user_data,
// so edits take effect on the next call without touching the Bolna agent.
const KEY = 'arhamavaz.settings.v1'

export const LANGUAGES = [
  { id: 'hi', label: 'हिन्दी', name: 'Hindi' },
  { id: 'gu', label: 'ગુજરાતી', name: 'Gujarati' },
  { id: 'en', label: 'English', name: 'English' },
  { id: 'hinglish', label: 'Hinglish', name: 'Hinglish' },
]

export const SCRIPT_TYPES = [
  { id: 'new', label: 'New policy' },
  { id: 'renewal', label: 'Renewal' },
  { id: 'switching', label: 'Switching insurer' },
]

export const DEFAULT_SETTINGS = {
  agentName: 'Deepali',
  companyName: 'ArhamSecure',
  // Placeholders: {name} customer name, {agent}, {company}, {vehicle}
  greetings: {
    hi: 'नमस्ते {name}, मैं {company} से {agent} बात कर रही हूँ। क्या आपकी {vehicle} इंश्योरेंस के बारे में दो मिनट बात कर सकते हैं?',
    gu: 'નમસ્તે {name}, હું {company} માંથી {agent} બોલું છું. શું તમારી {vehicle} ઇન્શ્યોરન્સ વિશે બે મિનિટ વાત કરી શકીએ?',
    en: 'Hi {name}, I am {agent} from {company}. Do you have two minutes to talk about your {vehicle} insurance?',
    hinglish: 'Hello {name}, main {company} se {agent} baat kar rahi hoon. Kya aapki {vehicle} insurance ke baare mein do minute baat kar sakte hain?',
  },
  scripts: {
    new: `Goal: sell a brand-new policy.
1. Confirm the vehicle make, model and year, and whether it is brand new or already on the road without insurance.
2. If they are driving without insurance, gently remind them third-party cover is mandatory by law and fines apply.
3. Explain Third-Party vs Comprehensive, and recommend Comprehensive with Zero Depreciation for vehicles under 5 years old.
4. Suggest two or three relevant add-ons. Car: Engine Protection, Roadside Assistance, Return to Invoice. Bike: Personal Accident cover, Roadside Assistance, multi-year policy.
5. Ask for their city and registration number (if available) to prepare a quote.
6. Offer to send an exact quote on WhatsApp and confirm a convenient callback time.`,
    renewal: `Goal: renew their existing policy before it lapses.
1. Ask when the current policy expires and who the current insurer is.
2. Stress renewing before expiry: no vehicle inspection is needed and they keep their No Claim Bonus, which can be up to 50 percent off.
3. Ask whether they made any claim in the last year, since that affects the No Claim Bonus.
4. Ask if they want the same cover or want to add Zero Depreciation, Engine Protection or Roadside Assistance.
5. Suggest comparing our renewal quote with their current insurer's renewal notice.
6. Offer to send the renewal quote on WhatsApp and confirm a follow-up time before the expiry date.`,
    switching: `Goal: win the customer over from their current insurer.
1. Ask which insurer they are with now and when the policy expires.
2. Ask what they are unhappy about: premium, claim experience, service, or cover.
3. Address that exact pain point: a better price, faster cashless claims at network garages, or dedicated claim support.
4. Reassure them their No Claim Bonus transfers fully when switching, using their previous policy copy.
5. Explain switching is simple and happens at renewal time with no gap in cover.
6. Offer a side-by-side comparison quote on WhatsApp and confirm a callback time.`,
  },
  guidelines: `Product knowledge:
- Third-Party: mandatory by law, cheapest, covers damage to other people and property only.
- Comprehensive: covers own damage, theft, fire, floods and accidents, plus third-party.
- Never quote exact premium amounts; the premium depends on the vehicle's IDV and the advisor will share an exact quote.
Closing:
- If interested, confirm their name and a convenient time for the quote callback or WhatsApp, thank them and end.
- If not interested or they ask not to be called, apologise, confirm they won't be called again, and end politely.`,
}

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY))
    if (saved) {
      return {
        ...DEFAULT_SETTINGS,
        ...saved,
        greetings: { ...DEFAULT_SETTINGS.greetings, ...saved.greetings },
        scripts: { ...DEFAULT_SETTINGS.scripts, ...saved.scripts },
      }
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

const VEHICLE_WORDS = {
  hi: { car: 'कार', bike: 'बाइक' },
  gu: { car: 'કાર', bike: 'બાઇક' },
  en: { car: 'car', bike: 'bike' },
  hinglish: { car: 'car', bike: 'bike' },
}

// Fills the opening-line template for a language; drops {name} cleanly when no name is given.
export function buildGreeting(settings, { language, name, vehicleType }) {
  const honorific = name ? (language === 'hi' || language === 'hinglish' ? `${name} ${language === 'hi' ? 'जी' : 'ji'}` : name) : ''
  return settings.greetings[language]
    .replaceAll('{name}', honorific)
    .replaceAll('{agent}', settings.agentName)
    .replaceAll('{company}', settings.companyName)
    .replaceAll('{vehicle}', VEHICLE_WORDS[language][vehicleType])
    .replace(/\s+([,.।?!])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
