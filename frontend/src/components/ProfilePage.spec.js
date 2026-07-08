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

  it('renders the placeholder copy', () => {
    const wrapper = mountProfilePage({ user: { name: 'Pat' } })

    expect(wrapper.text()).toContain('Your profile details will appear here soon.')
    expect(wrapper.text()).toContain('Nothing to see here yet.')
  })

  it('emits "back" when the back button is clicked', async () => {
    const wrapper = mountProfilePage({ user: { name: 'Pat' } })

    const backButton = wrapper.find('button')
    expect(backButton.text()).toBe('Back')

    await backButton.trigger('click')

    expect(wrapper.emitted('back')).toHaveLength(1)
  })
})