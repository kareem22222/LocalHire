// Pure, presentation-only formatters for job data. Kept out of components so the
// same display logic can be reused and unit-tested in isolation (SRP).

export const MAX_VISIBLE_CANDIDATES = 10

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
