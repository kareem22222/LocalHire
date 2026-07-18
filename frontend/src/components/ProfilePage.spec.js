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
})
