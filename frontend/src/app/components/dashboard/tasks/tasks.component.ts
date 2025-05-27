import { Component, inject, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Pour le formulaire d'ajout
import { TaskService } from './services/task-service.service';
import { KanbanBoardComponent } from './components/kanban/kanban.component';
import { Task } from './task.model';

@Component({
  selector: 'app-task-management',
  standalone: true,
  imports: [CommonModule, FormsModule, KanbanBoardComponent],
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss'],
})
export class TasksComponent {
  taskService = inject(TaskService);

}