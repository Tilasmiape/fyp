export interface User {
  email: string;
  password: string;
  role: 'client' | 'choreographer' | 'super-admin';
  profile?: {
    name?: string;
    gender?: string;
    dateOfBirth?: string;
    address?: string;
    mobileNumber?: string;
    danceType?: string;
    preferredStyle?: string;
  };
}

let users: User[] = [];

export function findUserByEmail(email: string): User | undefined {
  return users.find(u => u.email === email);
}

export function addUser(user: User): void {
  users.push(user);
}
