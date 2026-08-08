import api from './index.js'

export const getNotifications = () => api.get('/notifications')
export const getNotificationsPaged = (params = {}) => api.get('/notifications/paged', { params })
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`)
export const markAllNotificationsRead = () => api.put('/notifications/read-all')
