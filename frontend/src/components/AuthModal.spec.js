import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api, { setAuth } from '../api'
import AuthModal from './AuthModal.vue'

vi.mock('../api', () => ({
  default: { post: vi.fn() },
  setAuth: vi.fn(),
}))

async function continueStep(wrapper) {
  await wrapper.find('.auth-form__submit').trigger('click')
  await flushPromises()
}

async function reachSignupPassword(wrapper, { role = 'Hiring', name = 'Person', email = 'person@example.com' } = {}) {
  await wrapper.find('#auth-role').setValue(role)
  await continueStep(wrapper)
  await wrapper.find('#auth-name').setValue(name)
  await wrapper.find('#auth-register-email').setValue(email)
  await continueStep(wrapper)
}

async function reachLoginPassword(wrapper, { role = 'LookingForWork', email = 'person@example.com' } = {}) {
  await wrapper.find('#auth-role').setValue(role)
  await wrapper.find('#auth-login-email').setValue(email)
  await continueStep(wrapper)
}

describe('AuthModal', () => {
  beforeEach(() => {
    api.post.mockReset()
    setAuth.mockReset()
    api.post.mockResolvedValue({ data: { token: 'token' } })
  })

  it('gates signup steps and sends the completed registration', async () => {
    const wrapper = mount(AuthModal)

    expect(wrapper.text()).toContain('Step 1 of 3')
    expect(wrapper.find('#auth-name').exists()).toBe(false)
    await continueStep(wrapper)
    expect(wrapper.find('.auth-field__error').text()).toBe('Choose how you will use LocalHire.')

    await reachSignupPassword(wrapper)
    await wrapper.find('#auth-password').setValue('Password1!')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      name: 'Person', email: 'person@example.com', password: 'Password1!', role: 'Hiring',
    })
    expect(setAuth).toHaveBeenCalledWith('token')
    expect(wrapper.emitted('success')).toEqual([[{ mode: 'register' }]])
  })

  it('preselects the initial role', () => {
    const wrapper = mount(AuthModal, { props: { initialRole: 'Hiring' } })
    expect(wrapper.find('#auth-role').element.value).toBe('Hiring')
  })

  it('rejects an invalid email without advancing', async () => {
    const wrapper = mount(AuthModal, { props: { initialMode: 'login' } })
    await wrapper.find('#auth-role').setValue('LookingForWork')
    await wrapper.find('#auth-login-email').setValue('person@@example.com')
    await continueStep(wrapper)

    expect(wrapper.find('.auth-field__error').text()).toBe('Enter a valid email address.')
    expect(wrapper.text()).toContain('Step 1 of 2')
  })

  it('uses two steps and sends role on login', async () => {
    const wrapper = mount(AuthModal, { props: { initialMode: 'login' } })

    expect(wrapper.text()).toContain('Step 1 of 2')
    await reachLoginPassword(wrapper)
    await wrapper.find('#auth-password').setValue('Password1!')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'person@example.com', password: 'Password1!', role: 'LookingForWork',
    })
    expect(wrapper.emitted('success')).toEqual([[{ mode: 'login' }]])
  })

  it('toggles modes and resets to the first step', async () => {
    const wrapper = mount(AuthModal)
    expect(wrapper.find('.auth-modal__title').text()).toBe('Create your account')
    expect(wrapper.text()).toContain('Choose your path')

    await wrapper.find('.auth-modal__toggle').trigger('click')
    expect(wrapper.find('.auth-modal__title').text()).toBe('Welcome back')
    expect(wrapper.text()).toContain('Step 1 of 2')
    expect(wrapper.find('#auth-login-email').exists()).toBe(true)

    await wrapper.find('.auth-modal__toggle').trigger('click')
    expect(wrapper.text()).toContain('Step 1 of 3')
  })

  it('routes backend field errors back to their step', async () => {
    const wrapper = mount(AuthModal)
    await reachSignupPassword(wrapper)
    await wrapper.find('#auth-password').setValue('Password1!')
    api.post.mockRejectedValueOnce({ response: { status: 400, data: { errors: {
      Name: ['Name is required.'], Email: ['Invalid email format.'],
    } } } })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Step 2 of 3')
    expect(wrapper.find('#auth-name').exists()).toBe(true)
    expect(wrapper.findAll('.auth-field__error').map(error => error.text())).toEqual(['Name is required.', 'Invalid email format.'])
  })

  it('requires a valid signup password before calling the API', async () => {
    const wrapper = mount(AuthModal)
    await reachSignupPassword(wrapper)
    await wrapper.find('#auth-password').setValue('short')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('.auth-field__error').text()).toBe('Use at least 8 characters.')
    expect(api.post).not.toHaveBeenCalled()
  })

  it.each([
    [401, { title: 'Unauthorized' }, 'Invalid email, password, or role.'],
    [429, {}, 'Too many attempts. Please wait a moment and try again.'],
    [409, { error: 'That account already exists.' }, 'That account already exists.'],
    [500, {}, 'Something went wrong. Please try again.'],
  ])('shows the server message for status %s', async (status, data, message) => {
    const wrapper = mount(AuthModal, { props: { initialMode: 'login' } })
    await reachLoginPassword(wrapper)
    await wrapper.find('#auth-password').setValue('Password1!')
    api.post.mockRejectedValueOnce({ response: { status, data } })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.auth-form__error').text()).toBe(message)
    expect(wrapper.emitted('success')).toBeUndefined()
  })

  it('reports a missing token in the response', async () => {
    const wrapper = mount(AuthModal, { props: { initialMode: 'login' } })
    await reachLoginPassword(wrapper)
    await wrapper.find('#auth-password').setValue('Password1!')
    api.post.mockResolvedValueOnce({ data: {} })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.auth-form__error').text()).toBe('Invalid authentication response. Please try again.')
    expect(setAuth).not.toHaveBeenCalled()
  })

  it('emits close from the close button', async () => {
    const wrapper = mount(AuthModal)
    await wrapper.find('.auth-modal__close').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
