// Shared helpers for the job posting form, used by the create (PostJobView)
// and view/edit (JobDetailView) flows so they stay in sync.

export function emptyJobForm() {
  return {
    title: '',
    description: '',
    workplaceName: '',
    cityArea: '',
    pincode: '',
    state: '',
    latitude: null,
    longitude: null,
    employmentType: '',
    salaryMin: '',
    salaryMax: '',
    salaryPeriod: '',
    minEducation: '',
    experienceMinYears: '',
    experienceMaxYears: '',
    workingDays: '',
    shiftStartTime: '',
    shiftEndTime: '',
    openings: '',
    requiredSkills: '',
    languages: '',
    benefits: '',
  }
}

// Maps a JobPostResponse from the API into the flat, string-friendly shape the
// form uses. List fields become comma-separated text; nullable values fall back
// to empty strings so inputs stay controlled.
export function jobResponseToForm(job) {
  return {
    title: job.title ?? '',
    description: job.description ?? '',
    workplaceName: job.workplaceName ?? '',
    cityArea: job.cityArea ?? '',
    pincode: job.pincode ?? '',
    state: job.state ?? '',
    latitude: job.latitude ?? null,
    longitude: job.longitude ?? null,
    employmentType: job.employmentType ?? '',
    salaryMin: job.salaryMin ?? '',
    salaryMax: job.salaryMax ?? '',
    salaryPeriod: job.salaryPeriod ?? '',
    minEducation: job.minEducation ?? '',
    experienceMinYears: job.experienceMinYears ?? '',
    experienceMaxYears: job.experienceMaxYears ?? '',
    workingDays: job.workingDays ?? '',
    shiftStartTime: job.shiftStartTime ?? '',
    shiftEndTime: job.shiftEndTime ?? '',
    openings: job.openings ?? '',
    requiredSkills: (job.requiredSkills ?? []).join(', '),
    languages: (job.languages ?? []).join(', '),
    benefits: (job.benefits ?? []).join(', '),
  }
}

