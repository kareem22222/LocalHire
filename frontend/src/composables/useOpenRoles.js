import { computed } from 'vue'
import { formatRoleStatus } from '../utils/jobDisplay'

export function useOpenRoles(jobs) {
  return computed(() => jobs().map((job) => {
    const applicants = job.applicationCount ?? 0
    // Prefer the server-computed shortlisted count; fall back to a rough estimate
    // only when an older payload without the field is in play.
    const shortlisted = job.shortlistedCount != null
      ? Math.min(job.shortlistedCount, applicants)
      : Math.min(Math.round(applicants * 0.35), applicants)
    return {
      id: job.id,
      title: job.title,
      area: [job.cityArea, job.state].filter(Boolean).join(', '),
      workplaceName: job.workplaceName,
      applicants,
      shortlisted,
      status: formatRoleStatus(job),
    }
  }))
}
