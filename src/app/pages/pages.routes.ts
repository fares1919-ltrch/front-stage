import { Routes } from '@angular/router';
import { StarterComponent } from '../features/dashboard/starter.component';
import { AuthGuard } from '../guards/auth.guard';

export const PagesRoutes: Routes = [
  {
    path: '',
    component: StarterComponent,
    canActivate: [AuthGuard],
    data: {
      title: 'Starter Page',
      urls: [
        { title: 'Dashboard', url: '/dashboards/dashboard1' },
        { title: 'Starter Page' },
      ],
      allowValidatedUsers: true
    },
  },
];
