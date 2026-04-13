export interface SignupPayload {
  fullName: string;
  email: string;
  password: string;
  gender?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  location?: string;
  role: 'client' | 'choreographer' | 'super-admin';
  danceStyles?: string[];
  certificatePhoto?: string;
}

export function validateSignupPayload(body: SignupPayload): string | null {
  const { fullName, email, password, role, certificatePhoto } = body;

  if (role === 'super-admin') {
    return 'Cannot create super-admin via signup';
  }

  if (!fullName || !email || !password || !role) {
    return 'Missing required fields';
  }

  if (role === 'choreographer' && !certificatePhoto) {
    return 'Dance certificate photo is required for choreographers';
  }

  if (role === 'choreographer' && (!Array.isArray(body.danceStyles) || body.danceStyles.length === 0)) {
    return 'At least one dance style is required for choreographers';
  }

  return null;
}
