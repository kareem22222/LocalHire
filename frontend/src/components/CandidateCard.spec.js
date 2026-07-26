import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
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
    const card = wrapper.get('.candidate-card')

    expect(wrapper.text()).toContain('Bandra, Maharashtra')
    expect(card.classes()).toContain('spotlight-card')
    expect(wrapper.find('article').attributes('role')).toBeUndefined()
    expect(wrapper.find('.candidate-card__select').element.tagName).toBe('BUTTON')
    await wrapper.find('.candidate-card__select').trigger('click')
    await wrapper.find('.candidate-actions button').trigger('click')
    await wrapper.find('.candidate-actions__ghost').trigger('click')

    expect(wrapper.emitted('select')).toEqual([[candidate]])
    expect(wrapper.emitted('shortlist')).toEqual([[candidate]])
    expect(wrapper.emitted('contact')).toEqual([[candidate]])

    vi.spyOn(card.element, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 100, height: 100 })
    card.element.dispatchEvent(new MouseEvent('pointermove', { clientX: 75, clientY: 25 }))
    expect(card.element.style.getPropertyValue('--spotlight-x')).toBe('75%')
    expect(card.element.style.getPropertyValue('--spotlight-rx')).toBe('4.50deg')
    card.element.dispatchEvent(new MouseEvent('pointerleave'))
    expect(card.element.style.getPropertyValue('--spotlight-rx')).toBe('0deg')

    await wrapper.setProps({ candidate: { id: 'candidate-1', name: 'Ravi' }, shortlisted: true })
    expect(wrapper.text()).toContain('Location not shared')
    expect(wrapper.find('.candidate-actions button').attributes('disabled')).toBeDefined()
  })
})
