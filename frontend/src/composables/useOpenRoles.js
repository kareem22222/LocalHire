import { computed } from 'vue'
import { formatRoleStatus } from '../utils/jobDisplay'

export function useOpenRoles(jobs) {
  return computed(() => jobs().map((job) => {
    const applicants = job.applicationCount ?? 0
    return {
      id: job.id,
      title: job.title,
      area: [job.cityArea, job.state].filter(Boolean).join(', '),
      workplaceName: job.workplaceName,
      applicants,
      shortlisted: Math.min(Math.round(applicants * 0.35), applicants),
      status: formatRoleStatus(job),
    }
  }))
}
