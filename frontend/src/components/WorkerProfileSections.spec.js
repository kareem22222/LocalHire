import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import WorkerProfileSections from './WorkerProfileSections.vue'

function workerForm() {
  return {
    workPreferences: {
      desiredRoles: [], employmentTypes: [], shifts: [], workModes: [], preferredLocations: [],
      expectedSalaryMin: '', expectedSalaryMax: '', salaryPeriod: '', availability: '',
      noticePeriodDays: '', travelRadiusKm: '', willingToRelocate: false,
      canWorkWeekends: false, ownsVehicle: false, vehicleTypes: [],
    },
    workHistory: [],
    educationHistory: [],
    skillDetails: [],
    languageDetails: [],
    credentials: [],
  }
}

function button(wrapper, text) {
  return wrapper.findAll('button').find((item) => item.text() === text)
}

describe('WorkerProfileSections', () => {
  it('edits every practical profile section and supports removing entries', async () => {
    const form = workerForm()
    const wrapper = mount(WorkerProfileSections, { props: { form, editing: true } })

    await wrapper.find('input[placeholder="Delivery rider, Store assistant"]').setValue('Cashier, Driver')
    await wrapper.find('input[placeholder="Mysuru, Mandya"]').setValue('Mysuru, Mandya')

    const employment = wrapper.findAll('fieldset')[0].find('input')
    await employment.setValue(true)
    await employment.setValue(false)
    await employment.setValue(true)
    await wrapper.findAll('fieldset')[1].find('input').setValue(true)
    await wrapper.findAll('fieldset')[2].find('input').setValue(true)

    const selects = wrapper.findAll('.worker-grid > label select')
    await selects[0].setValue('Monthly')
    await selects[1].setValue('ServingNotice')
    await wrapper.find('input[max="365"]').setValue('30')
    await wrapper.find('input[max="500"]').setValue('20')

    const readiness = wrapper.findAll('fieldset')[3].findAll('input')
    for (const checkbox of readiness) await checkbox.setValue(true)
    await wrapper.find('input[placeholder="Two-wheeler, Bicycle"]').setValue('Two-wheeler, Bicycle')

    await button(wrapper, '+ Add work experience').trigger('click')
    await button(wrapper, '+ Add education or training').trigger('click')
    await button(wrapper, '+ Add skill').trigger('click')
    await button(wrapper, '+ Add language').trigger('click')
    await button(wrapper, '+ Add licence or certificate').trigger('click')

    await wrapper.find('input[placeholder="Electrician helper"]').setValue('Electrician')
    await wrapper.find('input[placeholder="Self-employed"]').setValue('Self-employed')
    const workInputs = wrapper.findAll('.worker-card')[1].findAll('input')
    await workInputs[2].setValue('Mysuru')
    await workInputs[3].setValue('2024-01-01')
    await workInputs[4].setValue('2025-01-01')
    await wrapper.find('textarea').setValue('Local wiring work')
    await wrapper.find('input[placeholder="ITI Electrician"]').setValue('ITI Electrician')
    const educationInputs = wrapper.findAll('.worker-card')[2].findAll('input')
    await educationInputs[1].setValue('Government ITI')
    await educationInputs[2].setValue('Electrical')
    await educationInputs[3].setValue('2020')
    await educationInputs[4].setValue('2022')
    await wrapper.find('input[aria-label="Skill"]').setValue('Wiring')
    await wrapper.find('select[aria-label="Skill level"]').setValue('Advanced')
    await wrapper.find('input[aria-label="Years using skill"]').setValue('3')
    await wrapper.find('input[aria-label="Language"]').setValue('Kannada')
    await wrapper.find('select[aria-label="Language level"]').setValue('Native')
    await wrapper.find('input[placeholder="LMV driving licence"]').setValue('Wireman certificate')
    await wrapper.find('input[placeholder="RTO / training institute"]').setValue('State board')
    const credentialInputs = wrapper.findAll('.worker-card')[4].findAll('input')
    await credentialInputs[2].setValue('2025-01-01')
    await credentialInputs[3].setValue('2027-01-01')
    await credentialInputs[4].setValue('CERT-1')
    await credentialInputs[5].setValue('https://example.com/cert')

    for (const checkbox of wrapper.findAll('.entry input[type="checkbox"]')) {
      await checkbox.setValue(true)
    }

    expect(form.workPreferences.desiredRoles).toEqual(['Cashier', 'Driver'])
    expect(form.workPreferences.employmentTypes).toContain('FullTime')
    expect(form.workPreferences.vehicleTypes).toEqual(['Two-wheeler', 'Bicycle'])
    expect(form.workHistory[0].jobTitle).toBe('Electrician')
    expect(form.skillDetails[0].proficiency).toBe('Advanced')

    for (const remove of [...wrapper.findAll('button.remove')].reverse()) {
      await remove.trigger('click')
    }
    expect(form.workHistory).toHaveLength(0)
    expect(form.educationHistory).toHaveLength(0)
    expect(form.skillDetails).toHaveLength(0)
    expect(form.languageDetails).toHaveLength(0)
    expect(form.credentials).toHaveLength(0)
  })

  it('renders complete saved worker details', () => {
    const form = workerForm()
    Object.assign(form.workPreferences, {
      desiredRoles: ['Cashier'], employmentTypes: ['FullTime'], shifts: ['Day'],
      workModes: ['OnSite'], expectedSalaryMin: 15000, expectedSalaryMax: 22000,
      salaryPeriod: 'Monthly', availability: 'Immediately', travelRadiusKm: 10,
      willingToRelocate: true, canWorkWeekends: true, ownsVehicle: true,
    })
    form.workHistory.push({ jobTitle: 'Cashier', employer: 'Local Mart', location: 'Mysuru', startDate: '2024-01-01', isCurrent: true, description: 'Billing' })
    form.educationHistory.push({ qualification: '12th pass', institution: 'Government School', fieldOfStudy: 'Commerce', startYear: 2020, endYear: 2022 })
    form.skillDetails.push({ name: 'Billing', proficiency: 'Advanced', yearsExperience: 2 })
    form.languageDetails.push({ name: 'Kannada', proficiency: 'Native', canSpeak: true, canRead: true, canWrite: true })
    form.credentials.push({ name: 'POS training', issuer: 'Local Mart', credentialId: 'CERT-1', issueDate: '2025-01-01', expiryDate: '2027-01-01' })

    const text = mount(WorkerProfileSections, { props: { form } }).text()

    expect(text).toContain('Cashier')
    expect(text).toContain('Local Mart')
    expect(text).toContain('Government School')
    expect(text).toContain('Billing')
    expect(text).toContain('Kannada')
    expect(text).toContain('POS training')
  })
})
