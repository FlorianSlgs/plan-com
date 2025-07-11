import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HomeComponent } from './components/home/home.component';
import { authGuard } from './guards/auth.guard'; // Importer le guard fonctionnel
import { RecapComponent } from './components/dashboard/recap/recap.component';
import { GoalsComponent } from './components/dashboard/goals/goals-component/goals.component';
import { TargetsComponent } from './components/dashboard/targets/targets-component/targets.component';
import { ActionsComponent } from './components/dashboard/actions/actions.component';
import { TasksComponent } from './components/dashboard/tasks/tasks.component';
import { WelcomeComponent } from './components/website/welcome/welcome.component';

export const routes: Routes = [
  // Charger les composants directement car ils sont standalone
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'welcome', component: WelcomeComponent },
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [authGuard], // Utiliser le guard fonctionnel
    children: [
      { path: 'recap', component: RecapComponent },
      { path: 'goals', component: GoalsComponent },
      { path: 'targets', component: TargetsComponent },
      { path: 'actions', component: ActionsComponent },
      { path: 'tasks', component: TasksComponent },
      { path: '', redirectTo: 'recap', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: '/welcome', pathMatch: 'full' }, // Redirection par défaut
  { path: '**', redirectTo: '/welcome' } // Wildcard
];