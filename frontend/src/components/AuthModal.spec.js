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
    expect(wrapper.emitted('success')).toEqual([[{ mode: 'register' }]])
  })

  it('uses the initial role when opening signup', async () => {
    const wrapper = mount(AuthModal, {
      props: { initialRole: '' },
    })

    expect(wrapper.find('#auth-role').element.value).toBe('')

    await wrapper.find('#auth-name').setValue('Person')
    await wrapper.find('#auth-email').setValue('person@example.com')
    await wrapper.find('#auth-password').setValue('Password1!')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      name: 'Person',
      email: 'person@example.com',
      password: 'Password1!',
      role: '',
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
    expect(wrapper.emitted('success')).toEqual([[{ mode: 'login' }]])
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

  it('toggles between register and login modes', async () => {
    const wrapper = mount(AuthModal)

    // Register mode shows the name field.
    expect(wrapper.find('#auth-name').exists()).toBe(true)
    expect(wrapper.find('.auth-modal__title').text()).toBe('Create your account')

    await wrapper.find('.auth-modal__toggle').trigger('click')

    expect(wrapper.find('#auth-name').exists()).toBe(false)
    expect(wrapper.find('.auth-modal__title').text()).toBe('Welcome back')

    await wrapper.find('.auth-modal__toggle').trigger('click')

    expect(wrapper.find('#auth-name').exists()).toBe(true)
    expect(wrapper.find('.auth-modal__title').text()).toBe('Create your account')
  })

  it('shows an invalid-credentials message on 401', async () => {
    const wrapper = mount(AuthModal)
    api.post.mockRejectedValueOnce({ response: { status: 401, data: { title: 'Unauthorized' } } })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.auth-form__error').text()).toBe('Invalid email, password, or role.')
    expect(wrapper.emitted('success')).toBeUndefined()
  })

  it('shows a rate-limit message on 429', async () => {
    const wrapper = mount(AuthModal)
    api.post.mockRejectedValueOnce({ response: { status: 429, data: {} } })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.auth-form__error').text()).toBe('Too many attempts. Please wait a moment and try again.')
  })

  it('shows the conflict message on 409', async () => {
    const wrapper = mount(AuthModal)
    api.post.mockRejectedValueOnce({ response: { status: 409, data: { error: 'That account already exists.' } } })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.auth-form__error').text()).toBe('That account already exists.')
  })

  it('reports a missing token in the response as an error', async () => {
    const wrapper = mount(AuthModal)
    api.post.mockResolvedValueOnce({ data: {} })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.auth-form__error').text()).toBe('Invalid authentication response. Please try again.')
    expect(setAuth).not.toHaveBeenCalled()
    expect(wrapper.emitted('success')).toBeUndefined()
  })

  it('shows a generic message for unexpected errors', async () => {
    const wrapper = mount(AuthModal)
    api.post.mockRejectedValueOnce({ response: { status: 500, data: {} } })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.auth-form__error').text()).toBe('Something went wrong. Please try again.')
  })

  it('emits close when the close button is clicked', async () => {
    const wrapper = mount(AuthModal)

    await wrapper.find('.auth-modal__close').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
