const ROLE_ICON_IDS = {
  'store associate': 'store-associate',
  'delivery partner': 'delivery-partner',
  cashier: 'cashier',
  'warehouse picker': 'warehouse-picker',
  'security guard': 'security-guard',
  'office assistant': 'office-assistant',
  'customer support executive': 'customer-support-executive',
  'housekeeping staff': 'housekeeping-staff',
  'kitchen helper': 'kitchen-helper',
  'cafe server': 'cafe-server',
  driver: 'driver',
  electrician: 'electrician',
  plumber: 'plumber',
  'sales associate': 'sales-associate',
  'data entry operator': 'data-entry-operator',
  receptionist: 'receptionist',
  tailor: 'tailor',
  'machine operator': 'machine-operator',
  'pharmacy assistant': 'pharmacy-assistant',
  'field technician': 'field-technician',
}

export function roleIconHref(title) {
  return `/role-icons.svg#${ROLE_ICON_IDS[String(title || '').trim().toLowerCase()] || 'generic'}`
}
