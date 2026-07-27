import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Pagination from './Pagination.vue'

describe('Pagination', () => {
  it('marks the active page and emits numbered and boundary navigation', async () => {
    const wrapper = mount(Pagination, { props: { page: 2, totalPages: 3 } })

    expect(wrapper.find('[aria-current="page"]').text()).toBe('2')
    await wrapper.find('[aria-label="Page 3 of 3"]').trigger('click')
    await wrapper.findAll('.list-pagination__edge')[0].trigger('click')

    expect(wrapper.emitted('change')).toEqual([[3], [1]])
  })

  it('windows large page counts around the active page', async () => {
    const wrapper = mount(Pagination, { props: { page: 1, totalPages: 48 } })

    expect(wrapper.findAll('.list-pagination__pages button').map((button) => button.text())).toEqual(['1', '2', '3', '4', '5', '48'])
    expect(wrapper.findAll('.list-pagination__ellipsis')).toHaveLength(1)

    await wrapper.setProps({ page: 24 })

    expect(wrapper.findAll('.list-pagination__pages button').map((button) => button.text())).toEqual(['1', '23', '24', '25', '48'])
    expect(wrapper.findAll('.list-pagination__ellipsis')).toHaveLength(2)
    expect(wrapper.find('[aria-label="Page 2 of 48"]').exists()).toBe(false)

    await wrapper.find('[aria-label="Page 25 of 48"]').trigger('click')
    expect(wrapper.emitted('change')).toEqual([[25]])
  })
})
