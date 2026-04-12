import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <SignUp
      signUpFallbackRedirectUrl="/dashboard"
      signInUrl="/sign-in"
    />
  );
}
