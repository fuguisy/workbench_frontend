import request from './request'

export interface Todo {
  id?: number
  userId?: number
  title: string
  priority: string
  done: number
  note?: string
  category?: string
  deadline?: string
  recurring?: string
  estPom?: number
  pomoMinutes?: number
  pomoCount?: number
  createTime?: string
  updateTime?: string
}

export const getTodoList = () => request.get('/todo/list')
export const getTodoPage = (params: { current: number; size: number }) => request.get('/todo/page', { params })
export const addTodo = (data: Todo) => request.post('/todo', data)
export const updateTodo = (data: Todo) => request.put('/todo', data)
export const deleteTodo = (id: number) => request.delete(`/todo/${id}`)
export const toggleTodoDone = (id: number) => request.put(`/todo/${id}/toggle`)
