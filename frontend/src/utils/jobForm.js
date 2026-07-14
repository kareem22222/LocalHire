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
  const base = String(key).split(/[.[]/)[0]
  return SERVER_FIELD_TO_FORM[base] || null
}

function validateRequiredText(form, errors) {
  const required = {
    title: 'Title is required.',
    description: 'Description is required.',
    workplaceName: 'Workplace name is required.',
    cityArea: 'City / area is required.',
  }
  for (const [field, message] of Object.entries(required)) {
    if (!String(form[field] ?? '').trim()) errors[field] = message
  }
}

function validateLocation(form, errors) {
  if (!/^\d{6}$/.test(String(form.pincode ?? '').trim())) {
    errors.pincode = 'Enter a valid 6-digit pincode.'
  } else if (!String(form.state ?? '').trim()) {
    errors.state = 'Please wait for the state to load from the pincode.'
  }
}

function validateSalary(form, errors) {
  const min = numberOrNull(form.salaryMin)
  const max = numberOrNull(form.salaryMax)
  if (isNegative(min)) errors.salaryMin = 'Salary cannot be negative.'
  if (isNegative(max)) errors.salaryMax = 'Salary cannot be negative.'
  if (min != null && max != null && max < min) {
    errors.salaryMax = 'Maximum salary must be greater than or equal to minimum salary.'
  }
  if ((min != null || max != null) && !String(form.salaryPeriod ?? '').trim()) {
    errors.salaryPeriod = 'Select a pay period when you enter a salary.'
  }
}

function validateExperience(form, errors) {
  const min = numberOrNull(form.experienceMinYears)
  const max = numberOrNull(form.experienceMaxYears)
  const message = 'Experience must be between 0 and 60 years.'
  if (isOutsideRange(min, 0, 60)) errors.experienceMinYears = message
  if (isOutsideRange(max, 0, 60)) errors.experienceMaxYears = message
  if (min != null && max != null && max < min) {
    errors.experienceMaxYears = 'Maximum experience must be greater than or equal to minimum experience.'
  }
  }

function validateOpenings(form, errors) {
  const openings = numberOrNull(form.openings)
  if (isOutsideRange(openings, 1, 10000)) {
    errors.openings = 'Openings must be between 1 and 10,000.'
  }
}

function isNegative(value) {
  return value != null && value < 0
}

function isOutsideRange(value, min, max) {
  return value != null && (value < min || value > max)
}

// Validates the form on the client and returns a { fieldKey: message } object.
// Empty object means the form passed all client-side checks. The rules mirror
// the backend CreateJobPostRequestValidator so users get the same feedback
// instantly, before a request is sent.
export function validateJobFormFields(form) {
  const errors = {}
  validateRequiredText(form, errors)
  validateLocation(form, errors)
  validateSalary(form, errors)
  validateExperience(form, errors)
  validateOpenings(form, errors)
  return errors
}

function errorText(value) {
  return Array.isArray(value) ? value.join(' ') : String(value ?? '')
}

function appendMessage(existing, text) {
  return existing ? `${existing} ${text}` : text
}

function fallbackMessage(data) {
  return data?.message || data?.error || data?.title || ''
}

export function mapServerErrors(data) {
  const fieldErrors = {}
  let generalMessage = ''

  for (const [key, value] of Object.entries(data?.errors ?? {})) {
    const text = errorText(value)
    if (!text) continue
    const field = serverKeyToField(key)
    if (field) {
      fieldErrors[field] = appendMessage(fieldErrors[field], text)
    } else {
      generalMessage = appendMessage(generalMessage, text)
    }
  }

  if (!generalMessage && Object.keys(fieldErrors).length === 0) {
    generalMessage = fallbackMessage(data)
  }

  return { fieldErrors, generalMessage }
}

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
