// 'use client';
// import { useState, FormEvent, ChangeEvent } from 'react';

// interface FormData {
//   fullName?: string;
//   email: string;
//   password: string;
//   dateOfBirth?: string;
//   phoneNumber?: string;
//   role?: string;
// }

// interface Props {
//   onSubmit: (data: FormData) => void;
//   title: string;
//   buttonText: string;
//   isSignup?: boolean;
// }

// export default function AuthForm({ onSubmit, title, buttonText, isSignup = false }: Props) {
//   const [data, setData] = useState<FormData>({ email: '', password: '' });
//   const [errors, setErrors] = useState<{ [key: string]: string }>({});

//   const validate = (name: keyof FormData, value: string): string => {
//     switch (name) {
//       case 'fullName':
//         return value.trim().length < 2 ? 'Full name must be 2+ characters' : '';
      
//       case 'email':
//         const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
//         const domain = value.split('@')[1];
//         return !domain || !domains.some(d => domain.toLowerCase().endsWith(d)) 
//           ? 'Must end with @gmail.com, @yahoo.com, @hotmail.com, or @outlook.com' 
//           : '';
      
//       case 'password':
//         if (value.length < 8) return 'Password must be minimum 8 characters';
//         if (!/[A-Z]/.test(value)) return 'Password needs at least 1 uppercase letter (A-Z)';
//         if (!/[a-z]/.test(value)) return 'Password needs at least 1 lowercase letter (a-z)';
//         if (!/[0-9]/.test(value)) return 'Password needs at least 1 digit (0-9)';
//         if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) return 'Password needs 1 special character (!@#$%)';
//         return '';
      
//       case 'phoneNumber':
//         if (!value) return '';
//         return !/^98[0-9]{8}$/.test(value.trim()) 
//           ? 'Phone must start with 98 and have exactly 10 digits (e.g., 9841234567)' 
//           : '';
      
//       case 'dateOfBirth':
//         if (!value.trim()) return 'Date of birth is required';
        
//         // Calculate age
//         const birthDate = new Date(value);
//         const today = new Date();
//         let age = today.getFullYear() - birthDate.getFullYear();
//         const monthDiff = today.getMonth() - birthDate.getMonth();
        
//         if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
//           age--;
//         }
        
//         return age < 18 ? 'You must be at least 18 years old' : '';

      
//       case 'role':
//         return !value.trim() ? 'Please select a role' : '';
      
//       default:
//         return '';
//     }
//   };

//   const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
//     const { name, value } = e.target;
//     setData(prev => ({ ...prev, [name]: value }));
//     const error = validate(name as keyof FormData, value);
//     setErrors(prev => ({ ...prev, [name]: error }));
//   };

//   const handleSubmit = (e: FormEvent) => {
//     e.preventDefault();
    
//     const newErrors: { [key: string]: string } = {};
    
//     // Validate email and password (always required)
//     if (!data.email.trim()) {
//       newErrors.email = 'Email is required';
//     } else {
//       const emailError = validate('email', data.email);
//       if (emailError) newErrors.email = emailError;
//     }

//     if (!data.password.trim()) {
//       newErrors.password = 'Password is required';
//     } else {
//       const passError = validate('password', data.password);
//       if (passError) newErrors.password = passError;
//     }

//     // For signup, validate additional fields
//     if (isSignup) {
//       if (!data.fullName?.trim()) {
//         newErrors.fullName = 'Full name is required';
//       } else {
//         const nameError = validate('fullName', data.fullName);
//         if (nameError) newErrors.fullName = nameError;
//       }

//       if (!data.dateOfBirth?.trim()) {
//         newErrors.dateOfBirth = 'Date of birth is required';
//       }

//       if (!data.role?.trim()) {
//         newErrors.role = 'Please select a role';
//       }

//       if (data.phoneNumber?.trim()) {
//         const phoneError = validate('phoneNumber', data.phoneNumber);
//         if (phoneError) newErrors.phoneNumber = phoneError;
//       }
//     }

//     setErrors(newErrors);

//     if (Object.keys(newErrors).length === 0) {
//       onSubmit(data);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4 py-12">
//       <div className="max-w-lg w-full bg-white/10 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-white/20 shadow-2xl">
//         <h2 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 bg-clip-text text-transparent">
//           {title}
//         </h2>
//         <p className="text-center text-slate-300 text-sm mb-8">Book Choreography Classes</p>
        
//         <form onSubmit={handleSubmit} className="space-y-5">
//           {/* ROLE AT TOP - Radio Buttons */}
//           {isSignup && (
//             <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
//               <label className="block text-sm font-semibold text-slate-300 mb-4">Choose the Role *</label>
//               <div className="flex items-center gap-8">
//                 <label className="flex items-center gap-3 cursor-pointer">
//                   <input 
//                     type="radio" 
//                     name="role" 
//                     value="client"
//                     checked={data.role === 'client'}
//                     onChange={handleChange}
//                     className="w-5 h-5 accent-yellow-500"
//                   />
//                   <span className="text-white font-medium">Client (Student)</span>
//                 </label>
//                 <label className="flex items-center gap-3 cursor-pointer">
//                   <input 
//                     type="radio" 
//                     name="role" 
//                     value="choreographer"
//                     checked={data.role === 'choreographer'}
//                     onChange={handleChange}
//                     className="w-5 h-5 accent-yellow-500"
//                   />
//                   <span className="text-white font-medium">Choreographer</span>
//                 </label>
//               </div>
//               {errors.role && <p className="text-red-300 text-xs mt-2 ml-2 font-medium">{errors.role}</p>}
//             </div>
//           )}

