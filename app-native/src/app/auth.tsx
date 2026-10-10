// dailydrop://auth?code=… is the account sign-in redirect (src/lib/account.ts). The auth browser session
// usually captures it; on Android the deep link can also reach the router, so land back where we were.
import { Redirect, useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function AuthReturn() {
  const router = useRouter();
  const back = router.canGoBack();
  useEffect(() => {
    if (back) router.back();
  }, [back, router]);
  return back ? null : <Redirect href="/settings" />;
}
