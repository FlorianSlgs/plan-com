import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HomeComponent } from './components/home/home.component';
import { adminGuard } from './guards/admin.guard'; // Guard spécifique admin
import { userGuard } from './guards/user.guard'; // Guard pour utilisateurs non-admin
import { RecapComponent } from './components/dashboard/recap/recap.component';
import { GoalsComponent } from './components/dashboard/goals/goals-component/goals.component';
import { TargetsComponent } from './components/dashboard/targets/targets-component/targets.component';
import { ActionsComponent } from './components/dashboard/actions/actions.component';
import { TasksComponent } from './components/dashboard/tasks/tasks.component';
import { WelcomeComponent } from './components/website/welcome/welcome.component';
import { MentionsLegalesComponent } from './components/website/mentions-legales/mentions-legales.component';
import { PolitiqueConfidentialiteComponent } from './components/website/politique-confidentialite/politique-confidentialite.component';
import { CguComponent } from './components/website/cgu/cgu.component';
import { AdminComponent } from './components/admin/admin.component';

export const routes: Routes = [
  // Routes publiques
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'welcome', component: WelcomeComponent },
  { path: 'mentions', component: MentionsLegalesComponent },
  { path: 'confidentialite', component: PolitiqueConfidentialiteComponent },
  { path: 'cgu', component: CguComponent },
  
  // Route admin - accessible uniquement aux admins
  { 
    path: 'admin', 
    component: AdminComponent, 
    canActivate: [adminGuard] 
  },
  
  // Routes utilisateur - accessibles uniquement aux non-admins
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [userGuard], // Utiliser userGuard au lieu d'authGuard
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