// Pure, presentation-only formatters for job data. Kept out of components so the
// same display logic can be reused and unit-tested in isolation (SRP).

export const MAX_VISIBLE_CANDIDATES = 10
export const MAX_VISIBLE_ROLES = 6
export const MAX_VISIBLE_JOBS = 6

// Builds "City, State - Pincode" from the parts that are present.
export function formatJobLocation(job) {
  const base = [job.cityArea, job.state].filter(Boolean).join(', ')
  return job.pincode ? [base, job.pincode].filter(Boolean).join(' - ') : base
}

export const EMPLOYMENT_TYPE_LABELS = {
  FullTime: 'Full-time',
  PartTime: 'Part-time',
  Contract: 'Contract',
  Temporary: 'Temporary',
  Internship: 'Internship',
  Daily: 'Daily wage',
}

export function formatEmploymentType(job) {
  if (!job.employmentType) return ''
  return EMPLOYMENT_TYPE_LABELS[job.employmentType] || job.employmentType
}

export function formatSalary(job) {
  if (job.salaryMin == null && job.salaryMax == null) return ''
  const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`
  const range = job.salaryMin != null && job.salaryMax != null
    ? `${money(job.salaryMin)} – ${money(job.salaryMax)}`
    : money(job.salaryMin ?? job.salaryMax)
  return job.salaryPeriod ? `${range} / ${job.salaryPeriod.toLowerCase()}` : range
}

export function formatExperience(job) {
  if (job.experienceMinYears == null && job.experienceMaxYears == null) return ''
  if (job.experienceMinYears != null && job.experienceMaxYears != null) {
    return `${job.experienceMinYears}–${job.experienceMaxYears} yrs exp`
  }
  return `${job.experienceMinYears ?? job.experienceMaxYears}+ yrs exp`
}

export function formatShift(job) {
  const time = job.shiftStartTime && job.shiftEndTime
    ? `${job.shiftStartTime}–${job.shiftEndTime}`
    : (job.shiftStartTime || '')
  return [job.workingDays, time].filter(Boolean).join(', ')
}

// Short pipeline status shown on hiring role cards. Kept as a plain function so
// the branching stays readable (no nested ternaries) and is unit-testable.
export function formatRoleStatus(job) {
  if (job?.isActive === false) return 'Inactive'
  if ((job?.applicationCount ?? 0) > 0) return 'Review applicants'
  return 'New role'
}

const APPLICATION_STATUS_DISPLAY = {
  Applied: {
    summary: 'Application sent. The employer has not reviewed it yet.',
    progress: 28,
    milestone: 'Waiting for review',
  },
  Shortlisted: {
    summary: 'You were shortlisted. The employer may contact you next.',
    progress: 64,
    milestone: 'Shortlist reached',
  },
  Rejected: {
    summary: 'The employer did not select you for this role.',
    progress: 100,
    milestone: 'Application closed',
  },
  Hired: {
    summary: 'You were selected for this role.',
    progress: 100,
    milestone: 'Hired',
  },
}

export function applicationStatusDisplay(status) {
  return APPLICATION_STATUS_DISPLAY[status] ?? {
    summary: 'Your application status was updated.',
    progress: 50,
    milestone: 'Status updated',
  }
}
