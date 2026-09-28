export const COMPANY = 'ArhamAvaz'

export const LANGUAGES = [
  { id: 'hi', label: 'हिन्दी', name: 'Hindi' },
  { id: 'gu', label: 'ગુજરાતી', name: 'Gujarati' },
  { id: 'en', label: 'English', name: 'English' },
  { id: 'hinglish', label: 'Hinglish', name: 'Hinglish' },
]

const VEHICLE = {
  hi: { car: 'कार', bike: 'बाइक' },
  gu: { car: 'કાર', bike: 'બાઇક' },
  en: { car: 'car', bike: 'bike' },
  hinglish: { car: 'car', bike: 'bike' },
}

// Opening line spoken by the agent; the agent's welcome message is just {{greeting}}.
export function buildGreeting({ language, callType, name, vehicleType }) {
  const v = VEHICLE[language][vehicleType]
  const lines = {
    hi: {
      sales: `नमस्ते${name ? ` ${name} जी` : ''}, मैं ${COMPANY} से प्रिया बात कर रही हूँ। क्या आपके पास अपनी ${v} इंश्योरेंस के बारे में दो मिनट हैं?`,
      renewal: `नमस्ते${name ? ` ${name} जी` : ''}, मैं ${COMPANY} से प्रिया बात कर रही हूँ। आपकी ${v} इंश्योरेंस के रिन्यूअल के लिए कॉल किया है, क्या दो मिनट बात कर सकते हैं?`,
    },
    gu: {
      sales: `નમસ્તે${name ? ` ${name}` : ''}, હું ${COMPANY} માંથી પ્રિયા બોલું છું. શું તમારી ${v} ઇન્શ્યોરન્સ વિશે બે મિનિટ વાત કરી શકીએ?`,
      renewal: `નમસ્તે${name ? ` ${name}` : ''}, હું ${COMPANY} માંથી પ્રિયા બોલું છું. તમારી ${v} ઇન્શ્યોરન્સના રિન્યુઅલ માટે ફોન કર્યો છે, શું બે મિનિટ વાત કરી શકીએ?`,
    },
    en: {
      sales: `Hi${name ? ` ${name}` : ''}, this is Priya from ${COMPANY}. Do you have two minutes to talk about your ${v} insurance?`,
      renewal: `Hi${name ? ` ${name}` : ''}, this is Priya from ${COMPANY}, calling about renewing your ${v} insurance. Is this a good time for two minutes?`,
    },
    hinglish: {
      sales: `Hello${name ? ` ${name} ji` : ''}, main ${COMPANY} se Priya baat kar rahi hoon. Kya aapke paas apni ${v} insurance ke baare mein do minute hain?`,
      renewal: `Hello${name ? ` ${name} ji` : ''}, main ${COMPANY} se Priya baat kar rahi hoon. Aapki ${v} insurance renewal ke liye call kiya hai, kya do minute baat kar sakte hain?`,
    },
  }
  return lines[language][callType]
}
