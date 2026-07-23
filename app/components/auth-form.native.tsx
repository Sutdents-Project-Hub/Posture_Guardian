import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

type AuthFormProps = PropsWithChildren<{
  onSubmit: () => void;
}>;

/** Native keeps the visual grouping while submission stays with the app button. */
export function AuthForm({ children }: AuthFormProps) {
  return <View>{children}</View>;
}
