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
})
