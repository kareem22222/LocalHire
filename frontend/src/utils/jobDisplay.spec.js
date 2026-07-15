import { describe, expect, it } from 'vitest'
import {
  EMPLOYMENT_TYPE_LABELS,
  formatEmploymentType,
  formatExperience,
  formatJobLocation,
  formatRoleStatus,
  formatSalary,
  formatShift,
} from './jobDisplay'

describe('formatJobLocation', () => {
  it('joins city and state and appends the pincode', () => {
    expect(formatJobLocation({ cityArea: 'Bandra', state: 'Maharashtra', pincode: '400050' }))
      .toBe('Bandra, Maharashtra - 400050')
  })

  it('omits the pincode when it is missing', () => {
    expect(formatJobLocation({ cityArea: 'Bandra', state: 'Maharashtra' }))
      .toBe('Bandra, Maharashtra')
  })

  it('drops empty parts', () => {
    expect(formatJobLocation({ cityArea: 'Bandra', state: '', pincode: '' })).toBe('Bandra')
    expect(formatJobLocation({})).toBe('')
  })
})

describe('formatEmploymentType', () => {
  it('returns an empty string when there is no type', () => {
    expect(formatEmploymentType({})).toBe('')
    expect(formatEmploymentType({ employmentType: '' })).toBe('')
  })

  it('maps known enum values to friendly labels', () => {
    expect(formatEmploymentType({ employmentType: 'FullTime' })).toBe('Full-time')
    expect(formatEmploymentType({ employmentType: 'Daily' })).toBe('Daily wage')
    expect(EMPLOYMENT_TYPE_LABELS.PartTime).toBe('Part-time')
  })

  it('falls back to the raw value for unknown types', () => {
    expect(formatEmploymentType({ employmentType: 'Seasonal' })).toBe('Seasonal')
  })
})

describe('formatSalary', () => {
  it('returns an empty string when both bounds are absent', () => {
    expect(formatSalary({ salaryMin: null, salaryMax: null })).toBe('')
  })

  it('formats a min-max range with the period', () => {
    expect(formatSalary({ salaryMin: 15000, salaryMax: 25000, salaryPeriod: 'Monthly' }))
      .toBe('₹15,000 – ₹25,000 / monthly')
  })

  it('formats a single bound without a period', () => {
    expect(formatSalary({ salaryMin: 18000, salaryMax: null })).toBe('₹18,000')
    expect(formatSalary({ salaryMin: null, salaryMax: 20000 })).toBe('₹20,000')
  })
})

describe('formatExperience', () => {
  it('returns an empty string when both bounds are absent', () => {
    expect(formatExperience({ experienceMinYears: null, experienceMaxYears: null })).toBe('')
  })

  it('formats a min-max range', () => {
    expect(formatExperience({ experienceMinYears: 1, experienceMaxYears: 3 })).toBe('1–3 yrs exp')
  })

  it('formats a single bound with a plus', () => {
    expect(formatExperience({ experienceMinYears: 2, experienceMaxYears: null })).toBe('2+ yrs exp')
    expect(formatExperience({ experienceMinYears: null, experienceMaxYears: 5 })).toBe('5+ yrs exp')
  })
})

describe('formatShift', () => {
  it('joins working days and a start-end time range', () => {
    expect(formatShift({ workingDays: 'Mon-Sat', shiftStartTime: '09:00', shiftEndTime: '18:00' }))
      .toBe('Mon-Sat, 09:00–18:00')
  })

  it('uses only the start time when the end time is missing', () => {
    expect(formatShift({ workingDays: 'Mon-Fri', shiftStartTime: '10:00', shiftEndTime: null }))
      .toBe('Mon-Fri, 10:00')
  })

  it('returns just the working days when there is no time', () => {
    expect(formatShift({ workingDays: 'Weekends' })).toBe('Weekends')
  })

  it('returns an empty string when nothing is set', () => {
    expect(formatShift({})).toBe('')
  })
})

describe('formatRoleStatus', () => {
  it('reports an inactive role', () => {
    expect(formatRoleStatus({ isActive: false, applicationCount: 5 })).toBe('Inactive')
  })

  it('reports a role that needs applicant review', () => {
    expect(formatRoleStatus({ isActive: true, applicationCount: 3 })).toBe('Review applicants')
  })

  it('reports a brand new role with no applicants', () => {
    expect(formatRoleStatus({ isActive: true, applicationCount: 0 })).toBe('New role')
    expect(formatRoleStatus({})).toBe('New role')
    expect(formatRoleStatus()).toBe('New role')
    expect(formatRoleStatus(null)).toBe('New role')
  })
})
