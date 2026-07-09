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

  it('uses the initial role when opening signup', async () => {
    const wrapper = mount(AuthModal, {
      props: { initialRole: 'Hiring' },
    })

    expect(wrapper.find('#auth-role').element.value).toBe('Hiring')

    await wrapper.find('#auth-name').setValue('Person')
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

  it('normalizes validation error keys to lowercase and displays them', async () => {
    const wrapper = mount(AuthModal)
    const errorResponse = {
      response: {
        status: 400,
        data: {
          errors: {
            Name: ['Name is required.'],
            Email: ['Invalid email format.'],
          },
        },
      },
    }
    api.post.mockRejectedValueOnce(errorResponse)

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const nameError = wrapper.find('.auth-field:nth-of-type(1) .auth-field__error')
    expect(nameError.text()).toBe('Name is required.')

    const emailError = wrapper.find('.auth-field:nth-of-type(3) .auth-field__error')
    expect(emailError.text()).toBe('Invalid email format.')
  })
})
