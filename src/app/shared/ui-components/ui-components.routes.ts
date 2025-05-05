import { Routes } from '@angular/router';

// ui
import { AppBadgeComponent } from './badge/badge.component';
import { AppChipsComponent } from './chips/chips.component';
import { AppListsComponent } from './lists/lists.component';
import { AppTooltipsComponent } from './tooltips/tooltips.component';
import { AppFormsComponent } from './forms/forms.component';
import { deduplicationComponent } from 'src/app/features/deduplication/deduplication.component';
import {UploadComponent} from '../../features/upload/upload.component' ;
import {UserProfileComponent} from '../../features/profile/user-profile.component';
import {AppHistoryComponent} from './history/history.component'
import { AdminsComponent } from 'src/app/features/admin/admins.component';

// Guards
import { AuthGuard } from '../../guards/auth.guard';
import { RoleGuard } from '../../guards/role.guard';
import { UserRole } from '../../services/admin.service';


export const UiComponentsRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'badge',
        component: AppBadgeComponent,
        canActivate: [AuthGuard],
        data: { allowValidatedUsers: true }
      },
      {
        path: 'chips',
        component: AppChipsComponent,
        canActivate: [AuthGuard],
        data: { allowValidatedUsers: true }
      },
      {
        path: 'lists',
        component: AppListsComponent,
        canActivate: [RoleGuard],
        data: { roles: [UserRole.SuperAdmin] }
      },
      {
        path: 'tooltips',
        component: AppTooltipsComponent,
        canActivate: [AuthGuard],
        data: { allowValidatedUsers: true }
      },
      {
        path: 'forms',
        component: AppFormsComponent,
        canActivate: [AuthGuard],
        data: { allowValidatedUsers: true }
      },
      {
        path: 'deduplication',
        component: deduplicationComponent,
        canActivate: [AuthGuard],
        data: { allowValidatedUsers: true }
      },
      {
        path: 'Upload',
        component: UploadComponent,
        canActivate: [AuthGuard],
        data: { allowValidatedUsers: true }
      },
      {
        path: 'User-Profile',
        component: UserProfileComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'history',
        component: AppHistoryComponent,
        canActivate: [AuthGuard],
        data: { allowValidatedUsers: true }
      },
      {
        path: 'Admins',
        component: AdminsComponent,
        canActivate: [RoleGuard],
        data: { roles: [UserRole.Admin, UserRole.SuperAdmin] }
      }
    ],
  },
];
