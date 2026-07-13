import { describe, expect, it } from 'vitest'
import {
  buildJobPayload,
  emptyJobForm,
  jobResponseToForm,
  validateJobForm,
} from './jobForm'

describe('emptyJobForm', () => {
  it('returns a blank form with the expected keys', () => {
    const form = emptyJobForm()
    expect(form.title).toBe('')
    expect(form.latitude).toBeNull()
    expect(form.longitude).toBeNull()
    expect(Object.keys(form)).toContain('requiredSkills')
  })
})

describe('jobResponseToForm', () => {
  it('maps a full response into flat, string-friendly fields', () => {
    const form = jobResponseToForm({
      title: 'Cashier',
      description: 'Front desk',
      workplaceName: 'Shop',
      cityArea: 'Bandra',
      pincode: '400050',
      state: 'Maharashtra',
      latitude: 12.9,
      longitude: 77.6,
      employmentType: 'FullTime',
      salaryMin: 15000,
      salaryMax: 25000,
      salaryPeriod: 'Monthly',
      minEducation: '10th',
      experienceMinYears: 1,
      experienceMaxYears: 3,
      workingDays: 'Mon-Sat',
      shiftStartTime: '09:00',
      shiftEndTime: '18:00',
      openings: 2,
      requiredSkills: ['Billing', 'Stock'],
      languages: ['Hindi'],
      benefits: ['PF'],
    })
    expect(form.title).toBe('Cashier')
    expect(form.latitude).toBe(12.9)
    expect(form.requiredSkills).toBe('Billing, Stock')
    expect(form.languages).toBe('Hindi')
    expect(form.benefits).toBe('PF')
  })

  it('applies fallbacks for missing values', () => {
    const form = jobResponseToForm({})
    expect(form.title).toBe('')
    expect(form.latitude).toBeNull()
    expect(form.salaryMin).toBe('')
    expect(form.requiredSkills).toBe('')
    expect(form.languages).toBe('')
    expect(form.benefits).toBe('')
  })
})

describe('validateJobForm', () => {
  const base = {
    title: 'Cashier',
    description: 'Front desk',
    workplaceName: 'Shop',
    cityArea: 'Bandra',
    pincode: '400050',
    state: 'Maharashtra',
  }

  it('passes when all required fields are valid', () => {
    expect(validateJobForm({ ...base })).toBe('')
  })

  it('flags missing required text fields', () => {
    expect(validateJobForm({ ...base, title: '   ' })).toBe('Please fill in all required fields.')
    expect(validateJobForm({ ...base, description: '' })).toBe('Please fill in all required fields.')
    expect(validateJobForm({ ...base, workplaceName: '' })).toBe('Please fill in all required fields.')
    expect(validateJobForm({ ...base, cityArea: '' })).toBe('Please fill in all required fields.')
  })

  it('flags an invalid pincode', () => {
    expect(validateJobForm({ ...base, pincode: '12' })).toBe('Please enter a valid 6-digit pincode.')
    expect(validateJobForm({ ...base, pincode: '' })).toBe('Please enter a valid 6-digit pincode.')
  })

  it('flags a missing state', () => {
    expect(validateJobForm({ ...base, state: '   ' })).toBe('Please wait for the state to load from the pincode.')
  })
})

describe('buildJobPayload', () => {
  const base = {
    title: ' Cashier ',
    description: ' Front desk ',
    workplaceName: ' Shop ',
    cityArea: ' Bandra ',
    state: ' Maharashtra ',
    pincode: ' 400050 ',
    latitude: 12.9,
    longitude: 77.6,
    employmentType: 'FullTime',
    salaryMin: '15000',
    salaryMax: '25000',
    salaryPeriod: 'Monthly',
    minEducation: ' 10th ',
    experienceMinYears: '1',
    experienceMaxYears: '3',
    workingDays: ' Mon-Sat ',
    shiftStartTime: '09:00',
    shiftEndTime: '18:00',
    openings: '2',
    requiredSkills: 'Billing, Stock , ',
    languages: 'Hindi',
    benefits: '',
  }

  it('trims text, coerces numbers, and splits lists', () => {
    const payload = buildJobPayload({ ...base })
    expect(payload.title).toBe('Cashier')
    expect(payload.state).toBe('Maharashtra')
    expect(payload.latitude).toBe(12.9)
    expect(payload.longitude).toBe(77.6)
    expect(payload.salaryMin).toBe(15000)
    expect(payload.openings).toBe(2)
    expect(payload.requiredSkills).toEqual(['Billing', 'Stock'])
    expect(payload.languages).toEqual(['Hindi'])
    expect(payload.benefits).toEqual([])
  })

  it('nulls out invalid coordinates and empty numbers/text', () => {
    const payload = buildJobPayload({
      ...base,
      latitude: 999,
      longitude: 77.6,
      state: '  ',
      pincode: '  ',
      salaryMin: '',
      salaryMax: 'abc',
      minEducation: '',
      openings: '',
    })
    expect(payload.latitude).toBeNull()
    expect(payload.longitude).toBeNull()
    expect(payload.state).toBeNull()
    expect(payload.pincode).toBeNull()
    expect(payload.salaryMin).toBeNull()
    expect(payload.salaryMax).toBeNull()
    expect(payload.minEducation).toBeNull()
    expect(payload.openings).toBeNull()
  })

  it('treats null/empty coordinate fields as no coordinates', () => {
    const payload = buildJobPayload({ ...base, latitude: null, longitude: '' })
    expect(payload.latitude).toBeNull()
    expect(payload.longitude).toBeNull()
  })
})