//           {/* Full Name */}
//           {isSignup && (
//             <div>
//               <label className="block text-sm font-semibold text-slate-300 mb-2">Full Name *</label>
//               <input 
//                 name="fullName"
//                 type="text" 
//                 className={`w-full px-4 py-3 rounded-2xl bg-white/20 border-2 transition-all duration-300 text-white placeholder-slate-400 focus:outline-none focus:ring-4 ${
//                   errors.fullName 
//                     ? 'border-red-500 ring-red-500/30 focus:border-red-500' 
//                     : 'border-white/30 focus:border-yellow-400 focus:ring-yellow-400/30'
//                 }`}
//                 placeholder="John Doe (2+ characters)"
//                 value={data.fullName || ''}
//                 onChange={handleChange}
//               />
//               {errors.fullName && <p className="text-red-300 text-xs mt-1 ml-2 font-medium">{errors.fullName}</p>}
//             </div>
//           )}

//           {/* Email */}
//           <div>
//             <label className="block text-sm font-semibold text-slate-300 mb-2">Email Address *</label>
//             <input 
//               name="email" 
//               type="email" 
//               className={`w-full px-4 py-3 rounded-2xl bg-white/20 border-2 transition-all duration-300 text-white placeholder-slate-400 focus:outline-none focus:ring-4 ${
//                 errors.email 
//                   ? 'border-red-500 ring-red-500/30 focus:border-red-500' 
//                   : 'border-white/30 focus:border-yellow-400 focus:ring-yellow-400/30'
//               }`}
//               placeholder="you@gmail.com"
//               value={data.email}
//               onChange={handleChange}
//             />
//             {errors.email && <p className="text-red-300 text-xs mt-1 ml-2 font-medium">{errors.email}</p>}
//           </div>

//           {/* Password */}
//           <div>
//             <label className="block text-sm font-semibold text-slate-300 mb-2">Password *</label>
//             <input 
//               name="password" 
//               type="password" 
//               className={`w-full px-4 py-3 rounded-2xl bg-white/20 border-2 transition-all duration-300 text-white placeholder-slate-400 focus:outline-none focus:ring-4 ${
//                 errors.password 
//                   ? 'border-red-500 ring-red-500/30 focus:border-red-500' 
//                   : 'border-white/30 focus:border-yellow-400 focus:ring-yellow-400/30'
//               }`}
//               placeholder="Passw0rd! (8+ chars)"
//               value={data.password}
//               onChange={handleChange}
//             />
//             {errors.password && <p className="text-red-300 text-xs mt-1 ml-2 font-medium">{errors.password}</p>}
//             {!errors.password && data.password && (
//               <p className="text-green-300 text-xs mt-1 ml-2 font-medium">✓ Password valid</p>
//             )}
//           </div>

//           {/* Date of Birth */}
//           {isSignup && (
//             <div>
//               <label className="block text-sm font-semibold text-slate-300 mb-2">Date of Birth *</label>
//               <input 
//                 name="dateOfBirth"
//                 type="date" 
//                 max={new Date().toISOString().split('T')[0]}
//                 className={`w-full px-4 py-3 rounded-2xl bg-white/20 border-2 transition-all duration-300 text-white focus:outline-none focus:ring-4 ${
//                   errors.dateOfBirth 
//                     ? 'border-red-500 ring-red-500/30 focus:border-red-500' 
//                     : 'border-white/30 focus:border-yellow-400 focus:ring-yellow-400/30'
//                 }`}
//                 value={data.dateOfBirth || ''}
//                 onChange={handleChange}
//               />
//               {errors.dateOfBirth && <p className="text-red-300 text-xs mt-1 ml-2 font-medium">{errors.dateOfBirth}</p>}
//             </div>
//           )}

//           {/* Phone Number */}
//           {isSignup && (
//             <div>
//               <label className="block text-sm font-semibold text-slate-300 mb-2">Phone Number (Optional)</label>
//               <input 
//                 name="phoneNumber"
//                 type="tel" 
//                 className={`w-full px-4 py-3 rounded-2xl bg-white/20 border-2 transition-all duration-300 text-white placeholder-slate-400 focus:outline-none focus:ring-4 ${
//                   errors.phoneNumber 
//                     ? 'border-red-500 ring-red-500/30 focus:border-red-500' 
//                     : 'border-white/30 focus:border-yellow-400 focus:ring-yellow-400/30'
//                 }`}
//                 placeholder="98xxxxxxxx (10 digits, starts with 98)"
//                 value={data.phoneNumber || ''}
//                 onChange={handleChange}
//               />
//               {errors.phoneNumber && <p className="text-red-300 text-xs mt-1 ml-2 font-medium">{errors.phoneNumber}</p>}
//             </div>
//           )}

//           {/* Submit Button */}
//           <button 
//             type="submit"
//             className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-slate-900 font-bold py-4 px-8 rounded-2xl text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 mt-8"
//           >
//             {buttonText}
//           </button>
//         </form>

//         {/* Sign In Link */}
//         {isSignup && (
//           <div className="mt-6 text-center">
//             <p className="text-slate-300 text-sm">
//               Already have an account? <a href="/signin" className="text-yellow-400 hover:text-yellow-300 underline font-semibold">Sign In</a>
//             </p>
//           </div>
//         )}

//         {/* Help Text */}
//         {isSignup && (
//           <div className="mt-4 p-4 bg-white/10 rounded-2xl border border-white/10">
//             <p className="text-slate-300 text-xs leading-relaxed">
//               <strong>Password rules:</strong> Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char (!@#$%)<br/>
//               <strong>Phone:</strong> Starts with 98, total 10 digits (e.g., 9841234567)
//             </p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
