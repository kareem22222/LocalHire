const now = new Date('2026-07-01T12:00:00Z')
export const id = (prefix, index) => `${prefix}0000000-0000-4000-8000-${String(index).padStart(12, '0')}`

const roles = [
  ['Store Associate', 'FullTime'],
  ['Delivery Partner', 'PartTime'],
  ['Cashier', 'FullTime'],
  ['Warehouse Picker', 'Contract'],
  ['Office Assistant', 'FullTime'],
  ['Customer Support Executive', 'PartTime'],
]

function profile(role) {
  const worker = role === 'LookingForWork'
  return {
    id: worker ? id('d', 1) : id('e', 1),
    name: worker ? 'Demo Worker' : 'Demo Employer',
    email: 'demo@localhire.test',
    role,
    phone: worker ? '+91 98765 43211' : '+91 98765 43210',
    dateOfBirth: worker ? '1998-06-15' : null,
    gender: worker ? 'Prefer not to say' : null,
    addressLine: '100 Feet Road',
    cityArea: 'Indiranagar, Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    latitude: 12.9719,
    longitude: 77.6412,
    locationUpdatedAt: now.toISOString(),
    createdAt: now.toISOString(),
    jobTitle: worker ? 'Delivery Partner' : null,
    professionalSummary: worker ? 'Reliable local worker with customer-facing experience.' : null,
    experienceYears: worker ? 3 : null,
    education: worker ? '12th pass' : null,
    skills: worker ? ['Customer service', 'Billing'] : [],
    languages: worker ? ['Kannada', 'Hindi', 'English'] : [],
    workPreferences: {
      desiredRoles: worker ? ['Store Associate', 'Delivery Partner'] : [],
      employmentTypes: worker ? ['FullTime', 'PartTime'] : [],
      shifts: worker ? ['Day'] : [],
      workModes: worker ? ['OnSite'] : [],
      preferredLocations: worker ? ['Bengaluru'] : [],
      expectedSalaryMin: worker ? 18000 : null,
      expectedSalaryMax: worker ? 26000 : null,
      salaryPeriod: worker ? 'Monthly' : null,
      availability: worker ? 'Immediately' : null,
      noticePeriodDays: 0,
      travelRadiusKm: worker ? 25 : null,
      willingToRelocate: false,
      canWorkWeekends: worker,
      ownsVehicle: worker,
      vehicleTypes: worker ? ['TwoWheeler'] : [],
    },
    workHistory: worker ? [{
      jobTitle: 'Store Assistant',
      employer: 'Neighbourhood Store',
      location: 'Bengaluru',
      startDate: '2023-01',
      endDate: null,
      isCurrent: true,
      description: 'Helped customers and managed stock.',
    }] : [],
    educationHistory: worker ? [{
      qualification: '12th pass',
      institution: 'Bengaluru Pre-University College',
      fieldOfStudy: 'Commerce',
      startYear: 2015,
      endYear: 2017,
    }] : [],
    skillDetails: worker ? [{ name: 'Customer service', proficiency: 'Advanced', yearsExperience: 3 }] : [],
    languageDetails: worker ? [{ name: 'Kannada', proficiency: 'Native', canSpeak: true, canRead: true, canWrite: true }] : [],
    credentials: worker ? [{ name: 'Retail Basics', issuer: 'Local Skills Centre', issueDate: '2025-01-10' }] : [],
    resumeFileName: worker ? 'demo-worker-resume.pdf' : null,
    isProfileComplete: worker,
    profileCompletionPercent: worker ? 90 : 75,
  }
}

