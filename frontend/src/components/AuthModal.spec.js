import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuthModal from './AuthModal.vue'
import api, { setAuth } from '../api'

vi.mock('../api', () => ({
  default: { post: vi.fn() },
  setAuth: vi.fn(),
}))

describe('AuthModal', () => {
  beforeEach(() => {
    api.post.mockReset()
    setAuth.mockReset()
    api.post.mockResolvedValue({ data: { token: 'token' } })
  })

  it('sends role on register', async () => {
    const wrapper = mount(AuthModal)

    await wrapper.find('#auth-name').setValue('Person')
    await wrapper.find('#auth-role').setValue('Hiring')
    await wrapper.find('#auth-email').setValue('person@example.com')
    await wrapper.find('#auth-password').setValue('Password1!')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      name: 'Person',
      email: 'person@example.com',
      password: 'Password1!',
      role: 'Hiring',
    })
    expect(setAuth).toHaveBeenCalledWith('token')
  })

  it('sends role on login', async () => {
    const wrapper = mount(AuthModal)

    await wrapper.find('.auth-modal__toggle').trigger('click')
    await wrapper.find('#auth-role').setValue('LookingForWork')
    await wrapper.find('#auth-email').setValue('person@example.com')
    await wrapper.find('#auth-password').setValue('Password1!')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'person@example.com',
      password: 'Password1!',
      role: 'LookingForWork',
    })
  })
})