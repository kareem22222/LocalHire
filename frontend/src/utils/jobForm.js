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

// Returns an error message string, or '' when the form passes client-side checks.
export function validateJobForm(form) {
  if (!form.title.trim() || !form.description.trim() || !form.workplaceName.trim() || !form.cityArea.trim()) {
    return 'Please fill in all required fields.'
  }
  if (!/^\d{6}$/.test(String(form.pincode || '').trim())) {
    return 'Please enter a valid 6-digit pincode.'
  }
  if (!form.state.trim()) {
    return 'Please wait for the state to load from the pincode.'
  }
  return ''
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
