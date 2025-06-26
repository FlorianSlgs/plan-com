import { Injectable, signal, WritableSignal, computed } from '@angular/core';
import { Task } from '../../components/dashboard/tasks/task.model';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private tasks: WritableSignal<Task[]> = signal<Task[]>([]);

  public readonly allTasks = this.tasks.asReadonly();
  public readonly todoTasks = computed(() => this.tasks().filter(task => task.status === 'todo'));
  public readonly inProgressTasks = computed(() => this.tasks().filter(task => task.status === 'inProgress'));
  public readonly doneTasks = computed(() => this.tasks().filter(task => task.status === 'done'));

  private apiUrl = 'http://localhost:3000/api/tasks'; // À adapter

  constructor(private http: HttpClient) {
    this.fetchTasks();
  }

  private getCurrentCampaignId(): string | null {
    return localStorage.getItem('currentCampaignId');
  }

  fetchTasks(): void {
    const campaignId = this.getCurrentCampaignId();
    if (!campaignId) return;

    // Le userId est maintenant récupéré automatiquement depuis le cookie par le backend
    // On envoie seulement l'ID de la campagne en query parameter
    this.http.get<Task[]>(`${this.apiUrl}?campaignId=${campaignId}`, {
      withCredentials: true // Important pour envoyer les cookies
    }).subscribe(tasks => this.tasks.set(tasks));
  }

  addTask(taskData: Omit<Task, 'id'>): void {
    const campaignId = this.getCurrentCampaignId();
    if (!campaignId) return;

    const payload = { ...taskData, campaignId };
    this.http.post<Task>(this.apiUrl, payload, {
      withCredentials: true // Important pour envoyer les cookies
    }).subscribe(newTask => {
      this.tasks.update(currentTasks => [...currentTasks, newTask]);
    });
  }

  updateTaskStatus(taskId: string, newStatus: 'todo' | 'inProgress' | 'done'): void {
    const campaignId = this.getCurrentCampaignId();
    if (!campaignId) return;

    this.http.patch<Task>(`${this.apiUrl}/${taskId}`, { 
      status: newStatus, 
      campaignId 
    }, {
      withCredentials: true // Important pour envoyer les cookies
    }).subscribe(updatedTask => {
      this.tasks.update(currentTasks =>
        currentTasks.map(task =>
          task.id === updatedTask.id ? updatedTask : task
        )
      );
    });
  }

  updateTask(updatedTask: Task): void {
    const campaignId = this.getCurrentCampaignId();
    if (!campaignId) return;

    this.http.put<Task>(`${this.apiUrl}/${updatedTask.id}`, { 
      ...updatedTask, 
      campaignId 
    }, {
      withCredentials: true // Important pour envoyer les cookies
    }).subscribe(task => {
      this.tasks.update(currentTasks =>
        currentTasks.map(t =>
          t.id === task.id ? task : t
        )
      );
    });
  }

  getTaskById(id: string) {
    return computed(() => this.tasks().find(task => task.id === id));
  }

  deleteTask(id: string): void {
    this.http.delete(`${this.apiUrl}/${id}`, {
      withCredentials: true // Important pour envoyer les cookies
    }).subscribe(() => {
      this.tasks.update(currentTasks => currentTasks.filter(task => task.id !== id));
    });
  }
}