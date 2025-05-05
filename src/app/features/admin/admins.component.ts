import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MaterialModule } from 'src/app/material.module';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';

import { UserService, UserDTO, ApiResponse, UserRole } from '../../../app/services/admin.service';
import { AuthService } from 'src/app/services/auth.service';
import { UserProfile } from 'src/app/services/profile.service';

@Component({
  selector: 'app-admins',
  standalone: true,
  imports: [
    MatTableModule,
    CommonModule,
    MatCardModule,
    MaterialModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatPaginatorModule,
  ],
  templateUrl: './admins.component.html',
})
export class AdminsComponent implements OnInit, AfterViewInit {
  displayedColumns1: string[] = ['name', 'email', 'role', 'status', 'assigned'];
  dataSource1: MatTableDataSource<UserDTO>;
  currentUserRole: UserRole = UserRole.User;
  currentUserId: string = '';

  // Pagination
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];
  pageIndex: number = 0;
  totalUsers: number = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // Expose the enum to the template
  UserRole = UserRole;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    if (this.dataSource1) {
      this.dataSource1.paginator = this.paginator;
    }
  }

  loadCurrentUser(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      // Parse the role string to enum value if needed
      if (typeof currentUser.role === 'string') {
        switch (currentUser.role) {
          case 'SuperAdmin':
            this.currentUserRole = UserRole.SuperAdmin;
            break;
          case 'Admin':
            this.currentUserRole = UserRole.Admin;
            break;
          default:
            this.currentUserRole = UserRole.User;
        }
      } else if (typeof currentUser.role === 'number') {
        // It's already a numeric value
        this.currentUserRole = currentUser.role as UserRole;
      }
      this.currentUserId = currentUser.userId;
    } else {
      // Fallback for development/testing
      this.currentUserRole = UserRole.SuperAdmin;
      this.currentUserId = 'test-user-id';
    }
  }

  loadUsers(): void {
    this.userService.getAllUsers().subscribe(
      (users) => {
        this.dataSource1 = new MatTableDataSource(users);
        this.totalUsers = users.length;

        // Set paginator after data is loaded
        if (this.paginator) {
          this.dataSource1.paginator = this.paginator;
        }
      },
      (error) => {
        console.error('Error fetching users', error);
        this.showNotification('Error fetching users: ' + this.getErrorMessage(error), 'error');
      }
    );
  }

  /**
   * Handle page change event
   */
  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
  }

  // Get the role as a string for display
  getRoleString(role: UserRole): string {
    return this.userService.getRoleString(role);
  }

  // Confirm a user
  confirmUser(userId: string): void {
    this.userService.confirmUser(userId).subscribe(
      (response) => {
        // Check if the response indicates an email was sent
        const emailSent = response.message?.includes('email') || response.message?.includes('notification');
        const message = emailSent
          ? 'User confirmed successfully. Email notification sent.'
          : 'User confirmed successfully.';

        this.showNotification(message, 'success');
        this.updateUserStatus(userId, true);

        // Log the full response for debugging
        console.log('User confirmation response:', response);
      },
      (error) => {
        console.error('Error confirming user', error);
        this.showNotification('Error confirming user: ' + this.getErrorMessage(error), 'error');
      }
    );
  }

  // Delete a user
  deleteUser(userId: string): void {
    // Prevent deleting your own account
    if (userId === this.currentUserId) {
      this.showNotification('You cannot delete your own account', 'error');
      return;
    }

    this.userService.deleteUser(userId).subscribe(
      (response) => {
        this.showNotification('User deleted successfully', 'success');
        this.removeUserFromList(userId);
      },
      (error) => {
        console.error('Error deleting user', error);
        this.showNotification('Error deleting user: ' + this.getErrorMessage(error), 'error');
      }
    );
  }

  // Promote a user to Admin
  promoteUser(userId: string): void {
    this.userService.promoteUser(userId).subscribe(
      (response) => {
        // Check if notification was sent
        const notificationSent = this.userService.wasNotificationSent(response);
        const message = notificationSent
          ? 'User promoted to Admin successfully. Email notification sent.'
          : 'User promoted to Admin successfully.';

        this.showNotification(message, 'success');
        this.updateUserRole(userId, UserRole.Admin);

        // Show detailed message if available
        if (response.user) {
          console.log(`User ${response.user.username} promoted from ${response.user.previousRole} to ${response.user.newRole}`);
        }
      },
      (error) => {
        console.error('Error promoting user', error);
        const errorMsg = this.getErrorMessage(error);

        // Add specific handling for 401/403 errors which likely indicate token issues
        if (error.status === 401) {
          this.showNotification('Authentication error: You may need to log in again', 'error');
        } else if (error.status === 403) {
          this.showNotification('Authorization error: You do not have permission to promote users', 'error');
        } else {
          this.showNotification('Error promoting user: ' + errorMsg, 'error');
        }
      }
    );
  }

  // Demote an Admin to User
  demoteUser(userId: string): void {
    this.userService.demoteUser(userId).subscribe(
      (response) => {
        // Check if notification was sent
        const notificationSent = this.userService.wasNotificationSent(response);
        const message = notificationSent
          ? 'Admin demoted to User successfully. Email notification sent.'
          : 'Admin demoted to User successfully.';

        this.showNotification(message, 'success');
        this.updateUserRole(userId, UserRole.User);

        // Show detailed message if available
        if (response.user) {
          console.log(`User ${response.user.username} demoted from ${response.user.previousRole} to ${response.user.newRole}`);
        }
      },
      (error) => {
        console.error('Error demoting admin', error);
        const errorMsg = this.getErrorMessage(error);

        // Add specific handling for 401/403 errors which likely indicate token issues
        if (error.status === 401) {
          this.showNotification('Authentication error: You may need to log in again', 'error');
        } else if (error.status === 403) {
          this.showNotification('Authorization error: You do not have permission to demote admins', 'error');
        } else {
          this.showNotification('Error demoting admin: ' + errorMsg, 'error');
        }
      }
    );
  }

  // Check if current user can perform actions based on roles
  canPromote(): boolean {
    return this.currentUserRole === UserRole.SuperAdmin;
  }

  canDemote(): boolean {
    return this.currentUserRole === UserRole.SuperAdmin;
  }

  canDelete(): boolean {
    return this.currentUserRole === UserRole.SuperAdmin || this.currentUserRole === UserRole.Admin;
  }

  canConfirm(): boolean {
    return this.currentUserRole === UserRole.SuperAdmin || this.currentUserRole === UserRole.Admin;
  }

  // Display notifications to the user
  showNotification(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar']
    });
  }

  // Extract error message from HTTP errors
  getErrorMessage(error: any): string {
    return error.error?.message || error.message || 'Unknown error';
  }

  // Update the user's status in the local data
  updateUserStatus(userId: string, isValidated: boolean): void {
    const user = this.dataSource1.data.find((user) => user.userId === userId);
    if (user) {
      user.isValidated = isValidated;
      // Trigger change detection by creating a new reference of the array
      this.dataSource1.data = [...this.dataSource1.data];
    }
  }

  // Update the user's role in the local data
  updateUserRole(userId: string, role: UserRole): void {
    const user = this.dataSource1.data.find((user) => user.userId === userId);
    if (user) {
      user.role = role;
      // Trigger change detection by creating a new reference of the array
      this.dataSource1.data = [...this.dataSource1.data];
    }
  }

  // Remove the user from the local data
  removeUserFromList(userId: string): void {
    this.dataSource1.data = this.dataSource1.data.filter((user) => user.userId !== userId);
  }
}
