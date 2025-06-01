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

  private getUserId(): string | null {
    return localStorage.getItem('userId');
  }

  private getCurrentCampaign(): string | null {
    return localStorage.getItem('currentCampaign');
  }

  fetchTasks(): void {
    const userId = this.getUserId();
    const campaign = this.getCurrentCampaign();
    if (!userId || !campaign) return;

    this.http.get<Task[]>(`${this.apiUrl}?userId=${userId}&campaign=${campaign}`)
      .subscribe(tasks => this.tasks.set(tasks));
  }

  addTask(taskData: Omit<Task, 'id'>): void {
    const userId = this.getUserId();
    const campaign = this.getCurrentCampaign();
    if (!userId || !campaign) return;

    const payload = { ...taskData, userId, campaign };
    this.http.post<Task>(this.apiUrl, payload).subscribe(newTask => {
      this.tasks.update(currentTasks => [...currentTasks, newTask]);
    });
  }

  updateTaskStatus(taskId: string, newStatus: 'todo' | 'inProgress' | 'done'): void {
    const userId = this.getUserId();
    const campaign = this.getCurrentCampaign();
    if (!userId || !campaign) return;

    this.http.patch<Task>(`${this.apiUrl}/${taskId}`, { status: newStatus, userId, campaign })
      .subscribe(updatedTask => {
        this.tasks.update(currentTasks =>
          currentTasks.map(task =>
            task.id === updatedTask.id ? updatedTask : task
          )
        );
      });
  }

  updateTask(updatedTask: Task): void {
    const userId = this.getUserId();
    const campaign = this.getCurrentCampaign();
    if (!userId || !campaign) return;

    this.http.put<Task>(`${this.apiUrl}/${updatedTask.id}`, { ...updatedTask, userId, campaign })
      .subscribe(task => {
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
}