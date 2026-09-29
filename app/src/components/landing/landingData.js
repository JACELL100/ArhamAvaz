// Sample content for the landing demos. Scripts are condensed from the app's built-in scripts in src/settings.js.
export const GREETINGS = {
  hi: 'नमस्ते प्रिया जी, मैं ArhamSecure से दीपाली बोल रही हूँ। क्या आपकी हेल्थ इंश्योरेंस के बारे में दो मिनट बात कर सकते हैं?',
  en: 'Hi Priya, I am Deepali from ArhamSecure. Do you have two minutes to talk about your health insurance?',
  hinglish: 'Hello Priya ji, main ArhamSecure se Deepali baat kar rahi hoon. Kya aapki health insurance ke baare mein do minute baat kar sakte hain?',
}

export const LANGUAGE_CHIPS = [
  { id: 'hi', label: 'Hindi' },
  { id: 'en', label: 'English' },
  { id: 'hinglish', label: 'Hinglish' },
]

export const TYPES = [
  { id: 'health', label: 'Health' },
  { id: 'life', label: 'Life' },
  { id: 'motor', label: 'Motor' },
]

export const STAGES = [
  { id: 'new', label: 'New', long: 'New policy' },
  { id: 'renewal', label: 'Renewal', long: 'Renewal' },
  { id: 'port', label: 'Port', long: 'Rollover / Port' },
]

export const SCRIPTS = {
  health: {
    new: {
      goal: 'Sell a new health insurance policy.',
      open: 'Namaste Priya ji, main Deepali bol rahi hoon. Kya aapki [[health insurance]] ke baare mein do minute baat kar sakte hain?',
      steps: [
        'Ask who needs cover and the age of the eldest member.',
        'Ask about [[existing illness]] and employer cover.',
        'Recommend a [[family floater]] and explain [[cashless treatment]].',
        'Mention [[waiting periods]] honestly, then confirm a callback time.',
      ],
    },
    renewal: {
      goal: 'Renew their health policy before it lapses.',
      open: 'Namaste Priya ji, main Deepali bol rahi hoon. Aapki [[health policy renewal]] ke regarding call kar rahi hoon.',
      steps: [
        'Ask when the policy expires and who the insurer is.',
        'Explain that renewing on time protects the [[waiting-period credit]] and [[no-claim bonus]].',
        'Ask about any hospitalisation or a new member to add.',
        'Suggest a higher [[sum insured]] and confirm a follow-up before expiry.',
      ],
    },
    port: {
      goal: 'Port their health policy to you.',
      open: 'Namaste Priya ji, main Deepali bol rahi hoon. Aapki [[health policy]] ko [[port]] karne ke baare mein baat karni thi.',
      steps: [
        'Ask which insurer, the sum insured and the expiry date.',
        'Ask what they dislike: premium, claims or [[room rent limits]].',
        'Explain [[portability]]: waiting period and bonus carry over.',
        'Note the port request is due [[45 days before renewal]].',
      ],
    },
  },
  life: {
    new: {
      goal: 'Sell a new term life insurance policy.',
      open: 'Namaste Amit ji, main Deepali bol rahi hoon. Kya aapke [[life insurance]] cover ke baare mein baat kar sakte hain?',
      steps: [
        'Ask age, occupation and who depends on them.',
        'Ask about existing cover and [[loans]].',
        'Explain [[term insurance]] in simple words.',
        'Suggest a cover level and mention [[section 80C]] and riders.',
      ],
    },
    renewal: {
      goal: 'Keep their life policy active.',
      open: 'Namaste Amit ji, main Deepali bol rahi hoon. Aapka [[life policy premium]] jald due hai.',
      steps: [
        'Ask when the [[premium]] is due.',
        'Explain the policy can lapse after the [[grace period]].',
        'Offer easy payment, including [[auto-debit]].',
        'Check if cover still fits, then confirm when they will pay.',
      ],
    },
    port: {
      goal: 'Review, upgrade or switch their life cover.',
      open: 'Namaste Amit ji, main Deepali bol rahi hoon. Aapke [[life cover]] ko review karna tha.',
      steps: [
        'Ask which policy, the cover and the yearly premium.',
        'Check if it is a low-cover [[endowment]] plan.',
        'Explain a pure [[term plan]] can give more cover for less.',
        'Advise never to stop the old policy before the new one is issued.',
      ],
    },
  },
  motor: {
    new: {
      goal: 'Sell a new motor insurance policy.',
      open: 'Namaste Rahul ji, main Deepali bol rahi hoon. Aapki [[gaadi ki insurance]] ke baare mein baat karni thi.',
      steps: [
        'Confirm the vehicle make, model and year.',
        'Remind them [[third-party cover]] is mandatory.',
        'Recommend [[Comprehensive]] with [[Zero Depreciation]] for newer vehicles.',
        'Suggest add-ons and ask for city and registration number.',
      ],
    },
    renewal: {
      goal: 'Renew their motor policy before it lapses.',
      open: 'Namaste Rahul ji, main Deepali bol rahi hoon. Aapki [[motor policy renewal]] ke regarding call kar rahi hoon.',
      steps: [
        'Ask when the policy expires and who the insurer is.',
        'Stress renewing before expiry: no inspection, keep the [[No Claim Bonus]].',
        'Ask if they made a claim last year.',
        'Offer the same cover or add [[Engine Protection]].',
      ],
    },
    port: {
      goal: 'Roll their motor policy over to you.',
      open: 'Namaste Rahul ji, main Deepali bol rahi hoon. Aapki [[motor policy]] ko [[rollover]] karne ke baare mein baat karni thi.',
      steps: [
        'Ask which insurer and when the policy expires.',
        'Ask what they are unhappy about.',
        'Reassure them the [[No Claim Bonus]] transfers on rollover.',
        'Explain there is no gap in cover if done before expiry.',
      ],
    },
  },
}

export const QUEUE = [
  { time: '09:00', name: 'Priya', initial: 'P' },
  { time: '09:05', name: 'Rahul', initial: 'R' },
  { time: '09:10', name: 'Amit', initial: 'A' },
]

export const CALLS = [
  {
    name: 'Priya Sharma', status: 'Answered', duration: '2m 14s', language: 'Hindi', insurance: 'Health', stage: 'Renewal', sub: 'Health · Renewal',
    summary: 'Customer is interested in renewing the policy and requested a follow-up.',
    transcript: [
      { who: 'AI', text: 'नमस्ते प्रिया जी, आपकी पॉलिसी रिन्यूअल के बारे में…', hindi: true },
      { who: 'Customer', text: 'Haan, mujhe renewal ke baare mein jaanna tha.' },
    ],
  },
  { name: 'Rahul Mehta', status: 'Missed', duration: '—', language: 'English', insurance: 'Motor', stage: 'Port', sub: 'Motor · Port', summary: '', transcript: [] },
  {
    name: 'Amit Shah', status: 'Answered', duration: '3m 02s', language: 'Hinglish', insurance: 'Life', stage: 'New policy', sub: 'Life · New',
    summary: 'Customer asked for a term plan quote and a callback in the evening.',
    transcript: [
      { who: 'AI', text: 'Hello Amit ji, main Deepali baat kar rahi hoon…' },
      { who: 'Customer', text: 'Haan bataiye, term plan ke baare mein.' },
    ],
  },
]
