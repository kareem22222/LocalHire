import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ProfilePage from './ProfilePage.vue'

function mountProfilePage(props = {}) {
  return mount(ProfilePage, { props })
}

describe('ProfilePage', () => {
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
    expect(wrapper.find('.profile-hero__headline').text()).toBe('Hiring locally on LocalHire')
  })

  it('shows worker-specific copy without hiring language', () => {
    const wrapper = mountProfilePage({ user: { name: 'Pat', role: 'LookingForWork' } })

    expect(wrapper.find('.profile-badge--role').text()).toBe('Worker')
    expect(wrapper.find('.profile-hero__headline').text()).toBe('Looking for work on LocalHire')
    expect(wrapper.find('.profile-card__hint').text()).not.toContain('nearby talent')
  })

  it('shows and hydrates the job title only for workers', async () => {
    const worker = mountProfilePage({ user: { name: 'Pat', role: 'LookingForWork', jobTitle: 'Electrician' } })
    await worker.findAll('button').find((button) => button.text() === 'Edit profile').trigger('click')

    expect(worker.find('#profile-job-title').element.value).toBe('Electrician')

    const hiring = mountProfilePage({ user: { name: 'Acme', role: 'Hiring', jobTitle: 'Ignored' } })
    await hiring.findAll('button').find((button) => button.text() === 'Edit profile').trigger('click')

    expect(hiring.find('#profile-job-title').exists()).toBe(false)
  })

  it('renders the personal information and location sections only', () => {
    const wrapper = mountProfilePage({ user: { name: 'Pat', role: 'Hiring' } })

    expect(wrapper.text()).toContain('Personal information')
    expect(wrapper.text()).toContain('Location')
    expect(wrapper.text()).not.toContain('Professional details')
    expect(wrapper.text()).not.toContain('Company details')
  })

  it('emits "back" when the back button is clicked', async () => {
    const wrapper = mountProfilePage({ user: { name: 'Pat' } })

    const backButton = wrapper.findAll('button').find((b) => b.text() === 'Back')
    expect(backButton).toBeTruthy()

    await backButton.trigger('click')

    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  it('enters edit mode and emits "save" with the worker job title', async () => {
    const wrapper = mountProfilePage({ user: { name: 'Pat', role: 'LookingForWork', jobTitle: 'Electrician' } })

    const editButton = wrapper.findAll('button').find((b) => b.text() === 'Edit profile')
    await editButton.trigger('click')

    const nameInput = wrapper.find('#profile-name')
    await nameInput.setValue('Pat Updated')
    await wrapper.find('#profile-job-title').setValue('Plumber')

    const saveButton = wrapper.findAll('button').find((b) => b.text() === 'Save')
    await saveButton.trigger('click')

    const saved = wrapper.emitted('save')
    expect(saved).toHaveLength(1)
    expect(saved[0][0].name).toBe('Pat Updated')
    expect(saved[0][0].jobTitle).toBe('Plumber')
  })
})
