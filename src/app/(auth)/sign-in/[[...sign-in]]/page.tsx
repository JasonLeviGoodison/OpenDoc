import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <SignIn
      signInFallbackRedirectUrl="/dashboard"
      signUpUrl="/sign-up"
    />
  );
}
