import { createMockData, id as idFor } from './mock-data.js'

const json = (response, status, body) => {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json')
  response.end(body == null ? '' : JSON.stringify(body))
}

const readBody = async (request) => {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const tokenFor = (role) => {
  const payload = Buffer.from(JSON.stringify({
    role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  })).toString('base64url')
  return `mock.${payload}.localhire`
}

const roleFrom = (request) => {
  const token = request.headers.authorization?.replace(/^Bearer /, '')
  if (!token?.startsWith('mock.')) return null
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
    return payload.exp * 1000 > Date.now() ? payload.role : null
  } catch {
    return null
  }
}

const jobResponse = (data, job) => {
  const applications = data.applications.filter((item) => item.jobId === job.id)
  return {
    ...job,
    applicationCount: applications.length,
    shortlistedCount: applications.filter((item) => item.status === 'Shortlisted').length,
  }
}

const candidateListItem = ({ email, createdAt, professionalSummary, experienceYears, education,
  skills, languages, hasResume, workPreferences, workHistory, educationHistory, skillDetails,
  languageDetails, credentials, gender, dateOfBirth, addressLine, ...candidate }) => candidate

function authorize(request, response, expectedRole) {
  const role = roleFrom(request)
  if (!role) {
    json(response, 401, { title: 'Unauthorized' })
    return null
  }
  if (expectedRole && role !== expectedRole) {
    json(response, 403, { title: 'Forbidden' })
    return null
  }
  return role
}

