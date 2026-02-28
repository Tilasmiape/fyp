export type UserRole = 'admin' | 'choreographer' | 'client';

export interface User {
  _id: string;
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  phoneNumber?: string;
  profileImage?: string;
  dateOfBirth?: string;
  bio?: string;
  specialization?: string[];
  createdAt: Date;
  updatedAt: Date;
  
}
