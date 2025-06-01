import { Component, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { TaskService } from '../../../services/tasks/task-service.service';
import { Task } from './task.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule],
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss'],
})
export class TasksComponent implements OnInit {
  taskService = inject(TaskService);

  // Utilisation des signaux calculés du service
  todo = this.taskService.todoTasks;
  inProgress = this.taskService.inProgressTasks;
  done = this.taskService.doneTasks;

  showAddTaskModal = false;
  newTaskTitle = '';
  newTaskDescription = '';
  newTaskAssignee = '';
  addTaskStatus: 'todo' | 'inProgress' | 'done' = 'todo';

    constructor() {
      // Recharge si userId ou currentCampaign change dans le localStorage
      // (utile si l'app change de campagne/user sans reload)
      effect(() => {
        const userId = localStorage.getItem('userId');
        const campaign = localStorage.getItem('currentCampaign');
        // On relance fetchTasks si l'un des deux change
        this.taskService.fetchTasks();
      });
    }

    ngOnInit(): void {
      // Charge les tâches à l'initialisation selon userId et currentCampaign
      this.taskService.fetchTasks();
    }

  openAddTaskModal(status: 'todo' | 'inProgress' | 'done') {
    this.addTaskStatus = status;
    this.showAddTaskModal = true;
    this.newTaskTitle = '';
    this.newTaskDescription = '';
    this.newTaskAssignee = '';
  }

  closeAddTaskModal() {
    this.showAddTaskModal = false;
  }

  addTask() {
    if (!this.newTaskTitle.trim()) {
      alert('Le titre de la tâche est requis.');
      return;
    }
    this.taskService.addTask({
      title: this.newTaskTitle,
      description: this.newTaskDescription,
      assignee: this.newTaskAssignee,
      status: this.addTaskStatus
    });
    this.closeAddTaskModal();
    // L'ajout est fluide car le service met à jour le signal local dès la réponse du backend
  }

  drop(event: CdkDragDrop<Task[]>, newStatus: 'todo' | 'inProgress' | 'done'): void {
    if (event.previousContainer === event.container) {
      // Optionnel : réorganisation locale
    } else {
      const taskToMove = event.previousContainer.data[event.previousIndex];
      this.taskService.updateTaskStatus(taskToMove.id, newStatus);
      // Les signaux sont mis à jour automatiquement après la réponse backend
    }
  }

  getConnectedLists(): string[] {
    return ['todoList', 'inProgressList', 'doneList'];
  }
}