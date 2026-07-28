import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ResumeUpload from './ResumeUpload.vue'

describe('ResumeUpload', () => {
  it('validates files and renders real progress state', async () => {
    const wrapper = mount(ResumeUpload)
    const input = wrapper.find('#profile-resume')
    const invalid = new File(['bad'], 'resume.exe', { type: 'application/octet-stream' })
    Object.defineProperty(input.element, 'files', { configurable: true, value: [invalid] })
    await input.trigger('change')
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.emitted('select')).toBeUndefined()

    const resume = new File(['%PDF'], 'resume.pdf', { type: 'application/pdf' })
    Object.defineProperty(input.element, 'files', { configurable: true, value: [resume] })
    await input.trigger('change')
    expect(wrapper.emitted('select')[0]).toEqual([resume])
    await wrapper.setProps({ uploading: true, progress: 42 })
    expect(wrapper.find('progress').attributes('value')).toBe('42')
  })
})
