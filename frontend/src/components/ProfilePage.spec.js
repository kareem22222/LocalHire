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
  })

  it('hydrates the edit form from the user prop', async () => {
    const wrapper = mountProfilePage({
      user: {
        name: 'Asha Rao',
        email: 'asha@example.com',
        phone: '+91 98765 43210',
        dateOfBirth: '1995-05-20',
        gender: 'Female',
        addressLine: '12 MG Road',
        cityArea: 'Indiranagar',
        state: 'Karnataka',
        pincode: '560038',
      },
    })

    await wrapper.findAll('button').find((b) => b.text() === 'Edit profile').trigger('click')

    expect(wrapper.find('#profile-name').element.value).toBe('Asha Rao')
    expect(wrapper.find('#profile-phone').element.value).toBe('+91 98765 43210')
    expect(wrapper.find('#profile-dob').element.value).toBe('1995-05-20')
    expect(wrapper.find('#profile-gender').element.value).toBe('Female')
    expect(wrapper.find('#profile-address').element.value).toBe('12 MG Road')
    expect(wrapper.find('#profile-city-area').element.value).toBe('Indiranagar')
    expect(wrapper.find('#profile-state').element.value).toBe('Karnataka')
    expect(wrapper.find('#profile-pincode').element.value).toBe('560038')
  })

  it('emits the full profile payload on save, trimming text fields', async () => {
    const wrapper = mountProfilePage({ user: { name: 'Asha', role: 'Hiring' } })

    await wrapper.findAll('button').find((b) => b.text() === 'Edit profile').trigger('click')
    await wrapper.find('#profile-name').setValue('  Asha Rao  ')
    await wrapper.find('#profile-phone').setValue('  +91 98765 43210  ')
    await wrapper.find('#profile-dob').setValue('1995-05-20')
    await wrapper.find('#profile-gender').setValue('Female')
    await wrapper.find('#profile-address').setValue('  12 MG Road  ')
    await wrapper.find('#profile-city-area').setValue('  Indiranagar  ')
    await wrapper.find('#profile-state').setValue('Karnataka')
    await wrapper.find('#profile-pincode').setValue('560038')
    await wrapper.findAll('button').find((b) => b.text() === 'Save changes').trigger('click')

    const saved = wrapper.emitted('save')
    expect(saved).toHaveLength(1)
    expect(saved[0][0]).toEqual({
      name: 'Asha Rao',
      phone: '+91 98765 43210',
      dateOfBirth: '1995-05-20',
      gender: 'Female',
      addressLine: '12 MG Road',
      cityArea: 'Indiranagar',
      state: 'Karnataka',
      pincode: '560038',
    })
  })

  it('leaves edit mode after saving', async () => {
    const wrapper = mountProfilePage({ user: { name: 'Asha', role: 'Hiring' } })

    await wrapper.findAll('button').find((b) => b.text() === 'Edit profile').trigger('click')
    expect(wrapper.find('#profile-name').exists()).toBe(true)

    await wrapper.findAll('button').find((b) => b.text() === 'Save changes').trigger('click')

    expect(wrapper.find('#profile-name').exists()).toBe(false)
    expect(wrapper.findAll('button').find((b) => b.text() === 'Edit profile')).toBeTruthy()
  })

  it('restores the original values and exits edit mode on cancel', async () => {
    const wrapper = mountProfilePage({ user: { name: 'Asha', phone: '+91 100', role: 'Hiring' } })

    await wrapper.findAll('button').find((b) => b.text() === 'Edit profile').trigger('click')
    await wrapper.find('#profile-name').setValue('Changed Name')
    await wrapper.find('#profile-phone').setValue('+91 999')

    await wrapper.findAll('button').find((b) => b.text() === 'Cancel').trigger('click')

    // Back to read-only view showing the original name.
    expect(wrapper.find('#profile-name').exists()).toBe(false)
    expect(wrapper.find('.dash-welcome__name').text()).toBe('Asha')

    // Re-entering edit shows the original values, not the discarded edits.
    await wrapper.findAll('button').find((b) => b.text() === 'Edit profile').trigger('click')
    expect(wrapper.find('#profile-name').element.value).toBe('Asha')
    expect(wrapper.find('#profile-phone').element.value).toBe('+91 100')
  })
})
