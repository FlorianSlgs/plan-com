import { Component, inject, OnInit, effect, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { A11yModule } from '@angular/cdk/a11y';
import { TaskService } from '../../../services/dashboard/tasks/task-service.service';
import { Task } from '../../../models/tasks.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule, A11yModule],
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss'],
})
export class TasksComponent implements OnInit {
  taskService = inject(TaskService);

  @ViewChild('firstInputAdd') firstInputAdd!: ElementRef<HTMLInputElement>;
  @ViewChild('firstInputEdit') firstInputEdit!: ElementRef<HTMLInputElement>;

  // Utilisation des signaux calculés du service
  todo = this.taskService.todoTasks;
  inProgress = this.taskService.inProgressTasks;
  done = this.taskService.doneTasks;
  isReadOnly = this.taskService.isReadOnly;

  showAddTaskModal = false;
  newTaskTitle = '';
  newTaskDescription = '';
  newTaskAssignee = '';
  addTaskStatus: 'todo' | 'inProgress' | 'done' = 'todo';

  // Variables pour le modal d'édition
  editTaskId: string | null = null;
  editTaskTitle = '';
  editTaskDescription = '';
  editTaskAssignee = '';
  editTaskStatus: 'todo' | 'inProgress' | 'done' = 'todo';
  showEditTaskModal = false;

  constructor() {
    // Recharge si currentCampaignId change dans le localStorage
    effect(() => {
      const campaignId = localStorage.getItem('currentCampaignId');
      this.taskService.fetchTasks();
    });
  }

  ngOnInit(): void {
    this.taskService.fetchTasks();
  }

  openAddTaskModal(status: 'todo' | 'inProgress' | 'done') {
    if (this.isReadOnly()) {
      alert('Vous n\'avez accès qu\'en lecture seule à cette campagne.');
      return;
    }
    
    this.addTaskStatus = status;
    this.showAddTaskModal = true;
    this.newTaskTitle = '';
    this.newTaskDescription = '';
    this.newTaskAssignee = '';

    // Focus automatique sur le premier champ après ouverture du modal
    setTimeout(() => {
      if (this.firstInputAdd) {
        this.firstInputAdd.nativeElement.focus();
      }
    }, 100);
  }

  closeAddTaskModal() {
    this.showAddTaskModal = false;
  }

  addTask() {
    if (this.isReadOnly()) {
      alert('Vous n\'avez accès qu\'en lecture seule à cette campagne.');
      return;
    }

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
  }

  openEditTaskModal(task: Task) {
    if (this.isReadOnly()) {
      alert('Vous n\'avez accès qu\'en lecture seule à cette campagne.');
      return;
    }

    this.editTaskId = task.id;
    this.editTaskTitle = task.title;
    this.editTaskDescription = task.description || '';
    this.editTaskAssignee = task.assignee || '';
    this.editTaskStatus = task.status;
    this.showEditTaskModal = true;

    // Focus automatique sur le premier champ après ouverture du modal
    setTimeout(() => {
      if (this.firstInputEdit) {
        this.firstInputEdit.nativeElement.focus();
      }
    }, 100);
  }

  closeEditTaskModal() {
    this.showEditTaskModal = false;
    this.editTaskId = null;
  }

  updateTask() {
    if (this.isReadOnly()) {
      alert('Vous n\'avez accès qu\'en lecture seule à cette campagne.');
      return;
    }

    if (!this.editTaskId) return;
    
    this.taskService.updateTask({
      id: this.editTaskId,
      title: this.editTaskTitle,
      description: this.editTaskDescription,
      assignee: this.editTaskAssignee,
      status: this.editTaskStatus
    });
    this.closeEditTaskModal();
  }

  deleteTask() {
    if (this.isReadOnly()) {
      alert('Vous n\'avez accès qu\'en lecture seule à cette campagne.');
      return;
    }

    if (!this.editTaskId) return;
    
    this.taskService.deleteTask(this.editTaskId);
    this.closeEditTaskModal();
  }

  drop(event: CdkDragDrop<Task[]>, newStatus: 'todo' | 'inProgress' | 'done'): void {
    if (this.isReadOnly()) {
      // Ne pas permettre le déplacement en mode lecture seule
      return;
    }

    if (event.previousContainer === event.container) {
      // Optionnel : réorganisation locale
    } else {
      const taskToMove = event.previousContainer.data[event.previousIndex];
      this.taskService.updateTaskStatus(taskToMove.id, newStatus);
    }
  }

  getConnectedLists(): string[] {
    // En mode lecture seule, ne pas connecter les listes pour empêcher le drag & drop
    if (this.isReadOnly()) {
      return [];
    }
    return ['todoList', 'inProgressList', 'doneList'];
  }
}