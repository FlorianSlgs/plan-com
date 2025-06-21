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

  private getCurrentCampaign(): string | null {
    return localStorage.getItem('currentCampaign');
  }

  fetchTasks(): void {
    const campaign = this.getCurrentCampaign();
    if (!campaign) return;

    // Le userId est maintenant récupéré automatiquement depuis le cookie par le backend
    // On envoie seulement la campagne en query parameter
    this.http.get<Task[]>(`${this.apiUrl}?campaign=${campaign}`, {
      withCredentials: true // Important pour envoyer les cookies
    }).subscribe(tasks => this.tasks.set(tasks));
  }

  addTask(taskData: Omit<Task, 'id'>): void {
    const campaign = this.getCurrentCampaign();
    if (!campaign) return;

    const payload = { ...taskData, campaign };
    this.http.post<Task>(this.apiUrl, payload, {
      withCredentials: true // Important pour envoyer les cookies
    }).subscribe(newTask => {
      this.tasks.update(currentTasks => [...currentTasks, newTask]);
    });
  }

  updateTaskStatus(taskId: string, newStatus: 'todo' | 'inProgress' | 'done'): void {
    const campaign = this.getCurrentCampaign();
    if (!campaign) return;

    this.http.patch<Task>(`${this.apiUrl}/${taskId}`, { 
      status: newStatus, 
      campaign 
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
    const campaign = this.getCurrentCampaign();
    if (!campaign) return;

    this.http.put<Task>(`${this.apiUrl}/${updatedTask.id}`, { 
      ...updatedTask, 
      campaign 
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