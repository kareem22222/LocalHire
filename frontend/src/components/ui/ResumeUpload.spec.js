import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ResumeUpload from './ResumeUpload.vue'

describe('ResumeUpload', () => {
  it('shows download only when a stored resume exists', async () => {
    const empty = mount(ResumeUpload)
    expect(empty.findAll('button').some((button) => button.text() === 'Download')).toBe(false)

    const stored = mount(ResumeUpload, { props: { fileName: 'pat-cv.pdf' } })
    const download = stored.findAll('button').find((button) => button.text() === 'Download')
    expect(download).toBeTruthy()
    await download.trigger('click')
    expect(stored.emitted('download')).toHaveLength(1)
  })

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
