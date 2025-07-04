export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'inProgress' | 'done'; // Statuts pour le Kanban
  startDate?: Date;
  endDate?: Date;
  assignee?: string;
}

export interface TasksResponse {
  tasks: Task[];
  permissions: { isReadOnly: boolean };
}