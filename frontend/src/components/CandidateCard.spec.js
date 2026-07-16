import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CandidateCard from './CandidateCard.vue'

describe('CandidateCard', () => {
  it('renders state and emits keyboard and button actions', async () => {
    const candidate = {
      id: 'candidate-1',
      name: 'Ravi Kumar',
      role: 'Cashier',
      area: 'Bandra',
      state: 'Maharashtra',
      pincode: '400050',
      distanceKm: 2,
      matchScore: 95,
    }
    const wrapper = mount(CandidateCard, { props: { candidate } })

    expect(wrapper.text()).toContain('Bandra, Maharashtra')
    await wrapper.find('article').trigger('keydown.enter')
    await wrapper.find('article').trigger('keydown.space')
    await wrapper.find('.candidate-actions button').trigger('click')
    await wrapper.find('.candidate-actions__ghost').trigger('click')

    expect(wrapper.emitted('select')).toEqual([[candidate], [candidate]])
    expect(wrapper.emitted('shortlist')).toEqual([[candidate]])
    expect(wrapper.emitted('contact')).toEqual([[candidate]])

    await wrapper.setProps({ candidate: { id: 'candidate-1', name: 'Ravi' }, shortlisted: true })
    expect(wrapper.text()).toContain('Location not shared')
    expect(wrapper.find('.candidate-actions button').attributes('disabled')).toBeDefined()
  })
})
