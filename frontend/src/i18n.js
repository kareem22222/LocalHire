import { readonly, ref } from 'vue'

const STORAGE_KEY = 'localhire.locale'
const supported = new Set(['en', 'hi'])
let stored = 'en'
try { stored = localStorage.getItem(STORAGE_KEY) || 'en' } catch { /* use English */ }

export const locale = ref(supported.has(stored) ? stored : 'en')
document.documentElement.lang = locale.value

const hi = {
  Language: 'भाषा', English: 'English', Hindi: 'हिन्दी',
  'Create your account': 'अपना खाता बनाएँ', 'Welcome back': 'फिर से स्वागत है',
  'Join LocalHire and find the right opportunities near you.': 'LocalHire से जुड़ें और अपने पास सही अवसर खोजें।',
  'Sign in to continue your journey.': 'आगे बढ़ने के लिए साइन इन करें।',
  'Choose your path': 'अपना रास्ता चुनें', 'Tell us whether you are looking for work or hiring locally.': 'बताएँ कि आप काम खोज रहे हैं या स्थानीय भर्ती कर रहे हैं।',
  'Introduce yourself': 'अपना परिचय दें', 'Add the details people will recognise you by.': 'वे जानकारी जोड़ें जिससे लोग आपको पहचान सकें।',
  'Secure your account': 'अपना खाता सुरक्षित करें', 'Create a password and finish joining LocalHire.': 'पासवर्ड बनाएँ और LocalHire से जुड़ें।',
  'Find your account': 'अपना खाता खोजें', 'Choose your role and enter the email linked to it.': 'अपनी भूमिका चुनें और उससे जुड़ा ईमेल दर्ज करें।',
  'Enter your password to continue to LocalHire.': 'LocalHire में आगे बढ़ने के लिए पासवर्ड दर्ज करें।',
  Step: 'चरण', of: 'में से', 'I am': 'मैं हूँ', Select: 'चुनें', 'Looking for work': 'काम की तलाश में', Hiring: 'भर्ती कर रहा/रही हूँ',
  'Email address': 'ईमेल पता', 'Full name': 'पूरा नाम', Password: 'पासवर्ड', Previous: 'पिछला', Continue: 'आगे बढ़ें',
  'Create account': 'खाता बनाएँ', 'Sign in': 'साइन इन', 'Already have an account?': 'पहले से खाता है?', "Don't have an account?": 'खाता नहीं है?', 'Create one': 'खाता बनाएँ',
  'Choose how you will use LocalHire.': 'चुनें कि आप LocalHire का उपयोग कैसे करेंगे।', 'Enter your full name.': 'अपना पूरा नाम दर्ज करें।',
  'Enter your email address.': 'अपना ईमेल पता दर्ज करें।', 'Enter a valid email address.': 'मान्य ईमेल पता दर्ज करें।', 'Enter your password.': 'अपना पासवर्ड दर्ज करें।', 'Use at least 8 characters.': 'कम से कम 8 अक्षर इस्तेमाल करें।',
  'Something went wrong. Please try again.': 'कुछ गलत हुआ। कृपया फिर कोशिश करें।', 'Invalid email, password, or role.': 'ईमेल, पासवर्ड या भूमिका सही नहीं है।',
  'Too many attempts. Please wait a moment and try again.': 'बहुत अधिक प्रयास हुए। थोड़ा रुककर फिर कोशिश करें।',
  'Find work': 'काम खोजें', 'Browse nearby roles': 'पास की नौकरियाँ देखें', 'Build your profile': 'अपनी प्रोफ़ाइल बनाएँ',
  'Hire local': 'स्थानीय भर्ती', 'Post a role': 'नौकरी पोस्ट करें', 'Meet local talent': 'स्थानीय प्रतिभा देखें', Explore: 'जानें', 'Network momentum': 'नेटवर्क गतिविधि', Start: 'शुरुआत', Momentum: 'गतिविधि', Join: 'जुड़ें',
  'Dashboard': 'डैशबोर्ड', Applications: 'आवेदन', Invitations: 'निमंत्रण', 'Saved jobs': 'सहेजी गई नौकरियाँ',
  'Open roles': 'खुली नौकरियाँ', Talent: 'प्रतिभा', 'Saved candidates': 'सहेजे उम्मीदवार', Shortlists: 'चयनित सूची', 'Back to top': 'ऊपर जाएँ', 'Join LocalHire': 'LocalHire से जुड़ें',
  'Now hiring': 'अभी भर्ती जारी', 'Vacancy closed': 'भर्ती बंद', Back: 'वापस', 'Save job': 'नौकरी सहेजें', 'Saved job': 'नौकरी सहेजी गई',
  'Apply now': 'अभी आवेदन करें', 'Applying...': 'आवेदन हो रहा है…', Applied: 'आवेदन किया', Closed: 'बंद', Withdraw: 'आवेदन वापस लें', Withdrawing: 'वापस लिया जा रहा है…',
  'Application status': 'आवेदन की स्थिति', 'This vacancy is closed and no longer accepts applications.': 'यह भर्ती बंद है और अब आवेदन स्वीकार नहीं करती।',
  'Loading job details...': 'नौकरी का विवरण लोड हो रहा है…', 'Could not load job': 'नौकरी लोड नहीं हो सकी', Retry: 'फिर कोशिश करें',
  'About this job': 'इस नौकरी के बारे में', 'Job details': 'नौकरी का विवरण', 'Employment type': 'रोज़गार का प्रकार', Salary: 'वेतन', Experience: 'अनुभव', Education: 'शिक्षा', Schedule: 'समय-सारणी', Openings: 'रिक्तियाँ', Location: 'स्थान',
  'Requirements and benefits': 'आवश्यकताएँ और लाभ', Skills: 'कौशल', Languages: 'भाषाएँ', Benefits: 'लाभ', Share: 'साझा करें', Sharing: 'साझा हो रहा है…',
  'Loading vacancy…': 'नौकरी लोड हो रही है…', 'Job unavailable': 'नौकरी उपलब्ध नहीं है', 'Visit LocalHire': 'LocalHire पर जाएँ',
  'This vacancy is closed or no longer available.': 'यह भर्ती बंद है या अब उपलब्ध नहीं है।', 'We could not load this vacancy. Please try again.': 'यह नौकरी लोड नहीं हो सकी। कृपया फिर कोशिश करें।',
  'Sign in with a worker account to apply.': 'आवेदन करने के लिए काम खोजने वाले खाते से साइन इन करें।',
  'We could not share this vacancy. Copy the page address instead.': 'यह नौकरी साझा नहीं हो सकी। पेज का पता कॉपी करें।',
  'Application journey': 'आवेदन यात्रा', 'Applied jobs': 'आवेदन की गई नौकरियाँ', 'Back to jobs': 'नौकरियों पर वापस जाएँ', 'Total applications': 'कुल आवेदन', Shortlisted: 'चयनित सूची', Hired: 'नियुक्त',
  'Live status': 'वर्तमान स्थिति', 'Your journey so far': 'अब तक की आपकी यात्रा', role: 'नौकरी', roles: 'नौकरियाँ', 'Latest update': 'नवीनतम अपडेट', Updated: 'अपडेट', 'View job': 'नौकरी देखें',
  'Withdraw application': 'आवेदन वापस लें', 'No applications yet': 'अभी कोई आवेदन नहीं', 'Find a nearby role that feels right and start your journey.': 'पास की सही नौकरी खोजें और अपनी यात्रा शुरू करें।', 'Explore local jobs': 'स्थानीय नौकरियाँ देखें',
  'Application sent. The employer has not reviewed it yet.': 'आवेदन भेजा गया है। नियोक्ता ने अभी इसकी समीक्षा नहीं की है।',
  'You were shortlisted. The employer may contact you next.': 'आप चयनित सूची में हैं। नियोक्ता आपसे संपर्क कर सकता है।',
  'The employer did not select you for this role.': 'नियोक्ता ने इस नौकरी के लिए आपका चयन नहीं किया।', 'You were selected for this role.': 'इस नौकरी के लिए आपका चयन हो गया है।',
  'You withdrew this application. The original record remains for your history.': 'आपने आवेदन वापस ले लिया है। रिकॉर्ड आपके इतिहास में रहेगा।',
  'Waiting for review': 'समीक्षा की प्रतीक्षा', 'Shortlist reached': 'चयनित सूची में', 'Application closed': 'आवेदन बंद', Withdrawn: 'वापस लिया', 'Status updated': 'स्थिति अपडेट हुई',
  'Full-time': 'पूर्णकालिक', 'Part-time': 'अंशकालिक', Contract: 'अनुबंध', Temporary: 'अस्थायी', Internship: 'प्रशिक्षण', 'Daily wage': 'दैनिक वेतन',
  'Roles for you': 'आपके लिए नौकरियाँ', 'No roles found': 'कोई नौकरी नहीं मिली',
  'Try another role, area, employment type, or use your current location.': 'दूसरी नौकरी, क्षेत्र या रोज़गार प्रकार खोजें, या अपना वर्तमान स्थान इस्तेमाल करें।',
  'matching roles': 'मिलती नौकरियाँ', applications: 'आवेदन', 'profile score': 'प्रोफ़ाइल स्कोर', results: 'परिणाम', Search: 'खोजें', All: 'सभी',
  'Search by role, company, area, state, or pincode': 'पद, कंपनी, क्षेत्र, राज्य या पिनकोड से खोजें', 'Pay period': 'वेतन अवधि', 'Any period': 'कोई भी अवधि', 'Minimum pay': 'न्यूनतम वेतन', 'Maximum pay': 'अधिकतम वेतन', Any: 'कोई भी', 'Your experience': 'आपका अनुभव', Years: 'वर्ष', Distance: 'दूरी',
  'Locating...': 'स्थान खोजा जा रहा है…', 'Use my location': 'मेरा स्थान इस्तेमाल करें', 'Distance unavailable': 'दूरी उपलब्ध नहीं', 'View details': 'विवरण देखें', 'Show more roles': 'और नौकरियाँ दिखाएँ', total: 'कुल',
  'Jobs without salary are excluded only when pay filters are used; unspecified experience remains included.': 'वेतन फ़िल्टर लगाने पर ही बिना वेतन वाली नौकरियाँ हटती हैं; बिना बताए अनुभव वाली नौकरियाँ शामिल रहती हैं।',
  'Finding work locally on LocalHire': 'LocalHire पर स्थानीय काम खोज रहे हैं', 'Hiring locally on LocalHire': 'LocalHire पर स्थानीय भर्ती कर रहे हैं', 'Member since': 'सदस्य बने',
  'Edit profile': 'प्रोफ़ाइल संपादित करें', 'Saving...': 'सहेजा जा रहा है…', Save: 'सहेजें', Cancel: 'रद्द करें',
  'Personal information': 'व्यक्तिगत जानकारी', 'Your basic account and contact details.': 'आपके खाते और संपर्क की मूल जानकारी।', Email: 'ईमेल', Phone: 'फ़ोन', 'Date of birth': 'जन्म तिथि', Gender: 'लिंग',
  'Professional details': 'पेशेवर जानकारी', 'Tell nearby employers what work fits you.': 'पास के नियोक्ताओं को बताएँ कि कौन सा काम आपके लिए सही है।', 'Job title': 'पद', 'Experience in years': 'वर्षों का अनुभव', 'Professional summary': 'पेशेवर परिचय', 'Highest education': 'उच्चतम शिक्षा',
  'Helps us match you with nearby talent.': 'यह पास के अवसरों से आपका मिलान करने में मदद करता है।', 'Address line': 'पता', 'City / Area': 'शहर / क्षेत्र', State: 'राज्य', Pincode: 'पिनकोड',
  'Title is required.': 'पद का नाम आवश्यक है।', 'Description is required.': 'विवरण आवश्यक है।', 'Workplace name is required.': 'कार्यस्थल का नाम आवश्यक है।', 'City / area is required.': 'शहर / क्षेत्र आवश्यक है।',
  'Enter a valid 6-digit pincode.': 'मान्य 6 अंकों का पिनकोड दर्ज करें।', 'Please wait for the state to load from the pincode.': 'पिनकोड से राज्य लोड होने तक प्रतीक्षा करें।', 'Confirm the workplace location again before saving.': 'सहेजने से पहले कार्यस्थल की जगह फिर पुष्टि करें।',
  'Salary cannot be negative.': 'वेतन शून्य से कम नहीं हो सकता।', 'Maximum salary must be greater than or equal to minimum salary.': 'अधिकतम वेतन न्यूनतम वेतन के बराबर या उससे अधिक होना चाहिए।', 'Select a pay period when you enter a salary.': 'वेतन दर्ज करते समय वेतन अवधि चुनें।',
  'Experience must be between 0 and 60 years.': 'अनुभव 0 से 60 वर्ष के बीच होना चाहिए।', 'Maximum experience must be greater than or equal to minimum experience.': 'अधिकतम अनुभव न्यूनतम अनुभव के बराबर या उससे अधिक होना चाहिए।', 'Openings must be between 1 and 10,000.': 'रिक्तियाँ 1 से 10,000 के बीच होनी चाहिए।',
  'We could not load roles right now. Please try again.': 'अभी नौकरियाँ लोड नहीं हो सकीं। कृपया फिर कोशिश करें।', 'Back to dashboard': 'डैशबोर्ड पर वापस जाएँ',
}

export function setLocale(value) {
  locale.value = supported.has(value) ? value : 'en'
  document.documentElement.lang = locale.value
  try { localStorage.setItem(STORAGE_KEY, locale.value) } catch { /* keep in memory */ }
}

export function t(key, values = {}) {
  let text = locale.value === 'hi' ? (hi[key] || key) : key
  for (const [name, value] of Object.entries(values)) text = text.replaceAll(`{${name}}`, value)
  return text
}

export function formatDate(value, options = { dateStyle: 'medium' }) {
  return new Intl.DateTimeFormat(locale.value === 'hi' ? 'hi-IN' : 'en-IN', options).format(new Date(value))
}

export function formatNumber(value) {
  return new Intl.NumberFormat(locale.value === 'hi' ? 'hi-IN' : 'en-IN').format(value)
}

export function useI18n() {
  return { locale: readonly(locale), setLocale, t, formatDate, formatNumber }
}
