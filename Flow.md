# System Flow Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Component Architecture](#component-architecture)
3. [User Journey](#user-journey)
4. [Feature Interactions](#feature-interactions)
5. [Process Flows](#process-flows)
6. [Data Flow](#data-flow)
7. [Security Flow](#security-flow)
8. [Error Handling](#error-handling)

## System Overview

The Facial Recognition Deduplication System provides a comprehensive workflow for managing facial images, detecting duplicates, and maintaining data integrity. The system integrates multiple components including user authentication, profile management, file uploads, and biometric processing.

```mermaid
graph TD
    A[User] --> B[Authentication]
    B --> C[User Management]
    C --> D[Profile Management]
    D --> E[File Upload]
    E --> F[Deduplication]
    F --> G[Process Management]

    B --> H[Role-Based Access]
    H --> I[Admin Features]
    H --> J[User Features]

    I --> K[User Management]
    I --> L[Process Monitoring]

    J --> M[File Upload]
    J --> N[Profile Updates]

    F --> O[T4Face Integration]
    O --> P[Face Detection]
    P --> Q[Feature Extraction]
    Q --> R[Similarity Matching]

    G --> S[Process Control]
    S --> T[Status Tracking]
    T --> U[Result Visualization]
```

## Component Architecture

```mermaid
graph TD
    subgraph Frontend
        UI[User Interface]
        Form[Form Components]
        Dash[Dashboard]
        Visual[Visualizations]
        State[State Management]
    end

    subgraph Backend
        API[API Controllers]
        Auth[Authentication]
        Upload[File Processing]
        Dedup[Deduplication Engine]
        Process[Process Management]
    end

    subgraph DataLayer
        DB[RavenDB]
        FileStore[File Storage]
        Cache[Cache]
    end

    subgraph ExternalServices
        T4Face[T4Face Biometric API]
        Email[Email Service]
        Google[Google OAuth]
    end

    UI --> API
    Form --> API
    Dash --> API
    Visual --> API

    API --> Auth
    API --> Upload
    API --> Dedup
    API --> Process

    Auth --> DB
    Upload --> FileStore
    Dedup --> T4Face
    Process --> DB

    Auth --> Google
    Auth --> Email
    DB <--> Cache
```

## User Journey

### 1. New User Registration Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant AuthController
    participant UserService
    participant EmailService
    participant Database

    User->>Frontend: Register with Email
    Frontend->>AuthController: Submit Registration
    AuthController->>UserService: Validate Input
    UserService->>Database: Check Email Uniqueness
    Database-->>UserService: Email Available
    UserService->>Database: Create User Record
    UserService->>EmailService: Send Verification Email
    EmailService-->>User: Verification Link Email
    AuthController-->>Frontend: Registration Success
    Frontend-->>User: Success Message

    User->>Frontend: Click Email Verification Link
    Frontend->>AuthController: Verify Email Token
    AuthController->>UserService: Validate Token
    UserService->>Database: Update Verification Status
    Database-->>UserService: User Verified
    AuthController-->>Frontend: Verification Success
    Frontend-->>User: Account Activated Message
```

### 2. Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant AuthController
    participant JwtTokenService
    participant UserService
    participant Database

    alt Traditional Login
        User->>Frontend: Enter Email/Password
        Frontend->>AuthController: Submit Login
        AuthController->>UserService: Validate Credentials
        UserService->>Database: Retrieve User Record
        Database-->>UserService: User Data with Password Hash
        UserService->>UserService: Verify Password Hash
        UserService-->>AuthController: Credentials Valid
        AuthController->>JwtTokenService: Generate JWT Tokens
        JwtTokenService-->>AuthController: Access & Refresh Tokens
        AuthController-->>Frontend: Set Auth Cookies & Return User Info
        Frontend-->>User: Redirect to Dashboard
    else Google OAuth
        User->>Frontend: Click Google Login
        Frontend->>Google: OAuth Request
        Google->>User: Authentication Prompt
        User->>Google: Approve Access
        Google->>Frontend: Auth Code
        Frontend->>AuthController: Submit Auth Code
        AuthController->>Google: Exchange for Token
        Google-->>AuthController: ID Token
        AuthController->>UserService: Find/Create User from Google Data
        UserService->>Database: Update User Record
        AuthController->>JwtTokenService: Generate JWT Tokens
        JwtTokenService-->>AuthController: Access & Refresh Tokens
        AuthController-->>Frontend: Set Auth Cookies & Return User Info
        Frontend-->>User: Redirect to Dashboard
    end
```

### 3. File Processing Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant UploadController
    participant UploadService
    participant DeduplicationController
    participant DeduplicationService
    participant T4FaceService
    participant Storage
    participant Database

    User->>Frontend: Upload Images
    Frontend->>UploadController: Submit Files
    UploadController->>UploadService: Process Upload
    UploadService->>Storage: Save to Temporary Storage
    UploadService->>Database: Create File Records
    UploadService-->>UploadController: File IDs
    UploadController-->>Frontend: Upload Success
    Frontend-->>User: Files Uploaded Confirmation

    User->>Frontend: Start Deduplication
    Frontend->>DeduplicationController: Start Process Request
    DeduplicationController->>DeduplicationService: Initialize Process
    DeduplicationService->>Database: Create Process Record
    DeduplicationService->>DeduplicationService: Begin Background Processing
    DeduplicationController-->>Frontend: Process Started
    Frontend-->>User: Process Status View

    loop For Each Image
        DeduplicationService->>Storage: Retrieve Image
        DeduplicationService->>T4FaceService: Extract Features
        T4FaceService-->>DeduplicationService: Feature Vector
        DeduplicationService->>T4FaceService: Compare with Database
        T4FaceService-->>DeduplicationService: Potential Matches
        DeduplicationService->>Database: Update Progress
        DeduplicationService->>Database: Create Conflicts if Matches Found
    end

    DeduplicationService->>Database: Mark Process Complete
    Frontend->>DeduplicationController: Poll Status
    DeduplicationController->>Database: Get Process Status
    Database-->>DeduplicationController: Process Complete
    DeduplicationController-->>Frontend: Process Results
    Frontend-->>User: Display Results & Conflicts
```

## Feature Interactions

### 1. Authentication & User Management

```mermaid
graph LR
    A[Authentication] --> B[User Creation]
    B --> C[Role Assignment]
    C --> D[Profile Setup]
    D --> E[Access Control]

    F[Google OAuth] --> B
    G[Email Verification] --> B
    H[Password Reset] --> A

    I[JWT Tokens] --> J[Authorization]
    J --> K[API Access]
    K --> L[Feature Access]

    M[SuperAdmin] --> N[User Management]
    N --> O[Role Management]
    O --> P[Permission Control]
```

### 2. File Processing & Deduplication

```mermaid
graph LR
    A[File Upload] --> B[Validation]
    B --> C[Temporary Storage]
    C --> D[Image Preparation]
    D --> E[Deduplication]

    E --> F[Feature Extraction]
    F --> G[Similarity Matching]
    G --> H[Conflict Detection]
    H --> I[Conflict Resolution]

    J[Process Control] --> K[Start/Pause/Resume]
    K --> L[Status Tracking]
    L --> M[Result Reporting]

    N[User Interface] --> O[Progress Visualization]
    O --> P[Conflict Management UI]
    P --> Q[Decision Making]
```

## Process Flows

### 1. Complete User Journey

```mermaid
graph TD
    A[User Registration] --> B[Authentication]
    B --> C[Role Assignment]
    C --> D[Profile Setup]
    D --> E[File Upload]
    E --> F[Deduplication]
    F --> G[Process Monitoring]
    G --> H[Conflict Resolution]

    subgraph Authentication Flow
        B1[Login Options] --> B2[Credential Validation]
        B2 --> B3[JWT Token Generation]
        B3 --> B4[Session Management]
    end

    subgraph Deduplication Flow
        F1[Process Initialization] --> F2[Image Processing]
        F2 --> F3[Feature Extraction]
        F3 --> F4[Similarity Comparison]
        F4 --> F5[Conflict Detection]
    end

    subgraph Admin Flow
        I[User Management] --> J[Process Control]
        J --> K[System Monitoring]
        K --> L[Configuration]
    end
```

### 2. End-to-End Deduplication Process

```mermaid
stateDiagram-v2
    [*] --> FileUpload
    FileUpload --> ValidationState

    ValidationState --> Failed: Validation Failed
    ValidationState --> ProcessInitialization: Validation Passed

    ProcessInitialization --> ProcessQueue
    ProcessQueue --> Processing

    Processing --> FeatureExtraction
    FeatureExtraction --> SimilarityMatching
    SimilarityMatching --> ResultAnalysis

    ResultAnalysis --> ConflictDetection: Potential Matches Found
    ResultAnalysis --> Completion: No Matches

    ConflictDetection --> UserReview
    UserReview --> ConflictResolution
    ConflictResolution --> Completion

    Completion --> [*]

    Failed --> [*]
```

## Data Flow

```mermaid
graph TD
    subgraph User Data
        A1[Registration Data]
        A2[Profile Information]
        A3[Credentials]
    end

    subgraph File Data
        B1[Uploaded Files]
        B2[File Metadata]
        B3[Temporary Files]
        B4[Processed Files]
    end

    subgraph Process Data
        C1[Process Records]
        C2[Status Information]
        C3[Process Results]
    end

    subgraph Biometric Data
        D1[Facial Features]
        D2[Feature Vectors]
        D3[Match Results]
    end

    A1 --> DB[(RavenDB)]
    A2 --> DB
    A3 --> DB

    B1 --> FS[File Storage]
    B2 --> DB
    B3 --> FS
    B4 --> FS

    C1 --> DB
    C2 --> DB
    C3 --> DB

    D1 --> T4F[T4Face Service]
    D2 --> T4F
    D3 --> DB

    DB <--> API[API Layer]
    FS <--> API
    T4F <--> API

    API <--> UI[User Interface]
```

## Security Flow

```mermaid
graph TD
    A[User Request] --> B{Has JWT?}
    B -->|No| C[Authentication Required]
    B -->|Yes| D[Validate JWT]

    C --> E[Login Flow]
    E --> F[Credentials Valid?]

    F -->|No| G[Auth Failed]
    F -->|Yes| H[Generate JWT]

    D --> I{Token Valid?}
    I -->|No| C
    I -->|Yes| J{Has Required Role?}

    J -->|No| K[Permission Denied]
    J -->|Yes| L[Process Request]

    H --> L

    subgraph Token Lifecycle
        M[Generate Access Token]
        N[Generate Refresh Token]
        O[Store in HTTP-Only Cookie]
        P[Token Expiration Check]
        Q[Token Refresh Flow]
    end

    subgraph Security Measures
        R[HTTPS Transport]
        S[Password Hashing]
        T[Role-Based Authorization]
        U[Rate Limiting]
        V[Input Validation]
    end
```

## Error Handling

```mermaid
graph TD
    A[User Action] --> B{Error Type?}

    B -->|Validation Error| C[Return 400 Bad Request]
    B -->|Authentication Error| D[Return 401 Unauthorized]
    B -->|Authorization Error| E[Return 403 Forbidden]
    B -->|Resource Error| F[Return 404 Not Found]
    B -->|Business Logic Error| G[Return 422 Unprocessable Entity]
    B -->|Server Error| H[Return 500 Internal Server Error]

    C --> I[Log Validation Errors]
    D --> J[Log Auth Attempts]
    E --> K[Log Access Violations]
    F --> L[Log Resource Requests]
    G --> M[Log Business Logic Errors]
    H --> N[Log Exception Details]

    I --> O[Return Detailed Error Messages]
    J --> P[Return Auth Error Details]
    K --> Q[Return Permission Error]
    L --> R[Return Resource Error]
    M --> S[Return Business Logic Error]
    N --> T[Return Generic Error Message]

    subgraph Error Response Structure
        U[Status Code]
        V[Error Type]
        W[Error Message]
        X[Error Details]
        Y[Request ID]
    end

    subgraph Error Handling Strategies
        Z1[Retry Logic]
        Z2[Circuit Breakers]
        Z3[Fallback Mechanisms]
        Z4[Graceful Degradation]
    end
```

## System States

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated

    Unauthenticated --> Authenticated: Login
    Authenticated --> Unauthenticated: Logout/Timeout

    Authenticated --> StandardUser: User Role
    Authenticated --> Administrator: Admin Role
    Authenticated --> SuperAdmin: SuperAdmin Role

    StandardUser --> ProfileManagement
    StandardUser --> FileUpload
    StandardUser --> ProcessMonitoring
    StandardUser --> ConflictResolution

    Administrator --> StandardUser
    Administrator --> UserManagement
    Administrator --> SystemMonitoring

    SuperAdmin --> Administrator
    SuperAdmin --> SystemConfiguration

    ProfileManagement --> [*]
    FileUpload --> [*]
    ProcessMonitoring --> [*]
    ConflictResolution --> [*]
    UserManagement --> [*]
    SystemMonitoring --> [*]
    SystemConfiguration --> [*]
```

## Feature Dependencies

```mermaid
graph LR
    A[Authentication] --> B[User Management]
    B --> C[Profile Management]
    C --> D[File Upload]
    D --> E[Deduplication]
    E --> F[Process Management]
    F --> G[Conflict Resolution]

    H[Role Management] --> I[Access Control]
    I --> J[Feature Access]
    J --> K[System Operations]

    L[T4Face API] --> M[Feature Extraction]
    M --> N[Biometric Matching]
    N --> O[Similarity Scoring]
    O --> P[Decision Support]

    Q[Security Layer] --- A
    Q --- D
    Q --- E
    Q --- F

    R[Database] --- B
    R --- C
    R --- E
    R --- F
```
