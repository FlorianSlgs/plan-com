import { Injectable, signal, WritableSignal, computed } from '@angular/core';
import { Task } from '../../components/dashboard/tasks/task.model';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface TasksResponse {
  tasks: Task[];
  permissions: { isReadOnly: boolean };
}

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private tasks: WritableSignal<Task[]> = signal<Task[]>([]);
  private permissions: WritableSignal<{ isReadOnly: boolean }> = signal({ isReadOnly: false });

  public readonly allTasks = this.tasks.asReadonly();
  public readonly todoTasks = computed(() => this.tasks().filter(task => task.status === 'todo'));
  public readonly inProgressTasks = computed(() => this.tasks().filter(task => task.status === 'inProgress'));
  public readonly doneTasks = computed(() => this.tasks().filter(task => task.status === 'done'));
  public readonly isReadOnly = computed(() => this.permissions().isReadOnly);

  private apiUrl = 'http://localhost:3000/api/tasks';

  constructor(private http: HttpClient) {
    this.fetchTasks();
  }

  private getCurrentCampaignId(): string | null {
    return localStorage.getItem('currentCampaignId');
  }

  fetchTasks(): void {
    const campaignId = this.getCurrentCampaignId();
    if (!campaignId) return;

    this.http.get<TasksResponse>(`${this.apiUrl}?campaignId=${campaignId}`, {
      withCredentials: true
    }).subscribe(response => {
      this.tasks.set(response.tasks);
      this.permissions.set(response.permissions);
    });
  }

  addTask(taskData: Omit<Task, 'id'>): void {
    if (this.isReadOnly()) {
      console.warn('Cannot add task: read-only access');
      return;
    }

    const campaignId = this.getCurrentCampaignId();
    if (!campaignId) return;

    const payload = { ...taskData, campaignId };
    this.http.post<Task>(this.apiUrl, payload, {
      withCredentials: true
    }).subscribe({
      next: (newTask) => {
        this.tasks.update(currentTasks => [...currentTasks, newTask]);
      },
      error: (error) => {
        if (error.status === 403) {
          alert('Vous n\'avez pas les permissions pour ajouter des tâches.');
        }
      }
    });
  }

  updateTaskStatus(taskId: string, newStatus: 'todo' | 'inProgress' | 'done'): void {
    if (this.isReadOnly()) {
      console.warn('Cannot update task status: read-only access');
      return;
    }

    const campaignId = this.getCurrentCampaignId();
    if (!campaignId) return;

    this.http.patch<Task>(`${this.apiUrl}/${taskId}`, { 
      status: newStatus, 
      campaignId 
    }, {
      withCredentials: true
    }).subscribe({
      next: (updatedTask) => {
        this.tasks.update(currentTasks =>
          currentTasks.map(task =>
            task.id === updatedTask.id ? updatedTask : task
          )
        );
      },
      error: (error) => {
        if (error.status === 403) {
          alert('Vous n\'avez pas les permissions pour modifier des tâches.');
        }
      }
    });
  }

  updateTask(updatedTask: Task): void {
    if (this.isReadOnly()) {
      console.warn('Cannot update task: read-only access');
      return;
    }

    const campaignId = this.getCurrentCampaignId();
    if (!campaignId) return;

    this.http.put<Task>(`${this.apiUrl}/${updatedTask.id}`, { 
      ...updatedTask, 
      campaignId 
    }, {
      withCredentials: true
    }).subscribe({
      next: (task) => {
        this.tasks.update(currentTasks =>
          currentTasks.map(t =>
            t.id === task.id ? task : t
          )
        );
      },
      error: (error) => {
        if (error.status === 403) {
          alert('Vous n\'avez pas les permissions pour modifier des tâches.');
        }
      }
    });
  }

  getTaskById(id: string) {
    return computed(() => this.tasks().find(task => task.id === id));
  }

  deleteTask(id: string): void {
    if (this.isReadOnly()) {
      console.warn('Cannot delete task: read-only access');
      return;
    }

    this.http.delete(`${this.apiUrl}/${id}`, {
      withCredentials: true
    }).subscribe({
      next: () => {
        this.tasks.update(currentTasks => currentTasks.filter(task => task.id !== id));
      },
      error: (error) => {
        if (error.status === 403) {
          alert('Vous n\'avez pas les permissions pour supprimer des tâches.');
        }
      }
    });
  }
}