export default function functionalTestApi() {
  let data = createMockData()

  return {
    name: 'localhire-functional-test-api',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url, 'http://localhire.test')
        if (!url.pathname.startsWith('/api/')) return next()

        const path = url.pathname.slice(4)
        const method = request.method

        try {
          if (path === '/health') return json(response, 200, { status: 'ok' })
          if (path === '/test/reset' && method === 'POST') {
            data = createMockData()
            return json(response, 204)
          }

          if ((path === '/auth/login' || path === '/auth/register') && method === 'POST') {
            const body = await readBody(request)
            if (path === '/auth/login'
              && (body.email !== 'demo@localhire.test' || body.password !== 'LocalHire1!'
                || !['Hiring', 'LookingForWork'].includes(body.role))) {
              return json(response, 401, { title: 'Unauthorized' })
            }
            return json(response, path.endsWith('register') ? 201 : 200, { token: tokenFor(body.role) })
          }

          if (path === '/auth/me' && method === 'GET') {
            const role = authorize(request, response)
            if (!role) return
            return json(response, 200, data.profiles[role])
          }

          if (path === '/me/profile' && method === 'PUT') {
            const role = authorize(request, response)
            if (!role) return
            data.profiles[role] = { ...data.profiles[role], ...await readBody(request), role }
            return json(response, 200, data.profiles[role])
          }

          if (path === '/me/location' && method === 'PUT') {
            const role = authorize(request, response)
            if (!role) return
            data.profiles[role] = { ...data.profiles[role], ...await readBody(request) }
            return json(response, 200, data.profiles[role])
          }

          if (path.startsWith('/hiring/')) {
            if (!authorize(request, response, 'Hiring')) return

            if (path === '/hiring/jobs' && method === 'GET') {
              return json(response, 200, data.jobs.map((job) => jobResponse(data, job)))
            }

            if (path === '/hiring/jobs' && method === 'POST') {
              const body = await readBody(request)
              const created = {
                ...body,
                id: idFor('c', data.nextJob++),
                requiredSkills: body.requiredSkills || [],
                languages: body.languages || [],
                benefits: body.benefits || [],
                isActive: true,
                createdAt: new Date().toISOString(),
              }
              data.jobs.unshift(created)
              return json(response, 201, jobResponse(data, created))
            }

            if (path === '/hiring/candidates/nearby' && method === 'GET') {
              const search = (url.searchParams.get('search') || '').toLowerCase()
              const role = (url.searchParams.get('role') || '').toLowerCase()
              const candidates = data.candidates
                .filter((candidate) => !search || [
                  candidate.name, candidate.role, candidate.area, candidate.state, candidate.pincode,
                ].some((value) => value?.toLowerCase().includes(search)))
                .filter((candidate) => !role || candidate.role.toLowerCase() === role)
                .map(candidateListItem)
              return json(response, 200, candidates)
            }

            const candidateMatch = path.match(/^\/hiring\/candidates\/([0-9a-f-]+)$/)
            if (candidateMatch && method === 'GET') {
              const candidate = data.candidates.find((item) => item.id === candidateMatch[1])
              if (!candidate) return json(response, 404, { title: 'Not Found' })
              const hasApplied = data.applications.some((item) => item.workerId === candidate.id)
              const detail = hasApplied
                ? { ...candidate, hasApplied }
                : { ...candidate, email: null, hasResume: false, credentials: null, hasApplied }
              return json(response, 200, detail)
            }

            const shortlistMatch = path.match(/^\/hiring\/jobs\/([0-9a-f-]+)\/applications\/([0-9a-f-]+)\/shortlist$/)
            if (shortlistMatch && method === 'POST') {
              const application = data.applications.find((item) =>
                item.jobId === shortlistMatch[1] && item.id === shortlistMatch[2])
              if (!application) return json(response, 404, { title: 'Not Found' })
              application.status = 'Shortlisted'
              return json(response, 200, applicantResponse(data, application))
            }

            const applicationsMatch = path.match(/^\/hiring\/jobs\/([0-9a-f-]+)\/applications$/)
            if (applicationsMatch && method === 'GET') {
              const items = data.applications
                .filter((item) => item.jobId === applicationsMatch[1])
                .map((item) => applicantResponse(data, item))
              return json(response, 200, items)
            }

            const jobMatch = path.match(/^\/hiring\/jobs\/([0-9a-f-]+)$/)
            if (jobMatch) {
              const index = data.jobs.findIndex((item) => item.id === jobMatch[1])
              if (index < 0) return json(response, 404, { title: 'Not Found' })
              if (method === 'GET') return json(response, 200, jobResponse(data, data.jobs[index]))
              if (method === 'PUT') {
                data.jobs[index] = { ...data.jobs[index], ...await readBody(request), id: data.jobs[index].id }
                return json(response, 200, jobResponse(data, data.jobs[index]))
              }
            }
          }

          if (path.startsWith('/work/')) {
            if (!authorize(request, response, 'LookingForWork')) return

            if (path === '/work/jobs/nearby' && method === 'GET') {
              const search = (url.searchParams.get('search') || '').toLowerCase()
              const employmentType = url.searchParams.get('employmentType') || ''
              const jobs = data.jobs
                .filter((job) => job.isActive)
                .filter((job) => !search || [
                  job.title, job.workplaceName, job.cityArea, job.state, job.pincode,
                ].some((value) => value?.toLowerCase().includes(search)))
                .filter((job) => !employmentType || job.employmentType === employmentType)
                .map((job) => jobResponse(data, job))
              return json(response, 200, jobs)
            }

            if (path === '/work/applications' && method === 'GET') {
              return json(response, 200, data.workerApplications)
            }

            const applyMatch = path.match(/^\/work\/jobs\/([0-9a-f-]+)\/apply$/)
            if (applyMatch && method === 'POST') {
              const job = data.jobs.find((item) => item.id === applyMatch[1] && item.isActive)
              if (!job) return json(response, 404, { title: 'Not Found' })
              if (data.workerApplications.some((item) => item.jobPostId === job.id)) {
                return json(response, 409, { message: 'You have already applied to this job.' })
              }
              const application = {
                id: idFor('a', data.nextApplication++),
                jobPostId: job.id,
                jobTitle: job.title,
                workplaceName: job.workplaceName,
                cityArea: job.cityArea,
                status: 'Applied',
                createdAt: new Date().toISOString(),
              }
              data.workerApplications.unshift(application)
              data.applications.unshift({
                id: application.id,
                jobId: job.id,
                workerId: data.profiles.LookingForWork.id,
                status: application.status,
                appliedAt: application.createdAt,
              })
              return json(response, 201, application)
            }

            const jobMatch = path.match(/^\/work\/jobs\/([0-9a-f-]+)$/)
            if (jobMatch && method === 'GET') {
              const job = data.jobs.find((item) => item.id === jobMatch[1] && item.isActive)
              return json(response, job ? 200 : 404, job ? jobResponse(data, job) : { title: 'Not Found' })
            }
          }

          if (path === '/notifications' && method === 'GET') {
            const role = authorize(request, response)
            if (!role) return
            const items = data.notifications[role]
            return json(response, 200, { items, unreadCount: items.filter((item) => !item.isRead).length })
          }

          if (path === '/notifications/read-all' && method === 'PUT') {
            const role = authorize(request, response)
            if (!role) return
            data.notifications[role].forEach((item) => Object.assign(item, {
              isRead: true,
              readAt: item.readAt || new Date().toISOString(),
            }))
            return json(response, 204)
          }

          const notificationMatch = path.match(/^\/notifications\/([0-9a-f-]+)\/read$/)
          if (notificationMatch && method === 'PUT') {
            const role = authorize(request, response)
            if (!role) return
            const item = data.notifications[role].find((entry) => entry.id === notificationMatch[1])
            if (!item) return json(response, 404, { title: 'Not Found' })
            Object.assign(item, { isRead: true, readAt: new Date().toISOString() })
            return json(response, 200, item)
          }

          return json(response, 404, { title: 'Not Found' })
        } catch (error) {
          server.config.logger.error(error)
          return json(response, 500, { title: 'Mock API error' })
        }
      })
    },
  }
}

function applicantResponse(data, application) {
  const worker = data.candidates.find((candidate) => candidate.id === application.workerId)
  return {
    id: application.id,
    workerId: worker.id,
    workerName: worker.name,
    role: worker.role,
    area: worker.area,
    state: worker.state,
    pincode: worker.pincode,
    status: application.status,
    appliedAt: application.appliedAt,
  }
}
