import { describe, expect, it } from 'vitest'
import {
  buildJobPayload,
  emptyJobForm,
  jobResponseToForm,
  mapServerErrors,
  validateJobFormFields,
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

describe('validateJobFormFields', () => {
  const base = {
    title: 'Cashier',
    description: 'Front desk',
    workplaceName: 'Shop',
    cityArea: 'Bandra',
    pincode: '400050',
    state: 'Maharashtra',
  }

  it('returns no errors when all required fields are valid', () => {
    expect(validateJobFormFields({ ...base })).toEqual({})
  })

  it('flags each missing required text field with its own message', () => {
    expect(validateJobFormFields({ ...base, title: '   ' })).toHaveProperty('title')
    expect(validateJobFormFields({ ...base, description: '' })).toHaveProperty('description')
    expect(validateJobFormFields({ ...base, workplaceName: '' })).toHaveProperty('workplaceName')
    expect(validateJobFormFields({ ...base, cityArea: '' })).toHaveProperty('cityArea')
  })

  it('flags an invalid pincode', () => {
    expect(validateJobFormFields({ ...base, pincode: '12' }).pincode).toBe('Enter a valid 6-digit pincode.')
    expect(validateJobFormFields({ ...base, pincode: '' }).pincode).toBe('Enter a valid 6-digit pincode.')
  })

  it('flags a missing state only when the pincode is valid', () => {
    expect(validateJobFormFields({ ...base, state: '   ' }).state)
      .toBe('Please wait for the state to load from the pincode.')
    // A bad pincode reports the pincode error, not the state error.
    expect(validateJobFormFields({ ...base, pincode: '12', state: '' }).state).toBeUndefined()
  })

  it('flags a maximum salary below the minimum', () => {
    const errors = validateJobFormFields({ ...base, salaryMin: '20000', salaryMax: '10000', salaryPeriod: 'Monthly' })
    expect(errors.salaryMax).toBe('Maximum salary must be greater than or equal to minimum salary.')
  })

  it('requires a pay period when a salary is entered', () => {
    const errors = validateJobFormFields({ ...base, salaryMin: '15000' })
    expect(errors.salaryPeriod).toBe('Select a pay period when you enter a salary.')
  })

  it('flags negative and out-of-range numeric fields', () => {
    expect(validateJobFormFields({ ...base, salaryMin: '-5', salaryPeriod: 'Monthly' }).salaryMin)
      .toBe('Salary cannot be negative.')
    expect(validateJobFormFields({ ...base, experienceMinYears: '70' }).experienceMinYears)
      .toBe('Experience must be between 0 and 60 years.')
    expect(validateJobFormFields({ ...base, openings: '0' }).openings)
      .toBe('Openings must be between 1 and 10,000.')
  })

  it('flags a maximum experience below the minimum', () => {
    const errors = validateJobFormFields({ ...base, experienceMinYears: '5', experienceMaxYears: '2' })
    expect(errors.experienceMaxYears).toBe('Maximum experience must be greater than or equal to minimum experience.')
  })
})

describe('mapServerErrors', () => {
  it('maps ValidationProblemDetails errors to form field keys', () => {
    const { fieldErrors, generalMessage } = mapServerErrors({
      title: 'One or more validation errors occurred.',
      status: 400,
      errors: {
        Title: ["'Title' must not be empty."],
        SalaryMax: ['Maximum salary must be greater than or equal to minimum salary.'],
      },
    })
    expect(fieldErrors.title).toBe("'Title' must not be empty.")
    expect(fieldErrors.salaryMax).toBe('Maximum salary must be greater than or equal to minimum salary.')
    expect(generalMessage).toBe('')
  })

  it('collapses list-item and count error keys to the base field', () => {
    const { fieldErrors } = mapServerErrors({
      errors: {
        'RequiredSkills[0]': ['Skill must not be empty.'],
        'Benefits.Count': ['A maximum of 30 benefits is allowed.'],
      },
    })
    expect(fieldErrors.requiredSkills).toBe('Skill must not be empty.')
    expect(fieldErrors.benefits).toBe('A maximum of 30 benefits is allowed.')
  })

  it('routes unmappable keys into the general message', () => {
    const { fieldErrors, generalMessage } = mapServerErrors({
      errors: { coordinates: ['Latitude and longitude must be supplied together.'] },
    })
    expect(fieldErrors).toEqual({})
    expect(generalMessage).toBe('Latitude and longitude must be supplied together.')
  })

  it('falls back to message/error/title when there is no errors object', () => {
    expect(mapServerErrors({ message: 'Boom' }).generalMessage).toBe('Boom')
    expect(mapServerErrors({ error: 'Nope' }).generalMessage).toBe('Nope')
    expect(mapServerErrors({ title: 'Bad request' }).generalMessage).toBe('Bad request')
    expect(mapServerErrors(undefined).generalMessage).toBe('')
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