function candidate(index) {
  const [role] = roles[index % roles.length]
  return {
    id: id('d', index + 1),
    name: index === 0 ? 'Demo Worker' : `Local Worker ${String(index + 1).padStart(2, '0')}`,
    email: index === 0 ? 'demo@localhire.test' : `worker${index + 1}@localhire.test`,
    role,
    gender: 'Prefer not to say',
    dateOfBirth: '1998-06-15',
    addressLine: `${index + 1} Main Road`,
    area: index % 2 ? 'Koramangala, Bengaluru' : 'Indiranagar, Bengaluru',
    state: 'Karnataka',
    pincode: index % 2 ? '560034' : '560038',
    latitude: 12.97,
    longitude: 77.64,
    distanceKm: index + 1,
    matchScore: 95 - index,
    createdAt: new Date(now.getTime() - index * 86_400_000).toISOString(),
    professionalSummary: 'Dependable local candidate ready for a new role.',
    experienceYears: 2 + index % 4,
    education: '12th pass',
    skills: ['Customer service', 'Communication'],
    languages: ['Kannada', 'Hindi'],
    hasResume: index % 2 === 0,
    workPreferences: {
      desiredRoles: [role], employmentTypes: ['FullTime'], shifts: ['Day'], workModes: ['OnSite'],
      preferredLocations: ['Bengaluru'], expectedSalaryMin: 18000, expectedSalaryMax: 26000,
      salaryPeriod: 'Monthly', availability: 'Immediately', noticePeriodDays: 0, travelRadiusKm: 25,
      willingToRelocate: false, canWorkWeekends: true, ownsVehicle: false, vehicleTypes: [],
    },
    workHistory: [], educationHistory: [], skillDetails: [], languageDetails: [], credentials: [],
  }
}

function job(index) {
  const [title, employmentType] = roles[index % roles.length]
  return {
    id: id('c', index + 1),
    employerId: id('e', 1),
    title,
    description: `Help our local team as a ${title.toLowerCase()}.`,
    workplaceName: `LocalHire Test Store ${String(index + 1).padStart(2, '0')}`,
    cityArea: index % 2 ? 'Koramangala, Bengaluru' : 'Indiranagar, Bengaluru',
    state: 'Karnataka', pincode: index % 2 ? '560034' : '560038', latitude: 12.97, longitude: 77.64,
    employmentType, salaryMin: 18000 + index * 100, salaryMax: 26000 + index * 100,
    salaryPeriod: 'Monthly', minEducation: '10th pass', experienceMinYears: 0, experienceMaxYears: 3,
    workingDays: 'Mon-Sat', shiftStartTime: '09:00', shiftEndTime: '18:00', openings: 2,
    requiredSkills: ['Communication', 'Customer service'], languages: ['Kannada', 'Hindi'],
    benefits: ['Paid leave'], isActive: true,
    createdAt: new Date(now.getTime() - index * 3_600_000).toISOString(),
  }
}

export function createMockData() {
  const candidates = Array.from({ length: 18 }, (_, index) => candidate(index))
  const jobs = Array.from({ length: 18 }, (_, index) => job(index))
  const applications = jobs.flatMap((item, jobIndex) => candidates.slice(0, 8).map((worker, candidateIndex) => ({
    id: id('b', jobIndex * 10 + candidateIndex + 1), jobId: item.id, workerId: worker.id,
    status: candidateIndex === 0 ? 'Shortlisted' : 'Applied',
    appliedAt: new Date(now.getTime() - (jobIndex * 10 + candidateIndex) * 60_000).toISOString(),
  })))
  const statuses = ['Applied', 'Shortlisted', 'Rejected', 'Hired']
  const workerApplications = jobs.slice(0, 12).map((item, index) => ({
    id: id('a', index + 1), jobPostId: item.id, jobTitle: item.title, workplaceName: item.workplaceName,
    cityArea: item.cityArea, status: statuses[index % statuses.length],
    createdAt: new Date(now.getTime() - index * 3_600_000).toISOString(),
  }))

  return {
    profiles: { Hiring: profile('Hiring'), LookingForWork: profile('LookingForWork') },
    jobs, candidates, applications, workerApplications,
    notifications: { Hiring: [], LookingForWork: [] },
    nextJob: jobs.length + 1,
    nextApplication: workerApplications.length + 1,
  }
}
