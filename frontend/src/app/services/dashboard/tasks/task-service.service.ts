import { Injectable, signal, WritableSignal, computed, inject } from '@angular/core';
import { catchError, retry } from 'rxjs/operators';

import { HttpService } from '../../http/http.service';
import { ErrorsService } from '../../errors/errors.service';
import { environment } from '../../../../environments/environment';
import { TasksResponse, Task } from '../../../models/tasks.model';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private readonly httpService = inject(HttpService);
  private readonly errorHandler = inject(ErrorsService);
  private readonly apiUrl = this.httpService.buildUrl(environment.endpoints.tasks);

  private tasks: WritableSignal<Task[]> = signal<Task[]>([]);
  private permissions: WritableSignal<{ isReadOnly: boolean }> = signal({ isReadOnly: false });

  public readonly allTasks = this.tasks.asReadonly();
  public readonly todoTasks = computed(() => this.tasks().filter(task => task.status === 'todo'));
  public readonly inProgressTasks = computed(() => this.tasks().filter(task => task.status === 'inProgress'));
  public readonly doneTasks = computed(() => this.tasks().filter(task => task.status === 'done'));
  public readonly isReadOnly = computed(() => this.permissions().isReadOnly);

  constructor() {
    this.fetchTasks();
  }

  private getCurrentCampaignId(): string | null {
    return localStorage.getItem('currentCampaignId');
  }

  fetchTasks(): void {
    const campaignId = this.getCurrentCampaignId();
    if (!campaignId) return;

    this.httpService.get<TasksResponse>(`${this.apiUrl}?campaignId=${campaignId}`)
      .pipe(
        retry(1),
        catchError(this.errorHandler.handleError)
      )
      .subscribe({
        next: (response) => {
          this.tasks.set(response.tasks);
          this.permissions.set(response.permissions);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des tâches:', error);
        }
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
    
    this.httpService.post<Task>(this.apiUrl, payload)
      .pipe(
        catchError(this.errorHandler.handleError)
      )
      .subscribe({
        next: (newTask) => {
          this.tasks.update(currentTasks => [...currentTasks, newTask]);
        },
        error: (error) => {
          if (error.message.includes('403') || error.message.includes('non autorisé')) {
            alert('Vous n\'avez pas les permissions pour ajouter des tâches.');
          }
          console.error('Erreur lors de l\'ajout de la tâche:', error);
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

    this.httpService.patch<Task>(`${this.apiUrl}/${taskId}`, { 
      status: newStatus, 
      campaignId 
    })
    .pipe(
      catchError(this.errorHandler.handleError)
    )
    .subscribe({
      next: (updatedTask) => {
        this.tasks.update(currentTasks =>
          currentTasks.map(task =>
            task.id === updatedTask.id ? updatedTask : task
          )
        );
      },
      error: (error) => {
        if (error.message.includes('403') || error.message.includes('non autorisé')) {
          alert('Vous n\'avez pas les permissions pour modifier des tâches.');
        }
        console.error('Erreur lors de la mise à jour du statut:', error);
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

    this.httpService.put<Task>(`${this.apiUrl}/${updatedTask.id}`, { 
      ...updatedTask, 
      campaignId 
    })
    .pipe(
      catchError(this.errorHandler.handleError)
    )
    .subscribe({
      next: (task) => {
        this.tasks.update(currentTasks =>
          currentTasks.map(t =>
            t.id === task.id ? task : t
          )
        );
      },
      error: (error) => {
        if (error.message.includes('403') || error.message.includes('non autorisé')) {
          alert('Vous n\'avez pas les permissions pour modifier des tâches.');
        }
        console.error('Erreur lors de la mise à jour de la tâche:', error);
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

    this.httpService.delete(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.errorHandler.handleError)
      )
      .subscribe({
        next: () => {
          this.tasks.update(currentTasks => currentTasks.filter(task => task.id !== id));
        },
        error: (error) => {
          if (error.message.includes('403') || error.message.includes('non autorisé')) {
            alert('Vous n\'avez pas les permissions pour supprimer des tâches.');
          }
          console.error('Erreur lors de la suppression de la tâche:', error);
        }
      });
  }

  clearTasks(): void {
    this.tasks.set([]);
    this.permissions.set({ isReadOnly: false });
  }
}