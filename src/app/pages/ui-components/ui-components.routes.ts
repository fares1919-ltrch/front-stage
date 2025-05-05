import { Routes } from '@angular/router';

// ui
import { AppBadgeComponent } from './badge/badge.component';
import { AppChipsComponent } from './chips/chips.component';
import { AppListsComponent } from './lists/lists.component';
import { AppTooltipsComponent } from './tooltips/tooltips.component';
import { AppFormsComponent } from './forms/forms.component';
import { AppTablesComponent } from './tables/tables.component';
import {UploadComponent} from '../../features/upload/upload/Upload.component' ;
import {UserProfileComponent} from '../../features/profile/user-profile/user-profile.component';
import {AppHistoryComponent} from './history/history.component'
import { AdminsComponent } from '../../features/admin/admins/admins.component';

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
        canActivate: [AuthGuard]
      },
      {
        path: 'chips',
        component: AppChipsComponent,
        canActivate: [AuthGuard]
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
        canActivate: [AuthGuard]
      },
      {
        path: 'forms',
        component: AppFormsComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'tables',
        component: AppTablesComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'Upload',
        component: UploadComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'User-Profile',
        component: UserProfileComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'history',
        component: AppHistoryComponent,
        canActivate: [AuthGuard]
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