function hasValidCoordinates(latitude, longitude) {
  if (latitude == null || longitude == null || latitude === '' || longitude === '') return false
  const lat = Number(latitude)
  const lng = Number(longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

function numberOrNull(value) {
  const text = String(value ?? '').trim()
  if (text === '') return null
  const num = Number(text)
  return Number.isFinite(num) ? num : null
}

function splitList(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}
const SERVER_FIELD_TO_FORM = {
  Title: 'title',
  Description: 'description',
  WorkplaceName: 'workplaceName',
  CityArea: 'cityArea',
  Pincode: 'pincode',
  State: 'state',
  Latitude: 'latitude',
  Longitude: 'longitude',
  EmploymentType: 'employmentType',
  SalaryMin: 'salaryMin',
  SalaryMax: 'salaryMax',
  SalaryPeriod: 'salaryPeriod',
  MinEducation: 'minEducation',
  ExperienceMinYears: 'experienceMinYears',
  ExperienceMaxYears: 'experienceMaxYears',
  WorkingDays: 'workingDays',
  ShiftStartTime: 'shiftStartTime',
  ShiftEndTime: 'shiftEndTime',
  Openings: 'openings',
  RequiredSkills: 'requiredSkills',
  Languages: 'languages',
  Benefits: 'benefits',
}

function serverKeyToField(key) {
  // Strip any "[index]" or ".Count" suffix down to the base property name.
  const base = String(key).split(/[.[]/)[0]
  return SERVER_FIELD_TO_FORM[base] || null
}

// Validates the form on the client and returns a { fieldKey: message } object.
// Empty object means the form passed all client-side checks. The rules mirror
// the backend CreateJobPostRequestValidator so users get the same feedback
// instantly, before a request is sent.
export function validateJobFormFields(form) {
  const errors = {}

  if (!String(form.title ?? '').trim()) errors.title = 'Title is required.'
  if (!String(form.description ?? '').trim()) errors.description = 'Description is required.'
  if (!String(form.workplaceName ?? '').trim()) errors.workplaceName = 'Workplace name is required.'
  if (!String(form.cityArea ?? '').trim()) errors.cityArea = 'City / area is required.'

  if (!/^\d{6}$/.test(String(form.pincode ?? '').trim())) {
    errors.pincode = 'Enter a valid 6-digit pincode.'
  } else if (!String(form.state ?? '').trim()) {
    errors.state = 'Please wait for the state to load from the pincode.'
  }

  const salaryMin = numberOrNull(form.salaryMin)
  const salaryMax = numberOrNull(form.salaryMax)
  if (salaryMin != null && salaryMin < 0) errors.salaryMin = 'Salary cannot be negative.'
  if (salaryMax != null && salaryMax < 0) errors.salaryMax = 'Salary cannot be negative.'
  if (salaryMin != null && salaryMax != null && salaryMax < salaryMin) {
    errors.salaryMax = 'Maximum salary must be greater than or equal to minimum salary.'
  }
  if ((salaryMin != null || salaryMax != null) && !String(form.salaryPeriod ?? '').trim()) {
    errors.salaryPeriod = 'Select a pay period when you enter a salary.'
  }

  const expMin = numberOrNull(form.experienceMinYears)
  const expMax = numberOrNull(form.experienceMaxYears)
  if (expMin != null && (expMin < 0 || expMin > 60)) {
    errors.experienceMinYears = 'Experience must be between 0 and 60 years.'
  }
  if (expMax != null && (expMax < 0 || expMax > 60)) {
    errors.experienceMaxYears = 'Experience must be between 0 and 60 years.'
  }
  if (expMin != null && expMax != null && expMax < expMin) {
    errors.experienceMaxYears = 'Maximum experience must be greater than or equal to minimum experience.'
  }

  const openings = numberOrNull(form.openings)
  if (openings != null && (openings < 1 || openings > 10000)) {
    errors.openings = 'Openings must be between 1 and 10,000.'
  }

  return errors
}

// Turns an API error response body (RFC 7807 ValidationProblemDetails) into
// per-field messages plus a general fallback message. Field-specific entries go
// into fieldErrors keyed by form field; anything that can't be mapped to a field
// (or a plain error/message payload) becomes generalMessage.
export function mapServerErrors(data) {
  const fieldErrors = {}
  let generalMessage = ''

  const serverErrors = data?.errors
  if (serverErrors && typeof serverErrors === 'object') {
    for (const [key, value] of Object.entries(serverErrors)) {
      const text = Array.isArray(value) ? value.join(' ') : String(value)
      if (!text) continue
      const field = serverKeyToField(key)
      if (field) {
        fieldErrors[field] = fieldErrors[field] ? `${fieldErrors[field]} ${text}` : text
      } else {
        generalMessage = generalMessage ? `${generalMessage} ${text}` : text
      }
    }
  }

  if (!generalMessage && Object.keys(fieldErrors).length === 0) {
    generalMessage = data?.message || data?.error || data?.title || ''
  }

  return { fieldErrors, generalMessage }
}

// Builds the API payload (matches CreateJobPostRequest) from the form state.
export function buildJobPayload(form) {
  const hasCoords = hasValidCoordinates(form.latitude, form.longitude)
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    workplaceName: form.workplaceName.trim(),
    cityArea: form.cityArea.trim(),
    state: form.state.trim() || null,
    pincode: form.pincode.trim() || null,
    latitude: hasCoords ? Number(form.latitude) : null,
    longitude: hasCoords ? Number(form.longitude) : null,
    employmentType: form.employmentType || null,
    salaryMin: numberOrNull(form.salaryMin),
    salaryMax: numberOrNull(form.salaryMax),
    salaryPeriod: form.salaryPeriod || null,
    minEducation: form.minEducation.trim() || null,
    experienceMinYears: numberOrNull(form.experienceMinYears),
    experienceMaxYears: numberOrNull(form.experienceMaxYears),
    workingDays: form.workingDays.trim() || null,
    shiftStartTime: form.shiftStartTime || null,
    shiftEndTime: form.shiftEndTime || null,
    openings: numberOrNull(form.openings),
    requiredSkills: splitList(form.requiredSkills),
    languages: splitList(form.languages),
    benefits: splitList(form.benefits),
  }
}
