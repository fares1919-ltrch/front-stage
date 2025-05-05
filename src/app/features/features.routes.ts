import { Routes } from '@angular/router';
import { UploadComponent } from './upload/upload.component';
import { UploadHistoryComponent } from './upload-history/upload-history.component';
import { deduplicationComponent } from './deduplication/deduplication.component';
import { ConflictsComponent } from './conflicts/conflicts.component';
import { UserProfileComponent } from './profile/user-profile.component';
import { AdminsComponent } from './admin/admins.component';
import { ProcessesComponent } from './processes/processes.component';
import { ExceptionsComponent } from './exceptions/exceptions.component';
import { BlacklistComponent } from './blacklist/blacklist.component';
import { AuthGuard } from '../guards/auth.guard';
import { RoleGuard } from '../guards/role.guard';
import { UserRole } from '../services/admin.service';

export const FeaturesRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'upload',
        component: UploadComponent,
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
        path: 'profile',
        component: UserProfileComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'admin',
        component: AdminsComponent,
        canActivate: [RoleGuard],
        data: { roles: [UserRole.Admin, UserRole.SuperAdmin] }
      },
      {
        path: 'upload-history',
        component: UploadHistoryComponent,
        canActivate: [AuthGuard],
        data: { allowValidatedUsers: true }
      },
      {
        path: 'conflicts',
        component: ConflictsComponent,
        canActivate: [AuthGuard],
        data: { allowValidatedUsers: true }
      },
      {
        path: 'processes',
        component: ProcessesComponent,
        canActivate: [AuthGuard],
        data: { allowValidatedUsers: true }
      },
      {
        path: 'exceptions',
        component: ExceptionsComponent,
        canActivate: [AuthGuard],
        data: { allowValidatedUsers: true }
      },
      {
        path: 'blacklist',
        component: BlacklistComponent,
        canActivate: [AuthGuard],
        data: { allowValidatedUsers: true }
      }
    ],
  },
];
