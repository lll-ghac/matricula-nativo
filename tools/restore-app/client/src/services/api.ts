import axios, { AxiosInstance } from 'axios'

let apiInstance: AxiosInstance = axios.create({
  timeout: 300000 // 5 minutes for restore operations
})

let authToken = ''

export function setApiConfig(baseUrl: string) {
  apiInstance = axios.create({
    baseURL: baseUrl,
    timeout: 300000
  })
}

export const api = {
  setToken(token: string) {
    authToken = token
  },

  async login(username: string, password: string) {
    const response = await apiInstance.post('/api/auth/login', {
      username,
      password
    })
    if (response.data.token) {
      authToken = response.data.token
    }
    return response.data
  },

  async getDatabaseStatus() {
    const response = await apiInstance.get('/api/database/status', {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    return response.data
  },

  async getBackups() {
    const response = await apiInstance.get('/api/backups', {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    return response.data
  },

  async uploadBackup(file: File) {
    const formData = new FormData()
    formData.append('backup', file)

    const response = await apiInstance.post('/api/backups/upload', formData, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  async restoreBackup(filename: string) {
    const response = await apiInstance.post('/api/backups/restore',
      { filename },
      { headers: { Authorization: `Bearer ${authToken}` } }
    )
    return response.data
  }
}

export default api
