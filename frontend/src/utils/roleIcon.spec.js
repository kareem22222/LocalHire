import { describe, expect, it } from 'vitest'
import { roleIconHref } from './roleIcon'

describe('roleIconHref', () => {
  it('maps every supported role and falls back for custom titles', () => {
    const roles = [
      'Store Associate', 'Delivery Partner', 'Cashier', 'Warehouse Picker',
      'Security Guard', 'Office Assistant', 'Customer Support Executive',
      'Housekeeping Staff', 'Kitchen Helper', 'Cafe Server', 'Driver',
      'Electrician', 'Plumber', 'Sales Associate', 'Data Entry Operator',
      'Receptionist', 'Tailor', 'Machine Operator', 'Pharmacy Assistant',
      'Field Technician',
    ]

    expect(roles.map(roleIconHref)).not.toContain('/role-icons.svg#generic')
    expect(roleIconHref('Custom Role')).toBe('/role-icons.svg#generic')
  })
})
