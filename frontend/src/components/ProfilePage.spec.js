import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api'
import ProfilePage from './ProfilePage.vue'

vi.mock('../api', () => ({ default: { get: vi.fn(), put: vi.fn() } }))

function mountProfilePage(props = {}) {
  return mount(ProfilePage, { props })
}

describe('ProfilePage', () => {
  beforeEach(() => api.get.mockReset())

  it('renders the user name when a user is provided', () => {
    const wrapper = mountProfilePage({ user: { name: 'Pat Doe' } })

    expect(wrapper.find('.dash-welcome__name').text()).toBe('Pat Doe')
  })

  it('falls back to "User" when no user prop is provided', () => {
    const wrapper = mountProfilePage()

    expect(wrapper.find('.dash-welcome__name').text()).toBe('User')
  })

  it('falls back to "User" when the user has no name', () => {
    const wrapper = mountProfilePage({ user: {} })

    expect(wrapper.find('.dash-welcome__name').text()).toBe('User')
  })

  it('defaults the user prop to null when not provided', () => {
    const wrapper = mountProfilePage()

    expect(wrapper.props('user')).toBeNull()
  })

  it('shows initials derived from the user name', () => {
    const wrapper = mountProfilePage({ user: { name: 'Pat Doe' } })

    expect(wrapper.find('.profile-hero__avatar').text()).toBe('PD')
  })

  it('shows the hiring role badge', () => {
    const wrapper = mountProfilePage({ user: { name: 'Acme', role: 'Hiring' } })

    expect(wrapper.find('.profile-badge--role').text()).toBe('Hiring')
  })

  it('renders the personal information and location sections only', () => {
    const wrapper = mountProfilePage({ user: { name: 'Pat', role: 'Hiring' } })

    expect(wrapper.text()).toContain('Personal information')
    expect(wrapper.text()).toContain('Location')
    expect(wrapper.text()).not.toContain('Professional details')
    expect(wrapper.text()).not.toContain('Company details')
  })

  it('shows worker professional fields and makes the resume optional', () => {
    const wrapper = mountProfilePage({ user: { name: 'Pat', role: 'LookingForWork', isProfileComplete: false } })

    expect(wrapper.text()).toContain('Professional details')
    expect(wrapper.text()).toContain('Resume (optional')
    expect(wrapper.text()).toContain('Complete the required')
    expect(wrapper.findAll('button').some((button) => button.text() === 'Back')).toBe(false)
  })

  it('emits "back" when the back button is clicked', async () => {
    const wrapper = mountProfilePage({ user: { name: 'Pat' } })

    const backButton = wrapper.findAll('button').find((b) => b.text() === 'Back')
    expect(backButton).toBeTruthy()

    await backButton.trigger('click')

    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  it('enters edit mode and emits "save" with the form payload', async () => {
    const wrapper = mountProfilePage({ user: { name: 'Pat', role: 'Hiring' } })

    const editButton = wrapper.findAll('button').find((b) => b.text() === 'Edit profile')
    await editButton.trigger('click')

    const nameInput = wrapper.find('#profile-name')
    await nameInput.setValue('Pat Updated')

    const saveButton = wrapper.findAll('button').find((b) => b.text() === 'Save')
    await saveButton.trigger('click')

    const saved = wrapper.emitted('save')
    expect(saved).toHaveLength(1)
    expect(saved[0][0].name).toBe('Pat Updated')
    expect(saved[0][0].dateOfBirth).toBeNull()
  })

  it('blocks an invalid salary range and explains why', async () => {
    const wrapper = mountProfilePage({ user: { name: 'Pat', role: 'LookingForWork' } })
    await wrapper.findAll('button').find((button) => button.text() === 'Edit profile').trigger('click')
    const salaryInputs = wrapper.findAll('input[type="number"]').filter((input) => ['15000', '22000'].includes(input.attributes('placeholder')))
    await salaryInputs[0].setValue('25000')
    await salaryInputs[1].setValue('15000')
    await wrapper.findAll('button').find((button) => button.text() === 'Save').trigger('click')

    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.get('[role="alert"]').text()).toContain('Maximum expected salary cannot be less than minimum expected salary.')
  })

  it('keeps the profile draft when a resume upload updates the user', async () => {
    const user = { name: 'Pat', role: 'LookingForWork' }
    const wrapper = mountProfilePage({ user })
    await wrapper.findAll('button').find((button) => button.text() === 'Edit profile').trigger('click')
    await wrapper.find('#profile-name').setValue('Pat Draft')

    await wrapper.setProps({ user: { ...user, resumeFileName: 'pat-cv.pdf' } })

    expect(wrapper.find('#profile-name').element.value).toBe('Pat Draft')
    expect(wrapper.text()).toContain('pat-cv.pdf')
    expect(wrapper.find('.resume-upload__status').text()).toBe('Uploaded')
    expect(wrapper.findAll('button').some((button) => button.text() === 'Save')).toBe(true)
  })

  it('downloads the stored worker resume through the profile API', async () => {
    api.get.mockResolvedValue({ data: {} })
    const wrapper = mountProfilePage({
      user: { name: 'Pat', role: 'LookingForWork', resumeFileName: 'pat-cv.pdf' },
    })

    await wrapper.findAll('button').find((button) => button.text() === 'Download').trigger('click')
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/me/resume')
  })

  it('rejects an unsafe stored resume URL', async () => {
    api.get.mockResolvedValue({ data: { url: 'data:text/html,unsafe' } })
    const wrapper = mountProfilePage({
      user: { name: 'Pat', role: 'LookingForWork', resumeFileName: 'pat-cv.pdf' },
    })

    await wrapper.findAll('button').find((button) => button.text() === 'Download').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to download resume.')
  })

  it('reports all invalid worker sections before sending them', async () => {
    const workHistory = Array.from({ length: 11 }, () => ({
      jobTitle: '', employer: '', location: '', startDate: '2026-02-01',
      endDate: '2026-01-01', isCurrent: false, description: '',
    }))
    const educationHistory = Array.from({ length: 11 }, () => ({
      qualification: '', institution: '', fieldOfStudy: '', startYear: 1940, endYear: 1930,
    }))
    const skillDetails = Array.from({ length: 31 }, (_, index) => ({ name: index ? `Skill ${index}` : '', proficiency: '', yearsExperience: '' }))
    const languageDetails = Array.from({ length: 16 }, (_, index) => ({ name: index ? `Language ${index}` : '', proficiency: '', canSpeak: true, canRead: false, canWrite: false }))
    const credentials = Array.from({ length: 16 }, (_, index) => ({
      name: index ? `Certificate ${index}` : '', issuer: index ? 'Issuer' : '',
      issueDate: '2026-02-01', expiryDate: '2026-01-01',
      credentialId: '', url: index ? '' : 'ftp://invalid.example',
    }))
    const wrapper = mountProfilePage({ user: {
      name: 'Pat', role: 'LookingForWork', phone: 'bad', dateOfBirth: '2999-01-01',
      pincode: '12', experienceYears: 61, workHistory, educationHistory,
      skillDetails, languageDetails, credentials,
      workPreferences: {
        desiredRoles: Array.from({ length: 11 }, (_, index) => `Role ${index}`),
        employmentTypes: [], shifts: [], workModes: [],
        preferredLocations: Array.from({ length: 11 }, (_, index) => `Place ${index}`),
        expectedSalaryMin: -1, expectedSalaryMax: 100, salaryPeriod: '',
        availability: 'ServingNotice', noticePeriodDays: 366, travelRadiusKm: 0,
        willingToRelocate: false, canWorkWeekends: false, ownsVehicle: false, vehicleTypes: [],
      },
    } })

    await wrapper.findAll('button').find((item) => item.text() === 'Edit profile').trigger('click')
    await wrapper.findAll('button').find((item) => item.text() === 'Save').trigger('click')
    const initialAlert = wrapper.get('[role="alert"]').text()
    expect(initialAlert).toContain('Enter a valid phone number.')
    expect(initialAlert).toContain('Date of birth cannot be in the future.')

    await wrapper.find('#profile-phone').setValue('+91 90000 00000')
    await wrapper.find('#profile-dob').setValue('1995-01-01')
    await wrapper.find('#profile-gender').setValue('Female')
    await wrapper.find('#profile-job-title').setValue('Senior Cashier')
    await wrapper.find('#profile-experience').setValue('3')
    await wrapper.find('#profile-summary').setValue('Local retail experience')
    await wrapper.find('#profile-education').setValue('12th pass')
    await wrapper.find('#profile-address').setValue('Market Road')
    await wrapper.find('#profile-city-area').setValue('Mysuru')
    await wrapper.find('#profile-state').setValue('Karnataka')
    await wrapper.find('#profile-pincode').setValue('570001')
    await wrapper.findAll('button').find((item) => item.text() === 'Save').trigger('click')

    const alert = wrapper.get('[role="alert"]').text()
    expect(wrapper.emitted('save')).toBeUndefined()
    expect(alert).toContain('Add at most 10 work-history entries.')
    expect(alert).toContain('Education 1: enter a valid year.')
    expect(alert).toContain('verification link must start with http:// or https://.')
  })

  it('maps and saves a complete structured worker profile', async () => {
    const wrapper = mountProfilePage({ user: {
      name: 'Pat', role: 'LookingForWork', createdAt: '2025-01-01T00:00:00Z',
      cityArea: 'Mysuru', state: 'Karnataka', pincode: '570001',
      skills: ['Fallback skill'], languages: ['Fallback language'],
      workPreferences: {
        desiredRoles: ['Cashier'], employmentTypes: ['FullTime'], shifts: ['Day'],
        workModes: ['OnSite'], preferredLocations: ['Mysuru'],
        expectedSalaryMin: 15000, expectedSalaryMax: 22000, salaryPeriod: 'Monthly',
        availability: 'Immediately', noticePeriodDays: null, travelRadiusKm: 10,
        willingToRelocate: false, canWorkWeekends: true, ownsVehicle: true, vehicleTypes: ['Two-wheeler'],
      },
      workHistory: [{ jobTitle: 'Cashier', employer: 'Local Mart', location: 'Mysuru', startDate: '2024-01-01', endDate: '', isCurrent: true, description: 'Billing' }],
      educationHistory: [{ qualification: '12th pass', institution: 'Government School', fieldOfStudy: 'Commerce', startYear: 2020, endYear: 2022 }],
      skillDetails: [{ name: 'Billing', proficiency: 'Advanced', yearsExperience: 2 }],
      languageDetails: [{ name: 'Kannada', proficiency: 'Native', canSpeak: true, canRead: true, canWrite: true }],
      credentials: [{ name: 'POS training', issuer: 'Local Mart', issueDate: '2025-01-01', expiryDate: '2027-01-01', credentialId: 'CERT-1', url: 'https://example.com/cert' }],
    } })

    await wrapper.findAll('button').find((item) => item.text() === 'Edit profile').trigger('click')
    await wrapper.findAll('button').find((item) => item.text() === 'Save').trigger('click')

    const payload = wrapper.emitted('save')[0][0]
    expect(payload.workPreferences.expectedSalaryMin).toBe(15000)
    expect(payload.workHistory[0].endDate).toBeNull()
    expect(payload.educationHistory[0].startYear).toBe(2020)
    expect(payload.skillDetails[0].yearsExperience).toBe(2)
    expect(payload.skills).toEqual(['Billing'])
    expect(payload.languages).toEqual(['Kannada'])
  })

  it('cancels edits and emits selected resume files', async () => {
    const wrapper = mountProfilePage({ user: { name: 'Pat', role: 'LookingForWork' } })
    await wrapper.findAll('button').find((item) => item.text() === 'Edit profile').trigger('click')
    await wrapper.find('#profile-name').setValue('Changed')
    await wrapper.findAll('button').find((item) => item.text() === 'Cancel').trigger('click')
    expect(wrapper.text()).toContain('Pat')
    expect(wrapper.text()).not.toContain('Changed')

    const file = new File(['cv'], 'pat-cv.pdf', { type: 'application/pdf' })
    const input = wrapper.find('#profile-resume')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    expect(wrapper.emitted('upload-resume')[0][0]).toBe(file)
  })

  it('builds structured fallbacks from legacy skills and closes after a confirmed save', async () => {
    const user = { name: 'Pat', role: 'LookingForWork', skills: ['Billing'], languages: ['Kannada'] }
    const wrapper = mountProfilePage({ user })
    expect(wrapper.text()).toContain('Billing')
    expect(wrapper.text()).toContain('Kannada')

    await wrapper.findAll('button').find((item) => item.text() === 'Edit profile').trigger('click')
    await wrapper.setProps({ user: { ...user, name: 'Pat Saved' }, saveVersion: 1 })

    expect(wrapper.text()).toContain('Pat Saved')
    expect(wrapper.findAll('button').some((item) => item.text() === 'Edit profile')).toBe(true)
  })
})
