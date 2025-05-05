import { Routes } from '@angular/router';

import { AppSideLoginComponent } from './side-login/side-login.component';
import { AppSideRegisterComponent } from './side-register/side-register.component';
import { AppSidegetEmailComponent } from './side-reset/side-reset.component';
import { AppSideNewPassComponent } from './side-newPass/side-newPass.component';

export const AuthenticationRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'login',
        component: AppSideLoginComponent,
      },
      {
        path: 'register',
        component: AppSideRegisterComponent,
      },
      {
        path: 'resetPass/changePass',
        component: AppSideNewPassComponent,
      },{
        path: 'resetPass/getEmail',
        component: AppSidegetEmailComponent,
      },


    ],
  },
];
